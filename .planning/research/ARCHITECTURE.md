# Architecture Research

**Domain:** Audit case management (airgapped, Dockerized web app)
**Researched:** 2026-02-10
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Docker Compose                              │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                     Reverse Proxy (Nginx)                     │  │
│  │              Static assets / SPA / API routing                │  │
│  └──────────────────────────┬────────────────────────────────────┘  │
│                             │                                       │
│  ┌──────────────────────────┴────────────────────────────────────┐  │
│  │                    Application Server                         │  │
│  │                                                               │  │
│  │  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │  │
│  │  │  Auth   │  │  Cases   │  │ Timeline │  │   Reports    │  │  │
│  │  │ Module  │  │  Module  │  │  Module  │  │   Module     │  │  │
│  │  └────┬────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘  │  │
│  │       │            │             │                │           │  │
│  │  ┌────┴────────────┴─────────────┴────────────────┴───────┐  │  │
│  │  │              Shared Services Layer                      │  │  │
│  │  │   (Audit Types Registry, File Storage, Import Parser)   │  │  │
│  │  └────────────────────────┬────────────────────────────────┘  │  │
│  └───────────────────────────┤                                   │  │
│                              │                                   │  │
│  ┌───────────────────────────┴───────────────────────────────┐   │  │
│  │                      PostgreSQL                            │   │  │
│  │   ┌──────────┐  ┌───────────┐  ┌─────────┐  ┌─────────┐  │   │  │
│  │   │  Cases   │  │  Events   │  │  Files  │  │  Users  │  │   │  │
│  │   │          │  │ (JSONB    │  │         │  │         │  │   │  │
│  │   │          │  │ metadata) │  │         │  │         │  │   │  │
│  │   └──────────┘  └───────────┘  └─────────┘  └─────────┘  │   │  │
│  └───────────────────────────────────────────────────────────┘   │  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                  File Storage Volume                           │  │
│  │           (uploaded evidence, generated reports)               │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘

                         ┌─────────────────────┐
                         │  Generated Reports  │
                         │  (PDF / DOCX / HTML) │
                         │  Offline viewable    │
                         └─────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Communicates With |
|-----------|----------------|-------------------|
| **Nginx (Reverse Proxy)** | Serves SPA static files, routes `/api/*` to app server, handles TLS | App Server |
| **App Server** | All business logic, REST API, session auth | PostgreSQL, File Storage |
| **Auth Module** | Simple login/logout, session management, user roles | PostgreSQL (users table) |
| **Cases Module** | CRUD for audit cases, case lifecycle (open/active/closed), audit type assignment | PostgreSQL, Audit Types Registry |
| **Timeline Module** | Chronological event management, inline editing, ordering, batch grouping | PostgreSQL (events table), File Storage |
| **Reports Module** | Multi-format report generation (PDF, DOCX, self-contained HTML) from case data | PostgreSQL (read), File Storage (write) |
| **Audit Types Registry** | Schema definitions for each audit type (USB, email, etc.), field validation rules | PostgreSQL (audit_type_schemas table) |
| **Import Parser** | Excel/CSV file parsing, column mapping, event creation from imported rows | PostgreSQL (events table), File Storage |
| **PostgreSQL** | All persistent data: cases, events (with JSONB metadata), users, files metadata, audit type schemas | App Server |
| **File Storage Volume** | Binary file storage for uploaded evidence and generated reports | App Server, Docker volume mount |

## Recommended Project Structure

