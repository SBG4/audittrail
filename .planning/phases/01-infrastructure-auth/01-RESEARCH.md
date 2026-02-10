# Phase 1: Infrastructure & Auth - Research

**Researched:** 2026-02-10
**Domain:** Docker Compose deployment, FastAPI backend skeleton, PostgreSQL setup, JWT authentication, React SPA scaffold
**Confidence:** HIGH

## Summary

Phase 1 stands up the foundational infrastructure: a Docker Compose stack with FastAPI, PostgreSQL, and Nginx, wired together with named volumes for persistence, Alembic for schema migrations, JWT authentication for login/logout, and a React SPA skeleton with routing and auth guards. This is an extremely well-trodden path -- every component has mature documentation and verified library support as of February 2026.

The most impactful finding during research is that **FastAPI's official documentation now recommends `PyJWT` + `pwdlib[argon2]`** instead of the previously recommended `python-jose` + `passlib[bcrypt]`. The STACK.md from project-level research listed `passlib + python-jose`, but those libraries are effectively abandoned (python-jose last released in 2021, passlib is unmaintained). The official FastAPI tutorial was updated in 2024 to use PyJWT and pwdlib. This research corrects that recommendation.

The second key finding is the airgap verification gate: Docker Compose supports `network_mode: "none"` per-service, but a more practical approach for Phase 1 is to verify the built images work with `docker run --network none` as a post-build smoke test, since inter-container networking (app to db) requires a shared Docker network at runtime. The `--network none` gate applies to the Dockerfile `RUN` steps and the final runtime test (no outbound internet), not to the compose network between services.

**Primary recommendation:** Stand up a three-service Docker Compose stack (FastAPI + PostgreSQL + Nginx), wire Alembic migrations to run on container startup, implement JWT auth following FastAPI's current official tutorial (PyJWT + pwdlib), scaffold the React SPA with Vite + React Router 7, and verify data persistence and airgap compliance before writing any feature code.

## Standard Stack

### Core (Phase 1 Specific)

| Library | Version | Purpose | Why Standard | Confidence |
|---------|---------|---------|--------------|------------|
| FastAPI | 0.115+ | REST API framework | Official Python async API framework. Pydantic-native. | HIGH |
| Uvicorn | 0.40.0 | ASGI server | FastAPI's recommended production server | HIGH |
| SQLAlchemy | 2.0.46 | ORM + async DB access | Industry standard Python ORM. v2.0 async support via asyncpg. | HIGH |
| asyncpg | 0.30+ | Async PostgreSQL driver | Fastest async PG driver for Python. Required by SQLAlchemy async. | HIGH |
| Alembic | 1.18.3 | Database migrations | Only serious migration tool for SQLAlchemy. Auto-generates from models. | HIGH |
| PyJWT | 2.11.0 | JWT token encode/decode | **Replaces python-jose.** Actively maintained. FastAPI official docs use this. | HIGH |
| pwdlib[argon2] | latest | Password hashing | **Replaces passlib[bcrypt].** Modern, maintained. FastAPI official docs use this. Argon2 is the recommended algorithm. | HIGH |
| Pydantic | 2.12+ | Data validation/schemas | Built into FastAPI. Required for request/response models. | HIGH |
| PostgreSQL | 17 | Database | Project requirement. Current stable. JSONB, full-text search. | HIGH |
| Nginx | 1.27+ | Reverse proxy | Serves React SPA static files, proxies `/api/*` to FastAPI | HIGH |
| Docker Compose | v2 | Container orchestration | Project requirement. Multi-service deployment. | HIGH |
| uv | 0.10+ | Python package manager | 10-100x faster than pip. Lockfile-based. Used in Dockerfile. | HIGH |
| Vite | 7.x | Frontend build tool | Standard React build tool. Fast HMR, native ESM. | HIGH |
| React | 19.x | Frontend UI framework | Project stack decision | HIGH |
| TypeScript | 5.7+ | Frontend language | Project stack decision | HIGH |
| React Router | 7.x | SPA routing | Simplified imports in v7. Library mode for SPA. | HIGH |
| pnpm | 9.x | Node package manager | Strict deps, faster installs than npm. Offline-capable with `pnpm fetch`. | HIGH |

