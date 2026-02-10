# Phase 4: File Batch Grouping - Research

**Researched:** 2026-02-10
**Domain:** Nested CRUD resource management (file batches within timeline events within cases)
**Confidence:** HIGH

## Summary

Phase 4 adds file batch grouping to timeline events. File batches are metadata-only records (label, count, description, file types) -- there is no actual file upload. This is a nested CRUD resource: batches belong to events, events belong to cases. The domain is straightforward and maps directly to established patterns already in the codebase (SQLAlchemy models, Pydantic schemas, FastAPI routers, TanStack Query hooks, shadcn/ui components).

The primary architectural question is how deeply to nest the API routes. Since batches are always accessed in the context of an event, and events in the context of a case, the recommended approach is a flat-ish API nested under events (`/cases/{case_id}/events/{event_id}/batches`) that returns batches as part of the event response. Quick-add templates are purely client-side presets (no backend storage needed for v1) that pre-fill batch creation forms.

**Primary recommendation:** Follow existing CRUD patterns exactly (model + schema + router + migration + hook + component), nest batches under events in the API, and implement templates as a static client-side array of preset objects.

## Standard Stack

### Core

No new libraries needed. Phase 4 uses the same stack as Phases 1-2:

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| SQLAlchemy 2.0 | (existing) | FileBatch model with FK to Event | Same ORM already in use |
| Pydantic v2 | (existing) | Request/response schemas for batches | Same validation layer |
| FastAPI | (existing) | Nested CRUD router for batches | Same API framework |
| Alembic | (existing) | Migration for file_batches table | Same migration tool |
| TanStack Query | (existing) | Hooks for batch CRUD with cache invalidation | Same data fetching layer |
| shadcn/ui | (existing) | Batch list/form components | Same component library |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | (existing) | Icons for batch type indicators and templates | Batch type visual indicators |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Nested route `/events/{id}/batches` | Flat route `/batches?event_id=X` | Flat is simpler but loses REST semantics; nested better matches domain hierarchy |
| Client-side templates | Server-side template storage | Server-side adds unnecessary complexity for v1 fixed templates |
| Separate batches table | JSONB array on event | Separate table allows proper indexing, querying, and independent CRUD; JSONB leads to mutation tracking issues (already seen in Phase 2) |

**Installation:** No new packages needed.

## Architecture Patterns

### Recommended Project Structure

New files follow existing conventions:

```
server/src/
├── models/
│   └── file_batch.py          # FileBatch SQLAlchemy model
├── schemas/
│   └── file_batch.py          # Pydantic schemas (Create, Update, Read)
├── routers/
│   └── file_batches.py        # Nested CRUD router
server/alembic/versions/
│   └── 005_create_file_batches_table.py  # Migration (004 is events from Phase 3)

client/src/
├── types/
│   └── file-batch.ts          # TypeScript interfaces
├── hooks/
│   └── useFileBatches.ts      # TanStack Query hooks
├── components/
│   └── batches/
│       ├── BatchList.tsx       # List of batches on an event
│       ├── BatchForm.tsx       # Create/edit batch form
│       └── BatchTemplates.tsx  # Quick-add template selector
```

### Pattern 1: Nested CRUD API

**What:** File batches are accessed via event-scoped routes
**When to use:** Child resources that are always accessed in parent context

API routes:
```
POST   /cases/{case_id}/events/{event_id}/batches          # Create batch
GET    /cases/{case_id}/events/{event_id}/batches          # List batches for event
PATCH  /cases/{case_id}/events/{event_id}/batches/{id}     # Update batch
DELETE /cases/{case_id}/events/{event_id}/batches/{id}     # Delete batch
```

The `case_id` in the URL provides authorization context (verify event belongs to case). Batches can also be returned embedded in the event response via SQLAlchemy relationship eager loading (`selectinload`), reducing separate API calls.

### Pattern 2: FileBatch Data Model

**What:** SQLAlchemy model with FK to Event, storing batch metadata
**When to use:** Always -- this is the core data structure

```python
class FileBatch(Base):
    __tablename__ = "file_batches"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    event_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True
    )
    label: Mapped[str] = mapped_column(String(200), nullable=False)
    file_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    file_types: Mapped[str | None] = mapped_column(String(500), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationship
    event = relationship("Event", back_populates="file_batches", lazy="selectin")
```

Key design choices:
- `ondelete="CASCADE"`: Delete batches when parent event is deleted
- `file_types` as String (comma-separated like ".pdf, .docx, .xlsx") rather than JSONB array -- simpler for display and input
- `sort_order` for user-defined ordering of batches within an event
- `file_count` as integer (not computed) because the auditor specifies how many files, not the system

### Pattern 3: Quick-Add Templates (Client-Side Only)

**What:** Static array of preset batch configurations for common scenarios
**When to use:** When users repeatedly create batches with similar patterns

