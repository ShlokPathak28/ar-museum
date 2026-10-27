import { expect, type Page } from "@playwright/test";

/**
 * The demo accounts are created through /register (Better Auth owns the hash),
 * so the suite reads them from the environment with the local defaults as a
 * fallback. See docs/TESTING.md for the one-time setup.
 */
export const ADMIN = {
  email: process.env.E2E_ADMIN_EMAIL ?? "admin@dharohar.test",
  password: process.env.E2E_ADMIN_PASSWORD ?? "museum-pass-2026",
};

export const VISITOR = {
  email: process.env.E2E_VISITOR_EMAIL ?? "visitor@dharohar.test",
  password: process.env.E2E_VISITOR_PASSWORD ?? "museum-pass-2026",
};

export async function signIn(page: Page, account: { email: string; password: string }) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Password").fill(account.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
}
