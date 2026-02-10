# Roadmap: AuditTrail

## Overview

AuditTrail goes from zero to a fully dockerized audit case management tool for airgapped networks in 9 phases. The journey starts with infrastructure and authentication foundations, builds up the core data model (cases, schemas, events), layers on the primary auditor workflow (timeline inline editing with file batches), adds power-user features (CSV/Excel import, Jira scraping), delivers three report formats (PDF, DOCX, self-contained HTML), and closes with data completeness guardrails and airgap deployment packaging. Every phase delivers a coherent, verifiable capability that auditors can observe.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Infrastructure & Auth** - Docker Compose stack with PostgreSQL, FastAPI skeleton, JWT authentication, and airgap verification gate
- [ ] **Phase 2: Audit Type Schemas & Case Management** - Schema-driven audit types, case CRUD with lifecycle states, and team case visibility
- [ ] **Phase 3: Timeline & Events** - Chronological event timeline with inline editing, fast date entry, and keyboard navigation
- [ ] **Phase 4: File Batch Grouping** - Free-form file batch groups attached to events with quick-add templates
- [ ] **Phase 5: Data Import** - Excel/CSV upload with column mapping wizard and batch event creation
- [ ] **Phase 6: Jira Integration** - Headless browser scraping of internal Jira issues to auto-populate case metadata
- [x] **Phase 7: Report Generation - PDF & DOCX** - PDF and DOCX reports in both quick timeline and detailed narrative modes
- [ ] **Phase 8: Report Generation - Interactive HTML** - Self-contained offline HTML report with embedded Plotly charts and dashboard stats
- [ ] **Phase 9: Data Completeness & Deployment Packaging** - Missing field indicators, pre-report review screen, and airgap packaging scripts

## Phase Details

### Phase 1: Infrastructure & Auth
**Goal**: Auditors can log into a running application deployed via Docker Compose, with persistent data that survives container restarts
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, INFR-01, INFR-02, INFR-03
**Success Criteria** (what must be TRUE):
  1. User can open the application in a browser and see a login page
  2. User can log in with username and password, and their session persists after refreshing the browser
  3. User can log out from any page and is redirected to the login screen
  4. Application starts via `docker compose up` with no internet access required after image build
  5. Database data persists after running `docker compose down` and `docker compose up` again
**Plans**: 4 plans

Plans:
- [ ] 01-01-PLAN.md -- Docker Compose stack with FastAPI, PostgreSQL, Nginx, all Dockerfiles, and project scaffolding
- [ ] 01-02-PLAN.md -- Database layer (SQLAlchemy, Alembic, User model, seed data) and JWT auth endpoints
- [ ] 01-03-PLAN.md -- React SPA with login page, Zustand auth store, AuthGuard, Layout shell, and routing
- [ ] 01-04-PLAN.md -- Integration verification: rebuild images, end-to-end auth flow, persistence test, airgap check

### Phase 2: Audit Type Schemas & Case Management
**Goal**: Auditors can create, edit, and manage audit cases with schema-driven metadata fields that auto-populate based on the selected audit type
**Depends on**: Phase 1
**Requirements**: CASE-01, CASE-02, CASE-03, CASE-04, CASE-05, CASE-06, CASE-07
**Success Criteria** (what must be TRUE):
  1. User can create a new case by selecting USB usage or email usage as the audit type, and the form displays type-specific metadata fields (USB: S/N, User Name, User ID, Computer Used)
  2. User can edit case metadata inline without navigating to a separate edit page
  3. User can set case lifecycle state (open, active, closed) and assign a case to a team member
  4. User can view a list of all cases with filtering by status and searching by case details
  5. User can delete a case
**Plans**: 5 plans

Plans:
- [ ] 02-01-PLAN.md -- Audit type schema registry (AuditType model, JSONB schema column, migration, CRUD endpoints, USB/email seed data)
- [ ] 02-02-PLAN.md -- Cases API (Case model, JSONB metadata, CRUD with schema validation, lifecycle states, assignment, filtering/search)
- [ ] 02-03-PLAN.md -- Schema-driven case creation UI (TanStack Query, TypeScript types, SchemaForm component, CaseCreatePage)
- [ ] 02-04-PLAN.md -- Case list dashboard (CaseListPage with CaseFilters, CaseList table, status badges, pagination)
- [ ] 02-05-PLAN.md -- Case detail view (CaseDetailPage with tabs, inline metadata editing, lifecycle controls, assignment, delete)

