# Project Research Summary

**Project:** AuditTrail
**Domain:** Audit case management web application (airgapped, Dockerized)
**Researched:** 2026-02-10
**Confidence:** HIGH

## Executive Summary

AuditTrail is an audit case management tool for small teams (2-5 auditors) on airgapped networks. The core workflow is: create a case by audit type (USB usage, email usage), populate schema-driven metadata, build a chronological event timeline with inline editing, attach file batch evidence, and generate reports in PDF, DOCX, or self-contained interactive HTML. This is a well-understood domain with proven technology choices. The recommended approach is a Python/FastAPI backend with a React SPA frontend, PostgreSQL for persistence, and Docker Compose for deployment. Every technology in the stack is mature, well-documented, and has HIGH confidence from verified package registry sources.

The key architectural insight is that audit type schemas should be stored as JSON Schema definitions in the database, with event metadata in PostgreSQL JSONB columns. This avoids the costly mistake of creating separate tables per audit type and makes the system extensible without code changes. The report generation pipeline shares a common data collection stage across three format-specific renderers (WeasyPrint for PDF, python-docx for DOCX, and Jinja2+Plotly for self-contained HTML). The self-contained HTML report is the most technically challenging deliverable -- it must inline all CSS, JavaScript (~3MB Plotly), fonts, and chart data into a single file that opens in any browser with zero network access.

The dominant risks are airgap-specific: dependency leakage (libraries that silently phone home), Docker image transfer failures (ARM vs x86 architecture mismatch), PostgreSQL data loss from incorrect volume mounts, and HTML reports that appear self-contained during development but break when opened from the filesystem. All of these are preventable with early infrastructure gates (build and test with `--network none` from Phase 1) and explicit verification checklists. The project's small user scale (2-5) means performance is not a concern, but the airgap deployment constraint demands rigorous offline testing throughout.

## Key Findings

### Recommended Stack

The stack is a Python 3.12 + FastAPI backend with a React 19 + TypeScript frontend, targeting PostgreSQL 17 in Docker Compose. All choices have HIGH confidence based on verified PyPI/npm package data.

**Core technologies:**
- **FastAPI (Python 3.12):** REST API with Pydantic-native validation. Schema-driven audit types map directly to Pydantic models. Auto-generated OpenAPI docs.
- **React 19 + TypeScript 5.7+:** Dominant frontend ecosystem. shadcn/ui for components, TanStack Query for server state, Zustand for minimal client state, React Hook Form + Zod for schema validation.
- **PostgreSQL 17:** JSONB columns for flexible audit type metadata, GIN indexes for efficient querying, full-text search for case search. Named Docker volumes for data persistence.
- **WeasyPrint:** HTML/CSS-to-PDF without a headless browser. Pure Python, lightweight, supports modern CSS. Shares Jinja2 templates with the HTML report format.
- **Plotly (Python):** `to_html(include_plotlyjs=True)` produces fully self-contained interactive charts (~3MB embedded JS). The key technology enabling offline interactive HTML reports.
- **Docker Compose v2:** Multi-container orchestration for app server, PostgreSQL, and optional Nginx reverse proxy. `docker save/load` for airgap transport.

**Key version constraints:** FastAPI requires Pydantic v2 (not v1). SQLAlchemy 2.0 and Alembic 1.18 must upgrade together. Tailwind CSS v4 (not v3) for automatic content detection and faster builds.

**Anti-stack (do NOT use):** Next.js (SSR pointless for airgapped SPA), Celery/Redis (overkill for 2-5 users), MongoDB (no ACID for audit data), Puppeteer/Chromium for PDF (heavy, fragile in Docker -- use WeasyPrint instead), Create React App (deprecated).

See [STACK.md](./STACK.md) for full library versions, installation commands, and alternatives analysis.

### Expected Features

*Note: FEATURES.md was not produced by the features researcher. Feature classification below is derived from PROJECT.md requirements, STACK.md capabilities, and ARCHITECTURE.md component design.*

