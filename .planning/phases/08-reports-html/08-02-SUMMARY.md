# 08-02 Summary: Plotly Chart Generation and API Endpoint

**Completed:** 2026-02-10
**Duration:** ~5min

## What Was Built

1. **Plotly Chart Generation** (added to `server/src/services/html_report.py`):
   - `_generate_timeline_chart()`: Interactive scatter plot showing events by date/type
     - Color-coded markers by event type (finding=red, action=green, note=indigo)
     - Marker size proportional to file_count
     - Hover text with date, time, file name, description
     - `include_plotlyjs=True` -- embeds the full ~4.8MB plotly.js library
   - `_generate_stats_chart()`: Bar chart showing events by type
     - `include_plotlyjs=False` -- reuses already-loaded plotly.js
   - `_generate_daily_activity_chart()`: Bar chart showing events per date
     - `include_plotlyjs=False` -- reuses already-loaded plotly.js
   - Empty state handling: annotation "No events recorded" for charts with no data

2. **API Endpoint** (added to `server/src/routers/reports.py`):
   - GET `/cases/{case_id}/reports/html` -- generates and downloads HTML report
   - Returns StreamingResponse with `text/html` content type
   - Content-Disposition header triggers browser download with filename `audit-report-{case_number}.html`
   - Integrated with existing Phase 7 reports router (already registered in main.py)

3. **Self-containment verification** (added to service):
   - `verify_self_contained()`: Scans HTML for external link tags, script src, @import, external images
   - `get_report_size_info()`: Returns size metrics and chart count
   - Verification runs automatically during generation; logs warnings on violations

4. **Updated generate() pipeline**:
   - Collects data -> generates 3 Plotly charts -> renders template -> verifies self-containment -> returns HTML

## Key Decisions

- Plotly.js embedded only once (~4.8MB) in the timeline chart; stats and daily charts use `include_plotlyjs=False`
- Total report size ~4.8MB with charts (acceptable for a self-contained file)
- Chart config enables displayModeBar and scrollZoom for interactivity

## Files Created/Modified

- `server/src/services/html_report.py` (modified - added chart generation, verification, updated pipeline)
- `server/src/routers/reports.py` (modified - added HTML endpoint)

## Verification

- Chart generation tested with mock data: timeline=4.8MB (includes plotly.js), stats=7KB, daily=7KB
- Router shows both `/generate` (Phase 7) and `/html` (Phase 8) endpoints
- All imports successful
