"""Unit tests for event validation logic."""

import pytest
from fastapi import HTTPException

from src.routers.events import VALID_EVENT_TYPES, _validate_event_type


class TestValidateEventType:
    def test_finding(self):
        _validate_event_type("finding")  # should not raise

    def test_action(self):
        _validate_event_type("action")

    def test_note(self):
        _validate_event_type("note")

    def test_invalid_type(self):
        with pytest.raises(HTTPException) as exc_info:
            _validate_event_type("invalid")
        assert exc_info.value.status_code == 422

    def test_valid_types_complete(self):
        assert VALID_EVENT_TYPES == {"finding", "action", "note"}
