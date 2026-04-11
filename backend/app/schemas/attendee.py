import uuid
from datetime import datetime
from pydantic import BaseModel


class AttendeeJoin(BaseModel):
    device_token: uuid.UUID
    display_name: str

    def validate_name(self) -> "AttendeeJoin":
        if not self.display_name.strip():
            raise ValueError("Please enter your name to continue")
        return self


class AttendeeJoinResponse(BaseModel):
    attendee_id: uuid.UUID
    event: dict  # AttendeeEventView dict


class AttendeeDetail(BaseModel):
    id: uuid.UUID
    display_name: str
    device_token: uuid.UUID
    joined_at: datetime
    photo_count: int

    model_config = {"from_attributes": True}