```
audittrail/
├── docker-compose.yml          # Orchestrates all services
├── nginx/
│   └── nginx.conf              # Reverse proxy config
├── server/                     # Backend application
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/           # Authentication & sessions
│   │   │   ├── cases/          # Case CRUD & lifecycle
│   │   │   ├── timeline/       # Event management & ordering
│   │   │   ├── reports/        # Report generation pipeline
│   │   │   ├── import/         # Excel/CSV parsing & mapping
│   │   │   └── audit-types/    # Schema registry & validation
│   │   ├── services/
│   │   │   ├── file-storage/   # File upload/download handling
│   │   │   └── db/             # Database client, migrations
│   │   ├── templates/
│   │   │   ├── pdf/            # PDF report templates
│   │   │   ├── docx/           # DOCX report templates
│   │   │   └── html/           # Self-contained HTML template
│   │   └── app.ts              # Server entry point
│   ├── migrations/             # PostgreSQL schema migrations
│   └── Dockerfile
├── client/                     # Frontend SPA
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard/      # Case list & overview
│   │   │   ├── CaseDetail/     # Single case view (tabs)
│   │   │   ├── Timeline/       # Chronological event timeline
│   │   │   └── Login/          # Authentication page
│   │   ├── components/
│   │   │   ├── TimelineEvent/  # Single event with inline edit
│   │   │   ├── EventForm/      # Add/edit event (schema-driven fields)
│   │   │   ├── FileAttachments/# File upload & batch grouping
│   │   │   ├── ImportWizard/   # CSV/Excel import mapping UI
│   │   │   └── ReportConfig/   # Report format selection & generation
│   │   ├── hooks/              # Shared React hooks
│   │   └── lib/                # API client, utilities
│   └── Dockerfile
├── report-assets/              # Bundled JS/CSS for self-contained HTML reports
│   ├── chart-library.min.js    # Charting library (inlined into HTML reports)
│   └── report-styles.css       # Report styling (inlined into HTML reports)
└── scripts/
    ├── seed-audit-types.sql    # Default USB/email audit type schemas
    └── export-images.sh        # Docker image export for airgap transport
```

### Structure Rationale

- **`server/src/modules/`:** Modular monolith -- each domain gets its own directory with routes, handlers, and validation. Modules share the same database and process but have clear boundaries. Keeps the small-team benefit of a single deployment while making code navigable.
- **`server/src/templates/`:** Report templates separated from business logic. Each format has its own template directory because PDF, DOCX, and HTML reports require fundamentally different template approaches.
- **`client/src/pages/`:** Page-level components map directly to routes. The timeline page is the core UI -- it hosts the chronological event list, inline editing, and file attachment components.
- **`report-assets/`:** Pre-bundled JavaScript and CSS libraries that get inlined into self-contained HTML reports at generation time. These never fetch from CDNs since the reports must work offline on airgapped networks.
- **`scripts/`:** Operational scripts for seeding initial data and exporting Docker images to tarballs for airgap deployment.

## Architectural Patterns

### Pattern 1: JSONB Metadata Columns for Schema-Driven Audit Types

**What:** Instead of EAV tables or separate tables per audit type, store type-specific metadata in a JSONB column on the events table. A separate `audit_type_schemas` table holds the JSON Schema definition for each audit type, used for both frontend form generation and backend validation.

**When to use:** When different audit types (USB usage, email usage) need different metadata fields per event, but share common fields (timestamp, description, case reference).

**Trade-offs:**
- Pro: Adding new audit types requires only a new schema row, no migrations
- Pro: PostgreSQL GIN indexes on JSONB enable efficient querying
- Pro: Single events table simplifies timeline queries (no JOINs across type tables)
- Con: No database-level enforcement of JSONB structure (validation must happen in application layer)
- Con: Complex JSONB queries can be harder to optimize than column queries

**Database design:**

```sql
-- Schema definitions for each audit type
CREATE TABLE audit_type_schemas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,          -- 'usb_usage', 'email_usage'
    display_name TEXT NOT NULL,         -- 'USB Usage', 'Email Usage'
    json_schema JSONB NOT NULL,         -- JSON Schema defining metadata fields
    ui_hints JSONB,                     -- Field ordering, grouping, input types
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events with shared columns + type-specific JSONB metadata
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id),
    audit_type_id UUID NOT NULL REFERENCES audit_type_schemas(id),
    event_time TIMESTAMPTZ NOT NULL,    -- When the audited event occurred
    description TEXT,
    metadata JSONB NOT NULL DEFAULT '{}', -- Type-specific fields (validated against schema)
    sort_order INTEGER,                 -- Manual ordering within timeline
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_metadata ON events USING GIN (metadata);
CREATE INDEX idx_events_case_time ON events (case_id, event_time);
```

