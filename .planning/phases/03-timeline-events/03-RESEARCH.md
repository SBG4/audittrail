# Phase 3: Timeline & Events - Research

**Researched:** 2026-02-10
**Domain:** Inline-editable timeline UI with optimistic updates and fast data entry
**Confidence:** HIGH

## Summary

Phase 3 adds a chronological event timeline to cases. Each event captures date, time, file name, file count, file description, and file type. The primary interaction model is inline editing directly in the timeline view -- no modals, no separate pages. Events save optimistically with instant UI feedback while persisting in the background.

The backend follows the same FastAPI + SQLAlchemy + JSONB patterns established in Phases 1-2. The frontend extends the existing TanStack Query mutation pattern (already used in `useCases.ts`) with optimistic update callbacks. Date/time entry uses native HTML inputs with sensible defaults to minimize clicks. Keyboard navigation (Tab between fields, Enter to save/create new row) makes data entry fast for power users.

**Primary recommendation:** Follow the exact same patterns from Phase 2 (SQLAlchemy model, Pydantic schemas, FastAPI router, TanStack Query hooks, inline editing components). Add optimistic updates via TanStack Query's `onMutate`/`onError`/`onSettled` callbacks. Use native `<input type="date">` and `<input type="time">` for fast date/time entry with no additional dependencies.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| FastAPI | >=0.128.7 | REST API for events CRUD | Already in stack |
| SQLAlchemy | >=2.0.46 | Event model with JSONB metadata | Already in stack |
| Alembic | >=1.18.4 | Migration for events table | Already in stack |
| TanStack Query | ^5.90.20 | Optimistic mutations, cache management | Already in stack |
| React | ^19.2.0 | UI components | Already in stack |
| Radix UI | ^1.4.3 | Accessible primitives (dialog, select) | Already in stack |
| lucide-react | ^0.563.0 | Event type icons | Already in stack |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| jsonschema | >=4.26.0 | Validate event metadata against audit type | Already in stack |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native date/time inputs | react-datepicker, date-fns/picker | Extra dependency, larger bundle; native inputs work well for ISO date/time and require zero clicks beyond typing |
| Custom table component | AG Grid, TanStack Table | Overkill for simple event list; custom inline editing is simpler and more controllable |
| Separate event form | Modal-based editing | Violates EVNT-02 requirement for inline editing |

**Installation:** No new dependencies needed. All libraries already in the project.

## Architecture Patterns

### Recommended Project Structure
```
server/
  src/models/event.py          # SQLAlchemy Event model
  src/schemas/event.py         # Pydantic create/update/read schemas
  src/routers/events.py        # CRUD endpoints nested under cases
  alembic/versions/004_create_events_table.py

client/
  src/types/event.ts           # TypeScript interfaces
  src/hooks/useEvents.ts       # TanStack Query hooks with optimistic updates
  src/components/timeline/
    TimelineView.tsx            # Main timeline container
    TimelineRow.tsx             # Single event row with inline editing
    InlineField.tsx             # Reusable inline-editable field
    EventTypeIcon.tsx           # Icon by event type
    DateTimeInput.tsx           # Fast date/time entry
```

### Pattern 1: Optimistic Updates with TanStack Query
**What:** Update the UI cache immediately on mutation, rollback on error
**When to use:** Any mutation where instant feedback matters (EVNT-07)
**Example:**
```typescript
const updateEvent = useMutation({
  mutationFn: (data) => api.patch(`/api/cases/${caseId}/events/${data.id}`, data),
  onMutate: async (newData) => {
    await queryClient.cancelQueries({ queryKey: ["events", caseId] });
    const previous = queryClient.getQueryData(["events", caseId]);
    queryClient.setQueryData(["events", caseId], (old) =>
      old.map(e => e.id === newData.id ? { ...e, ...newData } : e)
    );
    return { previous };
  },
  onError: (_err, _data, context) => {
    queryClient.setQueryData(["events", caseId], context.previous);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ["events", caseId] });
  },
});
```

### Pattern 2: Inline Editable Field Component
**What:** Click-to-edit field that switches between display and input mode
**When to use:** Every field in the timeline row (EVNT-02)
**Example:**
```typescript
function InlineField({ value, onSave, type = "text" }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef(null);

  function save() {
    if (draft !== value) onSave(draft);
    setEditing(false);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") save();
    if (e.key === "Escape") { setDraft(value); setEditing(false); }
    if (e.key === "Tab") save(); // Tab moves to next field naturally
  }

  if (!editing) return <span onClick={() => setEditing(true)}>{value}</span>;
  return <input ref={inputRef} value={draft} onChange={e => setDraft(e.target.value)}
    onBlur={save} onKeyDown={handleKeyDown} type={type} autoFocus />;
}
```

### Pattern 3: Keyboard Navigation in Editable Tables
**What:** Tab moves between fields, Enter saves and optionally creates new row
**When to use:** Timeline event data entry (EVNT-08)
**Key behaviors:**
- Tab: Save current field, move focus to next field in row
- Shift+Tab: Save current field, move focus to previous field
- Enter: Save current field (on last field of last row, create new event)
- Escape: Cancel editing, revert to original value

