from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.tasks.jobs import cleanup_expired_photos, send_deletion_warnings, send_event_ended_notifications

scheduler = AsyncIOScheduler()


def setup_scheduler() -> None:
    scheduler.add_job(
        cleanup_expired_photos,
        trigger=CronTrigger(hour=2, minute=0),
        id="cleanup_expired_photos",
        replace_existing=True,
    )
    scheduler.add_job(
        send_deletion_warnings,
        trigger=CronTrigger(hour=9, minute=0),
        id="send_deletion_warnings",
        replace_existing=True,
    )
    scheduler.add_job(
        send_event_ended_notifications,
        trigger=CronTrigger(minute=0),  # every hour
        id="send_event_ended_notifications",
        replace_existing=True,
    )
    scheduler.start()
