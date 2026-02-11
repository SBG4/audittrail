"""Unit tests for Pydantic schemas."""

import uuid
from datetime import date, datetime, time, timezone

import pytest
from pydantic import ValidationError

from src.schemas.audit_type import AuditTypeCreate, AuditTypeRead
from src.schemas.case import CaseCreate, CaseRead, CaseUpdate
from src.schemas.event import EventCreate, EventRead, EventUpdate
from src.schemas.file_batch import FileBatchRead


class TestCaseRead:
    def test_validation_alias_metadata(self):
        now = datetime.now(timezone.utc)
        data = {
            "id": uuid.uuid4(),
            "case_number": 1,
            "title": "Test",
            "description": None,
            "audit_type_id": uuid.uuid4(),
            "metadata_": {"field1": "val"},
            "status": "open",
            "assigned_to_id": None,
            "created_by_id": uuid.uuid4(),
            "created_at": now,
            "updated_at": now,
        }
        case = CaseRead.model_validate(data)
        assert case.metadata == {"field1": "val"}

    def test_from_attributes(self):
        """CaseRead should support from_attributes mode."""
        assert CaseRead.model_config["from_attributes"] is True


class TestCaseCreate:
    def test_valid_case_create(self):
        data = {
            "title": "New Case",
            "audit_type_id": str(uuid.uuid4()),
            "metadata": {"key": "val"},
        }
        case = CaseCreate(**data)
        assert case.title == "New Case"

    def test_title_max_length(self):
        with pytest.raises(ValidationError):
            CaseCreate(
                title="x" * 201,
                audit_type_id=uuid.uuid4(),
            )

    def test_default_metadata(self):
        case = CaseCreate(title="T", audit_type_id=uuid.uuid4())
        assert case.metadata == {}


class TestCaseUpdate:
    def test_exclude_unset(self):
        update = CaseUpdate(title="New Title")
        dumped = update.model_dump(exclude_unset=True)
        assert "title" in dumped
        assert "status" not in dumped

    def test_all_none_by_default(self):
        update = CaseUpdate()
        dumped = update.model_dump(exclude_unset=True)
        assert dumped == {}


class TestAuditTypeRead:
    def test_alias_schema(self):
        now = datetime.now(timezone.utc)
        data = {
            "id": uuid.uuid4(),
            "name": "Test",
            "slug": "test",
            "description": None,
            "schema": {"type": "object", "properties": {}},
            "is_active": True,
            "created_at": now,
        }
        at = AuditTypeRead.model_validate(data)
        assert at.schema_ == {"type": "object", "properties": {}}


class TestAuditTypeCreate:
    def test_valid_schema(self):
        data = {
            "name": "Test",
            "slug": "test",
            "schema": {
                "type": "object",
                "properties": {"f": {"type": "string"}},
            },
        }
        at = AuditTypeCreate.model_validate(data)
        assert at.schema_["type"] == "object"

    def test_invalid_schema_no_object_type(self):
        with pytest.raises(ValidationError):
            AuditTypeCreate.model_validate({
                "name": "Test",
                "slug": "test",
                "schema": {"type": "array"},
            })

    def test_invalid_schema_no_properties(self):
        with pytest.raises(ValidationError):
            AuditTypeCreate.model_validate({
                "name": "Test",
                "slug": "test",
                "schema": {"type": "object"},
            })


class TestEventRead:
    def test_file_batches_default(self):
        now = datetime.now(timezone.utc)
        data = {
            "id": uuid.uuid4(),
            "case_id": uuid.uuid4(),
            "event_type": "note",
            "event_date": date(2025, 1, 15),
            "event_time": None,
            "file_name": None,
            "file_count": None,
            "file_description": None,
            "file_type": None,
            "metadata_": {},
            "sort_order": 0,
            "created_by_id": uuid.uuid4(),
            "created_at": now,
            "updated_at": now,
        }
        event = EventRead.model_validate(data)
        assert event.file_batches == []
        assert event.metadata == {}


class TestEventCreate:
    def test_defaults(self):
        event = EventCreate(event_date=date(2025, 1, 15))
        assert event.event_type == "note"
        assert event.metadata == {}
        assert event.file_name is None
