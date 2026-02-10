import uuid
from datetime import date, datetime, time

from pydantic import BaseModel, ConfigDict, Field

from src.schemas.file_batch import FileBatchRead
from src.schemas.user import UserRead


class EventCreate(BaseModel):
    event_type: str = Field(default="note", max_length=20)
    event_date: date
    event_time: time | None = None
    file_name: str | None = Field(default=None, max_length=500)
    file_count: int | None = Field(default=None, ge=0)
    file_description: str | None = None
    file_type: str | None = Field(default=None, max_length=100)
    metadata: dict = Field(default_factory=dict)


class EventUpdate(BaseModel):
    event_type: str | None = Field(default=None, max_length=20)
    event_date: date | None = None
    event_time: time | None = None
    file_name: str | None = None
    file_count: int | None = None
    file_description: str | None = None
    file_type: str | None = None
    metadata: dict | None = None


class EventRead(BaseModel):
    id: uuid.UUID
    case_id: uuid.UUID
    event_type: str
    event_date: date
    event_time: time | None
    file_name: str | None
    file_count: int | None
    file_description: str | None
    file_type: str | None
    metadata: dict = Field(validation_alias="metadata_")
    sort_order: int
    created_by_id: uuid.UUID
    created_by: UserRead | None = None
    file_batches: list[FileBatchRead] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class EventListResponse(BaseModel):
    items: list[EventRead]
    total: int
