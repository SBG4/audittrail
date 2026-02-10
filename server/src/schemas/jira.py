import uuid

from pydantic import BaseModel, ConfigDict


class JiraScrapeRequest(BaseModel):
    url: str
    timeout_ms: int = 15000


class JiraScrapeResponse(BaseModel):
    url: str
    fields: dict[str, str]
    raw_fields: dict[str, str]
    error: str | None = None
    success: bool


class JiraFieldMappingRead(BaseModel):
    id: uuid.UUID
    audit_type_id: uuid.UUID
    jira_field_name: str
    case_metadata_key: str

    model_config = ConfigDict(from_attributes=True)


class JiraFieldMappingCreate(BaseModel):
    jira_field_name: str
    case_metadata_key: str


class JiraFieldMappingBulkUpdate(BaseModel):
    mappings: list[JiraFieldMappingCreate]
