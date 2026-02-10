# Phase 2: Audit Type Schemas & Case Management - Research

**Researched:** 2026-02-10
**Domain:** Schema-driven case management with PostgreSQL JSONB, FastAPI CRUD, React dynamic forms
**Confidence:** HIGH

## Summary

Phase 2 introduces two core domain models -- AuditType (schema registry) and Case (case instances) -- along with a schema-driven dynamic form system on the frontend. The backend stores JSON Schema definitions in PostgreSQL JSONB columns, validates case metadata against these schemas at the API layer using Python's `jsonschema` library, and exposes CRUD endpoints with filtering/search. The frontend renders dynamic metadata forms based on the schema fetched from the API, supporting both case creation and inline editing.

The architecture is straightforward: AuditType rows hold JSON Schema definitions as JSONB, Case rows hold their metadata as JSONB validated against the referenced AuditType's schema. No exotic PostgreSQL extensions are needed -- application-level validation with `jsonschema` is sufficient for this use case. The case lifecycle (open/active/closed) is a simple string enum with server-side transition enforcement.

**Primary recommendation:** Use Pydantic + `jsonschema` for server-side validation, a lightweight custom form renderer (not RJSF) for the small fixed schema set, and SQLAlchemy JSONB operators for metadata filtering.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| SQLAlchemy 2.0 (async) | existing | ORM with JSONB support | Already in stack, native JSONB type |
| Alembic | existing | Database migrations | Already in stack |
| Pydantic v2 | existing | Request/response schemas | Already in stack |
| jsonschema | latest | JSON Schema validation | Python standard for JSON Schema validation, used server-side |
| FastAPI | existing | API framework | Already in stack |
| React + TypeScript | existing | Frontend framework | Already in stack |
| Zustand | existing | State management | Already in stack, use for case state |
| shadcn/ui | existing | UI components | Already in stack, provides form inputs |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| TanStack Query (react-query) | v5 | Server state management | Case list fetching, caching, mutations |
| lucide-react | existing | Icons | Status icons, action buttons |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom form renderer | react-jsonschema-form (RJSF) | RJSF is powerful but heavyweight for just 2 audit types with known schemas. Custom renderer is simpler, uses existing shadcn components, avoids new dependency. Reconsider if audit types grow beyond 5. |
| jsonschema (Python) | pg_jsonschema extension | PG extension adds DB-level validation but requires extension installation in Docker. Application-level validation is simpler and sufficient for case creation flow. |
| fastapi-pagination | Manual offset/limit | Manual is fine for simple case lists. Pagination library adds abstraction for minimal benefit at this scale. |

**Installation:**
```bash
# Server
cd server && uv add jsonschema

# Client
cd client && pnpm add @tanstack/react-query
```

## Architecture Patterns

### Recommended Project Structure

**Backend additions:**
```
server/src/
├── models/
│   ├── audit_type.py      # AuditType model (schema registry)
│   └── case.py            # Case model (instances)
├── schemas/
│   ├── audit_type.py      # Pydantic schemas for audit types
│   └── case.py            # Pydantic schemas for cases
├── routers/
│   ├── audit_types.py     # CRUD for audit type schemas
│   └── cases.py           # CRUD for cases with filtering
└── services/
    └── case_service.py    # Case business logic (lifecycle, validation)
```

**Frontend additions:**
```
client/src/
├── pages/
│   ├── CaseListPage.tsx       # Dashboard with case list
│   ├── CaseCreatePage.tsx     # New case creation
│   └── CaseDetailPage.tsx     # Case detail with tabs
├── components/
│   ├── cases/
│   │   ├── CaseList.tsx       # Table/list component
│   │   ├── CaseFilters.tsx    # Filter controls
│   │   ├── CaseCard.tsx       # Case summary card
│   │   ├── CaseMetadata.tsx   # Metadata display/edit
│   │   ├── SchemaForm.tsx     # Dynamic form from JSON Schema
│   │   ├── LifecycleControl.tsx  # Status badge + transition
│   │   └── AssigneeSelect.tsx # User assignment dropdown
│   └── ui/
│       ├── select.tsx         # shadcn select (add)
│       ├── badge.tsx          # shadcn badge (add)
│       ├── table.tsx          # shadcn table (add)
│       ├── dialog.tsx         # shadcn dialog (add)
│       ├── tabs.tsx           # shadcn tabs (add)
│       └── textarea.tsx       # shadcn textarea (add)
├── hooks/
│   ├── useCases.ts            # TanStack Query hooks for cases
│   └── useAuditTypes.ts       # TanStack Query hooks for audit types
└── types/
    └── case.ts                # TypeScript types for cases
```

