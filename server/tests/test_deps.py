"""Unit tests for deps.py (password hashing, JWT tokens)."""

from datetime import timedelta

import jwt
import pytest

from src.config import settings
from src.deps import create_access_token, get_password_hash, verify_password


class TestPasswordHashing:
    def test_verify_correct_password(self):
        hashed = get_password_hash("mypassword")
        assert verify_password("mypassword", hashed) is True

    def test_verify_wrong_password(self):
        hashed = get_password_hash("mypassword")
        assert verify_password("wrongpassword", hashed) is False

    def test_different_hashes(self):
        hash1 = get_password_hash("mypassword")
        hash2 = get_password_hash("mypassword")
        assert hash1 != hash2  # salted hashes should differ

    def test_hash_is_string(self):
        hashed = get_password_hash("test")
        assert isinstance(hashed, str)
        assert len(hashed) > 0


class TestAccessToken:
    def test_create_and_decode(self):
        token = create_access_token(data={"sub": "testuser"})
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        assert payload["sub"] == "testuser"
        assert "exp" in payload

    def test_custom_expiry(self):
        token = create_access_token(
            data={"sub": "testuser"}, expires_delta=timedelta(minutes=5)
        )
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        assert payload["sub"] == "testuser"

    def test_expired_token(self):
        token = create_access_token(
            data={"sub": "testuser"}, expires_delta=timedelta(seconds=-1)
        )
        with pytest.raises(jwt.ExpiredSignatureError):
            jwt.decode(
                token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
            )

    def test_invalid_secret(self):
        token = create_access_token(data={"sub": "testuser"})
        with pytest.raises(jwt.InvalidSignatureError):
            jwt.decode(token, "wrong-secret", algorithms=[settings.ALGORITHM])
