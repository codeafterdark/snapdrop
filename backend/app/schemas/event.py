import uuid
from datetime import datetime
from pydantic import BaseModel, field_validator, model_validator


ALLOWED_CAPS = {20, 50, 100, 150, 200}


class EventCreate(BaseModel):
    name: str
    description: str | None = None
    starts_at: datetime
    ends_at: datetime
    attendee_cap: int = 50

    @field_validator("attendee_cap")
    @classmethod
    def validate_cap(cls, v: int) -> int:
        if v not in ALLOWED_CAPS:
            raise ValueError(f"Attendee cap must be one of {sorted(ALLOWED_CAPS)}")
        return v

    @model_validator(mode="after")
    def validate_dates(self) -> "EventCreate":
        if self.ends_at <= self.starts_at:
            raise ValueError("End date must be after start date")
        delta = self.ends_at - self.starts_at
        if delta.days > 14:
            raise ValueError("Event duration cannot exceed 14 days")
        return self


class EventUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class EventPublic(BaseModel):
    id: uuid.UUID
    slug: str
    name: str
    description: str | None
    starts_at: datetime
    ends_at: datetime
    attendee_cap: int
    qr_code_url: str | None
    join_url: str
    created_at: datetime

    model_config = {"from_attributes": True}


class EventListItem(BaseModel):
    id: uuid.UUID
    slug: str
    name: str
    starts_at: datetime
    ends_at: datetime
    attendee_cap: int
    status: str  # upcoming | active | closed
    created_at: datetime

    model_config = {"from_attributes": True}


class EventStats(BaseModel):
    attendee_count: int
    photo_count: int
    storage_bytes: int


class AttendeeEventView(BaseModel):
    """Minimal event data returned to attendees."""
    id: uuid.UUID
    name: str
    starts_at: datetime
    ends_at: datetime
    is_active: bool
