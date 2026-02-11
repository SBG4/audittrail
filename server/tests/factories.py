"""Test data factories."""

import uuid
from datetime import date, time

from src.deps import get_password_hash
from src.models.audit_type import AuditType
from src.models.case import Case
from src.models.event import Event
from src.models.file_batch import FileBatch
from src.models.user import User

# Counter for case_number (since Identity() doesn't work with SQLite)
_case_counter = 0


def next_case_number() -> int:
    global _case_counter
    _case_counter += 1
    return _case_counter


def make_user(**overrides) -> User:
    defaults = {
        "id": uuid.uuid4(),
        "username": f"user_{uuid.uuid4().hex[:8]}",
        "hashed_password": get_password_hash("password123"),
        "full_name": "Test User",
        "is_active": True,
    }
    defaults.update(overrides)
    return User(**defaults)


def make_audit_type(**overrides) -> AuditType:
    slug = overrides.pop("slug", None) or f"test-type-{uuid.uuid4().hex[:8]}"
    defaults = {
        "id": uuid.uuid4(),
        "name": overrides.pop("name", None) or f"Test Audit Type {slug}",
        "slug": slug,
        "description": "A test audit type",
        "schema": {
            "type": "object",
            "properties": {
                "field1": {"type": "string", "title": "Field 1"},
                "field2": {"type": "string", "title": "Field 2"},
            },
            "required": ["field1"],
        },
        "is_active": True,
    }
    defaults.update(overrides)
    return AuditType(**defaults)


def make_case(audit_type_id: uuid.UUID, created_by_id: uuid.UUID, **overrides) -> Case:
    defaults = {
        "id": uuid.uuid4(),
        "case_number": next_case_number(),
        "title": "Test Case",
        "description": "A test case description",
        "audit_type_id": audit_type_id,
        "metadata_": {"field1": "value1"},
        "status": "open",
        "created_by_id": created_by_id,
    }
    defaults.update(overrides)
    return Case(**defaults)


def make_event(case_id: uuid.UUID, created_by_id: uuid.UUID, **overrides) -> Event:
    defaults = {
        "id": uuid.uuid4(),
        "case_id": case_id,
        "event_type": "note",
        "event_date": date(2025, 1, 15),
        "event_time": time(10, 30),
        "file_name": None,
        "file_count": None,
        "file_description": None,
        "file_type": None,
        "metadata_": {},
        "sort_order": 0,
        "created_by_id": created_by_id,
    }
    defaults.update(overrides)
    return Event(**defaults)


def make_file_batch(event_id: uuid.UUID, **overrides) -> FileBatch:
    defaults = {
        "id": uuid.uuid4(),
        "event_id": event_id,
        "label": "Test Batch",
        "file_count": 5,
        "description": "A test file batch",
        "file_types": "pdf, xlsx",
        "sort_order": 0,
    }
    defaults.update(overrides)
    return FileBatch(**defaults)