### Pattern 1: JSON Schema in JSONB Column
**What:** Store JSON Schema definitions as JSONB in an `audit_types` table. Each audit type row has a `schema` column containing the full JSON Schema for its metadata fields.
**When to use:** When different entity types need different metadata shapes but share a common structure.
**Example:**
```python
# AuditType model
class AuditType(Base):
    __tablename__ = "audit_types"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    schema: Mapped[dict] = mapped_column(JSONB, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

### Pattern 2: Case with JSONB Metadata Validated Against Schema
**What:** Cases reference an AuditType and store their type-specific metadata as JSONB, validated at the API layer.
**When to use:** Schema-driven entities where metadata shape varies by type.
**Example:**
```python
class Case(Base):
    __tablename__ = "cases"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    audit_type_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("audit_types.id"), nullable=False)
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, nullable=False, default=dict)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="open")
    assigned_to_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_by_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
```

### Pattern 3: Application-Level Schema Validation
**What:** Validate case metadata against the audit type's JSON Schema using `jsonschema.validate()` in the service layer before persisting.
**When to use:** Before creating or updating case metadata.
**Example:**
```python
import jsonschema

def validate_case_metadata(metadata: dict, schema: dict) -> None:
    try:
        jsonschema.validate(instance=metadata, schema=schema)
    except jsonschema.ValidationError as e:
        raise HTTPException(
            status_code=422,
            detail=f"Metadata validation failed: {e.message}"
        )
```

### Pattern 4: Simple Enum Lifecycle
**What:** Case status as a string column with allowed values (open, active, closed) and server-side transition validation.
**When to use:** Simple lifecycle with few states and straightforward transitions.
**Example:**
```python
VALID_TRANSITIONS = {
    "open": ["active", "closed"],
    "active": ["closed"],
    "closed": ["open"],  # reopen capability
}

def validate_status_transition(current: str, target: str) -> None:
    if target not in VALID_TRANSITIONS.get(current, []):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition from '{current}' to '{target}'"
        )
