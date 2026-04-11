import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DB, get_attendee_from_device_token
from app.core.config import get_settings
from app.models.attendee import Attendee
from app.models.event import Event
from app.models.photo import Photo
from app.schemas.common import PaginatedResponse
from app.schemas.photo import (
    ALLOWED_MIME_TYPES,
    PhotoConfirm,
    PhotoPublic,
    UploadUrlRequest,
    UploadUrlResponse,
)
from app.services import r2_service, zip_service
from fastapi import Depends, Header
from typing import Annotated

settings = get_settings()
router = APIRouter(tags=["photos"])


def _check_event_window(event: Event) -> None:
    now = datetime.now(timezone.utc)
    if now < event.starts_at or now > event.ends_at:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This event is closed. Photo submissions are not accepted.",
        )


def _check_gallery_access(event: Event, attendee_count: int) -> None:
    """Raise 403 if the event exceeded its tier cap (admin must upgrade)."""
    if attendee_count > event.attendee_cap:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="attendee_cap_exceeded",
        )


# ── Attendee: request presigned PUT URL ────────────────────────────────────────

@router.post("/events/{event_id}/photos/upload-url", response_model=UploadUrlResponse)
async def request_upload_url(
    event_id: uuid.UUID,
    body: UploadUrlRequest,
    db: DB,
    x_device_token: Annotated[str | None, Header()] = None,
):
    """Attendee: get a presigned PUT URL to upload a photo directly to R2."""
    if not x_device_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing device token")

    try:
        device_token = uuid.UUID(x_device_token)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid device token")

    if body.mime_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"File type not allowed")
    if body.file_size_bytes > settings.max_photo_size_bytes:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File exceeds 10MB limit")

    # Verify event exists and is within window
    event_result = await db.execute(select(Event).where(Event.id == event_id))
    event = event_result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    _check_event_window(event)

    # Verify attendee is registered
    attendee_result = await db.execute(
        select(Attendee)
        .where(Attendee.event_id == event_id)
        .where(Attendee.device_token == device_token)
    )
    attendee = attendee_result.scalar_one_or_none()
    if not attendee:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not registered for this event")

    photo_uuid = uuid.uuid4()
    r2_key = f"events/{event_id}/photos/{attendee.id}/{photo_uuid}"

    upload_url = r2_service.generate_presigned_put(r2_key, body.mime_type)
    return UploadUrlResponse(upload_url=upload_url, r2_key=r2_key)


# ── Attendee: confirm upload ────────────────────────────────────────────────────

@router.post("/events/{event_id}/photos/confirm", response_model=PhotoPublic, status_code=status.HTTP_201_CREATED)
async def confirm_upload(
    event_id: uuid.UUID,
    body: PhotoConfirm,
    db: DB,
    x_device_token: Annotated[str | None, Header()] = None,
):
    """Attendee: record the photo in the DB after a successful PUT to R2."""
    if not x_device_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing device token")

    try:
        device_token = uuid.UUID(x_device_token)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid device token")

    if body.mime_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="File type not allowed")
    if body.file_size_bytes > settings.max_photo_size_bytes:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File exceeds 10MB limit")

    event_result = await db.execute(select(Event).where(Event.id == event_id))
    event = event_result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    _check_event_window(event)

    attendee_result = await db.execute(
        select(Attendee).where(Attendee.event_id == event_id).where(Attendee.device_token == device_token)
    )
    attendee = attendee_result.scalar_one_or_none()
    if not attendee:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not registered for this event")

    photo = Photo(
        event_id=event_id,
        attendee_id=attendee.id,
        r2_key=body.r2_key,
        file_name=body.file_name,
        file_size_bytes=body.file_size_bytes,
        mime_type=body.mime_type,
    )
    db.add(photo)
    await db.commit()
    await db.refresh(photo)

    signed_url = r2_service.generate_presigned_get(photo.r2_key)
    return PhotoPublic(
        id=photo.id,
        signed_url=signed_url,
        file_name=photo.file_name,
        file_size_bytes=photo.file_size_bytes,
        uploaded_at=photo.uploaded_at,
        attendee_name=attendee.display_name,
        attendee_id=attendee.id,
    )