**Must have (table stakes):**
- Schema-driven audit types with type-specific metadata fields (USB: S/N, User Name, User ID, Computer Used)
- Case CRUD with lifecycle management (open/active/closed)
- Chronological event timeline per case with inline editing
- Fast date/time entry for timeline events (minimal clicks)
- File batch grouping with label, count, description, file types
- Excel/CSV import to auto-parse structured data into events
- PDF report generation (quick timeline + detailed narrative)
- DOCX report generation (quick timeline + detailed narrative)
- Self-contained offline interactive HTML report with dashboard stats
- Simple login authentication (username/password, JWT)
- Dockerized deployment for airgapped networks

**Should have (differentiators for auditor productivity):**
- Optimistic UI updates on inline edits (via TanStack Query)
- Schema-driven form field rendering from JSON Schema + ui_hints
- Column mapping wizard for CSV/Excel import
- Interactive charts in HTML reports (hover, zoom, pan via Plotly)
- Event type visual differentiation in timeline (findings, actions, notes)
- Upload progress feedback for file attachments

**Defer (v2+):**
- Role-based access control / case-level permissions
- Real-time collaboration / live co-editing
- Automated log ingestion / SIEM integration
- Audit types beyond USB and email (schema system supports future addition)
- Custom report templates via UI
- Full-text search across all cases

### Architecture Approach

The application follows a modular monolith pattern: a single FastAPI process organized into domain modules (auth, cases, timeline, reports, import, audit-types) sharing a PostgreSQL database and a file storage Docker volume. This is the correct architecture for a 2-5 user tool -- it avoids microservice complexity while maintaining clean code boundaries. The frontend is a React SPA served as static files, communicating via REST API through an optional Nginx reverse proxy.

**Major components:**
1. **Auth Module** -- Simple JWT login/logout, session management for 2-5 users
2. **Cases Module** -- CRUD for audit cases, lifecycle management, audit type assignment
3. **Timeline Module** -- Chronological event management, inline editing, JSONB metadata validated against audit type schemas
4. **Audit Types Registry** -- JSON Schema definitions per audit type, stored in database, drives both form rendering and validation
5. **Import Parser** -- Excel/CSV file parsing, column mapping, batch event creation with per-row schema validation
6. **Reports Module** -- Three-stage pipeline (data collection, normalization, format-specific rendering) producing PDF, DOCX, and self-contained HTML
7. **File Storage** -- Docker volume for uploaded evidence and generated reports, linked to events via database references

**Key pattern: JSONB metadata with JSON Schema validation.** Events share a single table with common columns (timestamp, description, case_id) plus a JSONB `metadata` column for type-specific fields. The `audit_type_schemas` table holds JSON Schema definitions that drive both frontend form generation and backend validation. Adding a new audit type is a database row insert, not a code change.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for full system diagrams, data flow details, and anti-patterns.

### Critical Pitfalls

1. **Airgap dependency leakage** -- Libraries silently fetch resources from the internet (fonts, postinstall scripts, CDN links). Prevention: enforce `docker build/run --network none` as a CI gate from Phase 1. Audit all dependencies for network calls. This is the single most important gate for this project.

2. **PostgreSQL data loss on container recreation** -- Wrong volume mount path (`/var/lib/postgresql` vs `/var/lib/postgresql/data`) causes anonymous volumes that disappear on `docker compose down`. Prevention: use named volumes at the correct path, test the `down/up` cycle before storing any real data, include pg_dump backup scripts.

3. **Self-contained HTML reports that are not actually self-contained** -- Reports work when served from localhost but break when opened from the filesystem. Prevention: build the asset inlining pipeline first, test by opening files from the filesystem with no network, set a 5MB target file size budget.

4. **Docker image transfer failures** -- ARM Mac builds fail on x86 Linux targets. Prevention: always build with `--platform linux/amd64`, generate SHA256 checksums for image tarballs, test the full USB transfer cycle on a clean VM.

5. **Schema-driven forms that cannot evolve** -- Hardcoding audit types as Python classes or database columns makes adding new types require migrations and code changes. Prevention: use JSONB + JSON Schema from the start, version schemas, separate form schema from storage schema.

