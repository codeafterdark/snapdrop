"""Initial schema: users, events, attendees, photos

Revision ID: 001
Revises:
Create Date: 2026-04-10

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # users
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("display_name", sa.String(), nullable=True),
        sa.Column("avatar_url", sa.String(), nullable=True),
        sa.Column("plan", sa.String(), nullable=False, server_default="free"),
        sa.Column("stripe_customer_id", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("email", name="uq_users_email"),
        sa.CheckConstraint("plan IN ('free','starter','pro','business','unlimited')", name="ck_users_plan"),
    )

    # events
    op.create_table(
        "events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("slug", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("attendee_cap", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("qr_code_r2_key", sa.String(), nullable=True),
        sa.Column("delete_after", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deletion_warned", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("slug", name="uq_events_slug"),
        sa.CheckConstraint("ends_at > starts_at", name="ck_events_valid_date_range"),
        sa.CheckConstraint("ends_at - starts_at <= INTERVAL '14 days'", name="ck_events_max_duration"),
    )
    op.create_index("idx_events_owner_id", "events", ["owner_id"])
    op.create_index("idx_events_delete_after", "events", ["delete_after"])

    # attendees
    op.create_table(
        "attendees",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("event_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("events.id", ondelete="CASCADE"), nullable=False),
        sa.Column("device_token", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("display_name", sa.String(), nullable=False),
        sa.Column("joined_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("event_id", "device_token", name="uq_attendee_event_device"),
    )
    op.create_index("idx_attendees_event_id", "attendees", ["event_id"])
    op.create_index("idx_attendees_device_token", "attendees", ["device_token"])

    # photos
    op.create_table(
        "photos",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("event_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("events.id", ondelete="CASCADE"), nullable=False),
        sa.Column("attendee_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("attendees.id", ondelete="CASCADE"), nullable=False),
        sa.Column("r2_key", sa.String(), nullable=False),
        sa.Column("file_name", sa.String(), nullable=False),
        sa.Column("file_size_bytes", sa.Integer(), nullable=False),
        sa.Column("mime_type", sa.String(), nullable=False, server_default="image/jpeg"),
        sa.Column("width_px", sa.Integer(), nullable=True),
        sa.Column("height_px", sa.Integer(), nullable=True),
        sa.Column("taken_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("r2_key", name="uq_photos_r2_key"),
    )
    op.create_index("idx_photos_event_id", "photos", ["event_id"])
    op.create_index("idx_photos_attendee_id", "photos", ["attendee_id"])


def downgrade() -> None:
    op.drop_table("photos")
    op.drop_table("attendees")
    op.drop_table("events")
    op.drop_table("users")