```typescript
export interface BatchTemplate {
  id: string;
  name: string;
  description: string;
  defaults: {
    label: string;
    file_count?: number;
    description?: string;
    file_types?: string;
  };
}

export const BATCH_TEMPLATES: BatchTemplate[] = [
  {
    id: "usb-file-copy",
    name: "USB File Copy",
    description: "Files copied to/from USB device",
    defaults: {
      label: "USB File Copy",
      file_types: ".pdf, .docx, .xlsx, .pptx",
    },
  },
  {
    id: "email-attachments",
    name: "Email Attachment Batch",
    description: "Attachments from email messages",
    defaults: {
      label: "Email Attachments",
      file_types: ".pdf, .docx, .xlsx, .zip",
    },
  },
  {
    id: "network-transfer",
    name: "Network File Transfer",
    description: "Files transferred over network share",
    defaults: {
      label: "Network Transfer",
      file_types: ".pdf, .docx, .xlsx",
    },
  },
  {
    id: "print-job",
    name: "Print Job",
    description: "Files sent to printer",
    defaults: {
      label: "Print Job",
      file_types: ".pdf, .docx",
    },
  },
];
```

Templates are not stored in the database. They are hardcoded client-side constants. The user selects a template, form pre-fills, user adjusts as needed, then submits normally. This keeps the implementation simple and avoids unnecessary backend complexity.

### Pattern 4: Embedding Batches in Event Response

**What:** Event responses include their file batches via relationship loading
**When to use:** Timeline display where each event shows its batches inline

On the Event model (created in Phase 3):
```python
# Event model adds relationship:
file_batches = relationship("FileBatch", back_populates="event",
                            lazy="selectin", order_by="FileBatch.sort_order")
```

On the Event read schema:
```python
class EventRead(BaseModel):
    # ... existing fields ...
    file_batches: list[FileBatchRead] = []
```

This way, when the timeline fetches events, batches come embedded -- no second API call needed. Individual batch CRUD still uses the dedicated `/batches` endpoints.

### Anti-Patterns to Avoid

- **JSONB array for batches on the Event model:** Causes mutation tracking issues (already encountered in Phase 2 with case metadata). Use a proper relational table.
- **Separate API call per batch on timeline load:** Eagerly load via relationship instead of N+1 queries.
- **Server-side template storage for v1:** Adds migration, model, and CRUD for zero user benefit when templates are fixed.
- **File upload handling:** Phase 4 is metadata only. No actual file upload, storage, or serving. The `file_count` is a human-entered number.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| UUID primary keys | Custom ID generation | SQLAlchemy `default=uuid.uuid4` | Already established pattern in codebase |
| Form validation | Custom validation logic | Pydantic schemas + FastAPI auto-validation | Consistent with existing endpoints |
| Cache invalidation | Manual refetch logic | TanStack Query `invalidateQueries` on mutation success | Already used for cases |
| Sortable list UI | Custom drag-and-drop | Simple `sort_order` integer field with increment | Drag-and-drop is overkill for batch ordering |

**Key insight:** Phase 4 introduces zero new technical patterns. Every component follows directly from Phases 1-2 CRUD patterns. The value is in correct nesting (batch -> event -> case) and good UX (templates for speed, inline display on timeline).

## Common Pitfalls

### Pitfall 1: Cascade Delete Not Configured
**What goes wrong:** Deleting an event leaves orphaned file_batch rows with FK violations
**Why it happens:** Forgetting `ondelete="CASCADE"` on the foreign key
**How to avoid:** Set `ondelete="CASCADE"` on `event_id` FK in both the model and migration
**Warning signs:** IntegrityError when deleting events that have batches

### Pitfall 2: N+1 Queries on Timeline Load
**What goes wrong:** Loading a timeline with 50 events fires 50 separate queries for batches
**Why it happens:** Lazy loading relationships without explicit eager loading strategy
**How to avoid:** Use `selectinload(Event.file_batches)` in the event list query, and set `lazy="selectin"` on the relationship
**Warning signs:** Slow timeline load, excessive database queries in logs

### Pitfall 3: Event Ownership Not Verified
**What goes wrong:** A user can create/modify batches on events belonging to other cases
**Why it happens:** Batch endpoint only checks event_id exists, not that event belongs to the case_id in the URL
**How to avoid:** In batch router, verify `event.case_id == case_id` from URL params before any operation
**Warning signs:** Cross-case data leaks

### Pitfall 4: Migration Dependency on Phase 3
**What goes wrong:** Migration references `events.id` FK but events table doesn't exist yet
**Why it happens:** Phase 4 migration runs before Phase 3 migration
**How to avoid:** Migration numbering must be sequential after Phase 3's event migration (005 after 004). Alembic's `down_revision` chain ensures order.
**Warning signs:** Alembic upgrade failure with "relation events does not exist"

