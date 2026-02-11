"""Integration tests for file batches router."""

import uuid

import pytest

from tests.factories import make_audit_type, make_case, make_event, make_file_batch


class TestCreateFileBatch:
    async def test_create_batch(self, authenticated_client, db_session, test_user):
        at = make_audit_type()
        db_session.add(at)
        await db_session.flush()
        case = make_case(at.id, test_user.id)
        db_session.add(case)
        await db_session.flush()
        event = make_event(case.id, test_user.id)
        db_session.add(event)
        await db_session.commit()

        response = await authenticated_client.post(
            f"/cases/{case.id}/events/{event.id}/batches/",
            json={
                "label": "Test Batch",
                "file_count": 10,
                "description": "Some files",
                "file_types": "pdf",
                "sort_order": 0,
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["label"] == "Test Batch"
        assert data["file_count"] == 10

    async def test_create_batch_nonexistent_event(self, authenticated_client, db_session, test_user):
        at = make_audit_type()
        db_session.add(at)
        await db_session.flush()
        case = make_case(at.id, test_user.id)
        db_session.add(case)
        await db_session.commit()

        response = await authenticated_client.post(
            f"/cases/{case.id}/events/{uuid.uuid4()}/batches/",
            json={
                "label": "Batch",
                "file_count": 1,
                "sort_order": 0,
            },
        )
        assert response.status_code == 404


class TestListFileBatches:
    async def test_list_batches(self, authenticated_client, db_session, test_user):
        at = make_audit_type()
        db_session.add(at)
        await db_session.flush()
        case = make_case(at.id, test_user.id)
        db_session.add(case)
        await db_session.flush()
        event = make_event(case.id, test_user.id)
        db_session.add(event)
        await db_session.flush()

        b1 = make_file_batch(event.id, label="Batch A", sort_order=0)
        b2 = make_file_batch(event.id, label="Batch B", sort_order=1)
        db_session.add_all([b1, b2])
        await db_session.commit()

        response = await authenticated_client.get(
            f"/cases/{case.id}/events/{event.id}/batches/"
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["sort_order"] <= data[1]["sort_order"]

    async def test_list_batches_empty(self, authenticated_client, db_session, test_user):
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
            f"/cases/{case.id}/events/{event.id}/batches/"
        )
        assert response.status_code == 200
        assert response.json() == []


class TestUpdateFileBatch:
    async def test_update_batch(self, authenticated_client, db_session, test_user):
        at = make_audit_type()
        db_session.add(at)
        await db_session.flush()
        case = make_case(at.id, test_user.id)
        db_session.add(case)
        await db_session.flush()
        event = make_event(case.id, test_user.id)
        db_session.add(event)
        await db_session.flush()
        batch = make_file_batch(event.id)
        db_session.add(batch)
        await db_session.commit()

        response = await authenticated_client.patch(
            f"/cases/{case.id}/events/{event.id}/batches/{batch.id}",
            json={"label": "Updated Label"},
        )
        assert response.status_code == 200
        assert response.json()["label"] == "Updated Label"

    async def test_update_nonexistent_batch(self, authenticated_client, db_session, test_user):
        at = make_audit_type()
        db_session.add(at)
        await db_session.flush()
        case = make_case(at.id, test_user.id)
        db_session.add(case)
        await db_session.flush()
        event = make_event(case.id, test_user.id)
        db_session.add(event)
        await db_session.commit()

        response = await authenticated_client.patch(
            f"/cases/{case.id}/events/{event.id}/batches/{uuid.uuid4()}",
            json={"label": "Nope"},
        )
        assert response.status_code == 404


class TestDeleteFileBatch:
    async def test_delete_batch(self, authenticated_client, db_session, test_user):
        at = make_audit_type()
        db_session.add(at)
        await db_session.flush()
        case = make_case(at.id, test_user.id)
        db_session.add(case)
        await db_session.flush()
        event = make_event(case.id, test_user.id)
        db_session.add(event)
        await db_session.flush()
        batch = make_file_batch(event.id)
        db_session.add(batch)
        await db_session.commit()

        response = await authenticated_client.delete(
            f"/cases/{case.id}/events/{event.id}/batches/{batch.id}"
        )
        assert response.status_code == 204

    async def test_delete_nonexistent_batch(self, authenticated_client, db_session, test_user):
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
            f"/cases/{case.id}/events/{event.id}/batches/{uuid.uuid4()}"
        )
        assert response.status_code == 404
