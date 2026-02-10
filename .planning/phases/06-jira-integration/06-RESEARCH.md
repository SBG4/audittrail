# Phase 6: Jira Integration - Research

**Researched:** 2026-02-10
**Domain:** Headless browser scraping, Jira page parsing, configurable field mapping
**Confidence:** MEDIUM

## Summary

Phase 6 adds the ability for auditors to paste a Jira issue URL and have the tool automatically extract issue fields to pre-populate case metadata. Since this is an airgapped internal Jira instance with no API access, the solution uses headless browser scraping via Playwright. The scraping service runs server-side, fetches the Jira issue page, extracts structured field data from the DOM, maps it to case metadata fields via a configurable mapping, and returns the data for the user to review before saving.

The architecture is a backend service with three layers: (1) a Playwright-based browser automation layer that navigates to the Jira URL and returns raw HTML, (2) a parsing layer that extracts field key-value pairs from Jira's DOM structure, and (3) a mapping configuration that translates Jira field names to case metadata field keys per audit type.

**Primary recommendation:** Use Playwright (Python) as the headless browser engine, with BeautifulSoup4 for HTML parsing. Store field mappings in a new database table (JiraFieldMapping) keyed by audit_type_id. The frontend adds a "Import from Jira" input to both CaseCreatePage and CaseDetailPage, with a review step before applying scraped data.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| playwright | >=1.49 | Headless browser automation | Best maintained, async-native Python API, Chromium bundled |
| beautifulsoup4 | >=4.12 | HTML parsing and field extraction | Lightweight, well-known, no browser needed for parsing |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lxml | >=5.0 | Fast HTML parser backend for BS4 | Always (faster than html.parser) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Playwright | Puppeteer (via pyppeteer) | Playwright has better Python support, more reliable, actively maintained |
| BeautifulSoup4 | lxml directly | BS4 is more ergonomic for field extraction patterns |
| Separate scraping microservice | Inline in FastAPI | Inline is simpler for this project size; microservice adds Docker complexity |

**Installation:**
```bash
# Server dependencies
uv add playwright beautifulsoup4 lxml
# Playwright browser install (build-time, in Dockerfile)
playwright install chromium --with-deps
```

## Architecture Patterns

### Recommended Project Structure
```
server/src/
├── models/
│   └── jira_field_mapping.py    # JiraFieldMapping SQLAlchemy model
├── schemas/
│   └── jira.py                  # Pydantic schemas for scrape request/response, mappings
├── routers/
│   └── jira.py                  # /jira/scrape, /jira/mappings CRUD endpoints
├── services/
│   └── jira_scraper.py          # Playwright browser + BS4 parsing logic
```

### Pattern 1: Service Layer for Scraping
**What:** Isolate browser automation and HTML parsing into a dedicated service module, separate from the router.
**When to use:** Whenever business logic is complex enough to warrant separation from HTTP handling.
**Example:**
```python
# server/src/services/jira_scraper.py
class JiraScraper:
    async def scrape_issue(self, url: str) -> dict[str, str]:
        """Fetch Jira issue page and extract fields."""
        html = await self._fetch_page(url)
        return self._parse_fields(html)

    async def _fetch_page(self, url: str) -> str:
        """Use Playwright to load page and return HTML."""
        ...

    def _parse_fields(self, html: str) -> dict[str, str]:
        """Use BeautifulSoup to extract field name-value pairs."""
        ...
```

### Pattern 2: Configurable Field Mapping per Audit Type
**What:** A database table storing which Jira field name maps to which case metadata key, scoped per audit type.
**When to use:** When the mapping between source and target fields varies by context (audit type).
**Example:**
```python
# JiraFieldMapping model
class JiraFieldMapping(Base):
    __tablename__ = "jira_field_mappings"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    audit_type_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("audit_types.id"))
    jira_field_name: Mapped[str]      # e.g., "Assignee", "Summary"
    case_metadata_key: Mapped[str]    # e.g., "user_name", "serial_number"
```

### Pattern 3: Pre-fill with Review
**What:** Scraped data is returned to the client and displayed in a review panel, NOT auto-saved. User confirms before applying.
**When to use:** When external data may be inaccurate or incomplete.

### Anti-Patterns to Avoid
- **Direct auto-save without review:** Scraped data may be wrong or incomplete. Always show user first.
- **Synchronous scraping in request handler:** Playwright operations can take 5-30 seconds. Use proper async handling with timeout.
- **Hardcoded field mappings:** Mappings must be configurable per audit type, not baked into code.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Browser automation | Custom HTTP + cookie management | Playwright | Jira may require JS rendering, auth cookies, dynamic content |
| HTML parsing | Regex on HTML | BeautifulSoup4 | HTML is messy, BS4 handles malformed HTML gracefully |
| URL validation | Manual regex | Python urllib.parse | Edge cases with URL formats |

**Key insight:** Jira pages are complex JS-rendered SPAs. Simple HTTP requests (requests/httpx) will NOT work -- a real browser is required to render the JavaScript and get the final DOM.

## Common Pitfalls

### Pitfall 1: Jira Page Load Timing
**What goes wrong:** Playwright fetches the page but fields are not yet rendered because Jira uses heavy JavaScript.
**Why it happens:** Jira (especially newer versions) renders content dynamically after initial page load.
**How to avoid:** Wait for specific selectors (e.g., `[data-testid="issue.views.issue-details"]` or `.issue-header-content`) before extracting HTML. Use `page.wait_for_selector()` with a reasonable timeout (15s).
**Warning signs:** Empty field values, missing elements in parsed HTML.