See [PITFALLS.md](./PITFALLS.md) for all 7 critical pitfalls, technical debt patterns, security mistakes, and the "looks done but isn't" verification checklist.

## Implications for Roadmap

Based on combined research, the dependency graph between components dictates a clear 6-phase structure. This matches the build order suggested independently by both ARCHITECTURE.md and the pitfall-to-phase mapping in PITFALLS.md.

### Phase 1: Foundation and Infrastructure

**Rationale:** Everything else depends on a working Docker Compose stack with persistent data, authentication, and the audit type schema registry. The airgap `--network none` gate must be established before any feature work begins -- this is the single most important early decision.
**Delivers:** Docker Compose stack (FastAPI + PostgreSQL + Nginx), database schema with migrations (Alembic), auth module (JWT login), audit type schema registry seeded with USB and email types, and the `--network none` build/run gate.
**Features addressed:** Simple login authentication, Dockerized deployment, schema-driven audit types (registry only).
**Pitfalls avoided:** Airgap dependency leakage (gate), PostgreSQL data loss (named volumes verified), Docker image transfer (platform flag established).
**Stack elements:** FastAPI, SQLAlchemy 2.0, Alembic, Pydantic, PostgreSQL 17, Docker Compose, uv, Nginx.

### Phase 2: Core Data Model and CRUD

**Rationale:** Cases and events are the foundational data model. Nothing else (timeline UI, import, reports) works without them. The JSONB metadata pattern and schema-driven validation must be proven here before building dependent features.
**Delivers:** Cases CRUD API with lifecycle states, events CRUD API with JSONB metadata validated against audit type schemas, file attachment upload/download, audit trail logging (append-only).
**Features addressed:** Case creation with auto-populated metadata, schema-driven metadata fields, file batch grouping (backend).
**Pitfalls avoided:** Schema-driven forms that cannot evolve (JSONB + JSON Schema from day one), audit trail integrity gaps (append-only log with before/after values from the start).
**Stack elements:** SQLAlchemy (JSONB, GIN indexes), Pydantic models, Alembic migrations, FastAPI background tasks.

### Phase 3: Timeline UX and Frontend Core

**Rationale:** The timeline is the primary user interface -- auditors spend most time here. It depends on the events API from Phase 2. Inline editing, fast date entry, and schema-driven form rendering are the core productivity features.
**Delivers:** React SPA with routing, case list dashboard, case detail view with tabs, chronological timeline UI, inline event editing with optimistic updates, schema-driven form rendering from JSON Schema + ui_hints, file attachment UI with batch grouping and upload progress.
**Features addressed:** Chronological timeline with inline editing, fast date/time entry, file batch grouping (UI), in-app event entry as primary workflow.
**Pitfalls avoided:** Timeline UX confusion (explicit save/cancel, visual event type differentiation), form field overload (collapsible sections, per-section validation).
**Stack elements:** React 19, TypeScript, Vite, React Router, TanStack Query, React Hook Form + Zod, Zustand, shadcn/ui, Tailwind CSS v4.

### Phase 4: Data Import

**Rationale:** CSV/Excel import is additive -- it depends on the events API and audit type schemas being stable, but nothing downstream depends on it. It is a power-user feature that accelerates data entry for bulk pre-existing data.
**Delivers:** Excel/CSV file parsing with encoding detection, column mapping wizard UI, batch event creation with per-row schema validation, import summary with success/error counts.
**Features addressed:** Excel/CSV import to auto-parse structured data into timeline events.
**Pitfalls avoided:** Excel import encoding failures (detect BOM, support CP1252/UTF-8, handle semicolon delimiters and varied decimal separators).
**Stack elements:** pandas, openpyxl (backend parsing), @tanstack/react-table (mapping UI).

### Phase 5: Report Generation

