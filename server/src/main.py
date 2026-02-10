from fastapi import FastAPI

from src.routers.audit_types import router as audit_types_router
from src.routers.auth import router as auth_router
from src.routers.cases import router as cases_router

app = FastAPI(title="AuditTrail", root_path="/api")

app.include_router(auth_router)
app.include_router(audit_types_router)
app.include_router(cases_router)


@app.get("/health")
async def health_check():
    return {"status": "ok"}
