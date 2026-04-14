import uuid
from datetime import datetime
from pydantic import BaseModel


ALLOWED_MIME_TYPES = {
    "image/jpeg", "image/png", "image/webp",
    "video/mp4", "video/quicktime", "video/webm",
}


class UploadUrlRequest(BaseModel):
    file_name: str
    file_size_bytes: int
    mime_type: str

    def validate_upload(self, max_bytes: int) -> "UploadUrlRequest":
        if self.mime_type not in ALLOWED_MIME_TYPES:
            raise ValueError(f"File type not allowed. Accepted: {', '.join(ALLOWED_MIME_TYPES)}")
        if self.file_size_bytes > max_bytes:
            raise ValueError(f"File exceeds maximum size of {max_bytes // (1024*1024)}MB")
        return self


class UploadUrlResponse(BaseModel):
    upload_url: str
    r2_key: str
    expires_in: int = 300


class PhotoConfirm(BaseModel):
    r2_key: str
    file_name: str
    file_size_bytes: int
    mime_type: str


class PhotoPublic(BaseModel):
    id: uuid.UUID
    signed_url: str
    file_name: str
    file_size_bytes: int
    uploaded_at: datetime
    attendee_name: str
    attendee_id: uuid.UUID
    mime_type: str

    model_config = {"from_attributes": True}


class UserSchema(BaseModel):
    id: uuid.UUID
    email: str
    display_name: str | None
    avatar_url: str | None
    plan: str

    model_config = {"from_attributes": True}
