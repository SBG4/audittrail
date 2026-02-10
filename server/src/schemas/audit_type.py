import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class AuditTypeRead(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    description: str | None
    schema_: dict = Field(alias="schema", serialization_alias="schema")
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class AuditTypeCreate(BaseModel):
    name: str
    slug: str
    description: str | None = None
    schema_: dict = Field(alias="schema", serialization_alias="schema")

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("schema_")
    @classmethod
    def validate_json_schema(cls, v: dict) -> dict:
        if not isinstance(v, dict):
            raise ValueError("Schema must be a JSON object")
        if v.get("type") != "object":
            raise ValueError("Schema must have type 'object'")
        if "properties" not in v:
            raise ValueError("Schema must have 'properties'")
        return v


class AuditTypeList(BaseModel):
    items: list[AuditTypeRead]
    total: int
