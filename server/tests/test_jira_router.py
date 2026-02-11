"""Integration tests for jira router."""

import uuid
from unittest.mock import AsyncMock, patch

import pytest

from tests.factories import make_audit_type


class TestJiraScrape:
    async def test_scrape_issue(self, authenticated_client):
        mock_fields = {"Summary": "Test Issue", "Status": "Open"}

        with patch(
            "src.routers.jira.JiraScraper.scrape_issue",
            new_callable=AsyncMock,
            return_value=mock_fields,
        ):
            response = await authenticated_client.post(
                "/jira/scrape",
                json={"url": "https://jira.example.com/browse/TEST-1"},
            )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["fields"]["Summary"] == "Test Issue"

    async def test_scrape_failure(self, authenticated_client):
        with patch(
            "src.routers.jira.JiraScraper.scrape_issue",
            new_callable=AsyncMock,
            side_effect=Exception("Connection failed"),
        ):
            response = await authenticated_client.post(
                "/jira/scrape",
                json={"url": "https://jira.example.com/browse/TEST-1"},
            )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False
        assert "Connection failed" in data["error"]


class TestJiraMappings:
    async def test_get_empty_mappings(self, authenticated_client, db_session):
        at = make_audit_type()
        db_session.add(at)
        await db_session.commit()

        response = await authenticated_client.get(f"/jira/mappings/{at.id}")
        assert response.status_code == 200
        assert response.json() == []

    async def test_put_mappings(self, authenticated_client, db_session):
        at = make_audit_type()
        db_session.add(at)
        await db_session.commit()

        response = await authenticated_client.put(
            f"/jira/mappings/{at.id}",
            json={
                "mappings": [
                    {"jira_field_name": "Summary", "case_metadata_key": "field1"},
                    {"jira_field_name": "Status", "case_metadata_key": "field2"},
                ]
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["jira_field_name"] == "Summary"

    async def test_put_replaces_existing(self, authenticated_client, db_session):
        at = make_audit_type()
        db_session.add(at)
        await db_session.commit()

        # First PUT
        await authenticated_client.put(
            f"/jira/mappings/{at.id}",
            json={
                "mappings": [
                    {"jira_field_name": "Summary", "case_metadata_key": "field1"},
                ]
            },
        )

        # Second PUT replaces
        response = await authenticated_client.put(
            f"/jira/mappings/{at.id}",
            json={
                "mappings": [
                    {"jira_field_name": "Priority", "case_metadata_key": "field2"},
                ]
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["jira_field_name"] == "Priority"


class TestScrapeAndMap:
    async def test_scrape_and_map(self, authenticated_client, db_session):
        at = make_audit_type()
        db_session.add(at)
        await db_session.commit()

        # Set up mappings
        await authenticated_client.put(
            f"/jira/mappings/{at.id}",
            json={
                "mappings": [
                    {"jira_field_name": "Summary", "case_metadata_key": "field1"},
                ]
            },
        )

        mock_fields = {"Summary": "Mapped Issue", "Status": "Done"}
        with patch(
            "src.routers.jira.JiraScraper.scrape_issue",
            new_callable=AsyncMock,
            return_value=mock_fields,
        ):
            response = await authenticated_client.post(
                f"/jira/scrape-and-map?audit_type_id={at.id}",
                json={"url": "https://jira.example.com/browse/TEST-2"},
            )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["fields"]["field1"] == "Mapped Issue"
        assert "Status" not in data["fields"]  # Not mapped
        assert data["raw_fields"]["Status"] == "Done"
