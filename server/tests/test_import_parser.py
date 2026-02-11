"""Unit tests for import parser service."""

import csv
import io
from datetime import date, datetime, time

import pytest

from src.services.import_parser import (
    VALID_EVENT_FIELDS,
    VALID_EVENT_TYPES,
    normalize_cell_value,
    parse_csv,
    parse_date,
    parse_excel,
    parse_file,
    parse_int,
    parse_time,
    validate_and_transform_row,
)


class TestParseDate:
    def test_iso_format(self):
        assert parse_date("2025-01-15") == date(2025, 1, 15)

    def test_us_format(self):
        assert parse_date("01/15/2025") == date(2025, 1, 15)

    def test_eu_format(self):
        assert parse_date("15/01/2025") == date(2025, 1, 15)

    def test_slash_ymd(self):
        assert parse_date("2025/01/15") == date(2025, 1, 15)

    def test_datetime_object(self):
        dt = datetime(2025, 1, 15, 10, 30)
        assert parse_date(dt) == date(2025, 1, 15)

    def test_date_object(self):
        d = date(2025, 1, 15)
        assert parse_date(d) == date(2025, 1, 15)

    def test_none(self):
        assert parse_date(None) is None

    def test_empty_string(self):
        assert parse_date("") is None

    def test_invalid_string(self):
        assert parse_date("not-a-date") is None

    def test_whitespace_stripped(self):
        assert parse_date("  2025-01-15  ") == date(2025, 1, 15)


class TestParseTime:
    def test_hms_format(self):
        assert parse_time("10:30:00") == time(10, 30, 0)

    def test_hm_format(self):
        assert parse_time("10:30") == time(10, 30)

    def test_12h_am_pm(self):
        assert parse_time("02:30 PM") == time(14, 30)

    def test_12h_with_seconds(self):
        assert parse_time("02:30:15 PM") == time(14, 30, 15)

    def test_time_object(self):
        t = time(10, 30)
        assert parse_time(t) == time(10, 30)

    def test_datetime_object(self):
        dt = datetime(2025, 1, 15, 10, 30)
        assert parse_time(dt) == time(10, 30)

    def test_none(self):
        assert parse_time(None) is None

    def test_empty_string(self):
        assert parse_time("") is None

    def test_invalid_string(self):
        assert parse_time("not-a-time") is None


class TestParseInt:
    def test_integer(self):
        assert parse_int(42) == 42

    def test_float(self):
        assert parse_int(3.7) == 3

    def test_string_number(self):
        assert parse_int("5") == 5

    def test_string_float(self):
        assert parse_int("3.9") == 3

    def test_none(self):
        assert parse_int(None) is None

    def test_empty_string(self):
        assert parse_int("") is None

    def test_invalid_string(self):
        assert parse_int("abc") is None


class TestNormalizeCellValue:
    def test_none(self):
        assert normalize_cell_value(None) is None

    def test_datetime(self):
        dt = datetime(2025, 1, 15, 10, 30)
        assert normalize_cell_value(dt) == "2025-01-15T10:30:00"

    def test_date(self):
        d = date(2025, 1, 15)
        assert normalize_cell_value(d) == "2025-01-15"

    def test_time(self):
        t = time(10, 30)
        assert normalize_cell_value(t) == "10:30:00"

    def test_integer_float(self):
        assert normalize_cell_value(5.0) == 5

    def test_float(self):
        assert normalize_cell_value(3.14) == 3.14

    def test_integer(self):
        assert normalize_cell_value(42) == 42

    def test_string(self):
        assert normalize_cell_value("hello") == "hello"


class TestParseCsv:
    def test_simple_csv(self):
        content = "name,age\nAlice,30\nBob,25"
        headers, data = parse_csv(content.encode("utf-8"))
        assert headers == ["name", "age"]
        assert len(data) == 2
        assert data[0] == ["Alice", "30"]

    def test_utf8_bom(self):
        content = "\ufeffname,age\nAlice,30"
        headers, data = parse_csv(content.encode("utf-8-sig"))
        assert headers == ["name", "age"]
        assert len(data) == 1

    def test_semicolon_delimiter(self):
        content = "name;age\nAlice;30\nBob;25"
        headers, data = parse_csv(content.encode("utf-8"))
        assert headers == ["name", "age"]
        assert len(data) == 2

    def test_empty_file(self):
        headers, data = parse_csv(b"")
        assert headers == []
        assert data == []

    def test_headers_only(self):
        content = "name,age\n"
        headers, data = parse_csv(content.encode("utf-8"))
        assert headers == ["name", "age"]
        assert data == []

    def test_empty_rows_filtered(self):
        content = "name,age\nAlice,30\n,\nBob,25"
        headers, data = parse_csv(content.encode("utf-8"))
        assert len(data) == 2


