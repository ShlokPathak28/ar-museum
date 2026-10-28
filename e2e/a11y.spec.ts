import { expect, test } from "@playwright/test";

import { ADMIN, signIn } from "./accounts";

/**
 * The two things the in-app browser could not check during the accessibility
 * pass: real Tab order (the webview never takes OS focus) and the skip link's
 * visible state. Also the structural invariants axe reads but does not fail on.
 */
test.describe("keyboard and structure", () => {
  test("the skip link is the first stop, is visible on focus, and lands on main", async ({ page }) => {
    await page.goto("/exhibits");

    await page.keyboard.press("Tab");

    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();

    // Press on the element rather than the page: if hydration has just swapped
    // a node, this re-focuses it instead of sending the key to <body>.
    await skip.press("Enter");

    // The contract is the focus move, not the hash. Once the client router is
    // hydrated it handles the fragment itself and normalises the URL, so
    // `#main` is present before hydration and absent after it — both are fine.
    await expect(page.locator("main#main")).toBeFocused();
  });

  test("the skip link is also present in the studio chrome", async ({ page }) => {
    await signIn(page, ADMIN);

    await page.goto("/studio/exhibits");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  });

  for (const path of ["/", "/exhibits", "/exhibits/bidri-hookah-base", "/rooms", "/rooms/material-worlds", "/scan", "/markers", "/credits"]) {
    test(`one h1 and a main landmark on ${path}`, async ({ page }) => {
      await page.goto(path);

      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await expect(page.getByRole("main")).toHaveCount(1);
      await expect(page.locator("main#main")).toHaveCount(1);
    });
  }
});
