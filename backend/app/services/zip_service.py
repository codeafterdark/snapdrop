import io
import zipfile
from collections.abc import AsyncGenerator

import structlog

from app.services import r2_service

log = structlog.get_logger()


def _safe_filename(attendee_name: str, uploaded_at, photo_id: str, mime_type: str) -> str:
    """Build a ZIP entry filename: jane_smith_20260615_143022.jpg"""
    ext = "jpg" if mime_type == "image/jpeg" else mime_type.split("/")[-1]
    name_slug = attendee_name.lower().replace(" ", "_")[:30]
    ts = uploaded_at.strftime("%Y%m%d_%H%M%S")
    return f"{name_slug}_{ts}_{photo_id[:8]}.{ext}"


async def generate_zip_stream(photos: list) -> AsyncGenerator[bytes, None]:
    """
    Stream a ZIP archive to the client.
    Each photo is fetched from R2 and written into the ZIP chunk-by-chunk.
    Yields bytes chunks suitable for FastAPI's StreamingResponse.
    """
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, mode="w", compression=zipfile.ZIP_STORED, allowZip64=True) as zf:
        for photo in photos:
            try:
                body = r2_service.stream_object(photo.r2_key)
                file_bytes = body.read()
                entry_name = _safe_filename(
                    photo.attendee.display_name,
                    photo.uploaded_at,
                    str(photo.id),
                    photo.mime_type,
                )
                zf.writestr(entry_name, file_bytes)
            except Exception as exc:
                log.error("zip.photo_skip", photo_id=str(photo.id), error=str(exc))
                continue

    buf.seek(0)
    while chunk := buf.read(64 * 1024):
        yield chunk
