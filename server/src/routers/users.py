from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.deps import get_current_user, get_db
from src.models.user import User
from src.schemas.user import UserRead

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/", response_model=list[UserRead])
async def list_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[UserRead]:
    """List all active users for assignment dropdowns."""
    result = await db.execute(
        select(User).where(User.is_active == True).order_by(User.full_name)
    )
    users = result.scalars().all()
    return [UserRead.model_validate(u) for u in users]
