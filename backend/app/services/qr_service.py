import io
import qrcode

from app.core.config import get_settings
from app.services import r2_service

settings = get_settings()


def generate_and_store_qr(event_slug: str) -> str:
    """
    Generate a QR code PNG for the attendee join URL and upload it to R2.
    Returns the R2 object key.
    """
    join_url = f"{settings.frontend_url}/e/{event_slug}"

    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    qr.add_data(join_url)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    png_bytes = buf.getvalue()

    r2_key = f"qr/{event_slug}.png"
    r2_service.upload_bytes(r2_key, png_bytes, mime_type="image/png")
    return r2_key
