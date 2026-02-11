import time
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import settings
from src.deps import (
    create_access_token,
    get_current_user,
    get_db,
    verify_password,
)
from src.models.user import User
from src.schemas.auth import Token
from src.schemas.user import UserRead

router = APIRouter(prefix="/auth", tags=["auth"])

# In-memory rate limiting for login endpoint
_login_attempts: dict[str, list[float]] = defaultdict(list)


def _check_login_rate_limit(client_ip: str) -> None:
    """Enforce per-IP rate limiting on login attempts."""
    now = time.monotonic()
    window = settings.LOGIN_RATE_WINDOW_SECONDS
    attempts = _login_attempts[client_ip]
    # Prune attempts outside the window
    _login_attempts[client_ip] = [t for t in attempts if now - t < window]
    if len(_login_attempts[client_ip]) >= settings.LOGIN_RATE_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Please try again later.",
        )
    _login_attempts[client_ip].append(now)


@router.post("/login", response_model=Token)
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
) -> Token:
    client_ip = request.client.host if request.client else "unknown"
    _check_login_rate_limit(client_ip)

    result = await db.execute(
        select(User).where(User.username == form_data.username)
    )
    user = result.scalar_one_or_none()

    if user is None or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": user.username})
    return Token(access_token=access_token)


@router.get("/me", response_model=UserRead)
async def read_current_user(
    current_user: User = Depends(get_current_user),
) -> UserRead:
    return UserRead.model_validate(current_user)
