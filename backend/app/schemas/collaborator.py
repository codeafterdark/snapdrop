import uuid
from datetime import datetime

from pydantic import BaseModel


class CollaboratorPublic(BaseModel):
    id: uuid.UUID
    invited_email: str
    user_id: uuid.UUID | None
    display_name: str | None
    avatar_url: str | None
    status: str  # pending | accepted
    invited_at: datetime
    accepted_at: datetime | None

    model_config = {"from_attributes": True}


class InviteCreate(BaseModel):
    email: str


class InviteInfo(BaseModel):
    """Public info shown on the invite accept page."""
    event_id: uuid.UUID
    event_name: str
    invited_by_name: str
    status: str  # pending | accepted
