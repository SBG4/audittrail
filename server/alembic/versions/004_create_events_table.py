"""create events table

Revision ID: 004
Revises: 003
Create Date: 2026-02-10

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "004"
down_revision: Union[str, Sequence[str], None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create events table."""
    op.create_table(
        "events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("case_id", sa.Uuid(), nullable=False),
        sa.Column("event_type", sa.String(length=20), nullable=False, server_default="note"),
        sa.Column("event_date", sa.Date(), nullable=False),
        sa.Column("event_time", sa.Time(), nullable=True),
        sa.Column("file_name", sa.String(length=500), nullable=True),
        sa.Column("file_count", sa.Integer(), nullable=True),
        sa.Column("file_description", sa.Text(), nullable=True),
        sa.Column("file_type", sa.String(length=100), nullable=True),
        sa.Column(
            "metadata",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_by_id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["case_id"],
            ["cases.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["created_by_id"],
            ["users.id"],
            ondelete="RESTRICT",
        ),
    )
    op.create_index("ix_events_case_id", "events", ["case_id"])
    op.create_index("ix_events_event_date", "events", ["event_date"])


def downgrade() -> None:
    """Drop events table."""
    op.drop_index("ix_events_event_date", table_name="events")
    op.drop_index("ix_events_case_id", table_name="events")
    op.drop_table("events")
