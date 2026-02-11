"""Integration tests for cases router."""

import uuid

import pytest

from tests.factories import make_audit_type, make_case


class TestCreateCase:
    async def test_create_case(self, authenticated_client, db_session, test_user):
        at = make_audit_type()
        db_session.add(at)
        await db_session.commit()

        response = await authenticated_client.post(
            "/cases/",
            json={
                "title": "New Case",
                "description": "Desc",
                "audit_type_id": str(at.id),
                "metadata": {"field1": "val1"},
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "New Case"
        assert data["status"] == "open"
        assert data["metadata"]["field1"] == "val1"

    async def test_create_case_invalid_audit_type(self, authenticated_client):
        response = await authenticated_client.post(
            "/cases/",
            json={
                "title": "New Case",
                "audit_type_id": str(uuid.uuid4()),
                "metadata": {},
            },
        )
        assert response.status_code == 404

    async def test_create_case_invalid_metadata(self, authenticated_client, db_session):
        at = make_audit_type()
        db_session.add(at)
        await db_session.commit()

        response = await authenticated_client.post(
            "/cases/",
            json={
                "title": "Bad Meta",
                "audit_type_id": str(at.id),
                "metadata": {"field1": 123},  # field1 should be string
            },
        )
        assert response.status_code == 422

    async def test_create_case_no_auth(self, async_client, db_session):
        at = make_audit_type()
        db_session.add(at)
        await db_session.commit()

        response = await async_client.post(
            "/cases/",
            json={
                "title": "Case",
                "audit_type_id": str(at.id),
                "metadata": {},
            },
        )
        assert response.status_code in (401, 403)


class TestListCases:
    async def test_list_empty(self, authenticated_client):
        response = await authenticated_client.get("/cases/")
        assert response.status_code == 200
        data = response.json()
        assert data["items"] == []
        assert data["total"] == 0

    async def test_list_multiple(self, authenticated_client, db_session, test_user):
        at = make_audit_type()
        db_session.add(at)
        await db_session.flush()

        c1 = make_case(at.id, test_user.id, title="Case 1")
        c2 = make_case(at.id, test_user.id, title="Case 2")
        db_session.add_all([c1, c2])
        await db_session.commit()

        response = await authenticated_client.get("/cases/")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2

    async def test_list_with_status_filter(self, authenticated_client, db_session, test_user):
        at = make_audit_type()
        db_session.add(at)
        await db_session.flush()

        c1 = make_case(at.id, test_user.id, status="open")
        c2 = make_case(at.id, test_user.id, status="active")
        db_session.add_all([c1, c2])
        await db_session.commit()

        response = await authenticated_client.get("/cases/?status=open")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["status"] == "open"

    async def test_list_with_search(self, authenticated_client, db_session, test_user):
        at = make_audit_type()
        db_session.add(at)
        await db_session.flush()

        c1 = make_case(at.id, test_user.id, title="Unique Search Term")
        c2 = make_case(at.id, test_user.id, title="Other Case")
        db_session.add_all([c1, c2])
        await db_session.commit()

        response = await authenticated_client.get("/cases/?search=Unique")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert "Unique" in data["items"][0]["title"]

    async def test_list_pagination(self, authenticated_client, db_session, test_user):
        at = make_audit_type()
        db_session.add(at)
        await db_session.flush()

        for i in range(5):
            db_session.add(make_case(at.id, test_user.id, title=f"Case {i}"))
        await db_session.commit()

        response = await authenticated_client.get("/cases/?offset=0&limit=2")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 5
        assert len(data["items"]) == 2
        assert data["limit"] == 2


class TestGetCase:
    async def test_get_case(self, authenticated_client, db_session, test_user):
        at = make_audit_type()
        db_session.add(at)
        await db_session.flush()

        case = make_case(at.id, test_user.id, title="Get Me")
        db_session.add(case)
        await db_session.commit()

        response = await authenticated_client.get(f"/cases/{case.id}")
        assert response.status_code == 200
        assert response.json()["title"] == "Get Me"

    async def test_get_nonexistent_case(self, authenticated_client):
        response = await authenticated_client.get(f"/cases/{uuid.uuid4()}")
        assert response.status_code == 404


class TestUpdateCase:
    async def test_update_title(self, authenticated_client, db_session, test_user):
        at = make_audit_type()
        db_session.add(at)
        await db_session.flush()

        case = make_case(at.id, test_user.id, title="Old Title")
        db_session.add(case)
        await db_session.commit()

        response = await authenticated_client.patch(
            f"/cases/{case.id}",
            json={"title": "New Title"},
        )
        assert response.status_code == 200
        assert response.json()["title"] == "New Title"

    async def test_update_status_valid(self, authenticated_client, db_session, test_user):
        at = make_audit_type()
        db_session.add(at)
        await db_session.flush()

        case = make_case(at.id, test_user.id, status="open")
        db_session.add(case)
        await db_session.commit()

        response = await authenticated_client.patch(
            f"/cases/{case.id}",
            json={"status": "active"},
        )
        assert response.status_code == 200
        assert response.json()["status"] == "active"

    async def test_update_status_invalid(self, authenticated_client, db_session, test_user):
        at = make_audit_type()
        db_session.add(at)
        await db_session.flush()

        case = make_case(at.id, test_user.id, status="open")
        db_session.add(case)
        await db_session.commit()

        response = await authenticated_client.patch(
            f"/cases/{case.id}",
            json={"status": "open"},  # open->open is invalid
        )
        assert response.status_code == 400

    async def test_update_metadata(self, authenticated_client, db_session, test_user):
        at = make_audit_type()
        db_session.add(at)
        await db_session.flush()

        case = make_case(at.id, test_user.id)
        db_session.add(case)
        await db_session.commit()

        response = await authenticated_client.patch(
            f"/cases/{case.id}",
            json={"metadata": {"field1": "updated"}},
        )
        assert response.status_code == 200
        assert response.json()["metadata"]["field1"] == "updated"

    async def test_update_nonexistent_case(self, authenticated_client):
        response = await authenticated_client.patch(
            f"/cases/{uuid.uuid4()}",
            json={"title": "X"},
        )
        assert response.status_code == 404


class TestDeleteCase:
    async def test_delete_case(self, authenticated_client, db_session, test_user):
        at = make_audit_type()
        db_session.add(at)
        await db_session.flush()

        case = make_case(at.id, test_user.id)
        db_session.add(case)
        await db_session.commit()

        response = await authenticated_client.delete(f"/cases/{case.id}")
        assert response.status_code == 204

        # Verify deleted
        response = await authenticated_client.get(f"/cases/{case.id}")
        assert response.status_code == 404

    async def test_delete_nonexistent_case(self, authenticated_client):
        response = await authenticated_client.delete(f"/cases/{uuid.uuid4()}")
        assert response.status_code == 404
