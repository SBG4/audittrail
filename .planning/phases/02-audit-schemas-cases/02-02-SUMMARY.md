---
phase: 02-audit-schemas-cases
plan: 02
subsystem: api
tags: [sqlalchemy, jsonb, pydantic, fastapi, alembic, jsonschema, cases, crud, lifecycle, filtering]

# Dependency graph
requires:
  - phase: 02-01
    provides: "AuditType model with JSONB schema column, AuditTypeRead Pydantic schema, migration 002"
  - phase: 01-02
    provides: "Async SQLAlchemy engine, Base model, User model, auth deps (get_db, get_current_user)"
provides:
  - Case SQLAlchemy model with JSONB metadata, status lifecycle, user assignment, and relationships
  - Pydantic schemas (CaseCreate, CaseUpdate, CaseRead, CaseListResponse) with metadata alias handling
  - Alembic migration 003 creating cases table with foreign keys and GIN index
  - Full CRUD API (POST, GET list, GET detail, PATCH, DELETE) with JWT protection
  - Metadata validation against audit type JSON Schema using jsonschema library
  - Status lifecycle enforcement (open->active->closed, closed->open)
  - Case list filtering by status, audit_type_id, assigned_to_id, and text search with pagination
affects: [02-03, 02-04, 02-05, all phases requiring case references]

# Tech tracking
tech-stack:
  added: [jsonschema]
  patterns: [jsonb-metadata-validation, status-lifecycle-transitions, crud-with-filtering]

key-files:
  created:
    - server/src/models/case.py
    - server/src/schemas/case.py
    - server/src/routers/cases.py
    - server/alembic/versions/003_create_cases_table.py
  modified:
    - server/src/models/__init__.py
    - server/src/main.py
    - server/pyproject.toml
    - server/uv.lock

key-decisions:
  - "Used metadata_ with validation_alias='metadata_' in CaseRead for SQLAlchemy metadata_ -> JSON metadata mapping"
  - "Replace entire metadata dict on update to avoid SQLAlchemy JSONB mutation tracking issues"
  - "Used Query alias for status filter param to avoid shadowing status module import"
  - "case_number uses autoincrement integer for human-readable case identifiers"

patterns-established:
  - "JSONB metadata validation: validate against audit type JSON Schema at API layer using jsonschema.validate()"
  - "Status lifecycle enforcement: simple transition map dict with HTTPException on invalid transitions"
  - "Partial update pattern: model_dump(exclude_unset=True) to apply only provided fields"
  - "Relationship eager loading: selectinload() in queries + lazy='selectin' on model for async compatibility"

# Metrics
duration: 3min
completed: 2026-02-10
---

# Phase 2 Plan 2: Cases API Summary

**Full CRUD cases API with JSONB metadata validation against audit type schemas, status lifecycle enforcement, and filtered list with pagination**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-10T17:09:49Z
- **Completed:** 2026-02-10T17:13:00Z
- **Tasks:** 2
- **Files modified:** 8 (4 created, 4 modified)

## Accomplishments
- Case SQLAlchemy model with JSONB metadata column, GIN index, UUID primary key, autoincrement case_number, timestamps, and selectin-loaded relationships (audit_type, assigned_to, created_by)
- Full CRUD router: POST (create with schema validation), GET (list with filtering/search/pagination), GET (detail), PATCH (partial update with lifecycle + metadata validation), DELETE (204 no content)
- Metadata validation using jsonschema library -- validates case metadata against the referenced audit type's JSON Schema definition on both create and update
- Status lifecycle transitions enforced: open->active, open->closed, active->closed, closed->open (reopen)
- Case list supports filtering by status, audit_type_id, assigned_to_id, and ILIKE text search across title/description

## Task Commits

Each task was committed atomically:

1. **Task 1: Case model, Pydantic schemas, and migration** - `07b33e7` (feat)
2. **Task 2: Cases CRUD router with validation, lifecycle, and filtering** - `f725009` (feat)

## Files Created/Modified
- `server/src/models/case.py` - Case SQLAlchemy model with JSONB metadata, status, assignment, relationships
- `server/src/schemas/case.py` - CaseCreate, CaseUpdate, CaseRead, CaseListResponse Pydantic schemas
- `server/src/routers/cases.py` - Full CRUD + filtering endpoints with metadata validation and lifecycle enforcement
- `server/alembic/versions/003_create_cases_table.py` - Migration creating cases table with foreign keys, GIN index, Identity sequence
- `server/src/models/__init__.py` - Added Case export
- `server/src/main.py` - Registered cases_router
- `server/pyproject.toml` - Added jsonschema dependency
- `server/uv.lock` - Updated lockfile with jsonschema and transitive deps

## Decisions Made
- **Metadata alias handling:** Used `validation_alias="metadata_"` in CaseRead to read from SQLAlchemy's `metadata_` attribute while serializing as `metadata` in JSON output. Different approach from AuditType's `Field(alias=...)` since Case uses `mapped_column("metadata")` renaming.
- **Full dict replacement on metadata update:** Replace the entire metadata dict rather than merging to avoid SQLAlchemy JSONB mutation tracking issues (in-place dict changes are not detected).
- **Query alias for status filter:** Used `Query(alias="status")` for the status filter parameter to avoid shadowing the `status` module import from FastAPI.
- **case_number autoincrement:** Used PostgreSQL Identity sequence via `sa.Identity()` in migration for reliable autoincrement without manual sequence management.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed deprecated HTTP_422_UNPROCESSABLE_ENTITY constant**
- **Found during:** Task 2 verification (overall verification step)
- **Issue:** `status.HTTP_422_UNPROCESSABLE_ENTITY` raises DeprecationWarning in current Starlette version
- **Fix:** Changed to `status.HTTP_422_UNPROCESSABLE_CONTENT` (same 422 status code, non-deprecated name)
- **Files modified:** server/src/routers/cases.py
- **Verification:** No deprecation warning on import, 422 status code still returned
- **Committed in:** `3280bae`

---

**Total deviations:** 1 auto-fixed (1 bug/deprecation)
**Impact on plan:** Trivial constant rename. No scope creep.

## Issues Encountered
- **Docker not available:** Cannot run full integration test. All code-level verifications passed: model imports, schema validation, router routes, helper functions, lifecycle transitions. Docker verification remains pending from Phase 1.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Case model and CRUD API ready for test plan (02-03) to write integration tests
- Migration chain valid: 001 -> 002 -> 003
- Metadata validation pattern established for frontend form rendering (02-04)
- Case list filtering ready for frontend case list page (02-04)
- All Phase 1 and Plan 02-01 functionality fully preserved

## Self-Check: PASSED

- All 8 created/modified files verified present
- All 3 commit hashes verified in git log (07b33e7, f725009, 3280bae)

---
*Phase: 02-audit-schemas-cases*
*Completed: 2026-02-10*
