"""Test configuration with async SQLite database."""

import itertools
import uuid
from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import JSON, event as sa_event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.dialects.postgresql import JSONB

from datetime import date, time, datetime

from src.database import Base
from src.deps import create_access_token, get_password_hash, get_db, get_current_user
from src.main import app
from src.models.case import Case
from src.models.event import Event
from src.models.user import User
from src.routers.auth import _login_attempts

# --- SQLite compatibility shims ---

# Map JSONB to JSON for SQLite
@compiles(JSONB, "sqlite")
def compile_jsonb_sqlite(type_, compiler, **kw):
    return "JSON"


# Auto-increment counter for case_number (Identity() doesn't work with SQLite)
_case_number_counter = itertools.count(1)


@sa_event.listens_for(Case, "init")
def _set_case_number_default(target, args, kwargs):
    """Auto-set case_number if not provided (SQLite compat for Identity())."""
    if target.case_number is None:
        target.case_number = next(_case_number_counter)


@sa_event.listens_for(Event.event_date, "set", retval=True)
def _coerce_event_date(target, value, oldvalue, initiator):
    """Coerce string dates to date objects for SQLite compat."""
    if isinstance(value, str):
        return date.fromisoformat(value)
    return value


@sa_event.listens_for(Event.event_time, "set", retval=True)
def _coerce_event_time(target, value, oldvalue, initiator):
    """Coerce string times to time objects for SQLite compat."""
    if isinstance(value, str):
        return time.fromisoformat(value)
    return value


# Create async SQLite engine (in-memory)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestSession = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


@pytest_asyncio.fixture(autouse=True)
async def setup_database():
    """Create all tables before each test, drop after."""
    _login_attempts.clear()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Provide a test database session."""
    async with TestSession() as session:
        yield session


@pytest_asyncio.fixture
async def test_user(db_session: AsyncSession) -> User:
    """Create a test user."""
    user = User(
        id=uuid.uuid4(),
        username="testuser",
        hashed_password=get_password_hash("testpass123"),
        full_name="Test User",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def async_client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """HTTP client that uses the test database session."""

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app, root_path="/api")
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def authenticated_client(
    db_session: AsyncSession, test_user: User
) -> AsyncGenerator[AsyncClient, None]:
    """HTTP client with auth token for the test user."""
    token = create_access_token(data={"sub": test_user.username})

    async def override_get_db():
        yield db_session

    async def override_get_current_user():
        return test_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user

    transport = ASGITransport(app=app, root_path="/api")
    async with AsyncClient(
        transport=transport,
        base_url="http://test",
        headers={"Authorization": f"Bearer {token}"},
    ) as client:
        yield client

    app.dependency_overrides.clear()