### Supporting (Phase 1 Specific)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| python-multipart | latest | Form data parsing | Required by FastAPI's OAuth2PasswordRequestForm for login endpoint |
| Tailwind CSS | 4.x | Utility CSS | Login page styling, layout shell |
| shadcn/ui | latest | UI components | Login form, layout components, navigation |
| Zustand | 5.x | Client state | Auth state (isAuthenticated, user info) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| PyJWT | python-jose | python-jose abandoned since 2021. FastAPI docs moved away from it. No reason to use. |
| pwdlib[argon2] | passlib[bcrypt] | passlib unmaintained. pwdlib is its modern successor. Argon2 is stronger than bcrypt. |
| Nginx | FastAPI serving static files directly | Nginx is more efficient for static files and provides clean separation. For 2-5 users either works, but Nginx is standard practice. |
| asyncpg | psycopg (async) | asyncpg is faster. psycopg3 async is viable but has less community usage with SQLAlchemy. |
| uv | pip | pip works but is 10-100x slower and lacks lockfile support. uv is the current standard for Dockerized Python. |

**Installation (Backend):**
```bash
uv init server
cd server
uv add fastapi "uvicorn[standard]" "sqlalchemy[asyncio]" asyncpg alembic pydantic
uv add pyjwt "pwdlib[argon2]" python-multipart
uv add --dev pytest pytest-asyncio httpx ruff
```

**Installation (Frontend):**
```bash
pnpm create vite client --template react-ts
cd client
pnpm add react-router zustand
pnpm add tailwindcss @tailwindcss/vite
pnpm add -D vitest
# Then: npx shadcn@latest init
```

## Architecture Patterns

### Recommended Project Structure (Phase 1 Scope)

```
audittrail/
├── docker-compose.yml
├── docker-compose.override.yml    # Dev overrides (hot reload, exposed ports)
├── .env.example                   # Template for environment variables
├── nginx/
│   ├── nginx.conf                 # Reverse proxy config
│   └── Dockerfile
├── server/
│   ├── pyproject.toml
│   ├── uv.lock
│   ├── alembic.ini
│   ├── alembic/
│   │   ├── env.py                 # Async migration environment
│   │   ├── script.py.mako         # Migration template
│   │   └── versions/              # Migration files
│   ├── src/
│   │   ├── __init__.py
│   │   ├── main.py                # FastAPI app entry point
│   │   ├── config.py              # Settings from env vars (Pydantic BaseSettings)
│   │   ├── database.py            # Async engine, session factory, Base model
│   │   ├── deps.py                # FastAPI dependencies (get_db, get_current_user)
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   └── user.py            # User SQLAlchemy model
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py            # Token, Login request/response schemas
│   │   │   └── user.py            # User Pydantic schemas
│   │   └── routers/
│   │       ├── __init__.py
│   │       └── auth.py            # /api/auth/login, /api/auth/logout, /api/auth/me
│   ├── scripts/
│   │   ├── entrypoint.sh          # Run migrations then start uvicorn
│   │   └── seed.py                # Seed default admin user
│   ├── tests/
│   │   └── test_auth.py
│   └── Dockerfile
├── client/
│   ├── package.json
│   ├── pnpm-lock.yaml
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── index.html
│   ├── src/
│   │   ├── main.tsx               # React entry point
│   │   ├── App.tsx                # Router setup
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   └── DashboardPage.tsx  # Placeholder (proves auth works)
│   │   ├── components/
│   │   │   ├── AuthGuard.tsx      # Protected route wrapper
│   │   │   └── Layout.tsx         # App shell (header, nav, content area)
│   │   ├── hooks/
│   │   │   └── useAuth.ts         # Auth state management
│   │   ├── lib/
│   │   │   └── api.ts             # Fetch wrapper with JWT interceptor
│   │   └── stores/
│   │       └── authStore.ts       # Zustand auth store
│   └── Dockerfile
└── scripts/
    └── verify-airgap.sh           # Post-build airgap verification test
```

### Pattern 1: Docker Compose Service Topology

**What:** Three services -- `api` (FastAPI), `db` (PostgreSQL), `nginx` (reverse proxy) -- on a shared Docker network. Nginx faces the host, proxying requests to the API and serving the built SPA.