**Validation flow:**

```
User submits event data
    ↓
Server looks up audit_type_schemas.json_schema for the event's type
    ↓
Validates metadata JSONB against JSON Schema (ajv or similar)
    ↓
Rejects with field-level errors if invalid, saves if valid
    ↓
Frontend uses same schema + ui_hints to render dynamic form fields
```

### Pattern 2: Report Generation Pipeline (Multi-Format from Single Data)

**What:** A three-stage pipeline that separates data collection, transformation, and rendering. The same collected data feeds into format-specific renderers, each producing a different output format.

**When to use:** When you need PDF, DOCX, and self-contained HTML reports from the same case data.

**Trade-offs:**
- Pro: Adding a new format means adding only a new renderer, not touching data collection
- Pro: Report data is format-agnostic until the final step
- Con: Each renderer has different constraints (e.g., HTML can be interactive, PDF cannot)
- Con: Maintaining three renderers requires familiarity with each output library

**Pipeline:**

```
┌─────────────────┐     ┌───────────────────┐     ┌─────────────────────┐
│  Data Collector  │────→│   Report Data     │────→│  Format Renderer    │
│                  │     │   (normalized)    │     │                     │
│  - Case metadata │     │  {                │     │  ┌── PDF Renderer   │
│  - Timeline      │     │    case: {...},   │     │  │   (Puppeteer or  │
│  - File refs     │     │    events: [...], │     │  │    WeasyPrint)    │
│  - Statistics    │     │    files: [...],  │     │  ├── DOCX Renderer  │
│                  │     │    stats: {...}   │     │  │   (docxtemplater) │
│                  │     │  }                │     │  └── HTML Renderer  │
└─────────────────┘     └───────────────────┘     │      (self-contained│
                                                   │       bundler)      │
                                                   └─────────────────────┘
```

### Pattern 3: Self-Contained HTML Report with Embedded Data

**What:** Generate a single `.html` file that contains all CSS, JavaScript, chart libraries, and case data inlined. The JSON data is embedded in a `<script>` tag. The report is a fully functional mini-application that opens in any browser with no network access.

**When to use:** For sharing audit reports on airgapped networks where recipients cannot access a server.

**Trade-offs:**
- Pro: Zero dependencies -- double-click to open, works anywhere
- Pro: Interactive -- can include filtering, search, collapsible sections, charts
- Pro: No server needed to view
- Con: File size grows with data volume and inlined libraries (typically 1-5MB)
- Con: Cannot be incrementally updated (must regenerate entire file)
- Con: Complex to build -- must inline and bundle all assets

**Structure of generated HTML:**

```html
<!DOCTYPE html>
<html>
<head>
    <style>/* All CSS inlined here */</style>
</head>
<body>
    <div id="report-root"></div>

    <!-- Inlined chart library (Chart.js ~200KB minified) -->
    <script>/* Chart.js source inlined */</script>

    <!-- Case data embedded as JSON -->
    <script id="report-data" type="application/json">
        {"case": {...}, "events": [...], "stats": {...}}
    </script>

    <!-- Report application logic -->
    <script>
        const data = JSON.parse(
            document.getElementById('report-data').textContent
        );
        // Render dashboard, timeline, charts from data
    </script>
</body>
</html>
```

### Pattern 4: Modular Monolith with Clear Module Boundaries

**What:** Structure the backend as separate modules (auth, cases, timeline, reports, import, audit-types) within a single deployable process. Each module owns its routes, handlers, and validation. Modules communicate through a shared services layer and shared database, not through HTTP calls to each other.

**When to use:** Small team, single deployment target, Docker Compose infrastructure.

**Trade-offs:**
- Pro: Single process simplifies deployment, debugging, and transactions
- Pro: Module boundaries keep code organized as it grows
- Pro: Can extract modules into services later if needed (unlikely for this scale)
- Con: Requires discipline to maintain boundaries (no cross-module imports except through shared services)

