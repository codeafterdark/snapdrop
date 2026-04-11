import structlog
from app.core.config import get_settings

settings = get_settings()
log = structlog.get_logger()


def _send(to: str, subject: str, html: str) -> None:
    if not settings.resend_api_key:
        log.warning("email.skipped", reason="no resend api key configured", to=to, subject=subject)
        return
    try:
        import resend
        resend.api_key = settings.resend_api_key
        resend.Emails.send({
            "from": settings.email_from,
            "to": to,
            "subject": subject,
            "html": html,
        })
        log.info("email.sent", to=to, subject=subject)
    except Exception as exc:
        log.error("email.failed", to=to, subject=subject, error=str(exc))


def send_event_ended(admin_email: str, event_name: str, event_id: str, deletion_date: str) -> None:
    subject = f"Your event '{event_name}' has ended — download your photos"
    html = f"""
    <h2>Your event has ended</h2>
    <p>Photos from <strong>{event_name}</strong> are available to download for the next 30 days.</p>
    <p><strong>Deletion date:</strong> {deletion_date}</p>
    <p><a href="{settings.frontend_url}/admin/events/{event_id}">View gallery &amp; download photos</a></p>
    <p>After {deletion_date}, all photos will be permanently deleted per our retention policy.</p>
    """
    _send(admin_email, subject, html)


def send_deletion_warning(admin_email: str, event_name: str, event_id: str, deletion_date: str) -> None:
    subject = f"Action required: photos from '{event_name}' will be deleted in 7 days"
    html = f"""
    <h2>Your photos will be deleted soon</h2>
    <p>Photos from <strong>{event_name}</strong> will be permanently deleted on <strong>{deletion_date}</strong>.</p>
    <p><a href="{settings.frontend_url}/admin/events/{event_id}">Download photos now</a></p>
    <p>This is your final reminder. After this date, recovery is not possible.</p>
    """
    _send(admin_email, subject, html)
