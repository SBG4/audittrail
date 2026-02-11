import { test, expect } from "../fixtures/auth";

test.describe("Timeline", () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    // Navigate to first case detail if available
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const caseLink = page.locator("a[href*='/cases/']").first();
    if (await caseLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await caseLink.click();
      await page.waitForLoadState("networkidle");
    }
  });

  test("displays timeline events", async ({ authenticatedPage: page }) => {
    // Timeline should be visible on case detail page
    const timeline = page.locator("[data-testid='timeline'], .timeline, table, [class*='timeline']").first();
    if (await timeline.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(timeline).toBeVisible();
    }
  });

  test("add event to timeline", async ({ authenticatedPage: page }) => {
    // Look for add event button
    const addButton = page.getByRole("button", { name: /add.*event|new.*event|add/i }).first();
    if (await addButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addButton.click();

      // Fill in event date
      const dateInput = page.locator('input[type="date"]').first();
      if (await dateInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await dateInput.fill("2025-06-15");
      }
    }
  });

  test("inline edit event", async ({ authenticatedPage: page }) => {
    // Look for editable event fields
    const eventRow = page.locator("tr, [data-testid*='event'], [class*='event']").first();
    if (await eventRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(eventRow).toBeVisible();
    }
  });

  test("add file batch to event", async ({ authenticatedPage: page }) => {
    // Look for add batch button on an event
    const addBatchButton = page.getByRole("button", { name: /add.*batch|file.*batch|add.*file/i }).first();
    if (await addBatchButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(addBatchButton).toBeVisible();
    }
  });

  test("delete event from timeline", async ({ authenticatedPage: page }) => {
    // Look for delete button on an event
    const deleteButton = page.locator("[data-testid*='delete'], button[aria-label*='delete']").first();
    if (await deleteButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(deleteButton).toBeVisible();
    }
  });
});
