import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base


class JiraFieldMapping(Base):
    __tablename__ = "jira_field_mappings"
    __table_args__ = (
        UniqueConstraint(
            "audit_type_id",
            "jira_field_name",
            name="uq_jira_mapping_type_field",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    audit_type_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("audit_types.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    jira_field_name: Mapped[str] = mapped_column(String(200), nullable=False)
    case_metadata_key: Mapped[str] = mapped_column(String(200), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationship
    audit_type = relationship("AuditType", lazy="selectin")
