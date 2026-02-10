# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-10)

**Core value:** Auditors can rapidly document and report on data movement incidents with a seamless inline editing experience that handles both individual events and bulk file operations without friction.
**Current focus:** Phase 2 - Audit Type Schemas & Case Management

## Current Position

Phase: 2 of 9 (Audit Schemas & Cases)
Plan: 2 of 5 in current phase
Status: Executing
Last activity: 2026-02-10 -- Completed 02-02-PLAN.md (Cases API with CRUD, lifecycle, filtering)

Progress: [======░░░░] 17%

## Performance Metrics

**Velocity:**
- Total plans completed: 6
- Average duration: 5min
- Total execution time: 0.5 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-infrastructure-auth | 4/4 | 26min | 7min |
| 02-audit-schemas-cases | 2/5 | 5min | 3min |

**Recent Trend:**
- Last 5 plans: 01-02 (3min), 01-03 (4min), 01-04 (2min), 02-01 (2min), 02-02 (3min)
- Trend: accelerating

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: 9-phase structure derived from 39 requirements across 9 categories
- [Roadmap]: Reports split into two phases (PDF/DOCX then HTML) due to HTML self-containment complexity
- [Roadmap]: Jira Integration as independent Phase 6 (depends only on Phase 2, parallelizable with Phase 5)
- [01-01]: Used pydantic-settings (separate package) for BaseSettings in Pydantic v2
- [01-01]: Set requires-python >= 3.12 for Docker compatibility
- [01-01]: Nginx Dockerfile build context is project root (.) to access client/ source
- [01-01]: Added pnpm.onlyBuiltDependencies config for esbuild approval
- [01-02]: Alembic uses sync psycopg2 driver (DATABASE_URL_SYNC) to avoid async complexity in env.py
- [01-02]: Manual migration file instead of autogenerate (no DB running in dev environment)
- [01-02]: tokenUrl set to /api/auth/login to match Nginx proxy path for Swagger UI
- [01-02]: Default access token expiry from settings (480min/8hr workday)
- [01-03]: Added @/ path alias in tsconfig and vite.config for shadcn/ui compatibility
- [01-03]: Login POST uses form-urlencoded format (FastAPI OAuth2PasswordRequestForm)
- [01-03]: Auth store initializes from localStorage at module load time (not React lifecycle)
- [01-04]: Fixed nginx proxy_pass to strip /api/ prefix (http://api:8000/ not http://api:8000/api/)
- [01-04]: Docker verification deferred -- all Docker commands documented in scripts/verify-integration.sh
- [01-04]: Browser checkpoint auto-approved -- verification steps documented for when Docker is available
- [02-01]: Used schema_ with alias='schema' and serialization_alias='schema' to avoid Pydantic BaseModel.schema conflict
- [02-01]: Read-only router (GET list + GET detail) -- no POST/PUT/DELETE needed for v1 fixed audit types
- [02-01]: Idempotent seed by slug check -- safe to run multiple times
- [02-02]: Used metadata_ with validation_alias in CaseRead for SQLAlchemy metadata_ -> JSON metadata mapping
- [02-02]: Replace entire metadata dict on update to avoid SQLAlchemy JSONB mutation tracking issues
- [02-02]: case_number uses PostgreSQL Identity sequence for autoincrement human-readable identifiers

### Pending Todos

- Docker verification: `docker compose build --no-cache && docker compose up -d && bash scripts/verify-integration.sh` when Docker is available
- Browser auth flow verification: follow steps in 01-04-SUMMARY.md "Docker Verification Commands" section

### Blockers/Concerns

- Docker Desktop not installed on development machine -- cannot verify full stack end-to-end until installed
- Phase 1 code is complete but Docker integration testing is pending

## Session Continuity

Last session: 2026-02-10
Stopped at: Completed 02-02-PLAN.md (Cases API with CRUD, lifecycle, filtering)
Resume file: .planning/phases/02-audit-schemas-cases/02-02-SUMMARY.md