### Phase 3: Timeline & Events
**Goal**: Auditors can build and edit a chronological timeline of events within a case using fast inline editing as their primary data entry workflow
**Depends on**: Phase 2
**Requirements**: EVNT-01, EVNT-02, EVNT-03, EVNT-04, EVNT-05, EVNT-06, EVNT-07, EVNT-08
**Success Criteria** (what must be TRUE):
  1. User can add events to a case timeline that display in chronological order, capturing date, time, file name, file count, file description, and file type
  2. User can click on any event field in the timeline and edit it inline without opening a modal or separate page
  3. User can enter dates and times with minimal clicks using a fast date picker and time selector
  4. User can navigate between event fields and create new events using keyboard shortcuts (Tab, Enter)
  5. Events save optimistically (instant UI feedback) with background persistence, and event types display with visual icons (findings, actions, notes)
**Plans**: TBD

Plans:
- [ ] 03-01: Events API (CRUD with JSONB metadata validated against audit type schema)
- [ ] 03-02: Timeline UI component with chronological display and event type icons
- [ ] 03-03: Inline editing with optimistic updates (TanStack Query mutations)
- [ ] 03-04: Fast date/time picker and keyboard navigation (Tab, Enter shortcuts)
- [ ] 03-05: Event deletion with confirmation and undo capability

### Phase 4: File Batch Grouping
**Goal**: Auditors can organize file evidence into labeled batch groups attached to timeline events, handling bulk scenarios (thousands of files) without per-file documentation
**Depends on**: Phase 3
**Requirements**: FILE-01, FILE-02, FILE-03
**Success Criteria** (what must be TRUE):
  1. User can create a file batch group with label, count, description, and file types
  2. User can attach multiple file batches to a single timeline event
  3. User can use quick-add templates for common file grouping patterns (e.g., "USB file copy", "email attachment batch")
**Plans**: 3 plans

Plans:
- [ ] 04-01-PLAN.md -- File batch API (FileBatch model, Pydantic schemas, nested CRUD router, Alembic migration, event ownership verification)
- [ ] 04-02-PLAN.md -- File batch UI within timeline events (TypeScript types, TanStack Query hooks, BatchList and BatchForm components)
- [ ] 04-03-PLAN.md -- Quick-add templates for common file grouping patterns (static template data, selector component, BatchForm integration)

### Phase 5: Data Import
**Goal**: Auditors can upload Excel or CSV files and map their columns to event fields, bulk-creating validated timeline events from pre-existing structured data
**Depends on**: Phase 3
**Requirements**: IMPT-01, IMPT-02, IMPT-03
**Success Criteria** (what must be TRUE):
  1. User can upload an Excel or CSV file and see its contents parsed correctly (handling various encodings and formats)
  2. User can visually map spreadsheet columns to event fields using a drag-and-drop or selection-based wizard
  3. User sees an import summary showing success count, error count, and per-row validation details before confirming
**Plans**: 4 plans

Plans:
- [x] 05-01-PLAN.md -- Backend file parsing (openpyxl + chardet, encoding detection, upload/validate/confirm endpoints)
- [x] 05-02-PLAN.md -- Column mapping API (row validation, multi-format date/time parsing, per-row error reporting)
- [x] 05-03-PLAN.md -- Column mapping wizard UI (FileUpload, ColumnMapper, ImportSummary, ImportPage with 3-step wizard)
- [x] 05-04-PLAN.md -- Batch event creation with validation summary (confirm endpoint, bulk Event creation, session cleanup)

### Phase 6: Jira Integration
**Goal**: Auditors can provide a Jira issue URL to auto-populate case metadata by scraping the internal Jira instance, with configurable field mapping per audit type
**Depends on**: Phase 2
**Requirements**: JIRA-01, JIRA-02, JIRA-03, JIRA-04
**Success Criteria** (what must be TRUE):
  1. User can paste a Jira issue URL when creating or editing a case, and the tool fetches issue data from the internal network
  2. Jira issue fields are scraped via headless browser and mapped to case metadata fields
  3. User can configure which Jira fields map to which case fields for each audit type
  4. Scraped values pre-fill the case form for user review and editing before saving
**Plans**: TBD

Plans:
- [ ] 06-01: Headless browser scraping service (Playwright/Puppeteer in Docker for internal Jira)
- [ ] 06-02: Jira field extraction and parsing logic
- [ ] 06-03: Field mapping configuration UI (per audit type Jira-to-case field mapping)
- [ ] 06-04: Case form pre-fill flow with scraped data review and user confirmation

