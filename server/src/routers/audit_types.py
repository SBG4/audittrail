import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.deps import get_current_user, get_db
from src.models.audit_type import AuditType
from src.models.user import User
from src.schemas.audit_type import AuditTypeList, AuditTypeRead

router = APIRouter(prefix="/audit-types", tags=["audit-types"])


@router.get("/", response_model=AuditTypeList)
async def list_audit_types(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AuditTypeList:
    """List all active audit types."""
    result = await db.execute(
        select(AuditType)
        .where(AuditType.is_active == True)  # noqa: E712
        .order_by(AuditType.name)
    )
    items = result.scalars().all()
    return AuditTypeList(
        items=[AuditTypeRead.model_validate(item) for item in items],
        total=len(items),
    )


@router.get("/{audit_type_id}", response_model=AuditTypeRead)
async def get_audit_type(
    audit_type_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AuditTypeRead:
    """Get a single audit type by ID."""
    result = await db.execute(
        select(AuditType).where(AuditType.id == audit_type_id)
    )
    audit_type = result.scalar_one_or_none()
    if audit_type is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audit type not found",
        )
    return AuditTypeRead.model_validate(audit_type)
