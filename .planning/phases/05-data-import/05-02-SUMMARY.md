# 05-02 Summary: Column mapping API

**Status:** Complete
**Duration:** ~2 min (validation logic and endpoint were built in 05-01)

## What was built

The column mapping validation API was implemented as part of 05-01. This plan verifies and documents the validation capabilities:

- **Row validation functions** in `import_parser.py`: parse_date (4 formats), parse_time (4 formats), parse_int, validate_and_transform_row
- **Validation endpoint** `POST /cases/{case_id}/imports/validate` in `imports.py`
- **Session-based validation**: Stores validated rows in import session for the confirm step

## Validation rules

- `event_date`: Required. Accepts YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY, YYYY/MM/DD, datetime and date objects
- `event_time`: Optional. Accepts HH:MM:SS, HH:MM, hh:MM AM/PM formats
- `event_type`: Optional (defaults to "note"). Must be finding/action/note
- `file_count`: Optional. Accepts int, float, numeric strings
- `file_name`, `file_description`, `file_type`: Optional string fields
- Unknown event fields are rejected (422)
- Missing columns in headers are rejected (422)
- event_date must be mapped (422 if missing)

## Endpoint behavior

1. Validates session exists and belongs to current user
2. Validates all mapping field names are valid event fields
3. Validates all column names exist in uploaded file headers
4. Checks event_date is included in mapping
5. Iterates all rows, applies field-specific parsers
6. Returns per-row validation with error details
7. Stores validated results in session for confirm step

## Files (already created in 05-01)

- `server/src/services/import_parser.py` - Row validation logic
- `server/src/routers/imports.py` - Validation endpoint
- `server/src/schemas/import_.py` - ColumnMapping and ImportValidationResponse schemas
