"""Report data collection and document generation service.

Provides a shared data collection pipeline for all report formats (PDF, DOCX, HTML)
and rendering functions for each format.
"""

import asyncio
import uuid
from functools import partial
from pathlib import Path
from datetime import datetime, timezone

from fastapi import HTTPException, status
from jinja2 import Environment, FileSystemLoader
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from weasyprint import HTML

from src.models.case import Case
from src.models.event import Event
from src.models.user import User

# Template setup
_TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"
_jinja_env = Environment(loader=FileSystemLoader(str(_TEMPLATES_DIR)))

# Template name mapping
_TEMPLATE_MAP = {
    "timeline": "reports/timeline.html",
    "narrative": "reports/narrative.html",
}


async def collect_report_data(
    case_id: uuid.UUID,
    db: AsyncSession,
    current_user: User,
) -> dict:
    """Collect all data needed for report generation.

    Fetches the case with audit type, events with file batches,
    and formats everything into a template-ready dictionary.
    """
    # Fetch case with relationships
    result = await db.execute(
        select(Case)
        .where(Case.id == case_id)
        .options(
            selectinload(Case.audit_type),
            selectinload(Case.assigned_to),
            selectinload(Case.created_by),
        )
    )
    case = result.scalar_one_or_none()
    if case is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found",
        )

    # Fetch events with file batches, sorted chronologically
    events_result = await db.execute(
        select(Event)
        .where(Event.case_id == case_id)
        .options(
            selectinload(Event.file_batches),
            selectinload(Event.created_by),
        )
        .order_by(
            Event.event_date.asc(),
            Event.event_time.asc().nulls_last(),
            Event.sort_order.asc(),
        )
    )
    events = events_result.scalars().all()

    # Build events data
    events_data = []
    total_file_count = 0
    for event in events:
        batches_data = []
        for batch in event.file_batches:
            batches_data.append({
                "label": batch.label,
                "file_count": batch.file_count,
                "description": batch.description or "",
                "file_types": batch.file_types or "",
            })

        event_file_count = event.file_count or 0
        total_file_count += event_file_count

        events_data.append({
            "event_date": event.event_date.isoformat() if event.event_date else "",
            "event_date_formatted": event.event_date.strftime("%Y-%m-%d") if event.event_date else "N/A",
            "event_time": event.event_time.strftime("%H:%M") if event.event_time else "",
            "event_time_formatted": event.event_time.strftime("%H:%M") if event.event_time else "N/A",
            "event_type": event.event_type or "note",
            "file_name": event.file_name or "",
            "file_count": event_file_count,
            "file_description": event.file_description or "",
            "file_type": event.file_type or "",
            "file_batches": batches_data,
            "has_batches": len(batches_data) > 0,
        })

    # Compute summary stats
    first_date = events[0].event_date.strftime("%Y-%m-%d") if events else "N/A"
    last_date = events[-1].event_date.strftime("%Y-%m-%d") if events else "N/A"

    # Count events by type
    findings_count = sum(1 for e in events_data if e["event_type"] == "finding")
    actions_count = sum(1 for e in events_data if e["event_type"] == "action")
    notes_count = sum(1 for e in events_data if e["event_type"] == "note")

    # Build metadata fields list
    metadata_fields = []
    if case.metadata_:
        for key, value in case.metadata_.items():
            metadata_fields.append({
                "label": key.replace("_", " ").title(),
                "value": str(value) if value else "N/A",
            })

    now = datetime.now(timezone.utc)

    return {
        "case": {
            "case_number": case.case_number,
            "title": case.title,
            "description": case.description or "",
            "status": case.status.title(),
            "created_at": case.created_at.strftime("%Y-%m-%d %H:%M") if case.created_at else "N/A",
            "updated_at": case.updated_at.strftime("%Y-%m-%d %H:%M") if case.updated_at else "N/A",
        },
        "audit_type": {
            "name": case.audit_type.name if case.audit_type else "Unknown",
            "slug": case.audit_type.slug if case.audit_type else "unknown",
        },
        "assigned_to": case.assigned_to.full_name if case.assigned_to else "Unassigned",
        "created_by": case.created_by.full_name if case.created_by else "Unknown",
        "metadata_fields": metadata_fields,
        "events": events_data,
        "stats": {
            "total_events": len(events_data),
            "total_file_count": total_file_count,
            "findings_count": findings_count,
            "actions_count": actions_count,
            "notes_count": notes_count,
            "first_date": first_date,
            "last_date": last_date,
        },
        "generated_at": now.strftime("%Y-%m-%d %H:%M UTC"),
        "generated_by": current_user.full_name,
    }


def _generate_pdf_sync(mode: str, data: dict) -> bytes:
    """Render HTML template and convert to PDF using WeasyPrint (sync).

    This is CPU-bound and must be called via run_in_executor.
    """
    template_name = _TEMPLATE_MAP.get(mode, _TEMPLATE_MAP["timeline"])
    template = _jinja_env.get_template(template_name)
    html_string = template.render(**data)
    html_doc = HTML(
        string=html_string,
        base_url=str(_TEMPLATES_DIR / "reports"),
    )
    return html_doc.write_pdf()


async def generate_pdf(mode: str, data: dict) -> bytes:
    """Generate a PDF report asynchronously.

    Runs WeasyPrint in a thread pool executor to avoid blocking the event loop.
    """
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        None, partial(_generate_pdf_sync, mode, data)
    )
