# 07-03 Summary: PDF Renderer (WeasyPrint)

**Status:** Complete
**Duration:** ~3min

## What Was Built

### WeasyPrint Dependency (server/pyproject.toml)
- Added `weasyprint>=68.0` to project dependencies
- Note: Requires system libraries (pango, cairo) installed in Docker image

### PDF Generation Functions (server/src/services/report_generator.py)
- Jinja2 Environment with FileSystemLoader pointing to `src/templates/`
- Template mapping: "timeline" -> "reports/timeline.html", "narrative" -> "reports/narrative.html"
- `_generate_pdf_sync(mode, data)` -- sync function that:
  1. Loads Jinja2 template by mode
  2. Renders HTML string with report data
  3. Creates WeasyPrint HTML object with base_url for relative paths
  4. Returns PDF bytes via `write_pdf()`
- `generate_pdf(mode, data)` -- async wrapper using `run_in_executor` to avoid blocking the event loop

### Updated Report Endpoint (server/src/routers/reports.py)
- Added `generate_pdf` import from report_generator
- When format == "pdf":
  - Calls `generate_pdf(mode, data)` to get PDF bytes
  - Returns `StreamingResponse` with `application/pdf` media type
  - Content-Disposition header with filename: `case-{number}-{mode}-report.pdf`
- DOCX format still returns placeholder JSON
- Preserved existing HTML report endpoint (`/html`)

## Decisions
- Used `asyncio.get_event_loop().run_in_executor(None, ...)` pattern to run WeasyPrint in thread pool
- Set `base_url` to templates/reports/ directory so WeasyPrint resolves relative paths correctly
- Jinja2 Environment created as module-level singleton (not per-request)

## Files Modified
- `server/pyproject.toml` -- added weasyprint dependency
- `server/src/services/report_generator.py` -- added Jinja2 + WeasyPrint PDF generation
- `server/src/routers/reports.py` -- updated endpoint to return PDF StreamingResponse