**Rationale:** Reports consume all other data (cases, events, files, statistics). They must be built last among features because they depend on everything else being stable. The self-contained HTML report is the most technically challenging deliverable and benefits from having real case data to test against.
**Delivers:** Report data collection pipeline, PDF renderer (WeasyPrint + Jinja2 templates), DOCX renderer (python-docx), self-contained HTML renderer (Jinja2 + Plotly with all assets inlined), report template system for quick timeline and detailed narrative modes.
**Features addressed:** PDF report generation, DOCX report generation, offline interactive HTML report with dashboard stats and visual timeline.
**Pitfalls avoided:** HTML reports not self-contained (build inlining pipeline first, test from filesystem), report generation blocking the API (use FastAPI BackgroundTasks or ProcessPoolExecutor for CPU-bound WeasyPrint rendering).
**Stack elements:** WeasyPrint, python-docx, Jinja2, Plotly (to_html with include_plotlyjs=True), Recharts (in-app dashboard charts).

### Phase 6: Polish, Packaging, and Deployment

**Rationale:** Airgap packaging is a deployment concern that wraps all completed features. End-to-end testing on an isolated network is the final validation gate. This phase also includes report template refinement based on real usage and UX polish.
**Delivers:** Airgap packaging scripts (docker save + checksums + load script), operator documentation, full USB transfer cycle test on clean VM, report template refinement, session timeout, content security policy, end-to-end smoke tests.
**Features addressed:** Dockerized deployment for airgapped networks (full packaging), small team support (multi-user concurrency verification).
**Pitfalls avoided:** Docker image transfer failures (full cycle test), plain-text passwords on USB (generate on first boot), no session timeout (15-minute idle timeout).

### Phase Ordering Rationale

- **Infrastructure first (Phase 1)** because the `--network none` gate protects every subsequent phase from airgap dependency leakage. This is the single highest-risk pitfall and must be caught immediately.
- **Data model before UI (Phase 2 before 3)** because the JSONB + JSON Schema architecture decision is extremely expensive to change later. Proving it works at the API level before building UI on top avoids costly rework.
- **Timeline UI as the third phase** because it is the primary user workflow and the most complex frontend work. It benefits from stable API contracts from Phase 2.
- **Import after timeline (Phase 4 after 3)** because import is additive and depends on stable event creation. It shares validation logic with the timeline but does not block it.
- **Reports last among features (Phase 5)** because they read from everything else. Building reports on unstable data models wastes template work.
- **Deployment packaging at the end (Phase 6)** because it wraps completed features. However, the `--network none` gate from Phase 1 means airgap compatibility is verified continuously, not just at the end.

### Research Flags

**Phases likely needing deeper research during planning:**
- **Phase 5 (Reports):** The self-contained HTML report with inlined Plotly (~3MB), base64 fonts, and embedded chart data is the most technically novel component. Needs research into Plotly's `to_image()` for static chart fallbacks in PDF, font subsetting for HTML reports, and file size optimization. WeasyPrint's CSS support limits (no JS execution) also need investigation for complex report layouts.
- **Phase 4 (Import):** CSV/Excel parsing edge cases (encoding detection, European locale formats, merged cells in Excel) vary significantly by real-world input files. Needs research with actual sample files from the auditor team.

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Foundation):** Docker Compose + FastAPI + PostgreSQL is an extremely well-documented pattern. The only non-standard element is the `--network none` gate, which is a simple Docker flag.
- **Phase 2 (Core Data):** CRUD APIs with JSONB and JSON Schema validation is a well-established PostgreSQL pattern with extensive documentation.
- **Phase 3 (Timeline UX):** React SPA with inline editing, TanStack Query for optimistic updates, and shadcn/ui components are standard patterns with abundant examples.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified against PyPI and npm registries (Feb 2026). Every library choice has clear rationale and documented alternatives. |
| Features | MEDIUM | FEATURES.md was not produced. Feature list derived from PROJECT.md requirements and cross-referenced with STACK.md capabilities and ARCHITECTURE.md components. Feature prioritization is inferred, not researched from competitive analysis. |
| Architecture | HIGH | Modular monolith with JSONB metadata is a proven pattern for this domain. Sources include PostgreSQL JSONB vs EAV analysis, government case management standards, and Docker monolith references. Build order independently confirmed by architecture dependency graph and pitfall-to-phase mapping. |
| Pitfalls | MEDIUM-HIGH | Combination of verified Docker/PostgreSQL documentation and domain-specific experience patterns. Airgap pitfalls well-documented. PDF generation pitfalls specific to WeasyPrint (not Puppeteer) need validation since PITFALLS.md focused on Puppeteer scenarios. |

