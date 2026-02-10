"""Tests for HTML report generation service.

Tests self-containment verification, chart generation, and template rendering
without requiring a database connection.
"""

from datetime import date, time
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from src.schemas.report import DashboardStats
from src.services.html_report import HtmlReportService


@pytest.fixture
def service():
    """Create a fresh HtmlReportService instance."""
    return HtmlReportService()


@pytest.fixture
def mock_case():
    """Create a mock case object mimicking SQLAlchemy model."""
    case = SimpleNamespace(
        title="USB Data Transfer Investigation",
        case_number=42,
        status="active",
        description="Investigation into unauthorized USB transfers.",
        metadata_={"serial_number": "USB-001", "user_name": "John Doe"},
        audit_type=SimpleNamespace(name="USB Usage"),
        assigned_to=SimpleNamespace(full_name="Alice Auditor"),
        created_by=SimpleNamespace(full_name="Bob Manager"),
    )
    return case


@pytest.fixture
def mock_events():
    """Create mock event objects mimicking SQLAlchemy models."""
    events = [
        SimpleNamespace(
            event_type="finding",
            event_date=date(2026, 1, 15),
            event_time=time(10, 30),
            file_name="report.xlsx",
            file_count=5,
            file_description="Quarterly financial report",
            file_type="xlsx",
            file_batches=[
                SimpleNamespace(
                    label="Financial Docs",
                    file_count=3,
                    description="Q4 reports",
                    file_types="xlsx,pdf",
                ),
            ],
        ),
        SimpleNamespace(
            event_type="action",
            event_date=date(2026, 1, 16),
            event_time=None,
            file_name="backup.zip",
            file_count=150,
            file_description="Full backup archive",
            file_type="zip",
            file_batches=[],
        ),
        SimpleNamespace(
            event_type="note",
            event_date=date(2026, 1, 17),
            event_time=time(14, 0),
            file_name=None,
            file_count=None,
            file_description="User interview conducted",
            file_type=None,
            file_batches=[],
        ),
    ]
    return events


@pytest.fixture
def mock_stats():
    """Create mock dashboard stats."""
    return DashboardStats(
        total_events=3,
        total_file_batches=1,
        total_files=158,
        date_range_start=date(2026, 1, 15),
        date_range_end=date(2026, 1, 17),
        events_by_type={"finding": 1, "action": 1, "note": 1},
        events_by_date={
            "2026-01-15": 1,
            "2026-01-16": 1,
            "2026-01-17": 1,
        },
    )


@pytest.fixture
def mock_data(mock_case, mock_events, mock_stats):
    """Create a complete mock data dict for rendering."""
    return {
        "case": mock_case,
        "events": mock_events,
        "stats": mock_stats,
        "generated_at": "2026-01-20 12:00 UTC",
        "timeline_chart_html": '<div id="timeline-chart">Mock timeline chart</div>',
        "stats_chart_html": '<div id="stats-chart">Mock stats chart</div>',
        "daily_chart_html": '<div id="daily-chart">Mock daily chart</div>',
    }


# ======================================================================
# Self-containment verification tests
# ======================================================================


