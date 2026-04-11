import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.event import Event
    from app.models.photo import Photo


class Attendee(Base):
    __tablename__ = "attendees"
    __table_args__ = (UniqueConstraint("event_id", "device_token", name="uq_attendee_event_device"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False
    )
    device_token: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    display_name: Mapped[str] = mapped_column(String, nullable=False)
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    event: Mapped["Event"] = relationship("Event", back_populates="attendees")
    photos: Mapped[list["Photo"]] = relationship("Photo", back_populates="attendee", cascade="all, delete-orphan")
