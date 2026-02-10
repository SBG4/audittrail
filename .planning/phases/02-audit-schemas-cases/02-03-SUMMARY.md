---
phase: 02-audit-schemas-cases
plan: 03
subsystem: ui
tags: [tanstack-query, react, typescript, json-schema, dynamic-forms, shadcn, case-creation]

# Dependency graph
requires:
  - phase: 02-01
    provides: "AuditType model with JSONB schema column, GET /api/audit-types endpoint"
  - phase: 02-02
    provides: "Cases CRUD API (POST /api/cases with metadata validation), Pydantic schemas"
  - phase: 01-03
    provides: "React app with Vite, shadcn/ui components, auth store, api helper, routing with AuthGuard"
provides:
  - TanStack Query setup with QueryClientProvider wrapping the app
  - TypeScript types for Case, AuditType, JsonSchema, and API request/response shapes
  - API hooks (useAuditTypes, useCases, useCreateCase, useUpdateCase, useDeleteCase)
  - SchemaForm component that dynamically renders form fields from JSON Schema
  - CaseCreatePage with audit type selection, schema-driven metadata form, and case creation
  - Route /cases/new protected by AuthGuard
affects: [02-04, 02-05, all phases requiring case UI references]

# Tech tracking
tech-stack:
  added: ["@tanstack/react-query"]
  patterns: [tanstack-query-hooks, schema-driven-forms, dynamic-field-rendering]

key-files:
  created:
    - client/src/types/case.ts
    - client/src/hooks/useAuditTypes.ts
    - client/src/hooks/useCases.ts
    - client/src/components/cases/SchemaForm.tsx
    - client/src/pages/CaseCreatePage.tsx
    - client/src/components/ui/select.tsx
    - client/src/components/ui/textarea.tsx
  modified:
    - client/package.json
    - client/pnpm-lock.yaml
    - client/src/main.tsx
    - client/src/lib/api.ts
    - client/src/App.tsx

key-decisions:
  - "TanStack Query staleTime 5min with retry 1 for reasonable caching and error recovery"
  - "SchemaForm renders fields dynamically from JsonSchema.properties with type-based input mapping"
  - "Audit type selection resets metadata to empty object to prevent stale field values"
  - "Added patch method to api helper for PATCH requests (same pattern as put)"
  - "Handle 204 responses in api helper to prevent json parse errors on DELETE"

patterns-established:
  - "TanStack Query hooks pattern: queryKey array, queryFn with api helper, enabled flag for conditional fetching"
  - "Schema-driven form rendering: iterate schema.properties, map type+format to Input/Select components"
  - "Mutation with cache invalidation: onSuccess invalidates query keys for automatic refetch"

# Metrics
duration: 3min
completed: 2026-02-10
---

# Phase 2 Plan 3: Case Creation UI Summary

**Schema-driven case creation page with TanStack Query hooks, dynamic form rendering from JSON Schema, and audit type selection using shadcn components**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-10T17:15:20Z
- **Completed:** 2026-02-10T17:18:30Z
- **Tasks:** 2
- **Files modified:** 12 (7 created, 5 modified)

## Accomplishments
- TanStack Query installed and configured with QueryClientProvider wrapping the app (5min staleTime, 1 retry)
- Complete TypeScript types covering Case, AuditType, JsonSchema, UserInfo, and all request/response interfaces
- Full set of API hooks: useAuditTypes, useAuditType, useCases, useCase, useCreateCase, useUpdateCase, useDeleteCase
- SchemaForm component dynamically renders form fields from JSON Schema (string/number/email/enum field types with required indicators)
- CaseCreatePage with three-section form: case details, audit type selection, and schema-driven metadata fields
- New route /cases/new protected inside AuthGuard + Layout wrapper

## Task Commits

Each task was committed atomically:

1. **Task 1: TanStack Query setup, TypeScript types, and API hooks** - `3dd7258` (feat)
2. **Task 2: SchemaForm component and CaseCreatePage** - `d31e704` (feat)

## Files Created/Modified
- `client/src/types/case.ts` - TypeScript interfaces for Case, AuditType, JsonSchema, UserInfo, request/response types
- `client/src/hooks/useAuditTypes.ts` - TanStack Query hooks for fetching audit types list and detail
- `client/src/hooks/useCases.ts` - TanStack Query hooks for CRUD case operations with cache invalidation
- `client/src/components/cases/SchemaForm.tsx` - Dynamic form renderer from JSON Schema with Input/Select field mapping
- `client/src/pages/CaseCreatePage.tsx` - Case creation page with audit type selection, metadata form, error handling
- `client/src/components/ui/select.tsx` - shadcn Select component (Radix UI primitives)
- `client/src/components/ui/textarea.tsx` - shadcn Textarea component
- `client/package.json` - Added @tanstack/react-query dependency
- `client/pnpm-lock.yaml` - Updated lockfile
- `client/src/main.tsx` - Wrapped app with QueryClientProvider
- `client/src/lib/api.ts` - Added patch method and 204 response handling
- `client/src/App.tsx` - Added /cases/new route with CaseCreatePage import

## Decisions Made
- **TanStack Query defaults:** staleTime of 5 minutes balances freshness with performance; retry of 1 provides one automatic retry without excessive retries on persistent errors.
- **Schema-driven form rendering:** SchemaForm iterates over schema.properties keys and maps type+format combinations to appropriate input components (text, number, email, select). This enables adding new audit types without code changes.
- **Audit type change resets metadata:** When user switches audit type, metadata state resets to `{}` to prevent stale fields from a previous schema leaking into the new form.
- **API helper enhancements:** Added `patch` method (same pattern as `put` but with `PATCH` method) and 204 response handling (returns `undefined` instead of attempting JSON parse) to support the full CRUD operation set.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added 204 response handling to api helper**
- **Found during:** Task 1 (API hooks)
- **Issue:** The existing `delete` method called `response.json()` which would fail on 204 No Content responses from the DELETE /api/cases/{id} endpoint
- **Fix:** Added early return for 204 status before JSON parsing in the `request` function
- **Files modified:** client/src/lib/api.ts
- **Verification:** TypeScript compiles, build succeeds
- **Committed in:** `3dd7258` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Essential for DELETE operations to work correctly. No scope creep.

## Issues Encountered
None - all tasks executed cleanly with successful TypeScript compilation and build.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Case creation UI complete, ready for case list page (02-04)
- TanStack Query hooks provide reusable data fetching for all case-related pages
- SchemaForm component reusable for case edit pages
- TypeScript types shared across all case-related components
- All Phase 1 and Plans 02-01/02-02 functionality fully preserved

## Self-Check: PASSED

- All 12 created/modified files verified present on disk
- All 2 commit hashes verified in git log (3dd7258, d31e704)

---
*Phase: 02-audit-schemas-cases*
*Completed: 2026-02-10*