### Pitfall 2: Jira Authentication
**What goes wrong:** Scraper gets redirected to login page instead of issue page.
**Why it happens:** Internal Jira requires authentication. The scraper needs valid session cookies.
**How to avoid:** Accept optional Jira credentials (username/password or session cookie) in the scrape request. Support both cookie-based and form-based authentication. Store Jira credentials in server settings (not per-request).
**Warning signs:** HTML content contains login form elements instead of issue fields.

### Pitfall 3: Playwright Installation in Docker
**What goes wrong:** Playwright browsers fail to install or run in Docker.
**Why it happens:** Chromium requires system-level dependencies (libglib, libnss, etc.).
**How to avoid:** Use `playwright install chromium --with-deps` which auto-installs system dependencies. In Dockerfile, ensure this runs as part of build.
**Warning signs:** Missing shared library errors at runtime.

### Pitfall 4: Scraping Timeout
**What goes wrong:** Request hangs for 30+ seconds when Jira is slow or unreachable.
**Why it happens:** No timeout set on Playwright navigation or the FastAPI endpoint.
**How to avoid:** Set `timeout=15000` (15s) on `page.goto()`, and set an overall endpoint timeout. Return a clear error message on timeout.

## Code Examples

### Playwright Async Scraping
```python
from playwright.async_api import async_playwright

async def fetch_jira_page(url: str, timeout_ms: int = 15000) -> str:
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        try:
            await page.goto(url, timeout=timeout_ms, wait_until="networkidle")
            html = await page.content()
            return html
        finally:
            await browser.close()
```

### BeautifulSoup Field Extraction
```python
from bs4 import BeautifulSoup

def parse_jira_fields(html: str) -> dict[str, str]:
    soup = BeautifulSoup(html, "lxml")
    fields = {}

    # Jira Server/DC: fields in .item .wrap with label/value structure
    for group in soup.select(".item .wrap"):
        label_el = group.select_one(".name .header")
        value_el = group.select_one(".value")
        if label_el and value_el:
            fields[label_el.get_text(strip=True)] = value_el.get_text(strip=True)

    # Jira Cloud: fields in data-testid attributes
    for field in soup.select("[data-testid^='issue-field']"):
        label = field.select_one("label, [data-testid$='.label']")
        value = field.select_one("[data-testid$='.value'], .field-value")
        if label and value:
            fields[label.get_text(strip=True)] = value.get_text(strip=True)

    # Fallback: common Jira field patterns
    # Summary/title
    summary_el = soup.select_one("#summary-val, [data-testid='issue.views.issue-base.foundation.summary.heading']")
    if summary_el:
        fields["Summary"] = summary_el.get_text(strip=True)

    return fields
```

### Applying Field Mapping
```python
def apply_field_mapping(
    scraped_fields: dict[str, str],
    mappings: list[JiraFieldMapping],
) -> dict[str, str]:
    """Map scraped Jira fields to case metadata keys."""
    result = {}
    mapping_dict = {m.jira_field_name.lower(): m.case_metadata_key for m in mappings}

    for jira_field, value in scraped_fields.items():
        metadata_key = mapping_dict.get(jira_field.lower())
        if metadata_key:
            result[metadata_key] = value

    return result
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Puppeteer (Node.js) | Playwright (cross-language) | 2020+ | Playwright has first-class Python async API |
| requests + regex | Playwright + BS4 | N/A | JS-rendered pages require real browser |
| Hardcoded scraping selectors | Multiple selector strategies with fallbacks | N/A | Jira versions vary, need resilient parsing |

## Open Questions

1. **Jira Version and Authentication**
   - What we know: Internal Jira on airgapped network, no API access
   - What's unclear: Exact Jira version (Server/DC vs Cloud), authentication method (form login, SSO, cookie)
   - Recommendation: Support both Jira Server and Cloud DOM structures. Accept optional credentials in config. Implement both login-based and cookie-based auth.

2. **Playwright Browser in Docker**
   - What we know: Playwright + Chromium works in Docker with `--with-deps`
   - What's unclear: Docker is not available for runtime testing
   - Recommendation: Create all service code, add Playwright to dependencies, add Dockerfile commands. Skip runtime testing until Docker is available.

## Sources

### Primary (HIGH confidence)
- Playwright Python documentation (async API, browser launch, page navigation)
- BeautifulSoup4 documentation (CSS selectors, text extraction)
- Existing codebase patterns (FastAPI routers, SQLAlchemy models, Pydantic schemas)

### Secondary (MEDIUM confidence)
- Jira DOM structure based on common Jira Server/Cloud patterns
- Playwright Docker setup patterns

### Tertiary (LOW confidence)
- Exact Jira CSS selectors (depends on specific Jira version deployed)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Playwright and BS4 are well-established
- Architecture: HIGH - Follows existing codebase patterns exactly
- Pitfalls: MEDIUM - Jira-specific selectors depend on deployed version
- Parsing: LOW - Exact DOM selectors need validation against real Jira instance

**Research date:** 2026-02-10
**Valid until:** 2026-03-10 (stable libraries, but Jira DOM may change)
