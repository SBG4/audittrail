import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.deps import get_current_user, get_db
from src.models.case import Case
from src.models.event import Event
from src.models.user import User
from src.schemas.event import EventCreate, EventListResponse, EventRead, EventUpdate

router = APIRouter(prefix="/cases/{case_id}/events", tags=["events"])

VALID_EVENT_TYPES = {"finding", "action", "note"}


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


def _event_query(case_id: uuid.UUID):
    """Build a base query for events with eagerly loaded relationships."""
    return (
        select(Event)
        .where(Event.case_id == case_id)
        .options(selectinload(Event.created_by))
    )


def _validate_event_type(event_type: str) -> None:
    """Validate that event_type is one of the allowed values."""
    if event_type not in VALID_EVENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid event_type '{event_type}'. Must be one of: {', '.join(sorted(VALID_EVENT_TYPES))}",
        )


@router.post("/", response_model=EventRead, status_code=status.HTTP_201_CREATED)
async def create_event(
    case_id: uuid.UUID,
    body: EventCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EventRead:
    """Create a new event in a case timeline."""
    await _verify_case_exists(case_id, db)
    _validate_event_type(body.event_type)

    # Determine sort_order: max existing + 1
    result = await db.execute(
        select(func.coalesce(func.max(Event.sort_order), -1)).where(
            Event.case_id == case_id
        )
    )
    max_sort = result.scalar() or 0
    next_sort = max_sort + 1

    event = Event(
        case_id=case_id,
        event_type=body.event_type,
        event_date=body.event_date,
        event_time=body.event_time,
        file_name=body.file_name,
        file_count=body.file_count,
        file_description=body.file_description,
        file_type=body.file_type,
        metadata_=body.metadata,
        sort_order=next_sort,
        created_by_id=current_user.id,
    )
    db.add(event)
    await db.commit()

    # Refresh with relationships
    result = await db.execute(
        _event_query(case_id).where(Event.id == event.id)
    )
    event = result.scalar_one()

    return EventRead.model_validate(event)


@router.get("/", response_model=EventListResponse)
async def list_events(
    case_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EventListResponse:
    """List all events for a case, sorted chronologically."""
    await _verify_case_exists(case_id, db)

    # Count total events
    count_result = await db.execute(
        select(func.count()).where(Event.case_id == case_id)
    )
    total = count_result.scalar() or 0

    # Fetch events sorted by date, time, then sort_order
    query = (
        _event_query(case_id)
        .order_by(
            Event.event_date.asc(),
            Event.event_time.asc().nulls_last(),
            Event.sort_order.asc(),
        )
    )
    result = await db.execute(query)
    events = result.scalars().all()

    return EventListResponse(
        items=[EventRead.model_validate(e) for e in events],
        total=total,
    )


@router.get("/{event_id}", response_model=EventRead)
async def get_event(
    case_id: uuid.UUID,
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EventRead:
    """Get a single event by ID."""
    await _verify_case_exists(case_id, db)

    result = await db.execute(
        _event_query(case_id).where(Event.id == event_id)
    )
    event = result.scalar_one_or_none()
    if event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found",
        )
    return EventRead.model_validate(event)


@router.patch("/{event_id}", response_model=EventRead)
async def update_event(
    case_id: uuid.UUID,
    event_id: uuid.UUID,
    body: EventUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EventRead:
    """Partially update an event."""
    await _verify_case_exists(case_id, db)

    result = await db.execute(
        _event_query(case_id).where(Event.id == event_id)
    )
    event = result.scalar_one_or_none()
    if event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found",
        )

    update_data = body.model_dump(exclude_unset=True)

    # Validate event_type if present
    if "event_type" in update_data and update_data["event_type"] is not None:
        _validate_event_type(update_data["event_type"])

    # Apply updates
    for field, value in update_data.items():
        if field == "metadata":
            # Replace entire dict to avoid JSONB mutation tracking issues
            event.metadata_ = value
        else:
            setattr(event, field, value)

    await db.commit()

    # Refresh with relationships
    result = await db.execute(
        _event_query(case_id).where(Event.id == event_id)
    )
    event = result.scalar_one()

    return EventRead.model_validate(event)


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    case_id: uuid.UUID,
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """Delete an event from a case timeline."""
    await _verify_case_exists(case_id, db)

    result = await db.execute(
        select(Event).where(Event.id == event_id, Event.case_id == case_id)
    )
    event = result.scalar_one_or_none()
    if event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found",
        )
    await db.delete(event)
    await db.commit()
