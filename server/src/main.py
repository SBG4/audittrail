from fastapi import FastAPI

app = FastAPI(title="AuditTrail", root_path="/api")


@app.get("/health")
async def health_check():
    return {"status": "ok"}
