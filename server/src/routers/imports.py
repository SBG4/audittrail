"""Import router for Excel/CSV file upload, column mapping, and batch event creation."""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.deps import get_current_user, get_db
from src.models.case import Case
from src.models.event import Event
from src.models.user import User
from src.schemas.import_ import (
    ColumnMapping,
    ImportConfirmRequest,
    ImportConfirmResponse,
    ImportUploadResponse,
    ImportValidationResponse,
    ImportValidationRow,
)
from src.services.import_parser import (
    VALID_EVENT_FIELDS,
    normalize_cell_value,
    parse_file,
    validate_and_transform_row,
)

router = APIRouter(prefix="/cases/{case_id}/imports", tags=["imports"])

# In-memory session storage for import data between upload and confirm steps.
# Keyed by session_id, stores parsed headers, data, user_id, and timestamps.
_import_sessions: dict[str, dict] = {}

# Maximum upload size: 10MB
MAX_UPLOAD_SIZE = 10 * 1024 * 1024

# Session expiry: 1 hour
SESSION_EXPIRY_SECONDS = 3600


def _cleanup_expired_sessions() -> None:
    """Remove import sessions older than 1 hour."""
    now = datetime.now(timezone.utc)
    expired = [
        sid
        for sid, sess in _import_sessions.items()
        if (now - sess.get("created_at", now)).total_seconds()
        > SESSION_EXPIRY_SECONDS
    ]
    for sid in expired:
        del _import_sessions[sid]


async def _verify_case_exists(
    case_id: uuid.UUID, db: AsyncSession
) -> Case:
    """Fetch a case or raise 404."""
    result = await db.execute(select(Case).where(Case.id == case_id))
    case = result.scalar_one_or_none()
    if case is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found",
        )
    return case


@router.post("/upload", response_model=ImportUploadResponse)
async def upload_file(
    case_id: uuid.UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ImportUploadResponse:
    """Upload an Excel or CSV file and get parsed preview data."""
    await _verify_case_exists(case_id, db)

    # Clean up old sessions
    _cleanup_expired_sessions()

    # Validate filename
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename provided",
        )

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ("csv", "xlsx", "xls"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file type. Use .csv or .xlsx",
        )

    # Read with streaming size check to avoid unbounded memory usage
    chunks: list[bytes] = []
    total_size = 0
    while chunk := await file.read(1024 * 1024):  # 1MB chunks
        total_size += len(chunk)
        if total_size > MAX_UPLOAD_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="File too large (max 10MB)",
            )
        chunks.append(chunk)
    contents = b"".join(chunks)

    # Parse the file
    try:
        headers, data = parse_file(file.filename, contents)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to parse file: {e}",
        )

    if not headers:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File appears to be empty (no headers found)",
        )

    # Normalize all cell values for JSON serialization
    normalized_data = [
        [normalize_cell_value(cell) for cell in row] for row in data
    ]

    # Store session
    session_id = str(uuid.uuid4())
    _import_sessions[session_id] = {
        "case_id": str(case_id),
        "user_id": str(current_user.id),
        "headers": headers,
        "data": normalized_data,
        "created_at": datetime.now(timezone.utc),
    }

    # Return preview (first 10 rows)
    preview_rows = normalized_data[:10]

    return ImportUploadResponse(
        session_id=session_id,
        filename=file.filename,
        headers=headers,
        row_count=len(normalized_data),
        preview_rows=preview_rows,
    )


@router.post("/validate", response_model=ImportValidationResponse)
async def validate_mapping(
    case_id: uuid.UUID,
    body: ColumnMapping,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ImportValidationResponse:
    """Validate column mappings against all parsed rows."""
    await _verify_case_exists(case_id, db)

    # Retrieve session
    session = _import_sessions.get(body.session_id)
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Import session not found. Please upload the file again.",
        )

    # Verify ownership
    if session["user_id"] != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This import session belongs to another user.",
        )

    # Verify case matches
    if session["case_id"] != str(case_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Import session does not belong to this case.",
        )

    # Validate mappings
    if not body.mappings:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No column mappings provided.",
        )

    # Check all event fields are valid
    for col_name, field_name in body.mappings.items():
        if field_name not in VALID_EVENT_FIELDS:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Unknown event field: '{field_name}'. "
                f"Valid fields: {', '.join(sorted(VALID_EVENT_FIELDS))}",
            )

    # Check all column names exist in headers
    headers = session["headers"]
    for col_name in body.mappings:
        if col_name not in headers:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Column '{col_name}' not found in uploaded file headers.",
            )

    # Check event_date is mapped
    if "event_date" not in body.mappings.values():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Event date mapping is required. Map a column to 'event_date'.",
        )

    # Validate all rows
    data = session["data"]
    validation_rows: list[ImportValidationRow] = []
    valid_count = 0
    error_count = 0
    validated_rows: list[tuple[bool, dict]] = []

    for i, row in enumerate(data):
        is_valid, transformed, errors = validate_and_transform_row(
            row, headers, body.mappings
        )
        if is_valid:
            valid_count += 1
        else:
            error_count += 1

        validated_rows.append((is_valid, transformed))
        validation_rows.append(
            ImportValidationRow(
                row_number=i + 1,
                valid=is_valid,
                errors=errors,
                data=transformed,
            )
        )

    # Store validation results in session
    session["validated_rows"] = validated_rows
    session["mappings"] = body.mappings

    return ImportValidationResponse(
        session_id=body.session_id,
        total_rows=len(data),
        valid_count=valid_count,
        error_count=error_count,
        rows=validation_rows,
    )


@router.post("/confirm", response_model=ImportConfirmResponse)
async def confirm_import(
    case_id: uuid.UUID,
    body: ImportConfirmRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ImportConfirmResponse:
    """Confirm the import and bulk-create events from validated rows."""
    await _verify_case_exists(case_id, db)

    # Retrieve session
    session = _import_sessions.get(body.session_id)
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Import session not found. Please upload the file again.",
        )

    # Verify ownership
    if session["user_id"] != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This import session belongs to another user.",
        )

    # Verify case matches
    if session["case_id"] != str(case_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Import session does not belong to this case.",
        )

    # Verify validation was completed
    validated_rows = session.get("validated_rows")
    if validated_rows is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must validate mapping before confirming import.",
        )

    # Get current max sort_order
    result = await db.execute(
        select(func.coalesce(func.max(Event.sort_order), -1)).where(
            Event.case_id == case_id
        )
    )
    next_sort = (result.scalar() or 0) + 1

    # Create events from valid rows
    created_count = 0
    error_count = 0
    errors: list[str] = []

    for i, (is_valid, transformed) in enumerate(validated_rows):
        if not is_valid:
            continue

        try:
            event = Event(
                case_id=case_id,
                event_date=transformed["event_date"],
                event_time=transformed.get("event_time"),
                event_type=transformed.get("event_type", "note"),
                file_name=transformed.get("file_name"),
                file_count=transformed.get("file_count"),
                file_description=transformed.get("file_description"),
                file_type=transformed.get("file_type"),
                metadata_={},
                sort_order=next_sort,
                created_by_id=current_user.id,
            )
            db.add(event)
            next_sort += 1
            created_count += 1
        except Exception as e:
            error_count += 1
            errors.append(f"Row {i + 1}: {e}")

    # Commit all events
    try:
        await db.commit()
    except Exception:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save imported events",
        )

    # Clean up session
    _import_sessions.pop(body.session_id, None)

    return ImportConfirmResponse(
        created_count=created_count,
        error_count=error_count,
        errors=errors,
    )