```

### Pattern 5: Custom Schema Form Renderer
**What:** A React component that reads a JSON Schema and renders shadcn/ui form fields dynamically.
**When to use:** When the schema set is small and known (2 audit types), and you want to use existing UI components rather than a heavy form library.
**Example:**
```typescript
// SchemaForm renders fields from JSON Schema properties
function SchemaForm({ schema, values, onChange }: SchemaFormProps) {
  return Object.entries(schema.properties).map(([key, prop]) => {
    switch (prop.type) {
      case "string":
        return <Input key={key} value={values[key]} onChange={...} />;
      case "number":
        return <Input key={key} type="number" value={values[key]} onChange={...} />;
      // ... etc
    }
  });
}
```

### Anti-Patterns to Avoid
- **Embedding schema logic in frontend code:** Don't hardcode USB/email field definitions in React. Fetch schemas from the API so adding new audit types requires only database changes.
- **Validating only on frontend:** Always validate metadata against JSON Schema on the server. Frontend validation is a UX convenience, server validation is the authority.
- **Over-engineering the state machine:** Three states with simple transitions don't need a full state machine library. A transition map with validation is sufficient.
- **Storing metadata as separate columns:** Don't create `usb_serial_number`, `usb_user_name` columns. JSONB keeps the Case table generic while the schema provides structure.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON Schema validation | Custom validation logic | `jsonschema` library | Edge cases in schema validation (patterns, formats, required, nested) |
| Server state management | Manual fetch/cache | TanStack Query | Handles caching, revalidation, optimistic updates, loading states |
| Form field components | Custom inputs from scratch | shadcn/ui (Input, Select, Textarea) | Accessible, themed, tested |
| UUID generation | Custom ID generation | PostgreSQL uuid_generate_v4() or Python uuid.uuid4() | Standard, collision-safe |

**Key insight:** The JSON Schema validation problem looks simple but has many edge cases (nested objects, arrays, patterns, conditional schemas). Use `jsonschema` library, don't write custom validators.

## Common Pitfalls

### Pitfall 1: JSONB Column Name Conflicts
**What goes wrong:** Using `metadata` as a Python attribute name conflicts with SQLAlchemy's internal `metadata` attribute on `Base`.
**Why it happens:** SQLAlchemy reserves `metadata` on the declarative base class for the `MetaData` object that tracks table definitions.
**How to avoid:** Use `metadata_` as the Python attribute name and `"metadata"` as the column name: `metadata_: Mapped[dict] = mapped_column("metadata", JSONB, ...)`.
**Warning signs:** `AttributeError` or unexpected behavior when accessing the column.

### Pitfall 2: Missing GIN Index on JSONB
**What goes wrong:** JSONB queries using containment (`@>`) or key existence scan the entire table.
**Why it happens:** JSONB columns are not indexed by default.
**How to avoid:** Add a GIN index: `Index('ix_cases_metadata', Case.metadata_, postgresql_using='gin')`.
**Warning signs:** Slow queries on metadata filtering with more than a few hundred rows.

### Pitfall 3: SQLAlchemy JSONB Mutation Tracking
**What goes wrong:** Modifying a JSONB dict in-place (e.g., `case.metadata_["key"] = "value"`) doesn't trigger SQLAlchemy's change detection, so the update never persists.
**Why it happens:** SQLAlchemy tracks object identity, not dict content changes.
**How to avoid:** Use `from sqlalchemy.orm.attributes import flag_modified` after in-place changes, or replace the entire dict: `case.metadata_ = {**case.metadata_, "key": "value"}`.
**Warning signs:** Updates appear to succeed (no error) but changes don't persist to the database.

### Pitfall 4: Foreign Key Cascade Behavior
**What goes wrong:** Deleting a case doesn't clean up related data, or deleting an audit type cascades unexpectedly.
**Why it happens:** Default SQLAlchemy/PostgreSQL foreign key behavior varies.
**How to avoid:** Explicitly set `ondelete="CASCADE"` on relationships that should cascade (e.g., case events in future phases), and `ondelete="RESTRICT"` on audit_type_id to prevent deleting types with existing cases.
**Warning signs:** Orphaned rows or unexpected deletion of related data.

### Pitfall 5: Async Session and Relationship Loading
**What goes wrong:** Accessing relationships (e.g., `case.audit_type`) outside the session context raises `MissingGreenlet` error.
**Why it happens:** SQLAlchemy async doesn't support lazy loading.
**How to avoid:** Use `selectinload()` or `joinedload()` in queries to eagerly load relationships, or use `relationship(lazy="selectin")`.
**Warning signs:** `MissingGreenlet` or `DetachedInstanceError` when accessing related objects.

## Code Examples

### Seed Audit Type Schemas
```python
USB_USAGE_SCHEMA = {
    "type": "object",
    "properties": {
        "serial_number": {"type": "string", "title": "S/N"},
        "user_name": {"type": "string", "title": "User Name"},
        "user_id": {"type": "string", "title": "User ID"},
        "computer_used": {"type": "string", "title": "Computer Used"},
    },
    "required": ["serial_number", "user_name", "user_id", "computer_used"],
}

