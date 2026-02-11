"""Unit tests for JiraScraper._parse_fields HTML parsing."""

import pytest

from src.services.jira_scraper import JiraScraper


@pytest.fixture
def scraper():
    return JiraScraper()


class TestParseFieldsServerDC:
    """Strategy A: Jira Server/DC detail view."""

    def test_details_module_items(self, scraper):
        html = """
        <div id="details-module">
            <div class="item">
                <strong>Priority</strong>
                <div class="value">High</div>
            </div>
        </div>
        """
        fields = scraper._parse_fields(html)
        assert fields["Priority"] == "High"

    def test_details_layout_items(self, scraper):
        html = """
        <div class="details-layout">
            <div class="item">
                <div class="name">Status</div>
                <div class="value">Open</div>
            </div>
        </div>
        """
        fields = scraper._parse_fields(html)
        assert fields["Status"] == "Open"

    def test_field_group_pattern(self, scraper):
        html = """
        <div class="field-group">
            <label>Reporter</label>
            <div class="field-value">Alice</div>
        </div>
        """
        fields = scraper._parse_fields(html)
        assert fields["Reporter"] == "Alice"

    def test_label_colon_stripped(self, scraper):
        html = """
        <div class="field-group">
            <div class="field-name">Assignee:</div>
            <div class="field-value">Bob</div>
        </div>
        """
        fields = scraper._parse_fields(html)
        assert fields["Assignee"] == "Bob"


class TestParseFieldsCloud:
    """Strategy B: Jira Cloud with data-testid."""

    def test_cloud_data_testid(self, scraper):
        html = """
        <div data-testid="issue-field-priority">
            <label>Priority</label>
            <div data-testid="issue-field-priority.value">Critical</div>
        </div>
        """
        fields = scraper._parse_fields(html)
        assert fields["Priority"] == "Critical"

    def test_cloud_label_suffix(self, scraper):
        html = """
        <div data-testid="issue-field-status">
            <div data-testid="issue-field-status-label">Status</div>
            <div data-testid="issue-field-status-value">In Progress</div>
        </div>
        """
        fields = scraper._parse_fields(html)
        assert fields["Status"] == "In Progress"


class TestParseFieldsKnownSelectors:
    """Strategy C: Known field selectors."""

    def test_summary_val(self, scraper):
        html = '<div id="summary-val">Fix login bug</div>'
        fields = scraper._parse_fields(html)
        assert fields["Summary"] == "Fix login bug"

    def test_status_val(self, scraper):
        html = '<span id="status-val">Done</span>'
        fields = scraper._parse_fields(html)
        assert fields["Status"] == "Done"

    def test_priority_val(self, scraper):
        html = '<span id="priority-val">Low</span>'
        fields = scraper._parse_fields(html)
        assert fields["Priority"] == "Low"

    def test_type_val(self, scraper):
        html = '<span id="type-val">Bug</span>'
        fields = scraper._parse_fields(html)
        assert fields["Type"] == "Bug"


class TestParseFieldsEdgeCases:
    def test_empty_html(self, scraper):
        fields = scraper._parse_fields("<html><body></body></html>")
        assert fields == {}

    def test_mixed_strategies(self, scraper):
        html = """
        <div id="details-module">
            <div class="item">
                <strong>Priority</strong>
                <div class="value">High</div>
            </div>
        </div>
        <div data-testid="issue-field-assignee">
            <label>Assignee</label>
            <div data-testid="issue-field-assignee.value">Alice</div>
        </div>
        <div id="summary-val">Login Bug</div>
        """
        fields = scraper._parse_fields(html)
        assert fields["Priority"] == "High"
        assert fields["Assignee"] == "Alice"
        assert fields["Summary"] == "Login Bug"

    def test_empty_value_skipped(self, scraper):
        html = """
        <div class="field-group">
            <label>Empty Field</label>
            <div class="field-value">  </div>
        </div>
        """
        fields = scraper._parse_fields(html)
        assert "Empty Field" not in fields
