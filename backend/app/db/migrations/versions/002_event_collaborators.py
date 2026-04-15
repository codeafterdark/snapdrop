"""Add event_collaborators table

Revision ID: 002
Revises: 001
Create Date: 2026-04-14
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "event_collaborators",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "event_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("events.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "invited_by_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("invited_email", sa.String(), nullable=False),
        sa.Column("invite_token", sa.String(64), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="pending"),
        sa.Column(
            "invited_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("invite_token", name="uq_collaborators_token"),
        sa.UniqueConstraint("event_id", "invited_email", name="uq_collaborators_event_email"),
        sa.CheckConstraint("status IN ('pending', 'accepted')", name="ck_collaborators_status"),
    )
    op.create_index("idx_collaborators_event_id", "event_collaborators", ["event_id"])
    op.create_index("idx_collaborators_user_id", "event_collaborators", ["user_id"])
    op.create_index("idx_collaborators_token", "event_collaborators", ["invite_token"])


def downgrade() -> None:
    op.drop_table("event_collaborators")
