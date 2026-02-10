"""Pydantic schemas for the data import flow."""

from typing import Any

from pydantic import BaseModel, Field


class ImportUploadResponse(BaseModel):
    """Response from file upload with parsed preview data."""

    session_id: str
    filename: str
    headers: list[str]
    row_count: int
    preview_rows: list[list[Any]] = Field(
        description="First 10 rows of parsed data"
    )


class ColumnMapping(BaseModel):
    """Column mapping submission from the user."""

    session_id: str
    mappings: dict[str, str] = Field(
        description="Mapping of spreadsheet column name to event field name"
    )


class ImportValidationRow(BaseModel):
    """Validation result for a single row."""

    row_number: int
    valid: bool
    errors: list[str]
    data: dict[str, Any]


class ImportValidationResponse(BaseModel):
    """Validation results for all rows after column mapping."""

    session_id: str
    total_rows: int
    valid_count: int
    error_count: int
    rows: list[ImportValidationRow]


class ImportConfirmRequest(BaseModel):
    """Request to confirm and execute the import."""

    session_id: str


class ImportConfirmResponse(BaseModel):
    """Response after confirming the import."""

    created_count: int
    error_count: int
    errors: list[str]
