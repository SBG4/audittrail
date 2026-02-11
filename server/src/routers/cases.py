import uuid

import jsonschema
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.deps import get_current_user, get_db
from src.models.audit_type import AuditType
from src.models.case import Case
from src.models.user import User
from src.schemas.case import CaseCreate, CaseListResponse, CaseRead, CaseUpdate

router = APIRouter(prefix="/cases", tags=["cases"])

VALID_TRANSITIONS: dict[str, list[str]] = {
    "open": ["active", "closed"],
    "active": ["closed"],
    "closed": ["open"],
}


def validate_case_metadata(metadata: dict, schema: dict) -> None:
    """Validate case metadata against the audit type's JSON Schema."""
    try:
        jsonschema.validate(instance=metadata, schema=schema)
    except jsonschema.ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Metadata validation failed: {e.message}",
        )


def validate_status_transition(current: str, target: str) -> None:
    """Validate that a status transition is allowed."""
    allowed = VALID_TRANSITIONS.get(current, [])
    if target not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot transition from '{current}' to '{target}'",
        )


def _escape_like(value: str) -> str:
    """Escape SQL LIKE wildcard characters to prevent pattern injection."""
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _case_query():
    """Build a base query for cases with eagerly loaded relationships."""
    return select(Case).options(
        selectinload(Case.audit_type),
        selectinload(Case.assigned_to),
        selectinload(Case.created_by),
    )


@router.post("/", response_model=CaseRead, status_code=status.HTTP_201_CREATED)
async def create_case(
    body: CaseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CaseRead:
    """Create a new case with metadata validated against the audit type schema."""
    # Fetch audit type
    result = await db.execute(
        select(AuditType).where(AuditType.id == body.audit_type_id)
    )
    audit_type = result.scalar_one_or_none()
    if audit_type is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audit type not found",
        )

    # Validate metadata against audit type schema
    validate_case_metadata(body.metadata, audit_type.schema)

    # Create case
    case = Case(
        title=body.title,
        description=body.description,
        audit_type_id=body.audit_type_id,
        metadata_=body.metadata,
        status="open",
        created_by_id=current_user.id,
    )
    db.add(case)
    await db.commit()

    # Refresh with relationships
    result = await db.execute(_case_query().where(Case.id == case.id))
    case = result.scalar_one()

    return CaseRead.model_validate(case)


@router.get("/", response_model=CaseListResponse)
async def list_cases(
    status_filter: str | None = Query(None, alias="status"),
    audit_type_id: uuid.UUID | None = None,
    assigned_to_id: uuid.UUID | None = None,
    search: str | None = None,
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CaseListResponse:
    """List cases with optional filtering, search, and pagination."""
    query = _case_query()

    # Apply filters
    if status_filter:
        query = query.where(Case.status == status_filter)
    if audit_type_id:
        query = query.where(Case.audit_type_id == audit_type_id)
    if assigned_to_id:
        query = query.where(Case.assigned_to_id == assigned_to_id)
    if search:
        escaped = _escape_like(search)
        query = query.where(
            or_(
                Case.title.ilike(f"%{escaped}%", escape="\\"),
                Case.description.ilike(f"%{escaped}%", escape="\\"),
            )
        )

    # Count total matching records
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    # Order and paginate
    query = query.order_by(Case.updated_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    cases = result.scalars().all()

    return CaseListResponse(
        items=[CaseRead.model_validate(c) for c in cases],
        total=total,
        offset=offset,
        limit=limit,
    )


@router.get("/{case_id}", response_model=CaseRead)
async def get_case(
    case_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CaseRead:
    """Get a single case by ID."""
    result = await db.execute(_case_query().where(Case.id == case_id))
    case = result.scalar_one_or_none()
    if case is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found",
        )
    return CaseRead.model_validate(case)


@router.patch("/{case_id}", response_model=CaseRead)
async def update_case(
    case_id: uuid.UUID,
    body: CaseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CaseRead:
    """Partially update a case with lifecycle and metadata validation."""
    result = await db.execute(_case_query().where(Case.id == case_id))
    case = result.scalar_one_or_none()
    if case is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found",
        )

    update_data = body.model_dump(exclude_unset=True)

    # Validate status transition if status is being changed
    if "status" in update_data and update_data["status"] is not None:
        validate_status_transition(case.status, update_data["status"])

    # Validate metadata if being changed
    if "metadata" in update_data and update_data["metadata"] is not None:
        # Fetch audit type for schema validation
        at_result = await db.execute(
            select(AuditType).where(AuditType.id == case.audit_type_id)
        )
        audit_type = at_result.scalar_one()
        validate_case_metadata(update_data["metadata"], audit_type.schema)

    # Apply updates
    for field, value in update_data.items():
        if field == "metadata":
            # Replace entire dict to avoid JSONB mutation tracking issues
            case.metadata_ = value
        else:
            setattr(case, field, value)

    await db.commit()

    # Refresh with relationships
    result = await db.execute(_case_query().where(Case.id == case_id))
    case = result.scalar_one()

    return CaseRead.model_validate(case)


@router.delete("/{case_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_case(
    case_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """Delete a case."""
    result = await db.execute(select(Case).where(Case.id == case_id))
    case = result.scalar_one_or_none()
    if case is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found",
        )
    await db.delete(case)
    await db.commit()