class TestParseExcel:
    def _make_xlsx(self, rows):
        """Create a minimal xlsx in memory."""
        import openpyxl

        wb = openpyxl.Workbook()
        ws = wb.active
        for row in rows:
            ws.append(row)
        buf = io.BytesIO()
        wb.save(buf)
        return buf.getvalue()

    def test_simple_excel(self):
        xlsx = self._make_xlsx([["name", "age"], ["Alice", 30], ["Bob", 25]])
        headers, data = parse_excel(xlsx)
        assert headers == ["name", "age"]
        assert len(data) == 2

    def test_empty_excel(self):
        xlsx = self._make_xlsx([])
        headers, data = parse_excel(xlsx)
        assert headers == []
        assert data == []

    def test_none_headers(self):
        xlsx = self._make_xlsx([[None, "col2"], ["a", "b"]])
        headers, data = parse_excel(xlsx)
        assert headers[0] == "Column_0"
        assert headers[1] == "col2"


class TestParseFile:
    def test_csv_routing(self):
        content = "a,b\n1,2"
        headers, data = parse_file("test.csv", content.encode("utf-8"))
        assert headers == ["a", "b"]

    def test_xlsx_routing(self):
        import openpyxl

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.append(["x", "y"])
        ws.append([1, 2])
        buf = io.BytesIO()
        wb.save(buf)
        headers, data = parse_file("test.xlsx", buf.getvalue())
        assert headers == ["x", "y"]

    def test_unsupported_extension(self):
        with pytest.raises(ValueError, match="Unsupported file type"):
            parse_file("test.json", b"{}")


class TestValidateAndTransformRow:
    def test_valid_row(self):
        headers = ["Date", "Type", "FileName"]
        mappings = {"Date": "event_date", "Type": "event_type", "FileName": "file_name"}
        row = ["2025-01-15", "finding", "doc.pdf"]
        is_valid, transformed, errors = validate_and_transform_row(row, headers, mappings)
        assert is_valid is True
        assert errors == []
        assert transformed["event_date"] == "2025-01-15"
        assert transformed["event_type"] == "finding"
        assert transformed["file_name"] == "doc.pdf"

    def test_missing_event_date(self):
        headers = ["Type"]
        mappings = {"Type": "event_type"}
        row = ["note"]
        is_valid, transformed, errors = validate_and_transform_row(row, headers, mappings)
        assert is_valid is False
        assert any("event date" in e.lower() or "Event date" in e for e in errors)

    def test_invalid_date(self):
        headers = ["Date"]
        mappings = {"Date": "event_date"}
        row = ["not-a-date"]
        is_valid, transformed, errors = validate_and_transform_row(row, headers, mappings)
        assert is_valid is False
        assert any("date" in e.lower() for e in errors)

    def test_invalid_event_type(self):
        headers = ["Date", "Type"]
        mappings = {"Date": "event_date", "Type": "event_type"}
        row = ["2025-01-15", "invalid_type"]
        is_valid, transformed, errors = validate_and_transform_row(row, headers, mappings)
        assert is_valid is False
        assert any("event type" in e.lower() for e in errors)

    def test_optional_time_none(self):
        headers = ["Date", "Time"]
        mappings = {"Date": "event_date", "Time": "event_time"}
        row = ["2025-01-15", ""]
        is_valid, transformed, errors = validate_and_transform_row(row, headers, mappings)
        assert is_valid is True
        assert "event_time" not in transformed

    def test_valid_time(self):
        headers = ["Date", "Time"]
        mappings = {"Date": "event_date", "Time": "event_time"}
        row = ["2025-01-15", "10:30"]
        is_valid, transformed, errors = validate_and_transform_row(row, headers, mappings)
        assert is_valid is True
        assert transformed["event_time"] == "10:30:00"

    def test_file_count_valid(self):
        headers = ["Date", "Count"]
        mappings = {"Date": "event_date", "Count": "file_count"}
        row = ["2025-01-15", "5"]
        is_valid, transformed, errors = validate_and_transform_row(row, headers, mappings)
        assert is_valid is True
        assert transformed["file_count"] == 5

    def test_file_count_invalid(self):
        headers = ["Date", "Count"]
        mappings = {"Date": "event_date", "Count": "file_count"}
        row = ["2025-01-15", "abc"]
        is_valid, transformed, errors = validate_and_transform_row(row, headers, mappings)
        assert is_valid is False
        assert any("number" in e.lower() for e in errors)

    def test_short_row(self):
        headers = ["Date", "Type", "Name"]
        mappings = {"Date": "event_date", "Type": "event_type", "Name": "file_name"}
        row = ["2025-01-15"]
        is_valid, transformed, errors = validate_and_transform_row(row, headers, mappings)
        assert is_valid is True
        assert "file_name" not in transformed

    def test_column_not_in_headers(self):
        headers = ["Date"]
        mappings = {"Date": "event_date", "Missing": "file_name"}
        row = ["2025-01-15"]
        is_valid, transformed, errors = validate_and_transform_row(row, headers, mappings)
        assert is_valid is False
        assert any("not found" in e.lower() for e in errors)