**Configuration:**
```yaml
# docker-compose.yml
services:
  db:
    image: postgres:17-slim
    environment:
      POSTGRES_DB: audittrail
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d audittrail"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  api:
    build:
      context: ./server
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgresql+asyncpg://${DB_USER}:${DB_PASSWORD}@db:5432/audittrail
      SECRET_KEY: ${SECRET_KEY}
      ALGORITHM: HS256
      ACCESS_TOKEN_EXPIRE_MINUTES: 480
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  nginx:
    build:
      context: ./nginx
      dockerfile: Dockerfile
    ports:
      - "${APP_PORT:-80}:80"
    depends_on:
      - api
    restart: unless-stopped

volumes:
  postgres_data:
```

### Pattern 2: FastAPI Async Database Session Dependency

**What:** Use SQLAlchemy 2.0 async engine with asyncpg driver. Create a session factory and inject sessions via FastAPI's dependency system. Sessions are scoped per-request.

**Key decisions:**
- `expire_on_commit=False` -- prevents lazy-load SQL after commit in async context
- `autoflush=False` -- explicit control over when writes happen
- Pool size of 5 is sufficient for 2-5 users

**Source:** [SQLAlchemy 2.0 async docs](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html)

```python
# server/src/database.py
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=5,
    max_overflow=5,
    echo=False,
)

async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)

class Base(DeclarativeBase):
    pass

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        yield session
```

### Pattern 3: JWT Auth Flow (FastAPI Official Pattern)

**What:** OAuth2 password flow with JWT bearer tokens. User posts credentials to `/api/auth/login`, receives a JWT. Token stored in localStorage (simple for internal tool). Token sent as `Authorization: Bearer <token>` header on subsequent requests.

**Source:** [FastAPI official JWT tutorial](https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/)

**Key decisions:**
- Use `PyJWT` (not python-jose) -- per FastAPI's current official docs
- Use `pwdlib[argon2]` (not passlib[bcrypt]) -- per FastAPI's current official docs
- Token expiry: 8 hours (480 min) for internal audit tool -- long enough for a workday
- No refresh tokens needed for 2-5 user internal tool
- Store token in `localStorage` (acceptable for airgapped internal tool)

### Pattern 4: Nginx SPA + API Reverse Proxy

**What:** Nginx serves the built React SPA as static files. All requests to `/api/*` are proxied to the FastAPI container. All other requests fall through to `index.html` for client-side routing.

**Configuration:**
```nginx
# nginx/nginx.conf
server {
    listen 80;
    server_name _;

    # Serve React SPA
    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to FastAPI
    location /api/ {
        proxy_pass http://api:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Pattern 5: Alembic Migrations on Container Startup

**What:** The API container runs `alembic upgrade head` before starting Uvicorn. This ensures the database schema is always current when the container starts, including after an image upgrade.

**Implementation:** Shell entrypoint script.

```bash
#!/bin/sh
# server/scripts/entrypoint.sh
set -e

echo "Running database migrations..."
alembic upgrade head

echo "Seeding default data..."
python -m src.scripts.seed

