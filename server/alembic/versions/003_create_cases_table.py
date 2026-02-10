"""create cases table

Revision ID: 003
Revises: 002
Create Date: 2026-02-10

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "003"
down_revision: Union[str, Sequence[str], None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create cases table."""
    op.create_table(
        "cases",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "case_number",
            sa.Integer(),
            sa.Identity(always=False),
            autoincrement=True,
            unique=True,
            nullable=False,
        ),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("audit_type_id", sa.Uuid(), nullable=False),
        sa.Column(
            "metadata",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="open"),
        sa.Column("assigned_to_id", sa.Uuid(), nullable=True),
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
            ["audit_type_id"],
            ["audit_types.id"],
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["assigned_to_id"],
            ["users.id"],
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["created_by_id"],
            ["users.id"],
            ondelete="RESTRICT",
        ),
    )
    op.create_index("ix_cases_status", "cases", ["status"])
    op.create_index("ix_cases_audit_type_id", "cases", ["audit_type_id"])
    op.create_index(
        "ix_cases_metadata",
        "cases",
        ["metadata"],
        postgresql_using="gin",
    )


def downgrade() -> None:
    """Drop cases table."""
    op.drop_index("ix_cases_metadata", table_name="cases")
    op.drop_index("ix_cases_audit_type_id", table_name="cases")
    op.drop_index("ix_cases_status", table_name="cases")
    op.drop_table("cases")