## Data Flow

### Core Data Flows

```
1. CREATE CASE
   User → [Cases Module] → INSERT cases row → Return case with ID

2. ADD TIMELINE EVENT
   User fills schema-driven form
       ↓
   [Timeline Module] → Validate metadata against audit_type JSON Schema
       ↓
   INSERT events row (with JSONB metadata) → Return updated timeline

3. IMPORT CSV/EXCEL
   User uploads file + selects audit type + maps columns
       ↓
   [Import Module] → Parse file (xlsx/csv library)
       ↓
   Map columns to event fields + metadata fields per schema
       ↓
   Validate each row against audit_type JSON Schema
       ↓
   Batch INSERT events → Return import summary (success/error counts)

4. ATTACH FILES TO EVENT
   User uploads file(s) + assigns to event + optional batch label
       ↓
   [File Storage] → Save to Docker volume → INSERT file_attachments row
       ↓
   Link file to event (event_id FK) with batch_group label

5. GENERATE REPORT
   User selects case + format (PDF/DOCX/HTML)
       ↓
   [Reports Module] → Collect case data, events, file references, statistics
       ↓
   Normalize into report data structure
       ↓
   Route to format-specific renderer
       ↓
   PDF: Render HTML template → Puppeteer/WeasyPrint → PDF binary
   DOCX: Fill DOCX template → docxtemplater → DOCX binary
   HTML: Inline all assets + embed JSON data → Single .html file
       ↓
   Save to file storage → Return download URL

6. INLINE EDIT TIMELINE EVENT
   User clicks event field → Editable input appears
       ↓
   [Frontend] → PATCH /api/events/:id {field: newValue}
       ↓
   [Timeline Module] → Validate changed field → UPDATE events row
       ↓
   Return updated event → Frontend updates in-place (no page reload)
```

### State Management

```
┌───────────────────────────────────────────────────┐
│                   Frontend SPA                     │
│                                                    │
│   URL State (router)                               │
│     └── /cases/:id/timeline → loads case + events  │
│                                                    │
│   Server State (API cache / React Query)           │
│     ├── Case data        ← GET /api/cases/:id      │
│     ├── Timeline events  ← GET /api/cases/:id/events│
│     ├── Audit type schema← GET /api/audit-types/:id │
│     └── File attachments ← GET /api/events/:id/files│
│                                                    │
│   Local UI State (React useState)                  │
│     ├── Currently editing event ID                  │
│     ├── Import wizard step / column mapping         │
│     └── Report generation progress                 │
└───────────────────────────────────────────────────┘
```

### Key Data Flows

1. **Schema-driven form rendering:** Frontend fetches `audit_type_schemas` for the case's type, reads `json_schema` and `ui_hints`, dynamically renders form fields. Same schema validates on both client (immediate feedback) and server (authoritative enforcement).

2. **Timeline ordering:** Events have both `event_time` (the real-world timestamp of the audited activity) and `sort_order` (for manual reordering). Default sort is by `event_time`, but users can override with drag-to-reorder which updates `sort_order`.

3. **File batch grouping:** Files attach to events via `event_id`. A `batch_group` text field on `file_attachments` allows free-form grouping (e.g., "Exhibit A", "USB captures 2024-03-15"). Batch labels are per-event, not global.

4. **Report data assembly:** Reports pull from multiple tables in a single transaction: case details, all events (with JSONB metadata), file attachment metadata, and computed statistics (event counts by type, date range, etc.).

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1-10 users (target) | Current architecture is ideal. Single PostgreSQL, single app server, Docker Compose. No optimization needed. |
| 10-50 users | Add connection pooling if not present. Consider read replicas if report generation blocks queries. Unlikely to be needed. |
| 50+ users | Not a realistic scenario for an airgapped audit tool. If reached, extract report generation to a background worker queue. |

### Scaling Priorities

