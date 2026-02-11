"""Integration tests for users router."""

import pytest

from tests.factories import make_user


class TestListUsers:
    async def test_list_active_users(self, authenticated_client, db_session, test_user):
        # test_user is already created and active
        u2 = make_user(full_name="Alice Active", is_active=True)
        u3 = make_user(full_name="Bob Inactive", is_active=False)
        db_session.add_all([u2, u3])
        await db_session.commit()

        response = await authenticated_client.get("/users/")
        assert response.status_code == 200
        data = response.json()
        names = [u["full_name"] for u in data]
        assert "Alice Active" in names
        assert "Bob Inactive" not in names

    async def test_list_users_no_auth(self, async_client):
        response = await async_client.get("/users/")
        assert response.status_code in (401, 403)
