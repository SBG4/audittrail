import logging
import uuid
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

from jinja2 import Environment, FileSystemLoader
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.case import Case
from src.models.event import Event
from src.schemas.report import DashboardStats

logger = logging.getLogger(__name__)

TEMPLATES_DIR = Path(__file__).parent.parent / "templates" / "reports"


class HtmlReportService:
    """Service for generating self-contained interactive HTML reports."""

    def __init__(self) -> None:
        self.env = Environment(
            loader=FileSystemLoader(str(TEMPLATES_DIR)),
            autoescape=True,
        )

    async def collect_report_data(
        self, case_id: uuid.UUID, db: AsyncSession
    ) -> dict:
        """Collect all data needed for HTML report generation."""
        # Fetch case with relationships
        result = await db.execute(
            select(Case)
            .options(
                selectinload(Case.audit_type),
                selectinload(Case.assigned_to),
                selectinload(Case.created_by),
            )
            .where(Case.id == case_id)
        )
        case = result.scalar_one_or_none()
        if case is None:
            raise ValueError(f"Case not found: {case_id}")

        # Fetch all events for case with file_batches
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
        events = list(events_result.scalars().all())

        # Compute dashboard stats
        stats = self._compute_stats(events)

        return {
            "case": case,
            "events": events,
            "stats": stats,
            "generated_at": datetime.now(timezone.utc).strftime(
                "%Y-%m-%d %H:%M UTC"
            ),
        }

    def _compute_stats(self, events: list) -> DashboardStats:
        """Compute dashboard statistics from events."""
        if not events:
            return DashboardStats()

        total_file_batches = sum(
            len(e.file_batches) for e in events
        )
        total_files_from_events = sum(
            e.file_count or 0 for e in events
        )
        total_files_from_batches = sum(
            b.file_count
            for e in events
            for b in e.file_batches
        )
        total_files = total_files_from_events + total_files_from_batches

        dates = [e.event_date for e in events]
        date_range_start = min(dates) if dates else None
        date_range_end = max(dates) if dates else None

        events_by_type = dict(Counter(e.event_type for e in events))
        events_by_date = dict(
            Counter(e.event_date.isoformat() for e in events)
        )

        return DashboardStats(
            total_events=len(events),
            total_file_batches=total_file_batches,
            total_files=total_files,
            date_range_start=date_range_start,
            date_range_end=date_range_end,
            events_by_type=events_by_type,
            events_by_date=events_by_date,
        )

    def render_html(self, data: dict) -> str:
        """Render the HTML report from collected data."""
        template = self.env.get_template("html_report.html")

        case = data["case"]
        stats = data["stats"]

        # Compute date range days
        date_range_days = 0
        if stats.date_range_start and stats.date_range_end:
            delta = stats.date_range_end - stats.date_range_start
            date_range_days = delta.days + 1  # inclusive

        # Prepare template context
        context = {
            "case_title": case.title,
            "case_number": case.case_number,
            "case_status": case.status,
            "case_description": case.description,
            "audit_type_name": (
                case.audit_type.name if case.audit_type else None
            ),
            "assigned_to": (
                case.assigned_to.full_name if case.assigned_to else None
            ),
            "created_by": (
                case.created_by.full_name if case.created_by else None
            ),
            "generated_at": data["generated_at"],
            "stats": {
                "total_events": stats.total_events,
                "total_file_batches": stats.total_file_batches,
                "total_files": stats.total_files,
                "date_range_start": (
                    stats.date_range_start.isoformat()
                    if stats.date_range_start
                    else None
                ),
                "date_range_end": (
                    stats.date_range_end.isoformat()
                    if stats.date_range_end
                    else None
                ),
                "date_range_days": date_range_days,
                "events_by_type": stats.events_by_type,
                "events_by_date": stats.events_by_date,
            },
            "events": data["events"],
            "metadata": case.metadata_ or {},
            # Chart HTML placeholders (populated by Plan 08-02)
            "timeline_chart_html": data.get("timeline_chart_html", ""),
            "stats_chart_html": data.get("stats_chart_html", ""),
            "daily_chart_html": data.get("daily_chart_html", ""),
        }

        return template.render(**context)

    async def generate(
        self, case_id: uuid.UUID, db: AsyncSession
    ) -> tuple[str, str]:
        """Generate a complete HTML report for a case.

        Returns:
            Tuple of (html_content, filename)
        """
        data = await self.collect_report_data(case_id, db)
        html = self.render_html(data)
        filename = f"audit-report-{data['case'].case_number}.html"

        logger.info(
            "Generated HTML report for case %s (%d bytes)",
            case_id,
            len(html.encode("utf-8")),
        )

        return html, filename


html_report_service = HtmlReportService()
