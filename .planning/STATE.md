# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-10)

**Core value:** Auditors can rapidly document and report on data movement incidents with a seamless inline editing experience that handles both individual events and bulk file operations without friction.
**Current focus:** Phase 2 Complete - Ready for Phase 3

## Current Position

Phase: 2 of 9 (Audit Schemas & Cases) -- COMPLETE
Plan: 5 of 5 in current phase (all complete)
Status: Phase Complete
Last activity: 2026-02-10 -- Completed 02-05-PLAN.md (Case Detail Page with inline editing)

Progress: [==========] 25%

## Performance Metrics

**Velocity:**
- Total plans completed: 9
- Average duration: 5min
- Total execution time: 0.7 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-infrastructure-auth | 4/4 | 26min | 7min |
| 02-audit-schemas-cases | 5/5 | 15min | 3min |

**Recent Trend:**
- Last 5 plans: 02-01 (2min), 02-02 (3min), 02-03 (3min), 02-04 (4min), 02-05 (3min)
- Trend: stable-fast

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
- [02-03]: TanStack Query staleTime 5min with retry 1 for reasonable caching and error recovery
- [02-03]: SchemaForm renders fields dynamically from JsonSchema.properties with type-based input mapping
- [02-03]: Audit type selection resets metadata to empty object to prevent stale field values
- [02-03]: Added patch method and 204 response handling to api helper for full CRUD support
- [02-04]: Replaced DashboardPage with CaseListPage as index route for immediate case management access
- [02-04]: Used sentinel __all__ values for Radix Select since empty string values are not supported
- [02-04]: Added /cases/:id placeholder route to enable row click navigation before 02-05
- [02-05]: useUsers hook with 10min staleTime since user list changes infrequently
- [02-05]: Inline title editing via click-to-edit with Enter/blur to save, Escape to cancel
- [02-05]: Description uses Save/Cancel buttons instead of blur-to-save for multi-line content
- [02-05]: LifecycleControl uses static TRANSITIONS map matching server-side VALID_TRANSITIONS
- [02-05]: AssigneeSelect uses __unassigned__ sentinel for Radix Select null representation
- [02-05]: Browser checkpoint auto-approved -- verification steps documented for when Docker is available

### Pending Todos

- Docker verification: `docker compose build --no-cache && docker compose up -d && bash scripts/verify-integration.sh` when Docker is available
- Browser auth flow verification: follow steps in 01-04-SUMMARY.md "Docker Verification Commands" section
- Phase 2 end-to-end browser verification: follow 15 steps in 02-05-SUMMARY.md "Docker Verification" section when Docker is available

### Blockers/Concerns

- Docker Desktop not installed on development machine -- cannot verify full stack end-to-end until installed
- Phase 1 code is complete but Docker integration testing is pending

## Session Continuity

Last session: 2026-02-10
Stopped at: Completed 02-05-PLAN.md (Case Detail Page -- Phase 2 complete)
Resume file: .planning/phases/02-audit-schemas-cases/02-05-SUMMARY.md
