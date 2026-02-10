---
phase: 02-audit-schemas-cases
plan: 05
subsystem: ui
tags: [react, typescript, tanstack-query, shadcn, tabs, dialog, inline-editing, lifecycle, assignment, case-detail]

# Dependency graph
requires:
  - phase: 02-03
    provides: "TanStack Query hooks (useCase, useUpdateCase, useDeleteCase), TypeScript types, SchemaForm component"
  - phase: 02-04
    provides: "CaseListPage with /cases/:id placeholder route, Badge and Table components"
  - phase: 02-02
    provides: "Cases CRUD API with PATCH/DELETE endpoints, lifecycle transitions, metadata validation"
  - phase: 01-03
    provides: "React app with Vite, shadcn/ui components, auth store, api helper"
provides:
  - CaseDetailPage with tabbed layout (Overview + Timeline placeholder) at /cases/:id
  - Inline editing for case title, description, and metadata
  - LifecycleControl component with status badge and valid transition buttons
  - AssigneeSelect component with user dropdown populated from GET /users endpoint
  - CaseMetadata component with view/edit toggle using SchemaForm
  - Delete case flow with Dialog confirmation and navigation
  - GET /users API endpoint returning active users for assignment dropdowns
  - useUsers hook with 10min staleTime for infrequent user list data
affects: [03-timeline, all phases requiring case detail navigation]

# Tech tracking
tech-stack:
  added: []
  patterns: [inline-editing-click-to-edit, lifecycle-state-transitions, tabbed-layout, delete-with-dialog-confirmation]

key-files:
  created:
    - server/src/routers/users.py
    - client/src/hooks/useUsers.ts
    - client/src/components/cases/AssigneeSelect.tsx
    - client/src/components/cases/LifecycleControl.tsx
    - client/src/components/cases/CaseMetadata.tsx
    - client/src/pages/CaseDetailPage.tsx
    - client/src/components/ui/dialog.tsx
    - client/src/components/ui/tabs.tsx
  modified:
    - server/src/main.py
    - client/src/App.tsx

key-decisions:
  - "useUsers hook with 10min staleTime since user list changes infrequently"
  - "Inline title editing via click-to-edit with Enter/blur to save, Escape to cancel"
  - "Description uses Save/Cancel buttons instead of blur-to-save for multi-line content"
  - "LifecycleControl uses static TRANSITIONS map matching server-side VALID_TRANSITIONS"
  - "AssigneeSelect uses __unassigned__ sentinel for Radix Select null representation"
  - "Feedback messages auto-clear after 3 seconds for non-blocking UX"

patterns-established:
  - "Inline editing pattern: click text to show input, blur/Enter to save (single-line), Save/Cancel buttons (multi-line)"
  - "Lifecycle transitions UI: static map of status->allowed transitions with styled buttons (primary/destructive/outline)"
  - "Delete confirmation: Dialog component with Cancel + destructive Confirm, navigate on success"
  - "Case detail layout: back link, title+badge header, status+assignee row, tabbed content"

# Metrics
duration: 3min
completed: 2026-02-10
---

# Phase 2 Plan 5: Case Detail Page Summary

**Case detail page with inline editing for title/description/metadata, lifecycle state controls, user assignment dropdown, delete with Dialog confirmation, and tabbed Overview/Timeline layout**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-10T17:22:41Z
- **Completed:** 2026-02-10T17:26:01Z
- **Tasks:** 3 (2 auto + 1 checkpoint auto-approved)
- **Files modified:** 10 (8 created, 2 modified)

## Accomplishments
- GET /users API endpoint returning active users for assignment dropdowns, registered in FastAPI app
- useUsers hook with 10-minute staleTime for efficient user list caching
- AssigneeSelect component with user dropdown from useUsers and Unassigned option
- LifecycleControl component displaying status badge with valid transition buttons (matching CaseList badge styling)
- CaseMetadata component with view/edit toggle: view mode shows labeled key-value grid, edit mode renders SchemaForm
- CaseDetailPage with tabbed layout (Overview active, Timeline placeholder), inline title/description editing, metadata editing, lifecycle controls, assignment, and delete with Dialog confirmation
- Router updated to replace placeholder with actual CaseDetailPage

