import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.deps import get_current_user, get_db
from src.models.user import User
from src.services.report_generator import collect_report_data

router = APIRouter(prefix="/cases/{case_id}/reports", tags=["reports"])

VALID_FORMATS = {"pdf", "docx"}
VALID_MODES = {"timeline", "narrative"}


@router.get("/generate")
async def generate_report(
    case_id: uuid.UUID,
    format: str = Query("pdf", description="Report format: pdf or docx"),
    mode: str = Query("timeline", description="Report mode: timeline or narrative"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate a report for a case in the specified format and mode."""
    # Validate parameters
    if format not in VALID_FORMATS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid format '{format}'. Must be one of: {', '.join(sorted(VALID_FORMATS))}",
        )
    if mode not in VALID_MODES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid mode '{mode}'. Must be one of: {', '.join(sorted(VALID_MODES))}",
        )

    # Collect report data
    report_data = await collect_report_data(case_id, db, current_user)

    # Placeholder response -- PDF/DOCX rendering will be added in 07-03 and 07-04
    return {
        "message": f"{format.upper()} generation pending implementation",
        "format": format,
        "mode": mode,
        "case_number": report_data["case"]["case_number"],
        "event_count": report_data["stats"]["total_events"],
    }
