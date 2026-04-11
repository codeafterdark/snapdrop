import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DB
from app.models.attendee import Attendee
from app.models.event import Event
from app.models.photo import Photo
from app.schemas.attendee import AttendeeDetail, AttendeeJoin, AttendeeJoinResponse
from app.schemas.event import AttendeeEventView

router = APIRouter(tags=["attendees"])


@router.post("/e/{slug}/join", response_model=AttendeeJoinResponse, status_code=status.HTTP_201_CREATED)
async def join_event(slug: str, body: AttendeeJoin, db: DB):
    """Register an attendee (device token + name) for an event. Public endpoint."""
    if not body.display_name.strip():
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Please enter your name to continue")

    result = await db.execute(select(Event).where(Event.slug == slug))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    now = datetime.now(timezone.utc)
    if now < event.starts_at:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"This event hasn't started yet. Come back on {event.starts_at.strftime('%B %d, %Y')}.",
        )
    if now > event.ends_at:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This event has ended. Photo submissions are closed.")

    # Check if this device token already joined
    existing = await db.execute(
        select(Attendee)
        .where(Attendee.event_id == event.id)
        .where(Attendee.device_token == body.device_token)
    )
    attendee = existing.scalar_one_or_none()

    if attendee is None:
        # Check attendee cap (count distinct device tokens)
        cap_result = await db.execute(
            select(func.count(func.distinct(Attendee.device_token))).where(Attendee.event_id == event.id)
        )
        current_count = cap_result.scalar_one()

        # Note: cap only blocks NEW device tokens, not re-joins or multiple uploads
        # Per PRD: uploads are NEVER blocked, only admin gallery access is gated
        # So we still allow join but record the excess for cap enforcement on download
        attendee = Attendee(
            event_id=event.id,
            device_token=body.device_token,
            display_name=body.display_name.strip(),
        )
        db.add(attendee)
        await db.commit()
        await db.refresh(attendee)
    else:
        # Update name if they re-join with a different name
        if attendee.display_name != body.display_name.strip():
            attendee.display_name = body.display_name.strip()
            await db.commit()
            await db.refresh(attendee)

    return AttendeeJoinResponse(
        attendee_id=attendee.id,
        event=AttendeeEventView(
            id=event.id,
            name=event.name,
            starts_at=event.starts_at,
            ends_at=event.ends_at,
            is_active=event.is_active,
        ).model_dump(),
    )


@router.get("/events/{event_id}/attendees", response_model=list[AttendeeDetail])
async def list_attendees(event_id: uuid.UUID, current_user: CurrentUser, db: DB):
    """Admin: list all attendees with their upload counts."""
    event_result = await db.execute(
        select(Event).where(Event.id == event_id).where(Event.owner_id == current_user.id)
    )
    if not event_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    result = await db.execute(
        select(
            Attendee,
            func.count(Photo.id).label("photo_count"),
        )
        .outerjoin(Photo, (Photo.attendee_id == Attendee.id) & (Photo.deleted_at.is_(None)))
        .where(Attendee.event_id == event_id)
        .group_by(Attendee.id)
        .order_by(Attendee.joined_at)
    )
    rows = result.all()

    return [
        AttendeeDetail(
            id=row.Attendee.id,
            display_name=row.Attendee.display_name,
            device_token=row.Attendee.device_token,
            joined_at=row.Attendee.joined_at,
            photo_count=row.photo_count,
        )
        for row in rows
    ]
