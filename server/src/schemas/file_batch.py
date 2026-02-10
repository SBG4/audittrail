import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class FileBatchCreate(BaseModel):
    label: str = Field(max_length=200)
    file_count: int = Field(ge=0)
    description: str | None = None
    file_types: str | None = None
    sort_order: int = 0


class FileBatchUpdate(BaseModel):
    label: str | None = Field(default=None, max_length=200)
    file_count: int | None = Field(default=None, ge=0)
    description: str | None = None
    file_types: str | None = None
    sort_order: int | None = None


class FileBatchRead(BaseModel):
    id: uuid.UUID
    event_id: uuid.UUID
    label: str
    file_count: int
    description: str | None
    file_types: str | None
    sort_order: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
