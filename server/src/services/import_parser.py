"""File parsing service for Excel and CSV imports with encoding detection."""

import csv
from datetime import date, datetime, time
from io import BytesIO, StringIO

import chardet
import openpyxl


VALID_EVENT_FIELDS = {
    "event_type",
    "event_date",
    "event_time",
    "file_name",
    "file_count",
    "file_description",
    "file_type",
}

VALID_EVENT_TYPES = {"finding", "action", "note"}


def normalize_cell_value(value: object) -> str | int | float | None:
    """Convert cell values to JSON-safe types."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, time):
        return value.isoformat()
    if isinstance(value, float):
        if value == int(value):
            return int(value)
        return value
    if isinstance(value, int):
        return value
    return str(value)


def parse_excel(file_bytes: bytes) -> tuple[list[str], list[list]]:
    """Parse an Excel (.xlsx) file and return headers and data rows.

    Uses read_only mode for memory efficiency and data_only to get
    computed values instead of formulas.
    """
    wb = openpyxl.load_workbook(
        BytesIO(file_bytes), read_only=True, data_only=True
    )
    ws = wb.active
    if ws is None:
        wb.close()
        return [], []

    rows = list(ws.iter_rows(values_only=True))
    wb.close()

    if not rows:
        return [], []

    # First row = headers
    headers = [
        str(h).strip() if h is not None else f"Column_{i}"
        for i, h in enumerate(rows[0])
    ]

    # Remaining rows = data, filter out completely empty rows
    data = []
    for row in rows[1:]:
        if any(cell is not None for cell in row):
            normalized = [normalize_cell_value(cell) for cell in row]
            data.append(normalized)

    return headers, data


def parse_csv(file_bytes: bytes) -> tuple[list[str], list[list]]:
    """Parse a CSV file with automatic encoding and dialect detection.

    Uses chardet for encoding detection and csv.Sniffer for delimiter
    detection. Falls back to UTF-8 and standard CSV dialect on failure.
    """
    # Detect encoding
    detected = chardet.detect(file_bytes[:10000])
    encoding = detected.get("encoding", "utf-8") or "utf-8"
    confidence = detected.get("confidence", 0.0) or 0.0

    # Fall back to UTF-8 for low confidence
    if confidence < 0.5:
        encoding = "utf-8"

    try:
        text = file_bytes.decode(encoding)
    except (UnicodeDecodeError, LookupError):
        text = file_bytes.decode("utf-8", errors="replace")

    # Strip BOM
    if text.startswith("\ufeff"):
        text = text[1:]

    # Detect CSV dialect (delimiter, quoting)
    try:
        dialect = csv.Sniffer().sniff(text[:5000])
    except csv.Error:
        dialect = csv.excel  # type: ignore[assignment]

    reader = csv.reader(StringIO(text), dialect)
    rows = list(reader)

    if not rows:
        return [], []

    headers = [h.strip() for h in rows[0]]

    # Filter out empty rows
    data = []
    for row in rows[1:]:
        if any(cell.strip() for cell in row):
            data.append(row)

    return headers, data


def parse_file(
    filename: str, file_bytes: bytes
) -> tuple[list[str], list[list]]:
    """Route file parsing based on extension."""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext == "csv":
        return parse_csv(file_bytes)
    if ext in ("xlsx", "xls"):
        return parse_excel(file_bytes)
    raise ValueError(f"Unsupported file type: .{ext}. Use .csv or .xlsx")


# --- Row validation for column mapping ---


def parse_date(value: object) -> date | None:
    """Parse a value into a date object, trying multiple formats."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value

    s = str(value).strip()
    if not s:
        return None

    # Try ISO format first, then common formats
    formats = ["%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%Y/%m/%d"]
    for fmt in formats:
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue

    return None


def parse_time(value: object) -> time | None:
    """Parse a value into a time object, trying multiple formats."""
    if value is None:
        return None
    if isinstance(value, time):
        return value
    if isinstance(value, datetime):
        return value.time()

    s = str(value).strip()
    if not s:
        return None

    formats = ["%H:%M:%S", "%H:%M", "%I:%M %p", "%I:%M:%S %p"]
    for fmt in formats:
        try:
            return datetime.strptime(s, fmt).time()
        except ValueError:
            continue

    return None


def parse_int(value: object) -> int | None:
    """Parse a value into an integer."""
    if value is None:
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)

    s = str(value).strip()
    if not s:
        return None

    try:
        return int(float(s))
    except (ValueError, OverflowError):
        return None


def validate_and_transform_row(
    row_data: list,
    headers: list[str],
    mappings: dict[str, str],
) -> tuple[bool, dict, list[str]]:
    """Validate and transform a single row based on column mappings.

    Args:
        row_data: Raw cell values for this row
        headers: Column header names
        mappings: Mapping of header name -> event field name

    Returns:
        (is_valid, transformed_data, error_messages)
    """
    transformed: dict[str, object] = {}
    errors: list[str] = []

    for col_name, field_name in mappings.items():
        # Find column index
        try:
            col_idx = headers.index(col_name)
        except ValueError:
            errors.append(f"Column '{col_name}' not found in headers")
            continue

        # Get raw value (handle short rows)
        raw_value = row_data[col_idx] if col_idx < len(row_data) else None

        # Parse based on field type
        if field_name == "event_date":
            parsed = parse_date(raw_value)
            if parsed is None:
                errors.append(
                    f"Invalid date in column '{col_name}': {raw_value!r}"
                )
            else:
                transformed["event_date"] = parsed.isoformat()

        elif field_name == "event_time":
            parsed_time = parse_time(raw_value)
            if parsed_time is not None:
                transformed["event_time"] = parsed_time.isoformat()
            # Time is optional, no error if None

        elif field_name == "event_type":
            s = str(raw_value).strip().lower() if raw_value else ""
            if s and s in VALID_EVENT_TYPES:
                transformed["event_type"] = s
            elif s:
                errors.append(
                    f"Invalid event type in column '{col_name}': "
                    f"'{raw_value}'. Must be one of: "
                    f"{', '.join(sorted(VALID_EVENT_TYPES))}"
                )
            # Default to "note" if empty

        elif field_name == "file_count":
            parsed_int = parse_int(raw_value)
            if parsed_int is not None:
                transformed["file_count"] = parsed_int
            elif raw_value is not None and str(raw_value).strip():
                errors.append(
                    f"Invalid number in column '{col_name}': {raw_value!r}"
                )

        elif field_name in ("file_name", "file_description", "file_type"):
            if raw_value is not None:
                s = str(raw_value).strip()
                if s:
                    transformed[field_name] = s

    # event_date is required
    if "event_date" not in transformed:
        errors.append("Event date is required but missing or invalid")

    is_valid = len(errors) == 0
    return is_valid, transformed, errors
