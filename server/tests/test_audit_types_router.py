"""Integration tests for audit types router."""

import uuid

import pytest

from tests.factories import make_audit_type


class TestListAuditTypes:
    async def test_list_active(self, authenticated_client, db_session):
        at1 = make_audit_type(name="Type A", slug="type-a", is_active=True)
        at2 = make_audit_type(name="Type B", slug="type-b", is_active=True)
        at3 = make_audit_type(name="Type C", slug="type-c", is_active=False)
        db_session.add_all([at1, at2, at3])
        await db_session.commit()

        response = await authenticated_client.get("/audit-types/")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2
        names = [item["name"] for item in data["items"]]
        assert "Type A" in names
        assert "Type B" in names
        assert "Type C" not in names

    async def test_list_empty(self, authenticated_client):
        response = await authenticated_client.get("/audit-types/")
        assert response.status_code == 200
        assert response.json()["total"] == 0


class TestGetAuditType:
    async def test_get_by_id(self, authenticated_client, db_session):
        at = make_audit_type(name="Get Me", slug="get-me")
        db_session.add(at)
        await db_session.commit()

        response = await authenticated_client.get(f"/audit-types/{at.id}")
        assert response.status_code == 200
        assert response.json()["name"] == "Get Me"

    async def test_get_nonexistent(self, authenticated_client):
        response = await authenticated_client.get(f"/audit-types/{uuid.uuid4()}")
        assert response.status_code == 404
