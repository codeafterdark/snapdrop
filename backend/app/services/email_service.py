import httpx
import structlog
from app.core.config import get_settings

settings = get_settings()
log = structlog.get_logger()


def _send(to: str, subject: str, html: str) -> None:
    if not settings.mailgun_api_key or not settings.mailgun_domain:
        log.warning("email.skipped", reason="mailgun not configured", to=to, subject=subject)
        return
    try:
        response = httpx.post(
            f"https://api.mailgun.net/v3/{settings.mailgun_domain}/messages",
            auth=("api", settings.mailgun_api_key),
            data={
                "from": f"SnapDrop <{settings.email_from}>",
                "to": to,
                "subject": subject,
                "html": html,
            },
            timeout=10,
        )
        response.raise_for_status()
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


def send_invite_email(to_email: str, inviter_name: str, event_name: str, invite_token: str) -> None:
    from app.core.config import get_settings
    frontend_url = get_settings().frontend_url
    accept_link = f"{frontend_url}/admin/invite/{invite_token}"
    subject = f"{inviter_name} invited you to manage '{event_name}' on SnapDrop"
    html = f"""
    <h2>You've been invited as a co-admin</h2>
    <p><strong>{inviter_name}</strong> has invited you to help manage the event
    <strong>{event_name}</strong> on SnapDrop.</p>
    <p>As a co-admin you can view the photo gallery, download all photos, and delete individual photos.</p>
    <p style="margin: 24px 0;">
      <a href="{accept_link}" style="background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
        Accept Invite
      </a>
    </p>
    <p style="color:#888;font-size:12px;">If you weren't expecting this, you can safely ignore this email.</p>
    """
    _send(to_email, subject, html)


def send_deletion_warning(admin_email: str, event_name: str, event_id: str, deletion_date: str) -> None:
    subject = f"Action required: photos from '{event_name}' will be deleted in 7 days"
    html = f"""
    <h2>Your photos will be deleted soon</h2>
    <p>Photos from <strong>{event_name}</strong> will be permanently deleted on <strong>{deletion_date}</strong>.</p>
    <p><a href="{settings.frontend_url}/admin/events/{event_id}">Download photos now</a></p>
    <p>This is your final reminder. After this date, recovery is not possible.</p>
    """
    _send(admin_email, subject, html)