echo "Starting application..."
exec uvicorn src.main:app --host 0.0.0.0 --port 8000 --proxy-headers
```

### Pattern 6: React Auth Guard

**What:** A wrapper component that checks auth state and redirects unauthenticated users to `/login`. Uses Zustand for auth state and React Router's `Navigate` for redirection.

**Implementation approach:**
```tsx
// Conceptual pattern (not verbatim implementation)
function AuthGuard({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
```

### Anti-Patterns to Avoid

- **Storing JWT in cookies with httpOnly for this project:** Adds CSRF complexity. For an airgapped internal tool with 2-5 users, localStorage is simpler and sufficient. The threat model does not include XSS from untrusted third-party scripts.
- **Using `docker compose down -v` in documentation/scripts:** The `-v` flag deletes named volumes. Never include it in operator instructions.
- **Mounting PostgreSQL volume at `/var/lib/postgresql`:** Must be `/var/lib/postgresql/data`. See Pitfalls section.
- **Running Alembic migrations in FastAPI startup event:** Use entrypoint script instead. Startup events run after the ASGI server binds, meaning the app may serve requests before migrations complete.
- **Using `passlib` or `python-jose`:** Both are effectively unmaintained. Use `pwdlib` and `PyJWT` respectively.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password hashing | Custom hash function or raw bcrypt | `pwdlib[argon2]` | Argon2 is the current recommended algorithm. pwdlib handles salt, timing-safe comparison, and algorithm upgrades. |
| JWT encoding/decoding | Manual base64 + HMAC | `PyJWT` | Handles expiry validation, algorithm verification, claim parsing. Edge cases in JWT spec are subtle. |
| Database migrations | Raw SQL ALTER TABLE scripts | `Alembic` with autogenerate | Tracks migration state, supports rollback, auto-detects model changes. |
| Request validation | Manual dict checking | `Pydantic` models (via FastAPI) | Type coercion, nested validation, automatic OpenAPI docs. |
| SPA routing fallback | Custom nginx try_files logic | Standard `try_files $uri $uri/ /index.html` | This is the canonical nginx SPA pattern. Any deviation breaks client-side routing. |
| Docker health checks | Custom TCP ping scripts | `pg_isready` for PostgreSQL | Built into PostgreSQL image. Checks actual database readiness, not just port availability. |
| Auth state management | React Context with manual persistence | `Zustand` with localStorage middleware | Zustand persists across page refreshes. Context requires custom serialization. |

**Key insight:** Phase 1 is entirely glue code connecting well-established tools. There is zero need for custom solutions. Every component has a standard, documented pattern.

## Common Pitfalls

### Pitfall 1: PostgreSQL Volume Mount Path

**What goes wrong:** Mounting the volume at `/var/lib/postgresql` instead of `/var/lib/postgresql/data` creates an anonymous volume. Data disappears on `docker compose down && up`.
**Why it happens:** Subtle path difference. Many copy-pasted examples get it wrong.
**How to avoid:** Always mount at `/var/lib/postgresql/data` with a named volume. Test the `down/up` cycle as part of Phase 1 acceptance.
**Warning signs:** Data lost after `docker compose down`. Volume listed as anonymous in `docker volume ls`.

### Pitfall 2: python-jose / passlib Are Abandoned

**What goes wrong:** Using python-jose (last release 2021) or passlib (unmaintained) leads to unpatched security vulnerabilities and compatibility issues with newer Python versions.
**Why it happens:** Older tutorials and even the project's STACK.md research reference these libraries. They were the standard until 2024.
**How to avoid:** Use `PyJWT` (2.11.0, released Jan 2026) and `pwdlib[argon2]` (actively maintained). Follow FastAPI's current official tutorial at https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/.
**Warning signs:** Import errors on Python 3.12+. Deprecation warnings from passlib.

### Pitfall 3: Alembic Async Configuration

**What goes wrong:** Alembic's default `env.py` uses synchronous connections. Running migrations against an async-only database URL (`postgresql+asyncpg://...`) fails with driver errors.
**Why it happens:** Alembic's init template generates sync-only code. The async configuration requires a different env.py pattern.
**How to avoid:** Use Alembic's async `env.py` pattern: run migrations with `run_async` using `connectable = async_engine_from_config(...)`. Alternatively, use a synchronous database URL for migrations only (e.g., `postgresql+psycopg2://...` or `postgresql://...`). The simplest approach: use the sync `psycopg2` driver for Alembic and the async `asyncpg` driver for the application.
**Warning signs:** `asyncpg` errors during `alembic upgrade head`. Migration commands hang or fail.

### Pitfall 4: Airgap Dependency Leakage in Dockerfiles

**What goes wrong:** Dockerfile `RUN` steps or npm postinstall scripts fetch resources from the internet. Builds succeed on connected machines but fail on airgapped deployment targets.
**Why it happens:** Development always happens on connected machines. Dependencies that phone home go unnoticed.
**How to avoid:** After building all images, run a verification script: `docker run --rm --network none <image> <health-check-command>`. For the frontend build stage, ensure `pnpm install --frozen-lockfile` uses only the lockfile and pre-fetched packages. For the backend, `uv sync --locked` ensures reproducible installs.
**Warning signs:** `npm install` output shows network downloads. `pip install` fetches packages at runtime. Font rendering differences between dev and Docker.

### Pitfall 5: CORS Misconfiguration

**What goes wrong:** During development, the React dev server (port 5173) and FastAPI (port 8000) are on different origins, causing CORS errors. Developers add permissive CORS middleware that leaks into production.
**Why it happens:** Nginx reverse proxy eliminates CORS in production (same origin), but development bypasses Nginx.
**How to avoid:** Use a `docker-compose.override.yml` for dev that either: (a) adds CORS middleware scoped to development only, or (b) uses Vite's proxy config to forward `/api` requests to FastAPI. In production compose, no CORS middleware is needed because Nginx serves both SPA and API on the same origin.
**Warning signs:** `Access-Control-Allow-Origin: *` in production response headers.

### Pitfall 6: Missing `depends_on` with Health Check

**What goes wrong:** FastAPI container starts before PostgreSQL is ready. Alembic migration fails because the database is not accepting connections.
**Why it happens:** Default `depends_on` only waits for the container to start, not for the service inside to be ready.
**How to avoid:** Use `depends_on: db: condition: service_healthy` with a `pg_isready` healthcheck on the PostgreSQL service.
**Warning signs:** Intermittent "connection refused" errors on startup. Migrations sometimes pass, sometimes fail.

### Pitfall 7: WeasyPrint System Dependencies in Docker

**What goes wrong:** WeasyPrint is not needed in Phase 1, but if the Dockerfile is designed as a single image for all phases, WeasyPrint's system dependencies (Pango, Cairo, GDK-Pixbuf) must be installed or the image will fail later.
**Why it happens:** WeasyPrint is a Python package but requires C libraries installed via `apt-get`.
**How to avoid:** Either install WeasyPrint's system deps in the Phase 1 Dockerfile proactively (`apt-get install -y libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf2.0-0 libcairo2 libffi-dev libjpeg-dev libopenjp2-7-dev`), or plan to add them when Phase 7 (reports) begins. Recommendation: install them now to avoid breaking the Docker image later.
**Warning signs:** `cannot load library 'pango-1.0-0'` error at runtime.

## Code Examples

### Docker Compose with Health Check and Named Volume

```yaml
# Source: Verified pattern from Docker docs + PostgreSQL docs
services:
  db:
    image: postgres:17-slim
    environment:
      POSTGRES_DB: audittrail
      POSTGRES_USER: ${DB_USER:-audittrail}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-audittrail} -d audittrail"]
      interval: 5s
      timeout: 5s
      retries: 5
      start_period: 10s
    restart: unless-stopped

volumes:
  postgres_data:
```

### FastAPI JWT Login Endpoint (Current Official Pattern)

```python
# Source: https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/
# Updated to use PyJWT + pwdlib (current FastAPI recommendation)
import jwt
from jwt.exceptions import InvalidTokenError
from datetime import datetime, timedelta, timezone
from pwdlib import PasswordHash
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm

password_hash = PasswordHash.recommended()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return password_hash.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return password_hash.hash(password)

def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except InvalidTokenError:
        raise credentials_exception
    user = await get_user_by_username(db, username)
    if user is None:
        raise credentials_exception
    return user
```

### User SQLAlchemy Model

```python
# Source: SQLAlchemy 2.0 mapped_column pattern
from sqlalchemy import String, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from src.database import Base
import uuid

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
```

### Multi-Stage Backend Dockerfile with uv

```dockerfile
# Source: https://docs.astral.sh/uv/guides/integration/docker/
FROM python:3.12-slim AS builder

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Install dependencies first (cached layer)
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --locked --no-install-project --no-editable --no-dev

# Copy source and install project
COPY . /app
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-editable --no-dev

# Production stage
FROM python:3.12-slim

# WeasyPrint system deps (install now, needed in Phase 7)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf2.0-0 \
    libcairo2 libffi-dev libjpeg62-turbo libopenjp2-7 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy virtual environment from builder
COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app/src /app/src
COPY --from=builder /app/alembic /app/alembic
COPY --from=builder /app/alembic.ini /app/alembic.ini
COPY --from=builder /app/scripts /app/scripts

ENV PATH="/app/.venv/bin:$PATH"

RUN chmod +x /app/scripts/entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/app/scripts/entrypoint.sh"]
```

### Multi-Stage Nginx + Frontend Dockerfile

```dockerfile
# Build React SPA
FROM node:22-slim AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# Serve from Nginx
FROM nginx:1.27-alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
```

### Alembic Async env.py Pattern

```python
# Source: https://alembic.sqlalchemy.org/en/latest/cookbook.html
# Simplest approach: use synchronous psycopg2 driver for migrations
# even though the app uses async asyncpg at runtime.
# This avoids async complexity in env.py entirely.
#
# alembic.ini: sqlalchemy.url = postgresql://user:pass@db:5432/audittrail
# (no +asyncpg -- uses default sync driver)
#
# This is the recommended approach for most projects.
```

### Seed Script for Default User

```python
# server/scripts/seed.py
import asyncio
from src.database import async_session
from src.models.user import User
from sqlalchemy import select

async def seed():
    async with async_session() as session:
        result = await session.execute(select(User).where(User.username == "admin"))
        if result.scalar_one_or_none() is None:
            from pwdlib import PasswordHash
            ph = PasswordHash.recommended()
            admin = User(
                username="admin",
                hashed_password=ph.hash("changeme"),
                full_name="Default Admin",
            )
            session.add(admin)
            await session.commit()
            print("Seeded default admin user")
        else:
            print("Admin user already exists, skipping seed")

if __name__ == "__main__":
    asyncio.run(seed())
```

### Airgap Verification Script

```bash
#!/bin/bash
# scripts/verify-airgap.sh
# Run after docker compose build to verify no outbound network needed

set -e

echo "=== Airgap Verification ==="

# Test API image runs without network
echo "Testing API container without network..."
docker run --rm --network none audittrail-api python -c "
from src.main import app
print('FastAPI app imports successfully without network')
"

echo "Testing Nginx container without network..."
docker run --rm --network none audittrail-nginx nginx -t

echo "=== All airgap checks passed ==="
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `python-jose` for JWT | `PyJWT` | 2024 (FastAPI docs update) | python-jose abandoned since 2021. PyJWT is actively maintained. |
| `passlib[bcrypt]` for hashing | `pwdlib[argon2]` | 2024 (FastAPI docs update) | passlib unmaintained. pwdlib is its modern replacement. Argon2 > bcrypt. |
| `pip install` in Dockerfile | `uv sync` in Dockerfile | 2024-2025 | 10-100x faster builds. Lockfile ensures reproducibility. |
| SQLAlchemy 1.4 async | SQLAlchemy 2.0 async | 2023 | New mapped_column syntax, better type support, explicit async patterns. |
| `npm ci` in Docker | `pnpm fetch` + `pnpm install --offline` | 2024-2025 | Stricter deps, better caching, faster Docker builds. |
| React Router v6 | React Router v7 | 2025 | Simplified imports (no react-router-dom). Library mode for SPA. |
| Tailwind CSS v3 | Tailwind CSS v4 | 2025 | Auto content detection, 5x faster builds, CSS-first config. |

**Deprecated/outdated (do NOT use):**
- `python-jose`: Last release 2021. Known security issues. FastAPI docs switched to PyJWT.
- `passlib`: Unmaintained. FastAPI docs switched to pwdlib.
- `tiangolo/uvicorn-gunicorn-fastapi` Docker image: Deprecated. Use official `python:3.12-slim`.
- `Create React App`: Deprecated since 2023. Use Vite.
- `npm` for Docker builds: Use pnpm for stricter dependency resolution and offline support.

## Open Questions

1. **Alembic sync vs async driver for migrations**
   - What we know: The simplest approach is to use a sync driver (`psycopg2` or default `psycopg`) for Alembic migrations and async `asyncpg` for the application runtime. This avoids async complexity in env.py.
   - What's unclear: Whether we want to add `psycopg2-binary` as a dependency just for migrations, or configure Alembic's async env.py pattern.
   - Recommendation: Use sync `psycopg2-binary` for Alembic. It is a dev/build dependency only. The added simplicity outweighs the extra dependency.

2. **Token storage: localStorage vs httpOnly cookie**
   - What we know: For an airgapped internal tool with 2-5 users, localStorage is simpler. The threat model does not include XSS from third-party scripts (no CDN, no external JS).
   - What's unclear: Whether auditors require any specific security certifications that mandate httpOnly cookies.
   - Recommendation: Use localStorage. If security requirements change, migrating to httpOnly cookies is straightforward.

3. **Nginx as separate container vs FastAPI serving static files**
   - What we know: Nginx is more efficient for static files and provides clean separation. FastAPI's `StaticFiles` mount works but is less performant.
   - What's unclear: Whether the operational simplicity of two containers (vs three) matters for this team.
   - Recommendation: Use Nginx. It is the standard pattern, provides SPA routing fallback (`try_files`), and isolates concerns cleanly. The React build output is copied into the Nginx image at build time -- zero extra operational complexity at runtime.

4. **Whether to install WeasyPrint system deps in Phase 1**
   - What we know: WeasyPrint is not used until Phase 7 (reports). But its system dependencies (Pango, Cairo) are installed via `apt-get` in the Dockerfile.
   - What's unclear: Whether adding ~50MB of system libraries to the Phase 1 image is worth the forward-compatibility.
   - Recommendation: Install them now. It prevents the Dockerfile from breaking when Phase 7 adds WeasyPrint as a Python dependency. The image size cost is minimal compared to the debugging cost of a broken Docker build later.

## Sources

### Primary (HIGH confidence)
- [FastAPI official JWT tutorial](https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/) -- Confirmed PyJWT + pwdlib are the current official recommendations
- [FastAPI Docker deployment guide](https://fastapi.tiangolo.com/deployment/docker/) -- Official Dockerfile patterns
- [uv Docker integration guide](https://docs.astral.sh/uv/guides/integration/docker/) -- Official multi-stage Dockerfile for uv
- [SQLAlchemy 2.0 async docs](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html) -- create_async_engine, AsyncSession patterns
- [Alembic cookbook](https://alembic.sqlalchemy.org/en/latest/cookbook.html) -- Async migration patterns
- [Docker Compose startup order](https://docs.docker.com/compose/how-tos/startup-order/) -- depends_on with service_healthy
- [Docker Compose networking](https://docs.docker.com/compose/how-tos/networking/) -- Network modes including `none`
- [PyJWT on PyPI](https://pypi.org/project/PyJWT/) -- v2.11.0 (Jan 30, 2026)
- [pwdlib on PyPI](https://pypi.org/project/pwdlib/) -- Modern password hashing, MIT license
- [pnpm Docker integration](https://pnpm.io/docker) -- pnpm fetch + offline install pattern

### Secondary (MEDIUM confidence)
- [FastAPI python-jose deprecation discussion](https://github.com/fastapi/fastapi/discussions/11345) -- Community confirmation of migration to PyJWT
- [FastAPI PR #11589](https://github.com/fastapi/fastapi/pull/11589) -- Actual PR updating docs from python-jose to PyJWT
- [React Router 7 protected routes](https://www.robinwieruch.de/react-router-private-routes/) -- Auth guard patterns (Jan 2026)
- [Authentication with React Router v7](https://blog.logrocket.com/authentication-react-router-v7/) -- Complete auth flow guide
- [Setup FastAPI with Async SQLAlchemy 2, Alembic, PostgreSQL and Docker](https://berkkaraal.com/blog/2024/09/19/setup-fastapi-project-with-async-sqlalchemy-2-alembic-postgresql-and-docker/) -- End-to-end tutorial

### Tertiary (LOW confidence)
- Various Medium articles on FastAPI + Docker Compose (used for pattern validation, not as primary sources)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- All libraries verified on PyPI/npm. FastAPI JWT tutorial fetched and confirmed.
- Architecture: HIGH -- Docker Compose + FastAPI + PostgreSQL + Nginx is among the most documented deployment patterns in Python web development.
- Pitfalls: HIGH -- PostgreSQL volume mount, library deprecation, and async Alembic issues are well-documented with clear fixes.
- Code examples: HIGH -- All examples derived from official documentation or verified patterns.

**Key correction from project-level research:** STACK.md recommended `passlib[bcrypt]` + `python-jose[cryptography]`. This research corrects that to `pwdlib[argon2]` + `PyJWT` based on FastAPI's current official documentation. The planner MUST use the updated libraries.

**Research date:** 2026-02-10
**Valid until:** 2026-03-10 (stable domain, 30-day validity)