**Overall confidence:** HIGH

The stack and architecture choices are well-supported. The missing FEATURES.md is the primary gap, but PROJECT.md provides a clear requirements list that compensates. The Puppeteer-vs-WeasyPrint inconsistency between PITFALLS.md and STACK.md is noted below as a gap.

### Gaps to Address

- **Missing FEATURES.md:** No competitive analysis or feature prioritization research was completed. The feature classification in this summary is derived from PROJECT.md and other research files. During planning, validate feature priorities with the auditor team -- particularly whether the interactive HTML report is truly a v1 must-have or can be deferred.

- **PITFALLS.md references Puppeteer/Chromium, but STACK.md recommends WeasyPrint:** The pitfalls research (Pitfall 3) focuses on Puppeteer/Chromium Docker failures, but the stack research explicitly recommends WeasyPrint over Puppeteer for PDF generation. WeasyPrint avoids the Chromium-in-Docker problems entirely (no headless browser, pure Python). During Phase 5 planning, validate that WeasyPrint handles all required PDF layouts (complex tables, embedded images, CJK characters) without needing Chromium as a fallback.

- **File batch grouping at scale:** PROJECT.md mentions scenarios with 7,000 files copied to USB. The architecture supports free-form batch grouping (label + count + description), but the actual UX for documenting 7,000 files in batch groups has not been researched. During Phase 3 planning, research how auditors currently organize large file sets and what batch granularity they need.

- **Report template design:** The technical pipeline for PDF/DOCX/HTML generation is well-researched, but actual report layouts (what sections, what visualizations, what statistics) need to be defined with auditor input. During Phase 5 planning, gather sample reports or report requirements from the team.

## Sources

### Primary (HIGH confidence)
- PyPI package registry -- FastAPI, SQLAlchemy, Alembic, Pydantic, WeasyPrint, python-docx, Plotly, pandas, Jinja2, Uvicorn, pytest (all versions verified Feb 2026)
- npm package registry -- React, Vite, React Router, TanStack Query, React Hook Form, Zustand, Zod, Tailwind CSS, Recharts, Vitest, shadcn/ui (all versions verified Feb 2026)
- [Plotly interactive HTML export](https://plotly.com/python/interactive-html-export/) -- self-contained HTML with `include_plotlyjs=True`
- [PostgreSQL versioning](https://www.postgresql.org/support/versioning/) -- v17 current stable
- [FastAPI Docker deployment](https://fastapi.tiangolo.com/deployment/docker/) -- official Docker guide
- [Docker Docs: Air-gapped containers](https://docs.docker.com/enterprise/security/hardened-desktop/air-gapped-containers/)

### Secondary (MEDIUM confidence)
- [Replacing EAV with JSONB in PostgreSQL](https://coussej.github.io/2016/01/14/Replacing-EAV-with-JSONB-in-PostgreSQL/) -- JSONB as superior alternative to EAV for dynamic metadata
- [Case Management Architecture (AGA)](https://architecture.digital.gov.au/case-management-standard) -- government case management standards
- [Self-contained HTML reports (HN)](https://news.ycombinator.com/item?id=46353359) -- patterns for single-file offline HTML
- [Puppeteer Troubleshooting](https://pptr.dev/troubleshooting) -- Docker/Chromium compatibility issues
- [Docker Compose Offline Stack Preparation](https://shantanoo-desai.github.io/posts/technology/docker-compose-offline-stack/) -- airgap deployment patterns
- [Air-gapped Python deployment](https://www.infoworld.com/article/3836692/airgapped-python-setting-up-python-without-a-network.html) -- wheel-based offline installs

### Tertiary (LOW confidence)
- Community consensus on Zustand vs Redux for small apps -- single blog post, but aligns with library download trends
- TanStack Router vs React Router comparison -- React Router recommended for SPA simplicity, needs validation if routing requirements grow

---
*Research completed: 2026-02-10*
*Ready for roadmap: yes*
