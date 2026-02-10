# Requirements: AuditTrail

**Defined:** 2026-02-10
**Core Value:** Auditors can rapidly document and report on data movement incidents with a seamless inline editing experience that handles both individual events and bulk file operations without friction.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication

- [ ] **AUTH-01**: User can log in with username and password
- [ ] **AUTH-02**: User session persists across browser refresh via JWT
- [ ] **AUTH-03**: User can log out from any page

### Case Management

- [ ] **CASE-01**: User can create a case by selecting audit type (USB usage or email usage)
- [ ] **CASE-02**: Case metadata fields auto-populate based on selected audit type schema (USB: S/N, User Name, User ID, Computer Used)
- [ ] **CASE-03**: User can edit case metadata inline
- [ ] **CASE-04**: User can delete a case
- [ ] **CASE-05**: User can set case lifecycle state (open, active, closed)
- [ ] **CASE-06**: User can view filterable/searchable list of all cases
- [ ] **CASE-07**: User can assign a case to a specific auditor on the team

### Jira Integration

- [ ] **JIRA-01**: User can provide a Jira issue URL to auto-populate case metadata
- [ ] **JIRA-02**: Tool scrapes Jira issue page via headless browser on internal network
- [ ] **JIRA-03**: User can configure field mapping (Jira field to case field) per audit type
- [ ] **JIRA-04**: Scraped values pre-fill case form for user review before saving

### Timeline & Events

- [ ] **EVNT-01**: User can add events to a case timeline chronologically
- [ ] **EVNT-02**: User can inline-edit events directly in the timeline view
- [ ] **EVNT-03**: Date/time entry uses fast picker with minimal clicks (date picker + time selector)
- [ ] **EVNT-04**: Each event captures: date, time, file name, file count, file description, file type
- [ ] **EVNT-05**: User can delete events from the timeline
- [ ] **EVNT-06**: Events display with visual type icons (findings, actions, notes)
- [ ] **EVNT-07**: Timeline updates optimistically (instant UI feedback, background save)
- [ ] **EVNT-08**: User can navigate and enter events via keyboard shortcuts (Tab, Enter)

### File Batch Grouping

- [ ] **FILE-01**: User can create free-form file batch groups with label, count, description, and file types
- [ ] **FILE-02**: User can attach multiple file batches to a single event
- [ ] **FILE-03**: User can use quick-add templates for common file grouping patterns

### Data Import

- [ ] **IMPT-01**: User can upload Excel or CSV file to parse into timeline events
- [ ] **IMPT-02**: Column mapping wizard lets user visually map spreadsheet columns to event fields
- [ ] **IMPT-03**: Import shows summary with success count, error count, and validation details

### Report Generation

- [ ] **REPT-01**: User can generate PDF report in quick timeline mode (case summary + chronological events)
- [ ] **REPT-02**: User can generate PDF report in detailed narrative mode (findings, conclusions, recommendations)
- [ ] **REPT-03**: User can generate DOCX report in both timeline and narrative modes
- [ ] **REPT-04**: User can generate self-contained offline HTML report with dashboard stats and visual timeline
- [ ] **REPT-05**: HTML report includes interactive charts (hover, zoom, pan) via embedded Plotly
- [ ] **REPT-06**: HTML report works when opened directly from filesystem with no server or network

### Data Completeness

- [ ] **COMP-01**: Empty/missing fields display visible color indicator throughout the app
- [ ] **COMP-02**: Case review screen highlights all incomplete fields before report generation

### Infrastructure

- [ ] **INFR-01**: Application deploys via Docker Compose on airgapped network
- [ ] **INFR-02**: Zero external network calls at runtime (all assets bundled)
- [ ] **INFR-03**: PostgreSQL data persists across container restarts via named Docker volumes

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Notifications

- **NOTF-01**: User receives in-app notifications for case assignments
- **NOTF-02**: User receives notification when assigned case is updated

### Access Control

- **RBAC-01**: Role-based permissions (auditor, reviewer, admin)
- **RBAC-02**: Case-level visibility restrictions

### Advanced Import

- **AIMPT-01**: Automated log ingestion from SIEM systems
- **AIMPT-02**: Bulk case creation from structured data source

### Additional Audit Types

- **ATYP-01**: User can create custom audit type schemas via UI
- **ATYP-02**: Support for network access, physical access, and print audit types

### Report Customization

- **RCST-01**: User can customize report templates via UI
- **RCST-02**: Full-text search across all cases and events

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time collaboration / live co-editing | Overkill for 2-5 user team |
| Cloud deployment / SaaS | Airgapped environment only |
| Mobile app | Browser on LAN is the access model |
| OAuth / SSO login | Simple username/password sufficient for internal tool |
| Video/audio evidence attachments | Storage complexity, not core to data movement auditing |
| Jira API integration | No API access available — web scraping only |
| Automated remediation workflows | Out of scope — this is documentation, not response |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | — | Pending |
| AUTH-02 | — | Pending |
| AUTH-03 | — | Pending |
| CASE-01 | — | Pending |
| CASE-02 | — | Pending |
| CASE-03 | — | Pending |
| CASE-04 | — | Pending |
| CASE-05 | — | Pending |
| CASE-06 | — | Pending |
| CASE-07 | — | Pending |
| JIRA-01 | — | Pending |
| JIRA-02 | — | Pending |
| JIRA-03 | — | Pending |
| JIRA-04 | — | Pending |
| EVNT-01 | — | Pending |
| EVNT-02 | — | Pending |
| EVNT-03 | — | Pending |
| EVNT-04 | — | Pending |
| EVNT-05 | — | Pending |
| EVNT-06 | — | Pending |
| EVNT-07 | — | Pending |
| EVNT-08 | — | Pending |
| FILE-01 | — | Pending |
| FILE-02 | — | Pending |
| FILE-03 | — | Pending |
| IMPT-01 | — | Pending |
| IMPT-02 | — | Pending |
| IMPT-03 | — | Pending |
| REPT-01 | — | Pending |
| REPT-02 | — | Pending |
| REPT-03 | — | Pending |
| REPT-04 | — | Pending |
| REPT-05 | — | Pending |
| REPT-06 | — | Pending |
| COMP-01 | — | Pending |
| COMP-02 | — | Pending |
| INFR-01 | — | Pending |
| INFR-02 | — | Pending |
| INFR-03 | — | Pending |

**Coverage:**
- v1 requirements: 39 total
- Mapped to phases: 0
- Unmapped: 39 ⚠️

---
*Requirements defined: 2026-02-10*
*Last updated: 2026-02-10 after initial definition*
