# 07-04 Summary: DOCX Renderer (python-docx)

**Status:** Complete
**Duration:** ~4min

## What Was Built

### python-docx Dependency (server/pyproject.toml)
- Added `python-docx>=1.1.0` to project dependencies

### DOCX Generation Functions (server/src/services/report_generator.py)

**Helper functions:**
- `_set_cell_shading(cell, color_hex)` -- applies background color to table cells via OpenXML
- `_style_header_row(table, num_cols)` -- styles first row with dark background (#2C3E50), white bold text
- `_add_metadata_table(doc, data)` -- creates 2-column key-value table with case info + custom metadata fields
- `_add_events_table(doc, events)` -- creates events table with columns: Date, Time, Type, File Name, Count, Description; includes file batch sub-rows
- `_add_numbered_items(doc, events, event_type, color)` -- renders filtered events as numbered items with color-coded headers

**Timeline mode** (`_generate_docx_timeline`):
- Title page: "Audit Case Report" + "Quick Timeline" centered headings
- Case number, title, generation date
- Page break, then Case Summary metadata table
- Optional Description section
- Timeline Events table with all events chronologically
- Generation footer

**Narrative mode** (`_generate_docx_narrative`):
- Title page: "Audit Case Report" + "Detailed Narrative" centered headings
- Executive Summary with auto-generated text from stats
- Key metrics table (5 columns: Total Events, Findings, Actions, Notes, Total Files)
- Case Details metadata table
- Findings section (filtered by event_type == "finding", color-coded red)
- Actions Taken section (filtered, blue)
- Supporting Notes section (filtered, gray)
- Complete Timeline table (all events)
- Conclusions placeholder: "[Add conclusions here]"
- Recommendations placeholder: "[Add recommendations here]"
- Generation footer

**Async wrapper** (`generate_docx`):
- Routes to timeline or narrative function
- Runs in thread pool executor via `run_in_executor`

### Updated Report Endpoint (server/src/routers/reports.py)
- Added `generate_docx` import
- When format == "docx":
  - Calls `generate_docx(mode, data)` to get DOCX bytes
  - Returns `StreamingResponse` with MIME type `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
  - Content-Disposition: `case-{number}-{mode}-report.docx`

## Decisions
- Used OpenXML namespace manipulation (`qn("w:shd")`) for cell shading since python-docx doesn't expose cell background color natively
- Color scheme matches PDF template: finding=red, action=blue, note=gray, header=#2C3E50
- "Table Grid" style used for all tables (built-in Word style with visible borders)
- Metrics displayed in a 2-row table (value row + label row) for narrative mode

## Files Modified
- `server/pyproject.toml` -- added python-docx dependency
- `server/src/services/report_generator.py` -- added DOCX generation functions
- `server/src/routers/reports.py` -- updated endpoint to handle DOCX format
