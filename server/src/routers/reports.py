import io
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from src.deps import get_current_user, get_db
from src.models.user import User
from src.services.html_report import html_report_service
from src.services.report_generator import collect_report_data, generate_pdf

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
    case_number = report_data["case"]["case_number"]

    if format == "pdf":
        pdf_bytes = await generate_pdf(mode=mode, data=report_data)
        filename = f"case-{case_number}-{mode}-report.pdf"
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
            },
        )

    if format == "docx":
        # Placeholder -- DOCX rendering will be added in 07-04
        return {
            "message": "DOCX generation pending implementation",
            "format": format,
            "mode": mode,
            "case_number": case_number,
            "event_count": report_data["stats"]["total_events"],
        }


@router.get("/html")
async def download_html_report(
    case_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StreamingResponse:
    """Generate and download a self-contained interactive HTML report.

    The report includes:
    - Dashboard statistics
    - Interactive Plotly charts (timeline, events by type, daily activity)
    - Full event timeline with file batches
    - Case metadata

    The HTML file is fully self-contained with all CSS, JavaScript (Plotly.js),
    and chart data embedded. It works offline when opened by double-clicking.
    """
    try:
        html_content, filename = await html_report_service.generate(
            case_id, db
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )

    content_bytes = html_content.encode("utf-8")
    buffer = io.BytesIO(content_bytes)

    return StreamingResponse(
        buffer,
        media_type="text/html; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length": str(len(content_bytes)),
        },
    )
