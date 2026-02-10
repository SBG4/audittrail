import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from src.schemas.audit_type import AuditTypeRead
from src.schemas.user import UserRead


class CaseCreate(BaseModel):
    title: str = Field(max_length=200)
    description: str | None = None
    audit_type_id: uuid.UUID
    metadata: dict = Field(default_factory=dict)


class CaseUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    description: str | None = None
    metadata: dict | None = None
    status: str | None = None
    assigned_to_id: uuid.UUID | None = None


class CaseRead(BaseModel):
    id: uuid.UUID
    case_number: int
    title: str
    description: str | None
    audit_type_id: uuid.UUID
    audit_type: AuditTypeRead | None = None
    metadata: dict = Field(validation_alias="metadata_")
    status: str
    assigned_to_id: uuid.UUID | None
    assigned_to: UserRead | None = None
    created_by_id: uuid.UUID
    created_by: UserRead | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class CaseListResponse(BaseModel):
    items: list[CaseRead]
    total: int
    offset: int
    limit: int
