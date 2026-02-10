import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.deps import get_current_user, get_db
from src.models.jira_field_mapping import JiraFieldMapping
from src.models.user import User
from src.schemas.jira import (
    JiraFieldMappingBulkUpdate,
    JiraFieldMappingRead,
    JiraScrapeRequest,
    JiraScrapeResponse,
)
from src.services.jira_scraper import JiraScraper

router = APIRouter(prefix="/jira", tags=["jira"])


@router.post("/scrape", response_model=JiraScrapeResponse)
async def scrape_jira_issue(
    body: JiraScrapeRequest,
    current_user: User = Depends(get_current_user),
) -> JiraScrapeResponse:
    """Scrape a Jira issue page and return extracted field data."""
    try:
        scraper = JiraScraper()
        scraped_fields = await scraper.scrape_issue(body.url, body.timeout_ms)
        return JiraScrapeResponse(
            url=body.url,
            fields=scraped_fields,
            raw_fields=scraped_fields,
            success=True,
        )
    except HTTPException:
        raise
    except Exception as e:
        return JiraScrapeResponse(
            url=body.url,
            fields={},
            raw_fields={},
            success=False,
            error=str(e),
        )


@router.get(
    "/mappings/{audit_type_id}",
    response_model=list[JiraFieldMappingRead],
)
async def get_field_mappings(
    audit_type_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[JiraFieldMappingRead]:
    """Get all Jira field mappings for an audit type."""
    result = await db.execute(
        select(JiraFieldMapping).where(
            JiraFieldMapping.audit_type_id == audit_type_id
        )
    )
    mappings = result.scalars().all()
    return [JiraFieldMappingRead.model_validate(m) for m in mappings]


@router.put(
    "/mappings/{audit_type_id}",
    response_model=list[JiraFieldMappingRead],
)
async def update_field_mappings(
    audit_type_id: uuid.UUID,
    body: JiraFieldMappingBulkUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[JiraFieldMappingRead]:
    """Replace all Jira field mappings for an audit type (bulk update)."""
    # Delete existing mappings for this audit type
    await db.execute(
        delete(JiraFieldMapping).where(
            JiraFieldMapping.audit_type_id == audit_type_id
        )
    )

    # Insert new mappings
    new_mappings = []
    for mapping_data in body.mappings:
        mapping = JiraFieldMapping(
            audit_type_id=audit_type_id,
            jira_field_name=mapping_data.jira_field_name,
            case_metadata_key=mapping_data.case_metadata_key,
        )
        db.add(mapping)
        new_mappings.append(mapping)

    await db.commit()

    # Refresh to get generated IDs and timestamps
    for m in new_mappings:
        await db.refresh(m)

    return [JiraFieldMappingRead.model_validate(m) for m in new_mappings]


@router.post("/scrape-and-map", response_model=JiraScrapeResponse)
async def scrape_and_map_jira_issue(
    body: JiraScrapeRequest,
    audit_type_id: uuid.UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JiraScrapeResponse:
    """Scrape a Jira issue and apply field mappings for the given audit type."""
    try:
        # Scrape the Jira page
        scraper = JiraScraper()
        raw_fields = await scraper.scrape_issue(body.url, body.timeout_ms)

        # Load mappings for this audit type
        result = await db.execute(
            select(JiraFieldMapping).where(
                JiraFieldMapping.audit_type_id == audit_type_id
            )
        )
        mappings = result.scalars().all()

        # Apply mapping: convert Jira field names to case metadata keys
        mapping_dict = {
            m.jira_field_name.lower(): m.case_metadata_key for m in mappings
        }
        mapped_fields: dict[str, str] = {}
        for jira_field, value in raw_fields.items():
            metadata_key = mapping_dict.get(jira_field.lower())
            if metadata_key:
                mapped_fields[metadata_key] = value

        return JiraScrapeResponse(
            url=body.url,
            fields=mapped_fields,
            raw_fields=raw_fields,
            success=True,
        )
    except HTTPException:
        raise
    except Exception as e:
        return JiraScrapeResponse(
            url=body.url,
            fields={},
            raw_fields={},
            success=False,
            error=str(e),
        )
