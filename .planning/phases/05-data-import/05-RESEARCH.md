# Phase 5: Data Import - Research

**Researched:** 2026-02-10
**Domain:** Excel/CSV file parsing, column mapping, batch event creation
**Confidence:** HIGH

## Summary

Phase 5 enables auditors to upload Excel or CSV files and map columns to event fields, bulk-creating validated timeline events from structured data. The implementation requires three layers: (1) backend file parsing with encoding detection, (2) a column mapping API with validation, and (3) a frontend wizard UI with preview and import confirmation.

The Python ecosystem has mature, well-tested libraries for this: `openpyxl` for Excel (.xlsx) parsing, Python's built-in `csv` module for CSV, and `chardet` for encoding detection. These are lightweight, well-suited for an airgapped environment, and avoid the heavy dependency of pandas (unnecessary for row-by-row parsing and validation).

**Primary recommendation:** Use openpyxl + csv + chardet for parsing; implement a two-phase upload flow (upload -> preview/map -> confirm import) with server-side session storage of parsed data to avoid re-parsing.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| openpyxl | >=3.1 | Parse .xlsx Excel files | De facto standard for Excel in Python, read-only mode for performance |
| chardet | >=5.0 | Detect CSV file encoding | Most widely used encoding detection, handles UTF-8/Shift-JIS/Latin-1/etc |
| csv (stdlib) | built-in | Parse CSV files | Standard library, handles quoting/escaping correctly |
| python-multipart | >=0.0.22 | File upload handling | Already in project dependencies, required by FastAPI for UploadFile |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| uuid (stdlib) | built-in | Generate import session IDs | Track upload-to-import flow |
| tempfile (stdlib) | built-in | Temporary file storage | Store uploaded files during mapping phase |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| openpyxl | pandas | pandas is 50MB+ dependency, overkill for row iteration; openpyxl is already pandas' backend |
| chardet | charset-normalizer | charset-normalizer is newer/faster but chardet has wider adoption |
| Server-side temp storage | Client-side parsing (SheetJS) | Server-side keeps parsing logic centralized, avoids large JS bundle |

**Installation:**
```bash
cd server && uv add openpyxl chardet
```

## Architecture Patterns

### Upload Flow (Two-Phase)
```
1. POST /api/imports/upload   -> Parse file, return preview (headers + sample rows)
2. POST /api/imports/mapping  -> Submit column mapping, validate all rows
3. POST /api/imports/confirm  -> Bulk create events from validated data
```

This avoids re-uploading/re-parsing the file. The server stores parsed data in a temporary JSON structure keyed by import session ID.

### Recommended File Structure
```
server/src/
├── routers/imports.py       # Upload, mapping, confirm endpoints
├── schemas/import_.py       # Pydantic schemas for import flow
├── services/
│   └── import_parser.py     # File parsing logic (Excel/CSV/encoding)

client/src/
├── pages/ImportPage.tsx     # Import wizard page
├── components/import/
│   ├── FileUpload.tsx       # File drop/select component
│   ├── ColumnMapper.tsx     # Column mapping wizard
│   └── ImportSummary.tsx    # Validation results + confirm
├── hooks/useImport.ts       # TanStack Query mutations for import flow
└── types/import.ts          # TypeScript types for import
```

### Pattern: File Upload with FastAPI
```python
from fastapi import UploadFile, File

@router.post("/upload")
async def upload_file(
    case_id: uuid.UUID,
    file: UploadFile = File(...),
):
    contents = await file.read()
    # Detect encoding, parse, return preview
```

### Pattern: Column Mapping
```python
# User maps: { "spreadsheet_col": "event_field" }
# e.g., { "Date": "event_date", "Description": "file_description" }
# Server validates each mapped field against EventCreate schema
```

### Anti-Patterns to Avoid
- **Loading entire file into memory as DataFrame:** Use openpyxl's read_only mode and iterate rows
- **Client-side parsing:** Keeps logic split, increases bundle size, encoding issues harder to handle
- **Single endpoint for everything:** Split upload/map/confirm for better UX (user sees preview before committing)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Excel parsing | Manual XML/ZIP extraction | openpyxl read_only mode | Excel format is complex, many edge cases |
| Encoding detection | charset sniffing heuristics | chardet.detect() | Encoding detection is a solved problem with many edge cases |
| CSV dialect detection | Manual delimiter guessing | csv.Sniffer().sniff() | Handles tabs, semicolons, pipes automatically |
| Date parsing from strings | Manual regex patterns | Python dateutil or datetime.strptime with multiple formats | Handles ISO, US, EU date formats |

**Key insight:** File format parsing has an enormous number of edge cases (merged cells, empty rows, BOM markers, mixed encodings). Using established libraries avoids weeks of bug fixes.

## Common Pitfalls

### Pitfall 1: Encoding Detection Failures
**What goes wrong:** chardet returns wrong encoding for small files or mixed-encoding files
**Why it happens:** Encoding detection is probabilistic; small sample sizes reduce accuracy
**How to avoid:** Read first 10KB for detection, fall back to UTF-8, let user override encoding in UI
**Warning signs:** Garbled characters in preview, UnicodeDecodeError on import

