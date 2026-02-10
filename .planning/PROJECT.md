# AuditTrail

## What This Is

A dockerized web application for managing audit cases on airgapped networks. Auditors create cases by type (USB usage, email usage), populate case metadata from schema-driven forms, build chronological timelines of events with file batch details, and generate reports in PDF, DOCX, or self-contained offline interactive HTML. Built for small teams (2-5 auditors) with simple authentication.

## Core Value

Auditors can rapidly document and report on data movement incidents with a seamless inline editing experience that handles both individual events and bulk file operations (thousands of files) without friction.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Schema-driven audit types (USB usage, email usage) with type-specific metadata fields
- [ ] Case creation with auto-populated metadata (USB: S/N, User Name, User ID, Computer Used)
- [ ] Chronological timeline of events per case with inline editing
- [ ] Fast date/time entry for timeline events (minimal clicks)
- [ ] File batch grouping — auditor-defined groups with label, count, description, and file types
- [ ] Excel/CSV import to auto-parse structured data into timeline events
- [ ] In-app inline event entry as primary data entry flow
- [ ] PDF report generation (quick timeline + detailed narrative)
- [ ] DOCX report generation (quick timeline + detailed narrative)
- [ ] Offline interactive HTML report — self-contained with dashboard stats and visual timeline
- [ ] Simple login authentication (username/password)
- [ ] Small team support (multiple auditors, shared case visibility)
- [ ] Dockerized deployment for airgapped networks

### Out of Scope

- Role-based access control / case-level permissions — simple login sufficient for v1
- Real-time collaboration / live co-editing — not needed for team size
- Cloud deployment / SaaS — airgapped environment only
- Mobile app — browser on LAN is the access model
- Automated log ingestion / SIEM integration — manual entry + CSV import covers v1
- Audit types beyond USB and email — extensible schema supports adding later

## Context

- Deployed on airgapped/isolated networks with no internet access
- Reports must be fully self-contained — no external CDN, fonts, or API calls
- The interactive HTML report needs to work when opened directly in a browser on any machine on the network (no server required for viewing)
- Bulk file scenarios are common (e.g., 7,000 files copied to USB) — the file grouping system must handle this without requiring per-file documentation
- Excel/CSV import is a power-user shortcut for pre-existing structured data; inline entry is the primary workflow
- Two report modes: quick timeline (case summary + chronological events) and detailed narrative (findings, conclusions, recommendations)

## Constraints

- **Deployment**: Docker containers — must run without internet access after initial image build
- **Network**: Airgapped — no external dependencies at runtime, all assets bundled
- **Database**: PostgreSQL (local, within Docker compose)
- **Team size**: 2-5 concurrent users
- **Reports**: Must render without any network calls — all JS/CSS/fonts embedded

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Dockerized web app over desktop app | Easier deployment on shared network, no per-machine installs | — Pending |
| PostgreSQL over SQLite | Better concurrent access for small team, structured data | — Pending |
| Schema-driven audit types | Extensible — new audit types added via schema, not code changes | — Pending |
| Free-form file batches over auto-grouping | Auditors know their data best, flexible grouping fits varied scenarios | — Pending |
| Both inline entry + CSV import | Primary flow is inline for speed, CSV for bulk pre-existing data | — Pending |

---
*Last updated: 2026-02-10 after initialization*