1. **First bottleneck: Report generation.** PDF generation (via Puppeteer/WeasyPrint) is CPU-intensive and can block the event loop. Mitigation: run report generation in a child process or worker thread so API requests remain responsive. At target scale (1-10 users), this is unlikely to be a problem but is easy to architect correctly from the start.
2. **Second bottleneck: Large CSV imports.** Importing 10,000+ row spreadsheets into events requires batch inserts and progress feedback. Mitigation: stream-parse the file, validate in chunks, insert with batch transactions, and return progress via polling or SSE.

## Anti-Patterns

### Anti-Pattern 1: Separate Tables Per Audit Type

**What people do:** Create `usb_events`, `email_events`, etc. -- one table per audit type with type-specific columns.
**Why it's wrong:** Timeline queries must UNION across all type tables. Adding a new audit type requires a migration and new code paths. The timeline UI becomes a maintenance burden because each type has different query logic.
**Do this instead:** Single `events` table with a JSONB `metadata` column. Audit type schemas stored in a registry table. One query gets the full timeline; type-specific fields live in JSONB.

### Anti-Pattern 2: CDN-Dependent HTML Reports

**What people do:** Generate HTML reports that reference Chart.js, Bootstrap, or fonts from CDNs.
**Why it's wrong:** Reports are viewed on airgapped networks with no internet. CDN links will fail silently, producing broken reports.
**Do this instead:** Inline all JavaScript, CSS, and font assets directly into the HTML file at generation time. Use base64-encoded data URIs for any images. The HTML file must be 100% self-contained.

### Anti-Pattern 3: Generic File Storage Without Event Linkage

**What people do:** Implement a global file manager where files exist independently, linked to cases but not to specific timeline events.
**Why it's wrong:** Audit reports need to show which evidence files relate to which events. Without event-level linkage, report generation cannot accurately associate evidence with timeline entries.
**Do this instead:** Files always attach to a specific event. If a file is general to the case (not tied to a specific event), create a "general evidence" event as a catch-all. This ensures every file appears in timeline context.

### Anti-Pattern 4: Storing Report Templates in the Database

**What people do:** Put report templates (DOCX templates, HTML templates) in database blob columns to make them "configurable."
**Why it's wrong:** Templates contain logic (loops, conditionals), reference specific data paths, and need version control. Database storage makes them harder to develop, test, and debug.
**Do this instead:** Store templates as files in the repository under `server/src/templates/`. Version control tracks changes. If users need to customize templates, provide a clearly bounded "report settings" UI (logo, header text, color scheme) stored as simple config in the database, not the templates themselves.

## Integration Points

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Frontend SPA <-> App Server | REST API (JSON over HTTP) | All data flows through `/api/*` endpoints. No WebSocket needed at this scale. |
| App Server <-> PostgreSQL | SQL via connection pool | Use parameterized queries or an ORM. Migrations managed by a migration tool (e.g., node-pg-migrate, Knex, Prisma). |
| App Server <-> File Storage | Filesystem read/write | Docker volume mounted into the app container. Files referenced by path in `file_attachments` table. |
| Nginx <-> App Server | HTTP proxy_pass | Nginx handles static files (SPA bundle) and reverse-proxies API requests to the app server. |
| Report Renderer <-> Report Assets | Filesystem read at generation time | HTML renderer reads `report-assets/` to inline JS/CSS into the self-contained HTML output. |

### Airgapped Deployment Boundary

| Concern | Approach | Notes |
|---------|----------|-------|
| Docker images | Export with `docker save`, transport via USB/removable media, load with `docker load` | All images must be pre-built; no `docker pull` on target network. |
| NPM dependencies | `npm ci` during image build, not at runtime | `node_modules` baked into Docker image. No npm registry access needed at deployment. |
| Frontend assets | Built into static files during Docker image build | SPA bundle included in Nginx image. No CDN references. |
| Report libraries | Vendored into repository or Docker image | Chart.js, fonts, CSS frameworks saved locally. Never fetched at runtime. |
| Database initialization | Init scripts in `docker-entrypoint-initdb.d/` | Schema migrations and seed data (audit type schemas) run automatically on first start. |