### Pitfall 2: Excel Date Cells
**What goes wrong:** openpyxl returns datetime objects for date-formatted cells but raw numbers for unformatted ones
**Why it happens:** Excel stores dates as serial numbers; formatting determines display
**How to avoid:** Check cell.data_type and handle both number_format-based dates and raw values
**Warning signs:** Dates showing as 5-digit numbers (Excel serial format)

### Pitfall 3: Empty Rows and Headers
**What goes wrong:** Files with empty rows before data, or headers not in row 1
**Why it happens:** Users format spreadsheets with title rows, blank separators, merged headers
**How to avoid:** Auto-detect header row (first row with >50% non-empty cells), skip trailing empty rows
**Warning signs:** Column names showing as "None" or empty, unexpected row counts

### Pitfall 4: Large File Memory Issues
**What goes wrong:** Loading entire file into memory causes OOM for large imports
**Why it happens:** Default openpyxl mode loads everything; large CSV files can be hundreds of MB
**How to avoid:** Use openpyxl read_only=True, process CSV rows lazily, set upload size limit (10MB default)
**Warning signs:** Server memory spikes during import, slow response times

### Pitfall 5: Time Format Variations
**What goes wrong:** Time values come as strings in many formats (HH:MM, HH:MM:SS, h:mm AM/PM)
**Why it happens:** No standard time format in spreadsheets
**How to avoid:** Support multiple time formats in parsing, normalize to HH:MM:SS
**Warning signs:** Time fields showing as null when data exists

## Code Examples

### Excel Parsing with openpyxl
```python
import openpyxl

def parse_excel(file_bytes: bytes) -> tuple[list[str], list[list]]:
    from io import BytesIO
    wb = openpyxl.load_workbook(BytesIO(file_bytes), read_only=True, data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    wb.close()

    if not rows:
        return [], []

    headers = [str(h) if h is not None else f"Column_{i}" for i, h in enumerate(rows[0])]
    data = [[cell for cell in row] for row in rows[1:] if any(c is not None for c in row)]
    return headers, data
```

### CSV Parsing with Encoding Detection
```python
import csv
import chardet
from io import StringIO

def parse_csv(file_bytes: bytes) -> tuple[list[str], list[list]]:
    detected = chardet.detect(file_bytes[:10000])
    encoding = detected.get("encoding", "utf-8") or "utf-8"

    text = file_bytes.decode(encoding)
    # Remove BOM if present
    if text.startswith('\ufeff'):
        text = text[1:]

    dialect = csv.Sniffer().sniff(text[:5000])
    reader = csv.reader(StringIO(text), dialect)
    rows = list(reader)

    if not rows:
        return [], []

    headers = rows[0]
    data = [row for row in rows[1:] if any(cell.strip() for cell in row)]
    return headers, data
```

### FastAPI File Upload
```python
@router.post("/upload")
async def upload_file(
    case_id: uuid.UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Validate file type
    if not file.filename:
        raise HTTPException(400, "No filename provided")

    ext = file.filename.rsplit(".", 1)[-1].lower()
    if ext not in ("csv", "xlsx", "xls"):
        raise HTTPException(400, "Unsupported file type. Use .csv or .xlsx")

    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(400, "File too large (max 10MB)")

    # Parse based on type
    if ext == "csv":
        headers, data = parse_csv(contents)
    else:
        headers, data = parse_excel(contents)

    # Return preview
    return {
        "session_id": str(uuid.uuid4()),
        "filename": file.filename,
        "headers": headers,
        "row_count": len(data),
        "preview_rows": data[:10],  # First 10 rows for preview
    }
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| pandas for everything | openpyxl + csv for parsing | Ongoing | Lighter dependency, faster startup |
| Client-side parsing (SheetJS) | Server-side parsing | Best practice | Centralized logic, better encoding handling |
| Single upload endpoint | Multi-step wizard flow | UX standard | Better user experience, preview before commit |

## Open Questions

1. **Maximum file size limit**
   - What we know: 10MB is reasonable for most audit spreadsheets
   - What's unclear: Whether auditors work with very large files
   - Recommendation: Start with 10MB, make configurable via settings

2. **Date format auto-detection**
   - What we know: Python dateutil can parse most formats
   - What's unclear: Whether MM/DD/YYYY vs DD/MM/YYYY ambiguity will be an issue
   - Recommendation: Default to ISO (YYYY-MM-DD), show format selector in mapping UI

## Sources

### Primary (HIGH confidence)
- openpyxl documentation - file parsing, read_only mode, data_only mode
- Python csv module documentation - Sniffer, dialects, reader
- chardet documentation - detect() function, encoding detection
- FastAPI documentation - UploadFile, File handling

### Secondary (MEDIUM confidence)
- Common patterns for spreadsheet import wizards in web applications

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - well-established Python libraries with stable APIs
- Architecture: HIGH - two-phase upload is a proven pattern for import wizards
- Pitfalls: HIGH - common issues well-documented in library issue trackers

**Research date:** 2026-02-10
**Valid until:** 2026-04-10 (stable domain, 60 days)
