"""Integration tests for imports router."""

import io
import uuid

import openpyxl
import pytest

from tests.factories import make_audit_type, make_case


def _make_csv_bytes(content: str) -> bytes:
    return content.encode("utf-8")


def _make_xlsx_bytes(rows: list[list]) -> bytes:
    wb = openpyxl.Workbook()
    ws = wb.active
    for row in rows:
        ws.append(row)
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


class TestUploadFile:
    async def test_upload_csv(self, authenticated_client, db_session, test_user):
        at = make_audit_type()
        db_session.add(at)
        await db_session.flush()
        case = make_case(at.id, test_user.id)
        db_session.add(case)
        await db_session.commit()

        csv_data = _make_csv_bytes("event_date,event_type\n2025-01-15,finding\n2025-01-16,note")
        response = await authenticated_client.post(
            f"/cases/{case.id}/imports/upload",
            files={"file": ("test.csv", csv_data, "text/csv")},
        )
        assert response.status_code == 200
        data = response.json()
        assert "session_id" in data
        assert data["headers"] == ["event_date", "event_type"]
        assert data["row_count"] == 2

    async def test_upload_xlsx(self, authenticated_client, db_session, test_user):
        at = make_audit_type()
        db_session.add(at)
        await db_session.flush()
        case = make_case(at.id, test_user.id)
        db_session.add(case)
        await db_session.commit()

        xlsx_data = _make_xlsx_bytes([
            ["event_date", "event_type"],
            ["2025-01-15", "finding"],
        ])
        response = await authenticated_client.post(
            f"/cases/{case.id}/imports/upload",
            files={"file": ("test.xlsx", xlsx_data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["row_count"] == 1

    async def test_upload_invalid_type(self, authenticated_client, db_session, test_user):
        at = make_audit_type()
        db_session.add(at)
        await db_session.flush()
        case = make_case(at.id, test_user.id)
        db_session.add(case)
        await db_session.commit()

        response = await authenticated_client.post(
            f"/cases/{case.id}/imports/upload",
            files={"file": ("test.json", b"{}", "application/json")},
        )
        assert response.status_code == 400


class TestValidateMapping:
    async def _upload_csv(self, client, case_id: uuid.UUID) -> str:
        csv_data = _make_csv_bytes("Date,Type\n2025-01-15,finding\n2025-01-16,note")
        resp = await client.post(
            f"/cases/{case_id}/imports/upload",
            files={"file": ("test.csv", csv_data, "text/csv")},
        )
        return resp.json()["session_id"]

    async def test_validate_mappings(self, authenticated_client, db_session, test_user):
        at = make_audit_type()
        db_session.add(at)
        await db_session.flush()
        case = make_case(at.id, test_user.id)
        db_session.add(case)
        await db_session.commit()

        session_id = await self._upload_csv(authenticated_client, case.id)

        response = await authenticated_client.post(
            f"/cases/{case.id}/imports/validate",
            json={
                "session_id": session_id,
                "mappings": {"Date": "event_date", "Type": "event_type"},
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["valid_count"] == 2
        assert data["error_count"] == 0

    async def test_validate_missing_event_date(self, authenticated_client, db_session, test_user):
        at = make_audit_type()
        db_session.add(at)
        await db_session.flush()
        case = make_case(at.id, test_user.id)
        db_session.add(case)
        await db_session.commit()

        session_id = await self._upload_csv(authenticated_client, case.id)

        response = await authenticated_client.post(
            f"/cases/{case.id}/imports/validate",
            json={
                "session_id": session_id,
                "mappings": {"Type": "event_type"},
            },
        )
        assert response.status_code == 422


class TestConfirmImport:
    async def test_confirm_creates_events(self, authenticated_client, db_session, test_user):
        at = make_audit_type()
        db_session.add(at)
        await db_session.flush()
        case = make_case(at.id, test_user.id)
        db_session.add(case)
        await db_session.commit()

        csv_data = _make_csv_bytes("Date,Type\n2025-01-15,finding\n2025-01-16,note")
        upload_resp = await authenticated_client.post(
            f"/cases/{case.id}/imports/upload",
            files={"file": ("test.csv", csv_data, "text/csv")},
        )
        session_id = upload_resp.json()["session_id"]

        # Validate
        await authenticated_client.post(
            f"/cases/{case.id}/imports/validate",
            json={
                "session_id": session_id,
                "mappings": {"Date": "event_date", "Type": "event_type"},
            },
        )

        # Confirm
        response = await authenticated_client.post(
            f"/cases/{case.id}/imports/confirm",
            json={"session_id": session_id},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["created_count"] == 2
        assert data["error_count"] == 0

        # Verify events exist
        events_resp = await authenticated_client.get(f"/cases/{case.id}/events/")
        assert events_resp.json()["total"] == 2

    async def test_confirm_without_validate(self, authenticated_client, db_session, test_user):
        at = make_audit_type()
        db_session.add(at)
        await db_session.flush()
        case = make_case(at.id, test_user.id)
        db_session.add(case)
        await db_session.commit()

        csv_data = _make_csv_bytes("Date\n2025-01-15")
        upload_resp = await authenticated_client.post(
            f"/cases/{case.id}/imports/upload",
            files={"file": ("test.csv", csv_data, "text/csv")},
        )
        session_id = upload_resp.json()["session_id"]

        response = await authenticated_client.post(
            f"/cases/{case.id}/imports/confirm",
            json={"session_id": session_id},
        )
        assert response.status_code == 400

    async def test_confirm_invalid_session(self, authenticated_client, db_session, test_user):
        at = make_audit_type()
        db_session.add(at)
        await db_session.flush()
        case = make_case(at.id, test_user.id)
        db_session.add(case)
        await db_session.commit()

        response = await authenticated_client.post(
            f"/cases/{case.id}/imports/confirm",
            json={"session_id": "nonexistent"},
        )
        assert response.status_code == 404
