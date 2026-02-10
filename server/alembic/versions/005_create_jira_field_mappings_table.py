"""create jira_field_mappings table

Revision ID: 005
Revises: 004
Create Date: 2026-02-10

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "005"
down_revision: Union[str, Sequence[str], None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create jira_field_mappings table."""
    op.create_table(
        "jira_field_mappings",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("audit_type_id", sa.Uuid(), nullable=False),
        sa.Column("jira_field_name", sa.String(length=200), nullable=False),
        sa.Column("case_metadata_key", sa.String(length=200), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["audit_type_id"],
            ["audit_types.id"],
            ondelete="CASCADE",
        ),
        sa.UniqueConstraint(
            "audit_type_id",
            "jira_field_name",
            name="uq_jira_mapping_type_field",
        ),
    )
    op.create_index(
        "ix_jira_field_mappings_audit_type_id",
        "jira_field_mappings",
        ["audit_type_id"],
    )


def downgrade() -> None:
    """Drop jira_field_mappings table."""
    op.drop_index(
        "ix_jira_field_mappings_audit_type_id",
        table_name="jira_field_mappings",
    )
    op.drop_table("jira_field_mappings")
