import { test as base, expect, type Page } from "@playwright/test";

/**
 * Authenticate by calling the API directly, then inject the token
 * into localStorage so the SPA picks it up.
 */
async function loginViaApi(
  page: Page,
  baseURL: string,
  username = "admin",
  password = "admin",
): Promise<string> {
  const response = await page.request.post(`${baseURL}/api/auth/login`, {
    form: { username, password },
  });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  const token: string = body.access_token;
  expect(token).toBeTruthy();

  // Inject token into localStorage before navigating
  await page.addInitScript((t) => {
    localStorage.setItem("token", t);
  }, token);

  return token;
}

type AuthFixtures = {
  authenticatedPage: Page;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page, baseURL }, use) => {
    await loginViaApi(page, baseURL!);
    await use(page);
  },
});

export { expect };
