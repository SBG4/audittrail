"""Integration tests for auth router."""

import pytest

from tests.factories import make_user


class TestAuthLogin:
    async def test_login_valid_credentials(self, async_client, db_session):
        user = make_user(username="loginuser")
        db_session.add(user)
        await db_session.commit()

        response = await async_client.post(
            "/auth/login",
            data={"username": "loginuser", "password": "password123"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    async def test_login_wrong_password(self, async_client, db_session):
        user = make_user(username="loginuser2")
        db_session.add(user)
        await db_session.commit()

        response = await async_client.post(
            "/auth/login",
            data={"username": "loginuser2", "password": "wrongpass"},
        )
        assert response.status_code == 401

    async def test_login_nonexistent_user(self, async_client):
        response = await async_client.post(
            "/auth/login",
            data={"username": "nouser", "password": "pass"},
        )
        assert response.status_code == 401


class TestAuthMe:
    async def test_get_me(self, authenticated_client, test_user):
        response = await authenticated_client.get("/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == test_user.username
        assert data["full_name"] == test_user.full_name

    async def test_get_me_no_token(self, async_client):
        response = await async_client.get("/auth/me")
        assert response.status_code in (401, 403)
