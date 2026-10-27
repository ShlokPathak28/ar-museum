import { expect, test } from "@playwright/test";

import { ADMIN, VISITOR, signIn } from "./accounts";

/**
 * Middleware is UX, not security. These tests exercise the UX half in a real
 * browser: what a signed-out visitor and a signed-in non-admin actually see.
 * The security half is `requireAdmin()` inside the layout and every action.
 */
test.describe("guards", () => {
  test("a signed-out visitor is sent to sign in, and brought back after", async ({ page }) => {
    await page.goto("/studio/exhibits");

    await expect(page).toHaveURL(/\/login\?next=%2Fstudio%2Fexhibits$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Welcome back");

    await page.getByLabel("Email").fill(ADMIN.email);
    await page.getByLabel("Password").fill(ADMIN.password);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/\/studio\/exhibits$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("the passport is private", async ({ page }) => {
    await page.goto("/passport");

    await expect(page).toHaveURL(/\/login\?next=%2Fpassport$/);
  });

  test("an admin sees the studio and its link in the menu", async ({ page }) => {
    await signIn(page, ADMIN);

    await page.goto("/studio");

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("The museum office");
    await expect(page.getByRole("main")).toBeVisible();
  });

  test("a signed-in visitor gets a 404, not a 403, and no studio link", async ({ page }) => {
    await signIn(page, VISITOR);

    // The link is only rendered for admins.
    await expect(page.getByRole("link", { name: "Studio" })).toHaveCount(0);

    const response = await page.goto("/studio");

    expect(response?.status()).toBe(404);
    await expect(page.getByText("This page could not be found")).toBeVisible();
  });
});
