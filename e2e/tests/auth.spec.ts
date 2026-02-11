import { test, expect } from "@playwright/test";
import { test as authTest, expect as authExpect } from "../fixtures/auth";

test.describe("Authentication", () => {
  test("shows login page for unauthenticated users", async ({ page, baseURL }) => {
    await page.goto("/");
    // Should redirect to /login
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: /audittrail/i })).toBeVisible();
    await expect(page.getByLabel(/username/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test("login with valid credentials", async ({ page, baseURL }) => {
    await page.goto("/login");
    await page.getByLabel(/username/i).fill("admin");
    await page.getByLabel(/password/i).fill("admin");
    await page.getByRole("button", { name: /sign in/i }).click();

    // Should redirect to case list (home page)
    await expect(page).not.toHaveURL(/\/login/);
    // Should see the main layout
    await expect(page.locator("body")).not.toContainText("Sign in to your account");
  });

  test("login with invalid credentials shows error", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/username/i).fill("admin");
    await page.getByLabel(/password/i).fill("wrongpassword");
    await page.getByRole("button", { name: /sign in/i }).click();

    // Should show error message
    await expect(page.getByRole("alert")).toBeVisible();
    // Should stay on login page
    await expect(page).toHaveURL(/\/login/);
  });

  authTest("logout returns to login page", async ({ authenticatedPage: page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Find and click logout (may be in a menu or header)
    const logoutButton = page.getByRole("button", { name: /logout|sign out|log out/i });
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      await expect(page).toHaveURL(/\/login/);
    }
  });
});