### Phase 7: Report Generation - PDF & DOCX
**Goal**: Auditors can generate professional PDF and DOCX reports from any case in both quick timeline mode (case summary + chronological events) and detailed narrative mode (findings, conclusions, recommendations)
**Depends on**: Phase 3, Phase 4
**Requirements**: REPT-01, REPT-02, REPT-03
**Success Criteria** (what must be TRUE):
  1. User can generate a PDF report in quick timeline mode showing case summary and chronological events
  2. User can generate a PDF report in detailed narrative mode showing findings, conclusions, and recommendations
  3. User can generate a DOCX report in both timeline and narrative modes with the same content as the PDF
  4. Generated reports include all case metadata, timeline events, and file batch details
**Plans**: 5 plans

Plans:
- [x] 07-01-PLAN.md -- Report data collection pipeline (shared data service, schemas, API endpoint)
- [x] 07-02-PLAN.md -- Jinja2 report templates (base, timeline, narrative with professional CSS)
- [x] 07-03-PLAN.md -- PDF renderer (WeasyPrint with async thread pool, Jinja2 template rendering)
- [x] 07-04-PLAN.md -- DOCX renderer (python-docx with styled tables, color-coded events)
- [x] 07-05-PLAN.md -- Report generation UI (ReportDialog with format/mode selection, blob download)

### Phase 8: Report Generation - Interactive HTML
**Goal**: Auditors can generate a self-contained interactive HTML report that opens directly from the filesystem in any browser with zero network access, featuring dashboard stats and interactive visual timeline with Plotly charts
**Depends on**: Phase 7
**Requirements**: REPT-04, REPT-05, REPT-06
**Success Criteria** (what must be TRUE):
  1. User can generate a self-contained HTML report file that includes dashboard statistics and a visual timeline
  2. HTML report contains interactive Plotly charts with hover, zoom, and pan functionality
  3. HTML report works when opened directly from the filesystem (double-click) with no server, no network, and no external dependencies (all JS, CSS, fonts, and chart data embedded in the single file)
**Plans**: TBD

Plans:
- [ ] 08-01: HTML report template with inlined CSS, JS, and base64 fonts
- [ ] 08-02: Plotly chart generation (interactive timeline, dashboard stats) with full JS embedding
- [ ] 08-03: Asset inlining pipeline and self-containment verification (filesystem open test)
- [ ] 08-04: HTML report size optimization and cross-browser testing

### Phase 9: Data Completeness & Deployment Packaging
**Goal**: Auditors see clear visual indicators for missing data throughout the app, can review case completeness before generating reports, and the application is fully packaged for airgap deployment via USB transfer
**Depends on**: Phase 8
**Requirements**: COMP-01, COMP-02
**Success Criteria** (what must be TRUE):
  1. Empty or missing fields display a visible color indicator (e.g., amber highlight) throughout the entire application
  2. A case review screen highlights all incomplete fields before the user generates a report
  3. Application is packaged as Docker image tarballs with checksums and a load script for USB transfer to airgapped networks
  4. Full USB transfer cycle (save, copy, load, run) works on a clean machine with no internet
**Plans**: TBD

Plans:
- [ ] 09-01: Missing field indicators (color-coded empty state throughout app)
- [ ] 09-02: Pre-report case review screen with completeness checklist
- [ ] 09-03: Airgap packaging scripts (docker save, SHA256 checksums, load script, operator docs)
- [ ] 09-04: End-to-end deployment verification on clean environment

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9

Note: Phase 5 (Data Import) and Phase 6 (Jira Integration) can execute in parallel after their dependencies are met. Phase 5 depends on Phase 3; Phase 6 depends on Phase 2.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Infrastructure & Auth | 0/4 | Not started | - |
| 2. Audit Type Schemas & Case Management | 0/5 | Not started | - |
| 3. Timeline & Events | 0/5 | Not started | - |
| 4. File Batch Grouping | 0/3 | Not started | - |
| 5. Data Import | 4/4 | Complete | 2026-02-10 |
| 6. Jira Integration | 0/4 | Not started | - |
| 7. Report Generation - PDF & DOCX | 5/5 | Complete | 2026-02-10 |
| 8. Report Generation - Interactive HTML | 0/4 | Not started | - |
| 9. Data Completeness & Deployment Packaging | 0/4 | Not started | - |

---
*Roadmap created: 2026-02-10*
*Last updated: 2026-02-10*
