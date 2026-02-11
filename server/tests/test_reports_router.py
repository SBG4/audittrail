"""Integration tests for reports router."""

import uuid
from unittest.mock import AsyncMock, patch

import pytest

from tests.factories import make_audit_type, make_case, make_event


class TestGenerateReport:
    async def _setup_case_with_events(self, db_session, test_user):
        at = make_audit_type()
        db_session.add(at)
        await db_session.flush()
        case = make_case(at.id, test_user.id)
        db_session.add(case)
        await db_session.flush()
        event = make_event(case.id, test_user.id)
        db_session.add(event)
        await db_session.commit()
        return case

    async def test_generate_docx(self, authenticated_client, db_session, test_user):
        case = await self._setup_case_with_events(db_session, test_user)

        response = await authenticated_client.get(
            f"/cases/{case.id}/reports/generate?format=docx&mode=timeline"
        )
        assert response.status_code == 200
        assert "application/vnd.openxmlformats" in response.headers["content-type"]
        assert len(response.content) > 0

    async def test_generate_docx_narrative(self, authenticated_client, db_session, test_user):
        case = await self._setup_case_with_events(db_session, test_user)

        response = await authenticated_client.get(
            f"/cases/{case.id}/reports/generate?format=docx&mode=narrative"
        )
        assert response.status_code == 200
        assert len(response.content) > 0

    async def test_generate_pdf_mocked(self, authenticated_client, db_session, test_user):
        case = await self._setup_case_with_events(db_session, test_user)

        with patch(
            "src.routers.reports.generate_pdf",
            new_callable=AsyncMock,
            return_value=b"%PDF-fake-content",
        ):
            response = await authenticated_client.get(
                f"/cases/{case.id}/reports/generate?format=pdf&mode=timeline"
            )
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"

    async def test_invalid_format(self, authenticated_client, db_session, test_user):
        case = await self._setup_case_with_events(db_session, test_user)

        response = await authenticated_client.get(
            f"/cases/{case.id}/reports/generate?format=txt"
        )
        assert response.status_code == 422

    async def test_invalid_mode(self, authenticated_client, db_session, test_user):
        case = await self._setup_case_with_events(db_session, test_user)

        response = await authenticated_client.get(
            f"/cases/{case.id}/reports/generate?format=docx&mode=invalid"
        )
        assert response.status_code == 422


class TestHtmlReport:
    async def test_html_report(self, authenticated_client, db_session, test_user):
        at = make_audit_type()
        db_session.add(at)
        await db_session.flush()
        case = make_case(at.id, test_user.id)
        db_session.add(case)
        await db_session.flush()
        event = make_event(case.id, test_user.id)
        db_session.add(event)
        await db_session.commit()

        response = await authenticated_client.get(f"/cases/{case.id}/reports/html")
        assert response.status_code == 200
        assert "text/html" in response.headers["content-type"]
        assert len(response.content) > 0
