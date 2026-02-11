"""Unit tests for case validation logic."""

import pytest
from fastapi import HTTPException

from src.routers.cases import (
    VALID_TRANSITIONS,
    validate_case_metadata,
    validate_status_transition,
)


class TestValidateStatusTransition:
    def test_open_to_active(self):
        validate_status_transition("open", "active")  # should not raise

    def test_open_to_closed(self):
        validate_status_transition("open", "closed")

    def test_active_to_closed(self):
        validate_status_transition("active", "closed")

    def test_closed_to_open(self):
        validate_status_transition("closed", "open")

    def test_open_to_open_invalid(self):
        with pytest.raises(HTTPException) as exc_info:
            validate_status_transition("open", "open")
        assert exc_info.value.status_code == 400

    def test_active_to_open_invalid(self):
        with pytest.raises(HTTPException) as exc_info:
            validate_status_transition("active", "open")
        assert exc_info.value.status_code == 400

    def test_closed_to_active_invalid(self):
        with pytest.raises(HTTPException) as exc_info:
            validate_status_transition("closed", "active")
        assert exc_info.value.status_code == 400

    def test_unknown_status(self):
        with pytest.raises(HTTPException) as exc_info:
            validate_status_transition("unknown", "open")
        assert exc_info.value.status_code == 400


class TestValidTransitions:
    def test_all_statuses_covered(self):
        assert set(VALID_TRANSITIONS.keys()) == {"open", "active", "closed"}

    def test_open_transitions(self):
        assert set(VALID_TRANSITIONS["open"]) == {"active", "closed"}

    def test_active_transitions(self):
        assert set(VALID_TRANSITIONS["active"]) == {"closed"}

    def test_closed_transitions(self):
        assert set(VALID_TRANSITIONS["closed"]) == {"open"}


class TestValidateCaseMetadata:
    def test_valid_metadata(self):
        schema = {
            "type": "object",
            "properties": {"field1": {"type": "string"}},
            "required": ["field1"],
        }
        validate_case_metadata({"field1": "value"}, schema)  # should not raise

    def test_missing_required_field(self):
        schema = {
            "type": "object",
            "properties": {"field1": {"type": "string"}},
            "required": ["field1"],
        }
        with pytest.raises(HTTPException) as exc_info:
            validate_case_metadata({}, schema)
        assert exc_info.value.status_code == 422

    def test_wrong_type(self):
        schema = {
            "type": "object",
            "properties": {"field1": {"type": "string"}},
        }
        with pytest.raises(HTTPException) as exc_info:
            validate_case_metadata({"field1": 123}, schema)
        assert exc_info.value.status_code == 422

    def test_extra_fields_allowed_by_default(self):
        schema = {
            "type": "object",
            "properties": {"field1": {"type": "string"}},
        }
        validate_case_metadata({"field1": "v", "extra": "ok"}, schema)