# ── Admin: list photos ──────────────────────────────────────────────────────────

@router.get("/events/{event_id}/photos", response_model=PaginatedResponse[PhotoPublic])
async def list_photos(
    event_id: uuid.UUID,
    current_user: CurrentUser,
    db: DB,
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=100),
):
    event_result = await db.execute(
        select(Event).where(Event.id == event_id).where(Event.owner_id == current_user.id)
    )
    event = event_result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    # Check attendee cap before showing gallery
    cap_result = await db.execute(
        select(func.count(func.distinct(Attendee.device_token))).where(Attendee.event_id == event_id)
    )
    attendee_count = cap_result.scalar_one()
    _check_gallery_access(event, attendee_count)

    total_result = await db.execute(
        select(func.count()).select_from(Photo)
        .where(Photo.event_id == event_id)
        .where(Photo.deleted_at.is_(None))
    )
    total = total_result.scalar_one()

    offset = (page - 1) * page_size
    result = await db.execute(
        select(Photo)
        .options(selectinload(Photo.attendee))
        .where(Photo.event_id == event_id)
        .where(Photo.deleted_at.is_(None))
        .order_by(Photo.uploaded_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    photos = result.scalars().all()

    items = [
        PhotoPublic(
            id=p.id,
            signed_url=r2_service.generate_presigned_get(p.r2_key),
            file_name=p.file_name,
            file_size_bytes=p.file_size_bytes,
            uploaded_at=p.uploaded_at,
            attendee_name=p.attendee.display_name,
            attendee_id=p.attendee_id,
        )
        for p in photos
    ]
    return PaginatedResponse(items=items, total=total, page=page, page_size=page_size)


# ── Admin: delete photo ─────────────────────────────────────────────────────────

@router.delete("/photos/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_photo(photo_id: uuid.UUID, current_user: CurrentUser, db: DB):
    result = await db.execute(
        select(Photo)
        .options(selectinload(Photo.event))
        .where(Photo.id == photo_id)
    )
    photo = result.scalar_one_or_none()
    if not photo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo not found")
    if photo.event.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    r2_service.delete_object(photo.r2_key)
    photo.deleted_at = datetime.now(timezone.utc)
    await db.commit()


# ── Admin: ZIP download ─────────────────────────────────────────────────────────

@router.get("/events/{event_id}/photos/zip")
async def download_photos_zip(event_id: uuid.UUID, current_user: CurrentUser, db: DB):
    event_result = await db.execute(
        select(Event).where(Event.id == event_id).where(Event.owner_id == current_user.id)
    )
    event = event_result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    # Check retention: if delete_after has passed, photos are gone
    if event.delete_after and datetime.now(timezone.utc) > event.delete_after:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Photos for this event have been deleted per our 30-day retention policy.",
        )

    # Check attendee cap
    cap_result = await db.execute(
        select(func.count(func.distinct(Attendee.device_token))).where(Attendee.event_id == event_id)
    )
    attendee_count = cap_result.scalar_one()
    _check_gallery_access(event, attendee_count)

    result = await db.execute(
        select(Photo)
        .options(selectinload(Photo.attendee))
        .where(Photo.event_id == event_id)
        .where(Photo.deleted_at.is_(None))
        .order_by(Photo.uploaded_at)
    )
    photos = result.scalars().all()

    if not photos:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No photos to download")

    event_name_slug = event.name.lower().replace(" ", "_")[:20]
    filename = f"snapdrop_{event_name_slug}_{event.id.hex[:8]}.zip"

    return StreamingResponse(
        zip_service.generate_zip_stream(photos),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