### Anti-Patterns to Avoid
- **Modal-based editing:** Violates EVNT-02 (inline editing requirement). Never open a dialog to edit an event field.
- **Debounced autosave without user intent:** Save on blur/Enter/Tab, not on every keystroke. Keystroke debounce creates confusing partial saves.
- **Re-fetching entire list after each field save:** Use optimistic updates to avoid flicker. Only invalidate after settled.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date formatting | Custom date parser | Native `<input type="date">` returns ISO format (YYYY-MM-DD) | Browser handles locale display, validation built-in |
| Time formatting | Custom time parser | Native `<input type="time">` returns HH:MM format | Built-in AM/PM handling per locale |
| UUID generation | Custom ID | `uuid.uuid4()` (Python) / server-generated | Consistent with existing models |
| Query cache management | Custom cache | TanStack Query `setQueryData`/`invalidateQueries` | Already battle-tested in Phase 2 |

**Key insight:** The project already has all required dependencies. Phase 3 adds zero new packages -- it extends the existing patterns with a new model/router/hook/component set.

## Common Pitfalls

### Pitfall 1: JSONB Mutation Tracking in SQLAlchemy
**What goes wrong:** Modifying a JSONB dict in place doesn't trigger SQLAlchemy change detection
**Why it happens:** SQLAlchemy tracks identity, not deep equality for JSONB columns
**How to avoid:** Replace the entire dict (same pattern used in cases router line 192: `case.metadata_ = value`)
**Warning signs:** Updates appear to succeed but data reverts on refresh

### Pitfall 2: Optimistic Update Cache Key Mismatch
**What goes wrong:** Optimistic update modifies wrong cache entry, UI shows stale data
**Why it happens:** Query key structure doesn't match between read and mutation
**How to avoid:** Use consistent query keys. Events for a case: `["events", caseId]`. Single event: `["events", caseId, eventId]`
**Warning signs:** After editing, wrong event shows updated value, or no change visible

### Pitfall 3: Race Condition on Rapid Inline Edits
**What goes wrong:** User edits field A, immediately edits field B. Field A's onSettled invalidation overwrites field B's optimistic update
**Why it happens:** invalidateQueries refetches with server state that doesn't yet include field B
**How to avoid:** Cancel in-flight queries in onMutate (already in pattern above). TanStack Query handles this with `cancelQueries`.
**Warning signs:** Second edit "flickers" back to old value briefly

### Pitfall 4: Tab Navigation Breaking on Dynamic Rows
**What goes wrong:** Tab doesn't move to expected field because DOM order changed
**Why it happens:** Adding/removing timeline rows shifts tabindex targets
**How to avoid:** Use natural DOM tab order (no explicit tabindex values). Keep timeline rows in consistent order (sorted by event_date).
**Warning signs:** Tab skips fields or jumps to unexpected location

## Code Examples

### Backend: Event Model
```python
class Event(Base):
    __tablename__ = "events"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    case_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cases.id", ondelete="CASCADE"))
    event_type: Mapped[str] = mapped_column(String(20), nullable=False, default="note")
    event_date: Mapped[date] = mapped_column(Date, nullable=False)
    event_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    file_name: Mapped[str | None] = mapped_column(String(500), nullable=True)
    file_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    file_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    file_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, nullable=False, default=dict)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
```

### Backend: Events nested under cases
```python
router = APIRouter(prefix="/cases/{case_id}/events", tags=["events"])
```

### Frontend: Optimistic update hook pattern
```typescript
export function useUpdateEvent(caseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }) => api.patch(`/api/cases/${caseId}/events/${id}`, body),
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: ["events", caseId] });
      const previous = queryClient.getQueryData(["events", caseId]);
      queryClient.setQueryData(["events", caseId], (old) =>
        old?.map(e => e.id === newData.id ? { ...e, ...newData } : e)
      );
      return { previous };
    },
    onError: (_err, _data, context) => {
      queryClient.setQueryData(["events", caseId], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["events", caseId] });
    },
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate edit page per record | Inline editing in table/list views | ~2020+ | Fewer page transitions, faster workflow |
| Fetch-after-mutate for cache | Optimistic updates with rollback | TanStack Query v4+ (2022) | Instant UI feedback |
| Custom date picker libraries | Native HTML date/time inputs | Browser support matured 2020+ | Zero dependency, consistent UX |

## Open Questions

1. **Event ordering within same date/time**
   - What we know: Events sort by event_date + event_time chronologically
   - What's unclear: When two events have identical date+time, which comes first?
   - Recommendation: Use sort_order column as tiebreaker, defaulting to creation order

## Sources

### Primary (HIGH confidence)
- Existing codebase: Phase 1-2 patterns (models, routers, schemas, hooks, components)
- TanStack Query v5 documentation: optimistic updates pattern
- SQLAlchemy 2.0 JSONB documentation: mutation tracking behavior

### Secondary (MEDIUM confidence)
- HTML Living Standard: `<input type="date">` and `<input type="time">` behavior

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already in project, zero new dependencies
- Architecture: HIGH - follows exact same patterns as Phase 2
- Pitfalls: HIGH - JSONB tracking issue already encountered and solved in Phase 2

**Research date:** 2026-02-10
**Valid until:** 2026-03-10 (stable stack, no changes expected)
