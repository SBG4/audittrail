from fastapi import FastAPI

from src.routers.auth import router as auth_router

app = FastAPI(title="AuditTrail", root_path="/api")

app.include_router(auth_router)


@app.get("/health")
async def health_check():
    return {"status": "ok"}