class TestVerifySelfContained:
    """Tests for the verify_self_contained method."""

    def test_verify_clean_html(self, service):
        """Clean HTML with no external refs should pass."""
        html = """
        <!DOCTYPE html>
        <html>
        <head><style>body { color: black; }</style></head>
        <body><h1>Report</h1></body>
        </html>
        """
        violations = service.verify_self_contained(html)
        assert violations == []

    def test_verify_external_stylesheet(self, service):
        """External stylesheet link should be flagged."""
        html = '<link rel="stylesheet" href="https://cdn.example.com/style.css">'
        violations = service.verify_self_contained(html)
        assert len(violations) == 1
        assert "stylesheet" in violations[0].lower()

    def test_verify_external_script(self, service):
        """External script src should be flagged."""
        html = '<script src="https://cdn.example.com/app.js"></script>'
        violations = service.verify_self_contained(html)
        assert len(violations) == 1
        assert "script" in violations[0].lower()

    def test_verify_css_import(self, service):
        """CSS @import url() should be flagged."""
        html = '<style>@import url("https://fonts.googleapis.com/css?family=Roboto");</style>'
        violations = service.verify_self_contained(html)
        assert len(violations) == 1
        assert "import" in violations[0].lower()

    def test_verify_data_uri_ok(self, service):
        """Data URIs should NOT be flagged."""
        html = '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...">'
        violations = service.verify_self_contained(html)
        assert violations == []

    def test_verify_anchor_link_ok(self, service):
        """Anchor links (href=#) should NOT be flagged."""
        html = '<a href="#section1">Go to section 1</a>'
        violations = service.verify_self_contained(html)
        assert violations == []

    def test_verify_inline_script_ok(self, service):
        """Inline scripts (no src) should NOT be flagged."""
        html = "<script>console.log('hello');</script>"
        violations = service.verify_self_contained(html)
        assert violations == []

    def test_verify_multiple_violations(self, service):
        """Multiple different violation types should all be reported."""
        html = """
        <link rel="stylesheet" href="https://cdn.example.com/style.css">
        <script src="https://cdn.example.com/app.js"></script>
        <style>@import url("https://fonts.googleapis.com");</style>
        """
        violations = service.verify_self_contained(html)
        assert len(violations) == 3

    def test_verify_external_image(self, service):
        """External image src should be flagged."""
        html = '<img src="https://example.com/logo.png">'
        violations = service.verify_self_contained(html)
        assert len(violations) == 1
        assert "image" in violations[0].lower()


# ======================================================================
# Chart generation tests
# ======================================================================


class TestChartGeneration:
    """Tests for Plotly chart generation methods."""

    def test_timeline_chart_returns_html(self, service, mock_events):
        """Timeline chart should return HTML containing the div id."""
        html = service._generate_timeline_chart(mock_events, "Test Case")
        assert "timeline-chart" in html
        assert isinstance(html, str)

    def test_timeline_chart_includes_plotlyjs(self, service, mock_events):
        """Timeline chart (first chart) should include plotly.js."""
        html = service._generate_timeline_chart(mock_events, "Test Case")
        # plotly.js is ~4.8MB; if included, the output should be >1MB
        assert len(html) > 1_000_000

    def test_stats_chart_excludes_plotlyjs(self, service, mock_stats):
        """Stats chart should NOT include plotly.js (uses False)."""
        html = service._generate_stats_chart(mock_stats)
        # Without plotly.js, chart HTML should be <100KB
        assert len(html) < 100_000
        assert "stats-chart" in html

    def test_daily_chart_excludes_plotlyjs(self, service, mock_stats):
        """Daily chart should NOT include plotly.js."""
        html = service._generate_daily_activity_chart(mock_stats)
        assert len(html) < 100_000
        assert "daily-chart" in html

    def test_empty_events_timeline_chart(self, service):
        """Empty events list should still produce valid chart HTML."""
        html = service._generate_timeline_chart([], "Empty Case")
        assert "timeline-chart" in html
        assert "No events recorded" in html

    def test_empty_stats_chart(self, service):
        """Empty stats should produce valid chart HTML."""
        stats = DashboardStats()
        html = service._generate_stats_chart(stats)
        assert "stats-chart" in html
        assert "No events recorded" in html

    def test_empty_daily_chart(self, service):
        """Empty daily stats should produce valid chart HTML."""
        stats = DashboardStats()
        html = service._generate_daily_activity_chart(stats)
        assert "daily-chart" in html
        assert "No events recorded" in html

    def test_timeline_chart_has_event_type_traces(self, service, mock_events):
        """Timeline chart should create traces for each event type."""
        html = service._generate_timeline_chart(mock_events, "Test Case")
        assert "Finding" in html
        assert "Action" in html
        assert "Note" in html


# ======================================================================
# Template rendering tests
# ======================================================================


