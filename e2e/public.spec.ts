import { expect, test } from "@playwright/test";

/**
 * The spine of the visit, in the order a stranger meets it: the entrance, the
 * collection, one object, one room. If these break, nothing else matters.
 */
test.describe("public spine", () => {
  test("entrance → collection → object", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toContainText("Nothing here is behind glass");

    await page.getByRole("link", { name: "Enter the collection" }).click();
    await expect(page).toHaveURL(/\/exhibits$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("The collection");

    await page.getByRole("link", { name: /Bidri Hookah Base/ }).first().click();
    await expect(page).toHaveURL(/\/exhibits\/bidri-hookah-base$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bidri Hookah Base");

    // The object page still asks a signed-out visitor to sign in before reviewing.
    await expect(page.getByRole("heading", { name: "Reviews" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in to review" })).toBeVisible();
  });

  test("the collection filters in place and mirrors itself into the URL", async ({ page }) => {
    await page.goto("/exhibits");

    await page.getByRole("searchbox", { name: "Search the collection" }).fill("bidri");

    await expect(page.getByRole("link", { name: /Bidri Hookah Base/ }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Terracotta Horse/ })).toHaveCount(0);
    await expect(page).toHaveURL(/\?q=bidri$/);

    await page.getByRole("searchbox", { name: "Search the collection" }).fill("");
    await expect(page.getByRole("link", { name: /Terracotta Horse/ }).first()).toBeVisible();
    await expect(page).toHaveURL(/\/exhibits$/);
  });

  test("a room page renders its objects and the 360 stage", async ({ page }) => {
    await page.goto("/rooms/material-worlds");

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Material Worlds");
    await expect(page.locator('[aria-label*="object markers"]')).toBeVisible();
    await expect(page.getByRole("link", { name: /Terracotta Horse/ }).first()).toBeVisible();
  });

  test("a printed code redirects to its object", async ({ request }) => {
    const response = await request.get("/x/TH01", { maxRedirects: 0 });

    expect(response.status()).toBe(307);
    expect(new URL(response.headers()["location"]).pathname).toBe("/exhibits/terracotta-horse");
    // The device cookie is what lets a guest collect stamps before signing up.
    expect(response.headers()["set-cookie"]).toContain("dharohar_device");
  });

  test("an unknown code falls back to the collection, not a 404", async ({ request }) => {
    const response = await request.get("/x/ZZ99", { maxRedirects: 0 });

    expect(new URL(response.headers()["location"]).pathname).toBe("/exhibits");
  });
});
