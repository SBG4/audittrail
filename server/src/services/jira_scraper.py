import ipaddress
import socket
from urllib.parse import urlparse

from bs4 import BeautifulSoup
from fastapi import HTTPException, status
from playwright.async_api import TimeoutError as PlaywrightTimeoutError
from playwright.async_api import async_playwright


class JiraScraper:
    """Headless browser scraper for Jira issue pages."""

    @staticmethod
    def _validate_url(url: str) -> None:
        """Validate URL scheme, hostname, and resolved IP to prevent SSRF."""
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="URL must start with http:// or https://",
            )
        if not parsed.netloc or not parsed.hostname:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid URL: missing hostname",
            )

        # Resolve hostname and block private/internal IPs
        try:
            resolved = socket.getaddrinfo(parsed.hostname, None)
        except socket.gaierror:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not resolve hostname",
            )

        for _, _, _, _, addr in resolved:
            ip = ipaddress.ip_address(addr[0])
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="URL must not resolve to a private or reserved IP address",
                )

    async def scrape_issue(
        self, url: str, timeout_ms: int = 15000
    ) -> dict[str, str]:
        """Fetch a Jira issue page via Playwright and extract field data.

        Args:
            url: Full URL to the Jira issue page.
            timeout_ms: Maximum time in milliseconds to wait for page load.

        Returns:
            Dictionary of field_name -> field_value strings.

        Raises:
            HTTPException: On timeout (504), connection failure (502), or invalid URL (400).
        """
        self._validate_url(url)

        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(
                    headless=True,
                    args=[
                        "--no-sandbox",
                        "--disable-setuid-sandbox",
                        "--disable-dev-shm-usage",
                    ],
                )
                try:
                    page = await browser.new_page()
                    await page.goto(
                        url,
                        timeout=timeout_ms,
                        wait_until="networkidle",
                    )
                    html = await page.content()
                finally:
                    await browser.close()

            return self._parse_fields(html)

        except PlaywrightTimeoutError:
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail=f"Jira page load timed out after {timeout_ms}ms",
            )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to fetch Jira page: {e}",
            )

    def _parse_fields(self, html: str) -> dict[str, str]:
        """Parse Jira issue HTML and extract field name-value pairs.

        Uses multiple strategies to handle Jira Server/DC and Cloud layouts.
        """
        soup = BeautifulSoup(html, "lxml")
        fields: dict[str, str] = {}

        # Strategy A: Jira Server/DC detail view
        # Fields in #details-module or .details-layout with .item elements
        for item in soup.select(
            "#details-module .item, .details-layout .item"
        ):
            label_el = item.select_one(".name, .name .header, strong")
            value_el = item.select_one(".value")
            if label_el and value_el:
                label = label_el.get_text(strip=True).rstrip(":")
                value = value_el.get_text(strip=True)
                if label and value:
                    fields[label] = value

        # Strategy A2: field-group patterns (older Jira Server)
        for group in soup.select(".field-group"):
            label_el = group.select_one(".field-name, label")
            value_el = group.select_one(".field-value")
            if label_el and value_el:
                label = label_el.get_text(strip=True).rstrip(":")
                value = value_el.get_text(strip=True)
                if label and value:
                    fields[label] = value

        # Strategy B: Jira Cloud with data-testid attributes
        for field in soup.select("[data-testid*='issue-field']"):
            label_el = field.select_one(
                "label, [data-testid$='.label'], [data-testid$='-label']"
            )
            value_el = field.select_one(
                "[data-testid$='.value'], [data-testid$='-value'], .field-value"
            )
            if label_el and value_el:
                label = label_el.get_text(strip=True).rstrip(":")
                value = value_el.get_text(strip=True)
                if label and value:
                    fields[label] = value

        # Strategy C: Known field selectors (common across versions)
        known_fields = {
            "Summary": [
                "#summary-val",
                "h1[data-testid*='summary']",
                "#summary_header_id",
                "#summary-val .value",
            ],
            "Status": [
                "#status-val",
                "[data-testid*='status'] span",
                "#status-val .value",
            ],
            "Assignee": [
                "#assignee-val",
                "[data-testid*='assignee']",
                "#assignee-val .user-hover",
            ],
            "Reporter": [
                "#reporter-val",
                "[data-testid*='reporter']",
                "#reporter-val .user-hover",
            ],
            "Priority": [
                "#priority-val",
                "[data-testid*='priority']",
                "#priority-val .value",
            ],
            "Type": [
                "#type-val",
                "[data-testid*='issuetype']",
                "#type-val .value",
            ],
            "Created": [
                "#created-val time",
                "#created-val .date",
                "[data-testid*='created']",
            ],
            "Description": [
                "#description-val",
                "[data-testid*='description']",
            ],
        }

        for field_name, selectors in known_fields.items():
            if field_name in fields:
                continue  # Already found via Strategy A or B
            for selector in selectors:
                el = soup.select_one(selector)
                if el:
                    value = el.get_text(strip=True)
                    if value:
                        fields[field_name] = value
                        break

        return fields
