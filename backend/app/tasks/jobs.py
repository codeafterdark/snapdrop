from datetime import datetime, timezone

import structlog
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload

from app.db.session import AsyncSessionLocal
from app.models.event import Event
from app.models.photo import Photo
from app.services import email_service, r2_service

log = structlog.get_logger()


async def cleanup_expired_photos() -> None:
    """
    Daily job (02:00 UTC): hard-delete photos from R2 and mark them deleted_at
    for events whose delete_after has passed.
    """
    now = datetime.now(timezone.utc)
    log.info("cleanup.start", now=now.isoformat())

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Photo)
            .join(Event, Photo.event_id == Event.id)
            .where(Event.delete_after <= now)
            .where(Photo.deleted_at.is_(None))
            .options(selectinload(Photo.event).selectinload(Event.owner))
        )
        photos = result.scalars().all()

        if not photos:
            log.info("cleanup.no_photos")
            return

        r2_keys = [p.r2_key for p in photos]
        photo_ids = [p.id for p in photos]

        # Batch delete from R2 (1000 max per call)
        for i in range(0, len(r2_keys), 1000):
            r2_service.delete_objects_batch(r2_keys[i : i + 1000])

        # Mark soft-deleted in DB
        await db.execute(
            update(Photo)
            .where(Photo.id.in_(photo_ids))
            .values(deleted_at=now)
        )
        await db.commit()
        log.info("cleanup.done", deleted_count=len(photo_ids))


async def send_deletion_warnings() -> None:
    """
    Daily job (09:00 UTC): send 7-day warning emails for events approaching deletion.
    """
    from datetime import timedelta
    now = datetime.now(timezone.utc)
    warning_threshold = now + timedelta(days=7)

    log.info("warnings.start", now=now.isoformat())

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Event)
            .options(selectinload(Event.owner))
            .where(Event.delete_after.is_not(None))
            .where(Event.delete_after <= warning_threshold)
            .where(Event.delete_after > now)
            .where(Event.deletion_warned.is_(False))
        )
        events = result.scalars().all()

        for event in events:
            owner = event.owner
            if not owner.email:
                log.warning("warnings.no_email", event_id=str(event.id))
                continue
            deletion_date = event.delete_after.strftime("%B %d, %Y")
            email_service.send_deletion_warning(
                admin_email=owner.email,
                event_name=event.name,
                event_id=str(event.id),
                deletion_date=deletion_date,
            )
            event.deletion_warned = True

        await db.commit()
        log.info("warnings.done", warned_count=len(events))


async def send_event_ended_notifications() -> None:
    """
    Hourly job: send end-of-event emails to admins within 1 hour of event end.
    """
    from datetime import timedelta
    now = datetime.now(timezone.utc)
    one_hour_ago = now - timedelta(hours=1)

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Event)
            .options(selectinload(Event.owner))
            .where(Event.ends_at <= now)
            .where(Event.ends_at > one_hour_ago)
            .where(Event.is_active.is_(True))
        )
        events = result.scalars().all()

        for event in events:
            owner = event.owner
            if not owner.email:
                continue
            deletion_date = event.delete_after.strftime("%B %d, %Y") if event.delete_after else "N/A"
            email_service.send_event_ended(
                admin_email=owner.email,
                event_name=event.name,
                event_id=str(event.id),
                deletion_date=deletion_date,
            )
            event.is_active = False

        await db.commit()
