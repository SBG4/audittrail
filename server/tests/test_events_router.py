"""Integration tests for events router."""

import uuid

import pytest

from tests.factories import make_audit_type, make_case, make_event


class TestCreateEvent:
    async def test_create_event(self, authenticated_client, db_session, test_user):
        at = make_audit_type()
        db_session.add(at)
        await db_session.flush()
        case = make_case(at.id, test_user.id)
        db_session.add(case)
        await db_session.commit()

        response = await authenticated_client.post(
            f"/cases/{case.id}/events/",
            json={
                "event_type": "finding",
                "event_date": "2025-01-15",
                "event_time": "10:30:00",
                "metadata": {},
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["event_type"] == "finding"
        assert data["event_date"] == "2025-01-15"
        assert data["sort_order"] == 0

    async def test_create_event_invalid_type(self, authenticated_client, db_session, test_user):
        at = make_audit_type()
        db_session.add(at)
        await db_session.flush()
        case = make_case(at.id, test_user.id)
        db_session.add(case)
        await db_session.commit()

        response = await authenticated_client.post(
            f"/cases/{case.id}/events/",
            json={
                "event_type": "invalid",
                "event_date": "2025-01-15",
                "metadata": {},
            },
        )
        assert response.status_code == 422

    async def test_create_event_nonexistent_case(self, authenticated_client):
        response = await authenticated_client.post(
            f"/cases/{uuid.uuid4()}/events/",
            json={
                "event_type": "note",
                "event_date": "2025-01-15",
                "metadata": {},
            },
        )
        assert response.status_code == 404


class TestListEvents:
    async def test_list_events(self, authenticated_client, db_session, test_user):
        at = make_audit_type()
        db_session.add(at)
        await db_session.flush()
        case = make_case(at.id, test_user.id)
        db_session.add(case)
        await db_session.flush()

        from datetime import date

        e1 = make_event(case.id, test_user.id, event_date=date(2025, 1, 10), sort_order=0)
        e2 = make_event(case.id, test_user.id, event_date=date(2025, 1, 20), sort_order=1)
        db_session.add_all([e1, e2])
        await db_session.commit()

        response = await authenticated_client.get(f"/cases/{case.id}/events/")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2
        # Should be sorted chronologically
        assert data["items"][0]["event_date"] == "2025-01-10"
        assert data["items"][1]["event_date"] == "2025-01-20"


class TestGetEvent:
    async def test_get_event(self, authenticated_client, db_session, test_user):
        at = make_audit_type()
        db_session.add(at)
        await db_session.flush()
        case = make_case(at.id, test_user.id)
        db_session.add(case)
        await db_session.flush()

        event = make_event(case.id, test_user.id)
        db_session.add(event)
        await db_session.commit()

        response = await authenticated_client.get(
            f"/cases/{case.id}/events/{event.id}"
        )
        assert response.status_code == 200
        assert response.json()["id"] == str(event.id)

    async def test_get_event_not_found(self, authenticated_client, db_session, test_user):
        at = make_audit_type()
        db_session.add(at)
        await db_session.flush()
        case = make_case(at.id, test_user.id)
        db_session.add(case)
        await db_session.commit()

        response = await authenticated_client.get(
            f"/cases/{case.id}/events/{uuid.uuid4()}"
        )
        assert response.status_code == 404


class TestUpdateEvent:
    async def test_update_event(self, authenticated_client, db_session, test_user):
        at = make_audit_type()
        db_session.add(at)
        await db_session.flush()
        case = make_case(at.id, test_user.id)
        db_session.add(case)
        await db_session.flush()

        event = make_event(case.id, test_user.id, event_type="note")
        db_session.add(event)
        await db_session.commit()

        response = await authenticated_client.patch(
            f"/cases/{case.id}/events/{event.id}",
            json={"event_type": "finding"},
        )
        assert response.status_code == 200
        assert response.json()["event_type"] == "finding"


class TestDeleteEvent:
    async def test_delete_event(self, authenticated_client, db_session, test_user):
        at = make_audit_type()
        db_session.add(at)
        await db_session.flush()
        case = make_case(at.id, test_user.id)
        db_session.add(case)
        await db_session.flush()

        event = make_event(case.id, test_user.id)
        db_session.add(event)
        await db_session.commit()

        response = await authenticated_client.delete(
            f"/cases/{case.id}/events/{event.id}"
        )
        assert response.status_code == 204

    async def test_delete_event_not_found(self, authenticated_client, db_session, test_user):
        at = make_audit_type()
        db_session.add(at)
        await db_session.flush()
        case = make_case(at.id, test_user.id)
        db_session.add(case)
        await db_session.commit()

        response = await authenticated_client.delete(
            f"/cases/{case.id}/events/{uuid.uuid4()}"
        )
        assert response.status_code == 404


class TestSortOrderAutoIncrement:
    async def test_sort_order_increments(self, authenticated_client, db_session, test_user):
        at = make_audit_type()
        db_session.add(at)
        await db_session.flush()
        case = make_case(at.id, test_user.id)
        db_session.add(case)
        await db_session.commit()

        r1 = await authenticated_client.post(
            f"/cases/{case.id}/events/",
            json={"event_type": "note", "event_date": "2025-01-15", "metadata": {}},
        )
        assert r1.status_code == 201
        assert r1.json()["sort_order"] == 0

        r2 = await authenticated_client.post(
            f"/cases/{case.id}/events/",
            json={"event_type": "note", "event_date": "2025-01-16", "metadata": {}},
        )
        assert r2.status_code == 201
        assert r2.json()["sort_order"] == 1