class TestTemplateRendering:
    """Tests for HTML template rendering."""

    def test_render_html_basic(self, service, mock_data):
        """Basic rendering should include the case title."""
        html = service.render_html(mock_data)
        assert "USB Data Transfer Investigation" in html
        assert isinstance(html, str)

    def test_render_html_contains_stats(self, service, mock_data):
        """Rendered HTML should contain dashboard stats."""
        html = service.render_html(mock_data)
        assert "Total Events" in html
        assert "File Batches" in html
        assert "Total Files" in html

    def test_render_html_contains_events_table(self, service, mock_data):
        """Rendered HTML should contain the events table."""
        html = service.render_html(mock_data)
        assert "Event Details" in html
        assert "2026-01-15" in html
        assert "report.xlsx" in html

    def test_render_html_contains_metadata(self, service, mock_data):
        """Rendered HTML should contain case metadata."""
        html = service.render_html(mock_data)
        assert "serial number" in html.lower()
        assert "USB-001" in html

    def test_render_html_contains_charts(self, service, mock_data):
        """Rendered HTML should include chart divs."""
        html = service.render_html(mock_data)
        assert "Mock timeline chart" in html
        assert "Mock stats chart" in html
        assert "Mock daily chart" in html

    def test_render_html_escapes_user_data(self, service, mock_data):
        """User-provided data should be HTML-escaped to prevent XSS."""
        mock_data["case"].title = '<script>alert("XSS")</script>'
        html = service.render_html(mock_data)
        # The script tag should be escaped, not rendered as HTML
        assert "<script>alert" not in html
        assert "&lt;script&gt;" in html

    def test_render_html_safe_charts(self, service, mock_data):
        """Chart HTML (pre-generated by Plotly) should NOT be escaped."""
        mock_data["timeline_chart_html"] = '<div class="plotly-graph-div">chart content</div>'
        html = service.render_html(mock_data)
        # Chart divs should appear unescaped
        assert '<div class="plotly-graph-div">chart content</div>' in html

    def test_render_html_contains_footer(self, service, mock_data):
        """Rendered HTML should contain the footer."""
        html = service.render_html(mock_data)
        assert "Generated by" in html
        assert "AuditTrail" in html

    def test_render_html_contains_header(self, service, mock_data):
        """Rendered HTML should contain the header with case info."""
        html = service.render_html(mock_data)
        assert "#42" in html
        assert "active" in html
        assert "USB Usage" in html

    def test_render_html_no_events(self, service, mock_data):
        """Report with no events should show empty state."""
        mock_data["events"] = []
        html = service.render_html(mock_data)
        assert "No events recorded" in html

    def test_render_html_file_batches(self, service, mock_data):
        """Report should include file batch details."""
        html = service.render_html(mock_data)
        assert "Financial Docs" in html

    def test_render_html_is_valid_html(self, service, mock_data):
        """Rendered HTML should be a complete HTML document."""
        html = service.render_html(mock_data)
        assert html.strip().startswith("<!DOCTYPE html>")
        assert "</html>" in html
        assert "<head>" in html
        assert "<body>" in html


# ======================================================================
# Stats computation tests
# ======================================================================


class TestComputeStats:
    """Tests for dashboard stats computation."""

    def test_empty_events(self, service):
        """Empty events list should return zero stats."""
        stats = service._compute_stats([])
        assert stats.total_events == 0
        assert stats.total_files == 0
        assert stats.date_range_start is None

    def test_stats_with_events(self, service, mock_events):
        """Stats should correctly count events and files."""
        stats = service._compute_stats(mock_events)
        assert stats.total_events == 3
        assert stats.total_file_batches == 1
        # 5 (from event 1) + 150 (from event 2) + 0 (event 3) + 3 (batch) = 158
        assert stats.total_files == 158
        assert stats.date_range_start == date(2026, 1, 15)
        assert stats.date_range_end == date(2026, 1, 17)
        assert stats.events_by_type == {"finding": 1, "action": 1, "note": 1}

    def test_stats_events_by_date(self, service, mock_events):
        """Events by date should have correct counts."""
        stats = service._compute_stats(mock_events)
        assert stats.events_by_date["2026-01-15"] == 1
        assert stats.events_by_date["2026-01-16"] == 1
        assert stats.events_by_date["2026-01-17"] == 1


# ======================================================================
# Report size info tests
# ======================================================================


class TestReportSizeInfo:
    """Tests for report size info method."""

    def test_small_html(self, service):
        """Small HTML should report correct size."""
        html = "<html><body>Hello</body></html>"
        info = service.get_report_size_info(html)
        assert info["total_bytes"] == len(html.encode("utf-8"))
        assert info["has_plotly_js"] is False
        assert info["estimated_chart_count"] == 0

    def test_size_with_charts(self, service):
        """HTML with plotly div class should count charts."""
        html = '<div class="plotly-graph-div">chart1</div><div class="plotly-graph-div">chart2</div>'
        info = service.get_report_size_info(html)
        assert info["estimated_chart_count"] == 2
