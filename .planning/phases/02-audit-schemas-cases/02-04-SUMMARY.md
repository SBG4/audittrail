---
phase: 02-audit-schemas-cases
plan: 04
subsystem: ui
tags: [react, shadcn, table, badge, select, filtering, pagination, debounce, case-list]

# Dependency graph
requires:
  - phase: 02-02
    provides: "Cases API with CRUD, filtering, and pagination (GET /api/cases with query params)"
  - phase: 02-03
    provides: "TanStack Query hooks (useCases, useAuditTypes), TypeScript types (Case, CaseFilters, CaseListResponse), CaseCreatePage"
  - phase: 01-03
    provides: "React app with shadcn/ui components, auth store, Layout, AuthGuard, api helper"
provides:
  - CaseListPage as default authenticated route showing filterable, searchable, paginated case table
  - CaseFilters component with debounced search, status select, audit type select, clear filters
  - CaseList component with color-coded status badges, clickable rows, pagination, empty/loading states
  - Route for /cases/:id (placeholder for case detail in 02-05)
affects: [02-05, all phases requiring case navigation]

# Tech tracking
tech-stack:
  added: []
  patterns: [debounced-search-filter, color-coded-status-badges, paginated-table-component]

key-files:
  created:
    - client/src/components/cases/CaseFilters.tsx
    - client/src/components/cases/CaseList.tsx
    - client/src/pages/CaseListPage.tsx
    - client/src/components/ui/table.tsx
    - client/src/components/ui/badge.tsx
  modified:
    - client/src/App.tsx
    - client/src/pages/DashboardPage.tsx

key-decisions:
  - "Replaced DashboardPage with CaseListPage as the index route for immediate case management access"
  - "Used sentinel __all__ values for Select components since Radix Select does not support empty string values"
  - "Added /cases/:id placeholder route to enable row click navigation before 02-05 implements it"

patterns-established:
  - "Debounced search: 300ms setTimeout debounce in filter component, reset offset on filter change"
  - "Status badge styling: open=outline+blue, active=default/primary, closed=secondary/gray"
  - "Filter pattern: parent owns filters state, passes to CaseFilters and uses with useCases hook"

# Metrics
duration: 4min
completed: 2026-02-10
---

# Phase 2 Plan 4: Case List Dashboard Summary

**Filterable, searchable case list page with debounced search, status/type select filters, paginated table with color-coded badges, and navigation routing**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-10T17:15:41Z
- **Completed:** 2026-02-10T17:20:08Z
- **Tasks:** 2
- **Files modified:** 7 (5 created, 2 modified)

## Accomplishments
- CaseFilters component with debounced search input (300ms), status select (Open/Active/Closed), audit type select populated from useAuditTypes hook, and clear filters button
- CaseList component rendering a paginated shadcn Table with case_number, title, type, color-coded status badges, assignee (or "Unassigned"), and relative date formatting
- CaseListPage integrating filters, case list table, error handling, and navigation as the default authenticated route
- Router updated with /cases/:id placeholder route and DashboardPage replaced with CaseListPage

## Task Commits

Each task was committed atomically:

1. **Task 1: CaseFilters and CaseList components** - `641bd98` (feat)
2. **Task 2: CaseListPage integration and router update** - `6d2c7b1` (feat)

## Files Created/Modified
- `client/src/components/cases/CaseFilters.tsx` - Filter controls for search, status, and audit type with debounce and clear
- `client/src/components/cases/CaseList.tsx` - Paginated table with status badges, clickable rows, empty/loading states
- `client/src/pages/CaseListPage.tsx` - Main case list page composing filters, table, and navigation
- `client/src/components/ui/table.tsx` - shadcn Table component (Table, TableHeader, TableBody, TableRow, TableHead, TableCell)
- `client/src/components/ui/badge.tsx` - shadcn Badge component with variant support
- `client/src/App.tsx` - Replaced DashboardPage with CaseListPage as index route, added /cases/:id placeholder
- `client/src/pages/DashboardPage.tsx` - Simplified to redirect to / for backwards compatibility

## Decisions Made
- **CaseListPage as index route:** Replaced the placeholder DashboardPage with CaseListPage as the default authenticated page since the case list IS the primary auditor workflow interface.
- **Select sentinel values:** Used `"__all__"` as the "all" option value for Radix Select components since they don't support empty string values. Converted to empty string in the onChange handler before passing to filters.
- **Placeholder case detail route:** Added `/cases/:id` pointing to a simple placeholder component to enable case row click navigation immediately, before 02-05 implements the full detail page.
- **DashboardPage redirect:** Instead of deleting DashboardPage, converted it to redirect to `/` for any stale bookmarks or references.

## Deviations from Plan

None - plan executed exactly as written. The hooks (useCases, useAuditTypes) and types were already created by the preceding 02-03 plan execution.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Case list page is fully functional and integrated as the default authenticated page
- All filter controls, pagination, and navigation work with the existing useCases hook and Cases API
- /cases/:id route is ready for 02-05 to implement the case detail page
- Client builds without TypeScript or bundle errors

## Self-Check: PASSED

- All 7 created/modified files verified present
- All 2 commit hashes verified in git log (641bd98, 6d2c7b1)

---
*Phase: 02-audit-schemas-cases*
*Completed: 2026-02-10*
