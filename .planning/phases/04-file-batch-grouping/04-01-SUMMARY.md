# Plan 04-01 Summary: File Batch API

## Status: COMPLETE

## What Was Built

### Task 1: FileBatch model, schemas, and migration
- **FileBatch SQLAlchemy model** (`server/src/models/file_batch.py`): UUID PK, event FK with CASCADE delete, label (String 200), file_count (Integer), description (Text), file_types (String 500), sort_order (Integer), created_at/updated_at timestamps
- **Pydantic schemas** (`server/src/schemas/file_batch.py`): FileBatchCreate, FileBatchUpdate (partial), FileBatchRead with from_attributes config
- **Alembic migration 005** (`server/alembic/versions/005_create_file_batches_table.py`): Creates file_batches table with FK to events.id (CASCADE), index on event_id
- **Event model updated** (`server/src/models/event.py`): Added `file_batches` relationship with selectin loading, sort_order ordering, and cascade delete-orphan
- **Event schema updated** (`server/src/schemas/event.py`): Added `file_batches: list[FileBatchRead] = []` to EventRead so batches are embedded in event responses
- **Models __init__ updated** (`server/src/models/__init__.py`): Added FileBatch to exports

### Task 2: File batch CRUD router
- **CRUD router** (`server/src/routers/file_batches.py`): Nested at `/cases/{case_id}/events/{event_id}/batches`
  - `POST /` - Create batch (201)
  - `GET /` - List batches ordered by sort_order
  - `PATCH /{batch_id}` - Partial update
  - `DELETE /{batch_id}` - Delete (204)
- **Event ownership verification**: `_get_event_or_404` ensures event belongs to case via both event_id and case_id match
- **JWT protection**: All endpoints require authenticated user via `get_current_user`
- **Router registered** in `server/src/main.py`

## Key Decisions
- CASCADE delete on FK ensures deleting an event removes all its batches
- file_types stored as comma-separated String (not JSONB array) for simplicity
- Batches embedded in event responses via selectin relationship loading (no separate API call needed for timeline display)
- sort_order field enables user-defined ordering within an event

## Files Modified
- `server/src/models/file_batch.py` (new)
- `server/src/models/__init__.py` (modified)
- `server/src/models/event.py` (modified)
- `server/src/schemas/file_batch.py` (new)
- `server/src/schemas/event.py` (modified)
- `server/alembic/versions/005_create_file_batches_table.py` (new)
- `server/src/routers/file_batches.py` (new)
- `server/src/main.py` (modified)
