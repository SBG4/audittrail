from datetime import date
from enum import Enum

from pydantic import BaseModel


class ReportFormat(str, Enum):
    pdf = "pdf"
    docx = "docx"
    html = "html"


class ReportMode(str, Enum):
    timeline = "timeline"
    narrative = "narrative"


class ReportRequest(BaseModel):
    format: ReportFormat = ReportFormat.pdf
    mode: ReportMode = ReportMode.timeline


class ReportResponse(BaseModel):
    filename: str
    content_type: str
    size_bytes: int


class DashboardStats(BaseModel):
    total_events: int = 0
    total_file_batches: int = 0
    total_files: int = 0
    date_range_start: date | None = None
    date_range_end: date | None = None
    events_by_type: dict[str, int] = {}
    events_by_date: dict[str, int] = {}
