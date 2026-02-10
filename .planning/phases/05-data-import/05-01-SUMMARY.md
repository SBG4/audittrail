# 05-01 Summary: Backend file parsing

**Status:** Complete
**Duration:** ~5 min

## What was built

- **Import parser service** (`server/src/services/import_parser.py`): Excel/CSV parsing with encoding detection, row validation, and cell normalization
- **Import schemas** (`server/src/schemas/import_.py`): Pydantic models for upload response, column mapping, validation results, and confirm request/response
- **Import router** (`server/src/routers/imports.py`): Three endpoints (upload, validate, confirm) with in-memory session storage
- **Dependencies**: Added openpyxl and chardet to pyproject.toml

## Key decisions

- Used in-memory dict for import session storage (sufficient for single-server deployment)
- Session cleanup removes entries older than 1 hour on each new upload
- 10MB file upload limit
- CSV encoding detection via chardet with UTF-8 fallback for low-confidence results
- CSV dialect detection via Sniffer with excel dialect fallback
- Validation requires event_date mapping; all other fields optional

## Endpoints created

- `POST /cases/{case_id}/imports/upload` - Parse file, return preview
- `POST /cases/{case_id}/imports/validate` - Validate column mappings
- `POST /cases/{case_id}/imports/confirm` - Bulk create events

## Files created/modified

- `server/pyproject.toml` (modified - added openpyxl, chardet)
- `server/src/services/import_parser.py` (created)
- `server/src/schemas/import_.py` (created)
- `server/src/routers/imports.py` (created)
- `server/src/main.py` (modified - registered imports router)
