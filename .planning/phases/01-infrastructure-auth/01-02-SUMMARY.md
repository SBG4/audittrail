---
phase: 01-infrastructure-auth
plan: 02
subsystem: auth
tags: [sqlalchemy, asyncpg, alembic, pyjwt, pwdlib, argon2, fastapi, jwt, postgresql]

# Dependency graph
requires:
  - phase: 01-01
    provides: "FastAPI app scaffold, Pydantic config with DATABASE_URL/SECRET_KEY, Docker Compose stack, entrypoint.sh"
provides:
  - Async SQLAlchemy engine and session factory
  - User model with UUID, username, hashed_password, full_name, is_active
  - Alembic migrations with sync psycopg2 driver
  - Initial migration creating users table
  - JWT authentication (PyJWT) with OAuth2 password flow
  - Password hashing with pwdlib/argon2
  - Auth endpoints: POST /auth/login, GET /auth/me
  - FastAPI dependencies: get_db, get_current_user
  - Default admin user seed script
affects: [01-03, 01-04, all subsequent phases requiring auth]

# Tech tracking
tech-stack:
  added: []
  patterns: [sqlalchemy-2.0-async-session, alembic-sync-driver-for-migrations, pyjwt-encode-decode, pwdlib-argon2-hashing, oauth2-password-bearer-flow, fastapi-depends-injection]

key-files:
  created:
    - server/src/database.py
    - server/src/models/__init__.py
    - server/src/models/user.py
    - server/src/schemas/__init__.py
    - server/src/schemas/auth.py
    - server/src/schemas/user.py
    - server/src/routers/__init__.py
    - server/src/routers/auth.py
    - server/src/deps.py
    - server/src/scripts/__init__.py
    - server/src/scripts/seed.py
    - server/alembic.ini
    - server/alembic/env.py
    - server/alembic/script.py.mako
    - server/alembic/versions/001_create_users_table.py
  modified:
    - server/src/main.py

key-decisions:
  - "Alembic uses sync psycopg2 driver (DATABASE_URL_SYNC) to avoid async complexity in env.py"
  - "Manual migration file instead of autogenerate (no DB running in dev environment)"
  - "tokenUrl set to /api/auth/login to match Nginx proxy path for Swagger UI"
  - "Default access token expiry from settings (480min/8hr workday)"

patterns-established:
  - "SQLAlchemy 2.0 async pattern: create_async_engine + async_sessionmaker with expire_on_commit=False"
  - "Alembic env.py overrides sqlalchemy.url from Pydantic settings at runtime"
  - "FastAPI Depends chain: get_db -> get_current_user for protected endpoints"
  - "OAuth2PasswordBearer + PyJWT for stateless JWT auth"
  - "pwdlib PasswordHash.recommended() for Argon2 password hashing"
  - "Seed script uses async_session directly, runnable as python -m src.scripts.seed"

# Metrics
duration: 3min
completed: 2026-02-10
---

# Phase 1 Plan 2: Auth Backend Summary

**Async SQLAlchemy database layer with User model, Alembic migrations, and JWT auth endpoints using PyJWT + pwdlib/argon2**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-10T16:39:18Z
- **Completed:** 2026-02-10T16:41:57Z
- **Tasks:** 2
- **Files modified:** 16 created, 1 modified

## Accomplishments
- Async SQLAlchemy engine with session factory, User model with UUID primary key and all required fields
- Alembic initialized with sync psycopg2 driver, env.py configured to import Base.metadata and read URL from settings
- JWT authentication: login endpoint accepts OAuth2 password form, returns JWT; /me endpoint validates JWT and returns user info
- Password hashing with pwdlib/argon2 (verify roundtrip tested)
- Default admin user seed script (admin/changeme) for first startup

## Task Commits

Each task was committed atomically:

1. **Task 1: Database layer, User model, and Alembic migrations** - `810142e` (feat)
2. **Task 2: JWT auth endpoints, dependencies, seed script, and route registration** - `a201f01` (feat)

## Files Created/Modified
- `server/src/database.py` - Async SQLAlchemy engine, session factory, DeclarativeBase
- `server/src/models/__init__.py` - Model registry importing User
- `server/src/models/user.py` - User model with UUID, username, hashed_password, full_name, is_active
- `server/src/schemas/auth.py` - Token and TokenData Pydantic schemas
- `server/src/schemas/user.py` - UserRead Pydantic schema with from_attributes
- `server/src/routers/auth.py` - POST /auth/login and GET /auth/me endpoints
- `server/src/deps.py` - get_db, verify_password, get_password_hash, create_access_token, get_current_user
- `server/src/scripts/seed.py` - Default admin user seeder
- `server/src/main.py` - Added auth router registration
- `server/alembic.ini` - Alembic config with sync psycopg2 URL
- `server/alembic/env.py` - Imports Base.metadata, overrides URL from settings
- `server/alembic/script.py.mako` - Migration template (default)
- `server/alembic/versions/001_create_users_table.py` - Initial migration creating users table with indexes

## Decisions Made
- **Alembic sync driver:** Used psycopg2 (sync) for Alembic migrations instead of async env.py pattern. Simpler and avoids async complexity. The app uses asyncpg at runtime.
- **Manual migration file:** Created migration manually since no database is running in the dev environment. Migration file matches the User model columns exactly.
- **tokenUrl includes /api prefix:** Set `tokenUrl="/api/auth/login"` in OAuth2PasswordBearer because the Swagger UI client makes requests through Nginx which routes /api/* to FastAPI.
- **Default token expiry from settings:** Uses `settings.ACCESS_TOKEN_EXPIRE_MINUTES` (480 min / 8 hours) as the default, rather than hardcoding.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- **Docker not available:** Cannot run the full integration verification (docker compose up, curl tests) since Docker Desktop is not installed on this machine. All code-level verifications passed: imports, password hashing roundtrip, JWT encode/decode, route registration. Docker verification should be performed when Docker is available.
- **PyJWT InsecureKeyLengthWarning:** PyJWT warns that the dev default SECRET_KEY ("change-me-in-production") is too short for HS256. This is expected in development -- production deployments must set a proper SECRET_KEY via environment variable.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Auth backend fully implemented and import-verified
- All routes registered: POST /auth/login, GET /auth/me, GET /health
- Password hashing and JWT token flow verified with unit-style checks
- Ready for Plan 01-03 (React frontend with auth UI) to consume these endpoints
- **Docker verification pending:** Full integration test (docker compose up + curl) needs Docker Desktop

## Self-Check: PASSED

- All 16 created/modified files verified present
- All 2 task commit hashes verified in git log (810142e, a201f01)

---
*Phase: 01-infrastructure-auth*
*Completed: 2026-02-10*
