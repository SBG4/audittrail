import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response

from src.config import settings
from src.routers.audit_types import router as audit_types_router
from src.routers.auth import router as auth_router
from src.routers.cases import router as cases_router
from src.routers.events import router as events_router
from src.routers.file_batches import router as file_batches_router
from src.routers.imports import router as imports_router
from src.routers.jira import router as jira_router
from src.routers.reports import router as reports_router
from src.routers.users import router as users_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.SECRET_KEY == "change-me-in-production":
        raise RuntimeError(
            "FATAL: SECRET_KEY is set to the default value. "
            "Set a strong SECRET_KEY environment variable. "
            "Generate one with: python -c 'import secrets; print(secrets.token_urlsafe(64))'"
        )
    yield


app = FastAPI(title="AuditTrail", root_path="/api", lifespan=lifespan)


@app.middleware("http")
async def security_headers(request: Request, call_next) -> Response:
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return response


app.include_router(auth_router)
app.include_router(audit_types_router)
app.include_router(cases_router)
app.include_router(events_router)
app.include_router(file_batches_router)
app.include_router(imports_router)
app.include_router(jira_router)
app.include_router(reports_router)
app.include_router(users_router)


@app.get("/health")
async def health_check():
    return {"status": "ok"}
