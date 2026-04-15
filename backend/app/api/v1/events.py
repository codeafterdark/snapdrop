import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DB
from app.core.config import get_settings
from app.models.attendee import Attendee
from app.models.collaborator import EventCollaborator
from app.models.event import Event
from app.models.photo import Photo
from app.schemas.common import PaginatedResponse
from app.schemas.event import (
    AttendeeEventView,
    EventCreate,
    EventListItem,
    EventPublic,
    EventStats,
    EventUpdate,
)
from app.services import qr_service, r2_service

settings = get_settings()
router = APIRouter(prefix="/events", tags=["events"])


def _event_status(event: Event) -> str:
    now = datetime.now(timezone.utc)
    if now < event.starts_at:
        return "upcoming"
    if now > event.ends_at:
        return "closed"
    return "active"


def _build_join_url(slug: str) -> str:
    return f"{settings.frontend_url}/e/{slug}"


def _build_qr_url(r2_key: str | None) -> str | None:
    if not r2_key:
        return None
    return r2_service.generate_presigned_get(r2_key, expires_in=3600)


def _to_event_public(event: Event, is_owner: bool = True) -> EventPublic:
    return EventPublic(
        id=event.id,
        slug=event.slug,
        name=event.name,
        description=event.description,
        starts_at=event.starts_at,
        ends_at=event.ends_at,
        attendee_cap=event.attendee_cap,
        qr_code_url=_build_qr_url(event.qr_code_r2_key),
        join_url=_build_join_url(event.slug),
        created_at=event.created_at,
        is_owner=is_owner,
    )


async def _get_event_with_access(
    event_id: uuid.UUID, current_user, db
) -> tuple[Event, bool]:
    """Return (event, is_owner). Raises 404 if user has no access."""
    result = await db.execute(
        select(Event).where(Event.id == event_id).where(Event.owner_id == current_user.id)
    )
    event = result.scalar_one_or_none()
    if event:
        return event, True

    result = await db.execute(
        select(Event)
        .join(EventCollaborator, EventCollaborator.event_id == Event.id)
        .where(Event.id == event_id)
        .where(EventCollaborator.user_id == current_user.id)
        .where(EventCollaborator.status == "accepted")
    )
    event = result.scalar_one_or_none()
    if event:
        return event, False

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")


@router.get("", response_model=PaginatedResponse[EventListItem])
async def list_events(
    current_user: CurrentUser,
    db: DB,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """List events owned by the current user."""
    offset = (page - 1) * page_size
    total_result = await db.execute(
        select(func.count()).select_from(Event).where(Event.owner_id == current_user.id)
    )
    total = total_result.scalar_one()

    result = await db.execute(
        select(Event)
        .where(Event.owner_id == current_user.id)
        .order_by(Event.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    events = result.scalars().all()

    items = [
        EventListItem(
            id=e.id,
            slug=e.slug,
            name=e.name,
            starts_at=e.starts_at,
            ends_at=e.ends_at,
            attendee_cap=e.attendee_cap,
            status=_event_status(e),
            created_at=e.created_at,
            is_owner=True,
        )
        for e in events
    ]
    return PaginatedResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/shared", response_model=list[EventListItem])
async def list_shared_events(current_user: CurrentUser, db: DB):
    """List events shared with the current user as a collaborator."""
    result = await db.execute(
        select(Event)
        .join(EventCollaborator, EventCollaborator.event_id == Event.id)
        .where(EventCollaborator.user_id == current_user.id)
        .where(EventCollaborator.status == "accepted")
        .order_by(Event.created_at.desc())
    )
    events = result.scalars().all()

    return [
        EventListItem(
            id=e.id,
            slug=e.slug,
            name=e.name,
            starts_at=e.starts_at,
            ends_at=e.ends_at,
            attendee_cap=e.attendee_cap,
            status=_event_status(e),
            created_at=e.created_at,
            is_owner=False,
        )
        for e in events
    ]


@router.post("", response_model=EventPublic, status_code=status.HTTP_201_CREATED)
async def create_event(body: EventCreate, current_user: CurrentUser, db: DB):
    slug = f"evt-{uuid.uuid4().hex[:12]}"

    event = Event(
        owner_id=current_user.id,
        slug=slug,
        name=body.name,
        description=body.description,
        starts_at=body.starts_at,
        ends_at=body.ends_at,
        attendee_cap=body.attendee_cap,
        delete_after=body.ends_at + timedelta(days=settings.photo_retention_days),
    )
    db.add(event)
    await db.flush()

    try:
        qr_key = qr_service.generate_and_store_qr(slug)
        event.qr_code_r2_key = qr_key
    except Exception as exc:
        import structlog
        structlog.get_logger().warning("qr_generation_failed", slug=slug, error=str(exc))

    await db.commit()
    await db.refresh(event)

    return _to_event_public(event, is_owner=True)


@router.get("/{event_id}", response_model=EventPublic)
async def get_event(event_id: uuid.UUID, current_user: CurrentUser, db: DB):
    event, is_owner = await _get_event_with_access(event_id, current_user, db)
    return _to_event_public(event, is_owner=is_owner)


@router.patch("/{event_id}", response_model=EventPublic)
async def update_event(event_id: uuid.UUID, body: EventUpdate, current_user: CurrentUser, db: DB):
    """Owner-only: edit event name/description."""
    result = await db.execute(
        select(Event).where(Event.id == event_id).where(Event.owner_id == current_user.id)
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    if body.name is not None:
        event.name = body.name
    if body.description is not None:
        event.description = body.description

    await db.commit()
    await db.refresh(event)

    return _to_event_public(event, is_owner=True)


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(event_id: uuid.UUID, current_user: CurrentUser, db: DB):
    """Owner-only: permanently delete the event and all its photos."""
    result = await db.execute(
        select(Event)
        .options(selectinload(Event.photos))
        .where(Event.id == event_id)
        .where(Event.owner_id == current_user.id)
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    r2_keys = [p.r2_key for p in event.photos]
    if event.qr_code_r2_key:
        r2_keys.append(event.qr_code_r2_key)
    if r2_keys:
        for i in range(0, len(r2_keys), 1000):
            r2_service.delete_objects_batch(r2_keys[i : i + 1000])

    await db.delete(event)
    await db.commit()


@router.get("/{event_id}/stats", response_model=EventStats)
async def get_event_stats(event_id: uuid.UUID, current_user: CurrentUser, db: DB):
    await _get_event_with_access(event_id, current_user, db)

    attendee_count_result = await db.execute(
        select(func.count(func.distinct(Attendee.device_token))).where(Attendee.event_id == event_id)
    )
    photo_count_result = await db.execute(
        select(func.count()).select_from(Photo).where(Photo.event_id == event_id).where(Photo.deleted_at.is_(None))
    )
    storage_result = await db.execute(
        select(func.coalesce(func.sum(Photo.file_size_bytes), 0))
        .where(Photo.event_id == event_id)
        .where(Photo.deleted_at.is_(None))
    )

    return EventStats(
        attendee_count=attendee_count_result.scalar_one(),
        photo_count=photo_count_result.scalar_one(),
        storage_bytes=storage_result.scalar_one(),
    )


# Public endpoint: resolve slug for attendees
@router.get("/public/{slug}", response_model=AttendeeEventView, tags=["attendee-public"])
async def get_event_by_slug(slug: str, db: DB):
    result = await db.execute(select(Event).where(Event.slug == slug))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return AttendeeEventView(
        id=event.id,
        name=event.name,
        starts_at=event.starts_at,
        ends_at=event.ends_at,
        is_active=event.is_active,
    )
