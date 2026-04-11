import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.attendee import Attendee
    from app.models.photo import Photo


class Event(Base):
    __tablename__ = "events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    slug: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    attendee_cap: Mapped[int] = mapped_column(Integer, nullable=False)  # snapshotted from owner plan at creation
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    qr_code_r2_key: Mapped[str | None] = mapped_column(String, nullable=True)  # R2 object key for QR PNG
    delete_after: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)  # ends_at + 30d
    deletion_warned: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    owner: Mapped["User"] = relationship("User", back_populates="events")
    attendees: Mapped[list["Attendee"]] = relationship("Attendee", back_populates="event", cascade="all, delete-orphan")
    photos: Mapped[list["Photo"]] = relationship("Photo", back_populates="event", cascade="all, delete-orphan")
