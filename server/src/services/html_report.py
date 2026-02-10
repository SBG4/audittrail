import logging
import uuid
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import plotly.graph_objects as go
from jinja2 import Environment, FileSystemLoader
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.case import Case
from src.models.event import Event
from src.schemas.report import DashboardStats

logger = logging.getLogger(__name__)

TEMPLATES_DIR = Path(__file__).parent.parent / "templates" / "reports"

# Color scheme matching the HTML template
TYPE_COLORS = {
    "finding": "#ef4444",
    "action": "#22c55e",
    "note": "#6366f1",
}

CHART_LAYOUT_DEFAULTS = dict(
    paper_bgcolor="white",
    plot_bgcolor="white",
    font=dict(
        family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        size=13,
        color="#0f172a",
    ),
    margin=dict(l=60, r=30, t=50, b=50),
)


class HtmlReportService:
    """Service for generating self-contained interactive HTML reports."""

    def __init__(self) -> None:
        self.env = Environment(
            loader=FileSystemLoader(str(TEMPLATES_DIR)),
            autoescape=True,
        )

    # ------------------------------------------------------------------
    # Data collection
    # ------------------------------------------------------------------

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

        total_file_batches = sum(len(e.file_batches) for e in events)
        total_files_from_events = sum(e.file_count or 0 for e in events)
        total_files_from_batches = sum(
            b.file_count for e in events for b in e.file_batches
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

    # ------------------------------------------------------------------
    # Plotly chart generation
    # ------------------------------------------------------------------

    def _generate_timeline_chart(
        self, events: list, case_title: str
    ) -> str:
        """Generate an interactive timeline scatter chart.

        The FIRST chart in the report -- includes the full plotly.js
        library (~3 MB) so the file is self-contained.
        """
        if not events:
            fig = go.Figure()
            fig.add_annotation(
                text="No events recorded",
                xref="paper",
                yref="paper",
                x=0.5,
                y=0.5,
                showarrow=False,
                font=dict(size=16, color="#94a3b8"),
            )
            fig.update_layout(
                title="Event Timeline",
                height=300,
                **CHART_LAYOUT_DEFAULTS,
            )
            return fig.to_html(
                include_plotlyjs=True,
                full_html=False,
                div_id="timeline-chart",
                config={"displayModeBar": True, "scrollZoom": True},
            )

        # Group events by type for separate traces
        type_events: dict[str, list] = {}
        for e in events:
            type_events.setdefault(e.event_type, []).append(e)

        fig = go.Figure()

        type_labels = {"finding": "Finding", "action": "Action", "note": "Note"}

        for event_type, evts in type_events.items():
            dates = [e.event_date.isoformat() for e in evts]
            y_labels = [type_labels.get(event_type, event_type)] * len(evts)
            sizes = [
                max(8, min(30, (e.file_count or 0) + 8)) for e in evts
            ]
            hover_texts = []
            for e in evts:
                parts = [f"<b>{e.event_date.isoformat()}</b>"]
                if e.event_time:
                    parts.append(f"Time: {e.event_time.isoformat()}")
                if e.file_name:
                    parts.append(f"File: {e.file_name}")
                if e.file_description:
                    desc = e.file_description[:100]
                    if len(e.file_description) > 100:
                        desc += "..."
                    parts.append(f"Desc: {desc}")
                if e.file_count is not None:
                    parts.append(f"Files: {e.file_count}")
                hover_texts.append("<br>".join(parts))

            fig.add_trace(
                go.Scatter(
                    x=dates,
                    y=y_labels,
                    mode="markers",
                    name=type_labels.get(event_type, event_type),
                    marker=dict(
                        color=TYPE_COLORS.get(event_type, "#94a3b8"),
                        size=sizes,
                        line=dict(width=1, color="white"),
                    ),
                    hovertext=hover_texts,
                    hoverinfo="text",
                )
            )

        fig.update_layout(
            title="Event Timeline",
            xaxis=dict(
                title="Date",
                type="date",
                gridcolor="#f1f5f9",
            ),
            yaxis=dict(
                title="",
                gridcolor="#f1f5f9",
                categoryorder="array",
                categoryarray=["Note", "Action", "Finding"],
            ),
            height=350,
            showlegend=True,
            legend=dict(orientation="h", y=-0.2),
            hovermode="closest",
            **CHART_LAYOUT_DEFAULTS,
        )

        return fig.to_html(
            include_plotlyjs=True,
            full_html=False,
            div_id="timeline-chart",
            config={"displayModeBar": True, "scrollZoom": True},
        )

    def _generate_stats_chart(self, stats: DashboardStats) -> str:
        """Generate a bar chart showing events by type.

        Uses include_plotlyjs=False since plotly.js is already loaded
        by the timeline chart.
        """
        type_labels = {"finding": "Finding", "action": "Action", "note": "Note"}
        types = list(stats.events_by_type.keys())
        counts = list(stats.events_by_type.values())
        colors = [TYPE_COLORS.get(t, "#94a3b8") for t in types]
        labels = [type_labels.get(t, t) for t in types]

        if not types:
            fig = go.Figure()
            fig.add_annotation(
                text="No events recorded",
                xref="paper",
                yref="paper",
                x=0.5,
                y=0.5,
                showarrow=False,
                font=dict(size=16, color="#94a3b8"),
            )
        else:
            fig = go.Figure(
                data=[
                    go.Bar(
                        x=labels,
                        y=counts,
                        marker_color=colors,
                        text=counts,
                        textposition="auto",
                    )
                ]
            )

        fig.update_layout(
            title="Events by Type",
            xaxis=dict(title=""),
            yaxis=dict(title="Count", gridcolor="#f1f5f9"),
            height=300,
            showlegend=False,
            **CHART_LAYOUT_DEFAULTS,
        )

        return fig.to_html(
            include_plotlyjs=False,
            full_html=False,
            div_id="stats-chart",
        )

    def _generate_daily_activity_chart(self, stats: DashboardStats) -> str:
        """Generate a bar chart showing events per day.

        Uses include_plotlyjs=False since plotly.js is already loaded.
        """
        dates = sorted(stats.events_by_date.keys())
        counts = [stats.events_by_date[d] for d in dates]

        if not dates:
            fig = go.Figure()
            fig.add_annotation(
                text="No events recorded",
                xref="paper",
                yref="paper",
                x=0.5,
                y=0.5,
                showarrow=False,
                font=dict(size=16, color="#94a3b8"),
            )
        else:
            fig = go.Figure(
                data=[
                    go.Bar(
                        x=dates,
                        y=counts,
                        marker_color="#3b82f6",
                        text=counts,
                        textposition="auto",
                    )
                ]
            )

        fig.update_layout(
            title="Daily Activity",
            xaxis=dict(title="Date", type="date", gridcolor="#f1f5f9"),
            yaxis=dict(title="Events", gridcolor="#f1f5f9"),
            height=300,
            showlegend=False,
            **CHART_LAYOUT_DEFAULTS,
        )

        return fig.to_html(
            include_plotlyjs=False,
            full_html=False,
            div_id="daily-chart",
        )

    # ------------------------------------------------------------------
    # Rendering
    # ------------------------------------------------------------------

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
            "timeline_chart_html": data.get("timeline_chart_html", ""),
            "stats_chart_html": data.get("stats_chart_html", ""),
            "daily_chart_html": data.get("daily_chart_html", ""),
        }

        return template.render(**context)

    # ------------------------------------------------------------------
    # Self-containment verification
    # ------------------------------------------------------------------

    def verify_self_contained(self, html: str) -> list[str]:
        """Verify HTML has no external URL references.

        Returns a list of violation descriptions. Empty list means the
        HTML is fully self-contained.
        """
        import re

        violations: list[str] = []

        # Check for external stylesheet links
        link_pattern = re.compile(
            r'<link[^>]+rel=["\']stylesheet["\'][^>]+href=["\'](?!data:)',
            re.IGNORECASE,
        )
        link_matches = link_pattern.findall(html)
        if link_matches:
            violations.append(
                f"External stylesheet link tags: {len(link_matches)}"
            )

        # Check for external script src (excluding inline scripts)
        script_src_pattern = re.compile(
            r'<script[^>]+src=["\'](?!data:)',
            re.IGNORECASE,
        )
        script_matches = script_src_pattern.findall(html)
        if script_matches:
            violations.append(
                f"External script src tags: {len(script_matches)}"
            )

        # Check for CSS @import
        import_pattern = re.compile(r"@import\s+url\(", re.IGNORECASE)
        import_matches = import_pattern.findall(html)
        if import_matches:
            violations.append(
                f"CSS @import statements: {len(import_matches)}"
            )

        # Check for external image src (not data: URIs)
        img_pattern = re.compile(
            r'<img[^>]+src=["\'](?!data:)(?:https?://|//)',
            re.IGNORECASE,
        )
        img_matches = img_pattern.findall(html)
        if img_matches:
            violations.append(
                f"External image sources: {len(img_matches)}"
            )

        return violations

    def get_report_size_info(self, html: str) -> dict:
        """Get size information about the generated report."""
        size_bytes = len(html.encode("utf-8"))
        return {
            "total_bytes": size_bytes,
            "total_kb": round(size_bytes / 1024, 1),
            "total_mb": round(size_bytes / (1024 * 1024), 2),
            "has_plotly_js": "plotly" in html.lower()
            and len(html) > 1_000_000,
            "estimated_chart_count": html.count('class="plotly-graph-div"'),
        }

    # ------------------------------------------------------------------
    # Generation pipeline
    # ------------------------------------------------------------------

    async def generate(
        self, case_id: uuid.UUID, db: AsyncSession
    ) -> tuple[str, str]:
        """Generate a complete self-contained HTML report for a case.

        Returns:
            Tuple of (html_content, filename)
        """
        data = await self.collect_report_data(case_id, db)

        # Generate interactive Plotly charts
        data["timeline_chart_html"] = self._generate_timeline_chart(
            data["events"], data["case"].title
        )
        data["stats_chart_html"] = self._generate_stats_chart(data["stats"])
        data["daily_chart_html"] = self._generate_daily_activity_chart(
            data["stats"]
        )

        html = self.render_html(data)

        # Verify self-containment
        violations = self.verify_self_contained(html)
        if violations:
            logger.warning(
                "HTML report self-containment violations for case %s: %s",
                case_id,
                violations,
            )
        else:
            logger.info(
                "HTML report self-containment verified for case %s", case_id
            )

        size_info = self.get_report_size_info(html)
        filename = f"audit-report-{data['case'].case_number}.html"

        logger.info(
            "Generated HTML report for case %s: %s (%.1f KB, %d charts)",
            case_id,
            filename,
            size_info["total_kb"],
            size_info["estimated_chart_count"],
        )

        return html, filename


html_report_service = HtmlReportService()