### Pitfall 5: Template Presets Overwriting User Edits
**What goes wrong:** Selecting a template after partially filling the form erases manual input
**Why it happens:** Template selection replaces all form fields unconditionally
**How to avoid:** Only pre-fill empty fields, or show confirmation before overwriting non-empty fields
**Warning signs:** User frustration when their edits disappear

## Code Examples

### Nested Router Registration
```python
# server/src/routers/file_batches.py
router = APIRouter(
    prefix="/cases/{case_id}/events/{event_id}/batches",
    tags=["file-batches"],
)

@router.post("/", response_model=FileBatchRead, status_code=201)
async def create_file_batch(
    case_id: uuid.UUID,
    event_id: uuid.UUID,
    body: FileBatchCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FileBatchRead:
    # Verify event exists and belongs to case
    event = await _get_event_or_404(db, event_id, case_id)

    batch = FileBatch(
        event_id=event.id,
        label=body.label,
        file_count=body.file_count,
        description=body.description,
        file_types=body.file_types,
        sort_order=body.sort_order or 0,
    )
    db.add(batch)
    await db.commit()
    await db.refresh(batch)
    return FileBatchRead.model_validate(batch)
```

### TanStack Query Hook Pattern
```typescript
// client/src/hooks/useFileBatches.ts
export function useFileBatches(caseId: string, eventId: string) {
  return useQuery({
    queryKey: ["file-batches", caseId, eventId],
    queryFn: () =>
      api.get<FileBatch[]>(
        `/api/cases/${caseId}/events/${eventId}/batches`
      ),
    enabled: !!caseId && !!eventId,
  });
}

export function useCreateFileBatch(caseId: string, eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateFileBatchRequest) =>
      api.post<FileBatch>(
        `/api/cases/${caseId}/events/${eventId}/batches`,
        body
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["file-batches", caseId, eventId] });
      // Also invalidate events to refresh embedded batch data
      queryClient.invalidateQueries({ queryKey: ["events", caseId] });
    },
  });
}
```

### Batch Inline Display on Event
```typescript
// Conceptual component structure for batch display within a timeline event
function EventBatchList({ batches }: { batches: FileBatch[] }) {
  if (batches.length === 0) return null;
  return (
    <div className="mt-2 space-y-1">
      {batches.map((batch) => (
        <div key={batch.id} className="flex items-center gap-2 text-sm">
          <Package className="size-3 text-muted-foreground" />
          <span className="font-medium">{batch.label}</span>
          <Badge variant="outline" className="text-xs">
            {batch.file_count} files
          </Badge>
          {batch.file_types && (
            <span className="text-xs text-muted-foreground">
              {batch.file_types}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| JSONB arrays for child records | Proper relational tables with FK | Always best practice | Avoids mutation tracking issues, enables proper querying |
| Separate API calls per child | Eager loading via selectinload | SQLAlchemy 2.0 async | Eliminates N+1 queries |
| Full-page forms for nested CRUD | Inline forms within parent display | Modern SPA patterns | Faster workflow, less context switching |

**Deprecated/outdated:**
- SQLAlchemy 1.x lazy loading patterns: Use 2.0 async-compatible `selectinload`

## Open Questions

1. **Migration numbering dependency on Phase 3**
   - What we know: Phase 3 will create migration 004 for events table
   - What's unclear: Exact migration number (could be 004 or different if Phase 3 uses multiple migrations)
   - Recommendation: Number file_batches migration as the next after whatever Phase 3's last migration is. If Phase 3 uses 004, this is 005.

2. **Event model relationship field name**
   - What we know: Phase 3 will create an Event model
   - What's unclear: Exact field names and relationship conventions Phase 3 will use
   - Recommendation: Plan assumes `Event.file_batches` relationship will be added. If Phase 3 uses different conventions, adapt at execution time.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `server/src/models/case.py`, `server/src/routers/cases.py` -- establishes model/router patterns
- Existing codebase: `client/src/hooks/useCases.ts`, `client/src/types/case.ts` -- establishes hook/type patterns
- Existing codebase: `server/alembic/versions/` -- establishes migration numbering convention
- `.planning/ROADMAP.md` -- Phase 4 requirements and success criteria
- `.planning/REQUIREMENTS.md` -- FILE-01, FILE-02, FILE-03 definitions

### Secondary (MEDIUM confidence)
- SQLAlchemy 2.0 docs on `selectinload` for async relationship loading
- FastAPI docs on nested router patterns with path parameters

### Tertiary (LOW confidence)
- None -- all patterns directly derived from existing codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new libraries, all patterns from existing codebase
- Architecture: HIGH - Nested CRUD is well-understood, maps directly to existing patterns
- Pitfalls: HIGH - Pitfalls drawn from actual issues encountered in Phase 2 (JSONB mutation, eager loading)

**Research date:** 2026-02-10
**Valid until:** 2026-03-10 (stable -- no external dependencies)
