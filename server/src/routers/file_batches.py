import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.deps import get_current_user, get_db
from src.models.event import Event
from src.models.file_batch import FileBatch
from src.models.user import User
from src.schemas.file_batch import FileBatchCreate, FileBatchRead, FileBatchUpdate

router = APIRouter(
    prefix="/cases/{case_id}/events/{event_id}/batches",
    tags=["file-batches"],
)


async def _get_event_or_404(
    db: AsyncSession, event_id: uuid.UUID, case_id: uuid.UUID
) -> Event:
    """Fetch an event ensuring it belongs to the specified case, or raise 404."""
    result = await db.execute(
        select(Event).where(Event.id == event_id, Event.case_id == case_id)
    )
    event = result.scalar_one_or_none()
    if event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found",
        )
    return event


@router.post("/", response_model=FileBatchRead, status_code=status.HTTP_201_CREATED)
async def create_file_batch(
    case_id: uuid.UUID,
    event_id: uuid.UUID,
    body: FileBatchCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FileBatchRead:
    """Create a new file batch attached to an event."""
    await _get_event_or_404(db, event_id, case_id)

    batch = FileBatch(
        event_id=event_id,
        label=body.label,
        file_count=body.file_count,
        description=body.description,
        file_types=body.file_types,
        sort_order=body.sort_order,
    )
    db.add(batch)
    await db.commit()
    await db.refresh(batch)

    return FileBatchRead.model_validate(batch)


@router.get("/", response_model=list[FileBatchRead])
async def list_file_batches(
    case_id: uuid.UUID,
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[FileBatchRead]:
    """List all file batches for an event, ordered by sort_order."""
    await _get_event_or_404(db, event_id, case_id)

    result = await db.execute(
        select(FileBatch)
        .where(FileBatch.event_id == event_id)
        .order_by(FileBatch.sort_order.asc())
    )
    batches = result.scalars().all()

    return [FileBatchRead.model_validate(b) for b in batches]


@router.patch("/{batch_id}", response_model=FileBatchRead)
async def update_file_batch(
    case_id: uuid.UUID,
    event_id: uuid.UUID,
    batch_id: uuid.UUID,
    body: FileBatchUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FileBatchRead:
    """Partially update a file batch."""
    await _get_event_or_404(db, event_id, case_id)

    result = await db.execute(
        select(FileBatch).where(
            FileBatch.id == batch_id, FileBatch.event_id == event_id
        )
    )
    batch = result.scalar_one_or_none()
    if batch is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File batch not found",
        )

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(batch, field, value)

    await db.commit()
    await db.refresh(batch)

    return FileBatchRead.model_validate(batch)


@router.delete("/{batch_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_file_batch(
    case_id: uuid.UUID,
    event_id: uuid.UUID,
    batch_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """Delete a file batch."""
    await _get_event_or_404(db, event_id, case_id)

    result = await db.execute(
        select(FileBatch).where(
            FileBatch.id == batch_id, FileBatch.event_id == event_id
        )
    )
    batch = result.scalar_one_or_none()
    if batch is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File batch not found",
        )

    await db.delete(batch)
    await db.commit()
