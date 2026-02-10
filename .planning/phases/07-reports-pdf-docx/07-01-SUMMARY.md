# 07-01 Summary: Report Data Collection Pipeline

**Status:** Complete
**Duration:** ~3min

## What Was Built

### Report Schemas (server/src/schemas/report.py)
- Extended existing schema file with `ReportFormat` enum (pdf, docx, html) and `ReportMode` enum (timeline, narrative)
- Preserved existing `DashboardStats` and `ReportResponse` classes for Phase 8 compatibility

### Report Data Collection Service (server/src/services/report_generator.py)
- `collect_report_data(case_id, db, current_user)` async function
- Fetches case with all relationships (audit_type, assigned_to, created_by)
- Fetches events sorted chronologically with file_batches loaded via selectinload
- Returns template-ready dict with:
  - `case`: case_number, title, description, status, timestamps
  - `audit_type`: name, slug
  - `assigned_to`, `created_by`: display names
  - `metadata_fields`: list of {label, value} dicts from case metadata
  - `events`: list with formatted dates/times, event details, nested file_batches
  - `stats`: total_events, total_file_count, findings/actions/notes counts, date range
  - `generated_at`, `generated_by`: generation metadata

### Report Router (server/src/routers/reports.py)
- Registered at `/cases/{case_id}/reports` with tag "reports"
- GET `/generate` endpoint with query params: format (pdf/docx), mode (timeline/narrative)
- Validates format and mode parameters (422 on invalid)
- Calls collect_report_data and returns placeholder JSON (PDF/DOCX rendering in 07-03/07-04)

### Main App Registration (server/src/main.py)
- Reports router imported and registered with `app.include_router(reports_router)`

## Decisions
- Kept existing `ReportFormat.html` value for Phase 8 forward compatibility
- Used dict return type (not Pydantic model) for report data to keep template flexibility
- Date/time formatting done in data collection layer (not in templates) for consistency across PDF and DOCX

## Files Modified
- `server/src/schemas/report.py` -- added ReportFormat.pdf/docx, ReportMode enum
- `server/src/services/report_generator.py` -- new: data collection pipeline
- `server/src/routers/reports.py` -- new: report generation endpoint
- `server/src/main.py` -- registered reports router