## Task Commits

Each task was committed atomically:

1. **Task 1: Users API endpoint, AssigneeSelect, and LifecycleControl** - `72c4d95` (feat)
2. **Task 2: CaseMetadata inline editing and CaseDetailPage** - `ea6e1f5` (feat)
3. **Task 3: Verify complete case management flow** - Checkpoint auto-approved (Docker not available)

## Files Created/Modified
- `server/src/routers/users.py` - GET /users endpoint returning active users for assignment dropdown
- `server/src/main.py` - Registered users_router in FastAPI app
- `client/src/hooks/useUsers.ts` - TanStack Query hook for fetching user list with 10min staleTime
- `client/src/components/cases/AssigneeSelect.tsx` - User assignment dropdown with Unassigned option
- `client/src/components/cases/LifecycleControl.tsx` - Status badge with transition buttons (Start/Close/Reopen)
- `client/src/components/cases/CaseMetadata.tsx` - View/edit metadata component using SchemaForm
- `client/src/pages/CaseDetailPage.tsx` - Full case detail page with tabs, inline editing, lifecycle, assignment, delete
- `client/src/components/ui/dialog.tsx` - shadcn Dialog component for delete confirmation
- `client/src/components/ui/tabs.tsx` - shadcn Tabs component for Overview/Timeline layout
- `client/src/App.tsx` - Replaced CaseDetailPlaceholder with CaseDetailPage, removed placeholder function

## Decisions Made
- **useUsers staleTime 10min:** User list changes very infrequently compared to case data, so longer cache time reduces unnecessary API calls.
- **Inline title editing pattern:** Click-to-edit with Input component, save on Enter/blur, cancel on Escape. Consistent with common SaaS inline editing UX.
- **Description editing with buttons:** Multi-line content uses explicit Save/Cancel buttons instead of blur-to-save, preventing accidental saves during text editing.
- **Static TRANSITIONS map in LifecycleControl:** Mirrors server-side VALID_TRANSITIONS dict to show only valid buttons. Server still validates transitions, so this is a UX convenience, not a security measure.
- **Sentinel value for unassigned:** Uses `__unassigned__` as Radix Select value for null assignment, consistent with the `__all__` sentinel pattern from CaseFilters (02-04).
- **Auto-clearing feedback:** 3-second timeout clears success/error messages automatically for non-blocking user experience.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## Docker Verification (Deferred)

Task 3 was a checkpoint:human-verify requiring Docker to test the complete case management flow in-browser. Docker is not available on this machine. The following verification steps should be executed when Docker is installed:

1. `docker compose up -d` to start the full stack
2. Navigate to http://localhost, log in with admin/changeme
3. Verify case list page shows as default view
4. Create a new case with "USB Usage" audit type and verify dynamic form fields
5. Switch to "Email Usage" and verify different form fields appear
6. Submit the form and verify case appears in list
7. Click case row to open detail view at /cases/:id
8. Verify Overview tab shows metadata in labeled grid
9. Click Edit on metadata, change a field, save, and verify persistence
10. Change status from Open to Active via LifecycleControl
11. Assign case to admin user via AssigneeSelect
12. Test delete: click Delete Case, confirm in Dialog, verify redirect to empty list
13. Verify Timeline tab shows placeholder text
14. Test inline title editing: click title, modify, press Enter
15. Test description editing: click description, modify, click Save

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 2 is now complete: all 5 plans executed successfully
- Full case management system: schema registry, CRUD API, case creation with dynamic forms, filterable case list, and case detail with inline editing
- All CASE-01 through CASE-07 requirements fulfilled
- Ready for Phase 3 (Timeline/Events) which will populate the Timeline tab placeholder
- Client builds and TypeScript compiles without errors

## Self-Check: PASSED

- All 10 created/modified files verified present on disk
- All 2 commit hashes verified in git log (72c4d95, ea6e1f5)

---
*Phase: 02-audit-schemas-cases*
*Completed: 2026-02-10*
