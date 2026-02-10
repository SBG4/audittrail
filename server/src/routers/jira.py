from fastapi import APIRouter, Depends, HTTPException

from src.deps import get_current_user
from src.models.user import User
from src.schemas.jira import JiraScrapeRequest, JiraScrapeResponse
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
