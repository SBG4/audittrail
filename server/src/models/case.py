import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base


class Case(Base):
    __tablename__ = "cases"
    __table_args__ = (
        Index("ix_cases_metadata", "metadata", postgresql_using="gin"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    case_number: Mapped[int] = mapped_column(
        Integer, autoincrement=True, unique=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    audit_type_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("audit_types.id", ondelete="RESTRICT"), nullable=False
    )
    metadata_: Mapped[dict] = mapped_column(
        "metadata", JSONB, nullable=False, default=dict
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="open", index=True
    )
    assigned_to_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_by_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    audit_type = relationship("AuditType", lazy="selectin")
    assigned_to = relationship(
        "User", foreign_keys=[assigned_to_id], lazy="selectin"
    )
    created_by = relationship(
        "User", foreign_keys=[created_by_id], lazy="selectin"
    )