## Build Order (Suggested Implementation Sequence)

The dependency graph between components dictates a natural build order:

```
Phase 1: Foundation
    ├── Docker Compose skeleton (Nginx + App + PostgreSQL)
    ├── Database schema + migrations
    ├── Auth module (simple login)
    └── Audit type schema registry (seed USB + email types)
         ↓
Phase 2: Core Data
    ├── Cases CRUD (depends on: auth, database)
    ├── Timeline events CRUD (depends on: cases, audit type schemas)
    └── Schema-driven form rendering (depends on: audit type schemas)
         ↓
Phase 3: Timeline UX
    ├── Chronological timeline UI (depends on: events CRUD)
    ├── Inline editing (depends on: timeline UI)
    ├── Fast date/time entry (depends on: timeline UI)
    └── File attachments + batch grouping (depends on: events, file storage)
         ↓
Phase 4: Import
    ├── CSV/Excel parsing (depends on: events CRUD, audit type schemas)
    └── Column mapping wizard UI (depends on: parsing, schema-driven fields)
         ↓
Phase 5: Reports
    ├── Report data collector (depends on: cases, events, files all working)
    ├── PDF renderer (depends on: data collector)
    ├── DOCX renderer (depends on: data collector)
    └── Self-contained HTML renderer (depends on: data collector, report-assets)
         ↓
Phase 6: Polish & Deployment
    ├── Airgap packaging scripts
    ├── Report template refinement
    └── End-to-end testing on isolated network
```

**Build order rationale:**
- The audit type schema registry must exist before events, because events validate metadata against schemas. Build it in Phase 1.
- Cases and events are the core data model. Nothing else works without them. Build in Phase 2.
- Timeline UX (inline editing, date entry) depends on having a working events API. Build in Phase 3.
- Import depends on the events API and audit type schemas for validation. It is additive, not foundational. Build in Phase 4.
- Reports consume all other data (cases, events, files). They must be built last because they depend on everything else being stable. Build in Phase 5.
- Airgap packaging is a deployment concern, not a feature. Test it last when all features are complete. Build in Phase 6.

## Sources

- [Replacing EAV with JSONB in PostgreSQL](https://coussej.github.io/2016/01/14/Replacing-EAV-with-JSONB-in-PostgreSQL/) -- JSONB as superior alternative to EAV pattern
- [PostgreSQL JSONB vs. EAV](https://www.razsamuel.com/postgresql-jsonb-vs-eav-dynamic-data/) -- Trade-off analysis for dynamic metadata storage
- [Polymorphism in Database Schema Design](https://bugfree.ai/knowledge-hub/polymorphism-in-database-schema-design) -- Single table inheritance and polymorphic patterns in SQL
- [Carbone - Report and Document Generator](https://carbone.io/) -- Multi-format report generation from JSON data
- [Docxtemplater](https://docxtemplater.com/) -- DOCX template-based document generation
- [Self-contained HTML reports (Hacker News)](https://news.ycombinator.com/item?id=46353359) -- Patterns for single-file HTML tools that run offline
- [Quarto self-contained HTML](https://github.com/quarto-dev/quarto-cli/discussions/2666) -- Inlining all assets into single HTML output
- [Chart.js step-by-step guide](https://www.chartjs.org/docs/latest/getting-started/usage.html) -- Charting library suitable for embedding in offline HTML
- [Rocket.Chat Air-Gapped Deployment](https://docs.rocket.chat/docs/rocketchat-air-gapped-deployment) -- Docker image export/import patterns for airgapped environments
- [Case Management Architecture (AGA)](https://architecture.digital.gov.au/case-management-standard) -- Government case management architecture standards
- [Docker App Monolith example](https://github.com/johncmunson/docker-app-monolith) -- Docker + Node + Nginx + Postgres monolith reference

---
*Architecture research for: AuditTrail -- audit case management on airgapped networks*
*Researched: 2026-02-10*
