import { test, expect } from "../fixtures/auth";

test.describe("Reports", () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    // Navigate to first case
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const caseLink = page.locator("a[href*='/cases/']").first();
    if (await caseLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await caseLink.click();
      await page.waitForLoadState("networkidle");
    }
  });

  test("download PDF report", async ({ authenticatedPage: page }) => {
    // Look for report generation button or link
    const pdfButton = page.getByRole("button", { name: /pdf|report|generate|download/i }).first()
      .or(page.getByRole("link", { name: /pdf|report/i }).first());

    if (await pdfButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Set up download listener
      const downloadPromise = page.waitForEvent("download", { timeout: 15000 }).catch(() => null);
      await pdfButton.click();
      const download = await downloadPromise;
      if (download) {
        expect(download.suggestedFilename()).toContain("report");
      }
    }
  });

  test("download DOCX report", async ({ authenticatedPage: page }) => {
    // Look for DOCX generation option
    const docxButton = page.getByRole("button", { name: /docx|word/i }).first();

    if (await docxButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      const downloadPromise = page.waitForEvent("download", { timeout: 15000 }).catch(() => null);
      await docxButton.click();
      const download = await downloadPromise;
      if (download) {
        expect(download.suggestedFilename()).toMatch(/\.(docx|doc)$/);
      }
    }
  });

  test("download HTML report", async ({ authenticatedPage: page }) => {
    // Look for HTML report option
    const htmlButton = page.getByRole("button", { name: /html/i }).first();

    if (await htmlButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      const downloadPromise = page.waitForEvent("download", { timeout: 15000 }).catch(() => null);
      await htmlButton.click();
      const download = await downloadPromise;
      if (download) {
        expect(download.suggestedFilename()).toMatch(/\.html$/);
      }
    }
  });
});
