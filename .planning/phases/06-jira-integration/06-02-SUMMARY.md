# 06-02 Summary: Jira Field Extraction and Parsing

**Completed:** 2026-02-10
**Duration:** ~5 min

## What Was Built

### Database Model
- **`server/src/models/jira_field_mapping.py`** -- `JiraFieldMapping` SQLAlchemy model:
  - UUID primary key, FK to audit_types (CASCADE delete)
  - `jira_field_name` (String 200) and `case_metadata_key` (String 200)
  - Unique constraint on (audit_type_id, jira_field_name)
  - Index on audit_type_id for fast lookups
  - `created_at` timestamp

### Alembic Migration
- **`server/alembic/versions/005_create_jira_field_mappings_table.py`**:
  - Creates `jira_field_mappings` table with all columns, FK, unique constraint, and index
  - Clean downgrade drops index then table

### CRUD + Scrape-and-Map Endpoints
- **`server/src/routers/jira.py`** -- Extended with 3 new endpoints:
  - `GET /jira/mappings/{audit_type_id}` -- List all field mappings for an audit type
  - `PUT /jira/mappings/{audit_type_id}` -- Bulk replace all mappings (delete + insert)
  - `POST /jira/scrape-and-map` -- Scrape Jira page + apply mappings, returns both mapped and raw fields

### Seed Data
- **`server/src/scripts/seed.py`** -- Added default Jira field mappings:
  - USB Usage: Assignee->user_name, Summary->serial_number, Reporter->user_id
  - Email Usage: Assignee->account_owner, Summary->email_address, Reporter->account_owner
  - Idempotent: checks if mappings already exist before inserting

### Model Registration
- **`server/src/models/__init__.py`** -- Added JiraFieldMapping import

## Decisions Made
- Bulk replace (PUT) for mapping updates -- simpler than individual CRUD, matches the UI pattern of "edit all then save"
- Case-insensitive Jira field name matching in scrape-and-map
- Default mappings are reasonable guesses; users configure actual mappings via UI

## Files Created/Modified
- `server/src/models/jira_field_mapping.py` (created)
- `server/src/models/__init__.py` (modified)
- `server/alembic/versions/005_create_jira_field_mappings_table.py` (created)
- `server/src/routers/jira.py` (modified -- added 3 endpoints)
- `server/src/scripts/seed.py` (modified -- added default mappings)
