# Plan 03-01 Summary: Events API

**Status:** Complete
**Duration:** ~5min

## What Was Built

### Event Model (`server/src/models/event.py`)
- SQLAlchemy model with UUID PK, case_id FK (CASCADE), event_type, event_date, event_time, file_name, file_count, file_description, file_type, JSONB metadata_, sort_order, created_by_id FK, created_at, updated_at
- Relationships: case (selectin), created_by (selectin)
- Indexes on case_id and event_date

### Pydantic Schemas (`server/src/schemas/event.py`)
- EventCreate: event_type (default "note"), event_date (required), optional time/file fields, metadata
- EventUpdate: All fields optional for partial updates
- EventRead: Full read model with validation_alias="metadata_" for JSONB
- EventListResponse: items + total

### Migration (`server/alembic/versions/004_create_events_table.py`)
- Revision 004, depends on 003
- Creates events table with all columns, FKs, and indexes

### CRUD Router (`server/src/routers/events.py`)
- Prefix: `/cases/{case_id}/events`
- POST /: Create event (validates type, auto-increments sort_order)
- GET /: List events sorted by event_date ASC, event_time ASC NULLS LAST, sort_order ASC
- GET /{event_id}: Get single event
- PATCH /{event_id}: Partial update with JSONB replacement pattern
- DELETE /{event_id}: Delete with 204

### Router Registration (`server/src/main.py`)
- Events router included in FastAPI app

## Decisions
- event_type validated against {"finding", "action", "note"} set
- sort_order auto-increments per case (max + 1)
- Events scoped to case in URL path and query filters
- Same JSONB replacement pattern as cases router

## Artifacts
- `server/src/models/event.py`
- `server/src/models/__init__.py` (updated)
- `server/src/schemas/event.py`
- `server/src/routers/events.py`
- `server/src/main.py` (updated)
- `server/alembic/versions/004_create_events_table.py`