EMAIL_USAGE_SCHEMA = {
    "type": "object",
    "properties": {
        "email_address": {"type": "string", "title": "Email Address", "format": "email"},
        "email_server": {"type": "string", "title": "Email Server"},
        "account_owner": {"type": "string", "title": "Account Owner"},
        "department": {"type": "string", "title": "Department"},
    },
    "required": ["email_address", "account_owner"],
}
```

### Case List API with Filtering
```python
@router.get("/cases", response_model=CaseListResponse)
async def list_cases(
    status: str | None = None,
    audit_type_id: uuid.UUID | None = None,
    assigned_to_id: uuid.UUID | None = None,
    search: str | None = None,
    offset: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Case).options(selectinload(Case.audit_type), selectinload(Case.assigned_to))

    if status:
        query = query.where(Case.status == status)
    if audit_type_id:
        query = query.where(Case.audit_type_id == audit_type_id)
    if assigned_to_id:
        query = query.where(Case.assigned_to_id == assigned_to_id)
    if search:
        query = query.where(
            or_(
                Case.title.ilike(f"%{search}%"),
                Case.description.ilike(f"%{search}%"),
            )
        )

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()

    # Paginate
    query = query.order_by(Case.updated_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    cases = result.scalars().all()

    return CaseListResponse(items=cases, total=total, offset=offset, limit=limit)
```

### TanStack Query Hook
```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useCases(filters: CaseFilters) {
  return useQuery({
    queryKey: ["cases", filters],
    queryFn: () => api.get<CaseListResponse>(
      `/api/cases?${new URLSearchParams(filters).toString()}`
    ),
  });
}

export function useCreateCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCaseRequest) => api.post<Case>("/api/cases", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cases"] }),
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SQLAlchemy 1.x JSON column | SQLAlchemy 2.0 JSONB with Mapped[] | 2023 | Type-safe JSONB with modern mapping |
| Manual fetch + state | TanStack Query v5 | 2023-2024 | Declarative server state with automatic caching |
| jsonschema Draft 4 | jsonschema Draft 2020-12 | 2022 | Latest JSON Schema spec support |
| react-jsonschema-form for all forms | Custom renderers for simple schemas | Ongoing | Simpler dependency tree for small schema sets |

**Deprecated/outdated:**
- `Column(JSON)` without JSONB: Use JSONB for indexing and operators
- Manual `useEffect` + `useState` for API data: TanStack Query handles this pattern

## Open Questions

1. **TanStack Query vs simple fetch**
   - What we know: TanStack Query provides caching, revalidation, and optimistic updates out of the box
   - What's unclear: Whether the added dependency is worth it for Phase 2 alone (only case list + create)
   - Recommendation: Add TanStack Query now. Phase 3 (timeline with optimistic updates) will heavily depend on it. Better to establish the pattern early.

2. **Case numbering/reference system**
   - What we know: Cases need a human-readable identifier beyond UUID
   - What's unclear: Format (e.g., "CASE-001", "USB-2026-001")
   - Recommendation: Add a sequential `case_number` integer column with a display format helper. Keep it simple.

## Sources

### Primary (HIGH confidence)
- SQLAlchemy 2.0 JSONB documentation - JSONB type, operators, GIN indexing
- PostgreSQL JSONB documentation - https://www.postgresql.org/docs/current/datatype-json.html
- FastAPI dependency injection - existing codebase patterns from Phase 1

### Secondary (MEDIUM confidence)
- [RJSF GitHub](https://github.com/rjsf-team/react-jsonschema-form) - Form generation capabilities and limitations
- [SQLAlchemy JSONB discussion](https://github.com/sqlalchemy/sqlalchemy/discussions/7991) - Filtering patterns
- [TanStack Query docs](https://tanstack.com/query/latest) - Server state management patterns

### Tertiary (LOW confidence)
- fastapi-pagination library - Evaluated but manual pagination preferred for simplicity

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing stack plus minimal additions (jsonschema, TanStack Query)
- Architecture: HIGH - Well-established patterns (JSONB metadata, schema validation, CRUD endpoints)
- Pitfalls: HIGH - JSONB mutation tracking and metadata naming conflict are well-documented SQLAlchemy issues

**Research date:** 2026-02-10
**Valid until:** 2026-03-10 (stable patterns, 30-day validity)
