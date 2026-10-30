import { createClient } from "@libsql/client";
import { expect, test } from "@playwright/test";

import { ADMIN, signIn } from "./accounts";

/**
 * The room editor is the one place an admin can add a place to the museum, give
 * it a 360° view and move objects into it — all without a redeploy. The fixture
 * is a room row with a unique slug, and the cleanup moves any object back to
 * Material Worlds before deleting it, because `Exhibit.roomId` cascades.
 */
const SLUG = `e2e-room-${Date.now()}`;
const NAME = "E2E Room";
const EXHIBIT = "Terracotta Horse";
const HOME_ROOM = "material-worlds";

const db = createClient({ url: process.env.DATABASE_URL ?? "file:./prisma/dev.db" });

// The two tests share the fixture room and the admin session, so they take
// turns; with four workers each would run beforeAll and delete the other's row.
test.describe.configure({ mode: "serial" });

async function cleanup() {
  await db.batch(
    [
      {
        sql: `UPDATE "Exhibit" SET "roomId" = (SELECT "id" FROM "Room" WHERE "slug" = ?)
              WHERE "roomId" IN (SELECT "id" FROM "Room" WHERE "slug" LIKE 'e2e-room-%')
                AND EXISTS (SELECT 1 FROM "Room" WHERE "slug" = ?)`,
        args: [HOME_ROOM, HOME_ROOM],
      },
      { sql: `DELETE FROM "Room" WHERE "slug" LIKE 'e2e-room-%'`, args: [] },
    ],
    "write",
  );
}

test.beforeAll(cleanup);

test.afterAll(async () => {
  await cleanup();
  db.close();
});

test("an admin creates a room, uploads a panorama, and moves an object in", async ({
  page,
  browser,
}) => {
  await signIn(page, ADMIN);

  await page.goto("/studio/rooms");
  await page.getByRole("link", { name: "New room" }).click();

  await page.getByLabel("Name").fill(NAME);
  await page.getByLabel("Slug").fill(SLUG);
  await page.getByLabel("Floor").fill("Test floor");
  await page.getByLabel(/Introduction/).fill("A room the test suite builds from the Studio.");
  await page.getByRole("button", { name: "Create room" }).click();

  await expect(page.getByRole("heading", { level: 1, name: NAME })).toBeVisible();
  await expect(page).toHaveURL(/\/studio\/rooms\/[^/]+$/);
  const roomUrl = page.url();

  // A real 2:1 JPEG, so the upload path is exercised end to end: header check,
  // size read, bytes stored, URL swapped in the same transaction.
  const fixture = await browser.newPage({ viewport: { width: 1024, height: 512 } });
  await fixture.setContent("<body style='margin:0;background:#4b4b4b'></body>");
  const panorama = await fixture.screenshot({ type: "jpeg" });
  await fixture.close();

  await page.setInputFiles("#panorama-file", {
    name: "e2e-panorama.jpg",
    mimeType: "image/jpeg",
    buffer: panorama,
  });

  await expect(page.getByRole("status")).toContainText("Stored e2e-panorama.jpg");
  await expect(page.getByRole("status")).toContainText("1024×512");

  await page.getByRole("button", { name: "Save room" }).click();
  await expect(page.getByText("Saved. The public pages have been refreshed.")).toBeVisible();

  // The public room exists, with the uploaded image behind next/image.
  await page.goto(`/rooms/${SLUG}`);
  await expect(page.getByRole("heading", { level: 1, name: NAME })).toBeVisible();
  await expect(page.locator('img[src*="panoramas"]').first()).toBeVisible();
  await expect(page.getByText("Panorama: Dharohar")).toBeVisible();

  // Move an object in from the room page.
  await page.goto(roomUrl);
  await page.getByRole("checkbox", { name: new RegExp(EXHIBIT) }).check();
  await page.getByRole("button", { name: /Move 1 object into/ }).click();
  await expect(page.getByRole("status")).toContainText(`Moved 1 object into ${NAME}`);

  // Both public pages see it straight away: the room lists it, the object
  // names the room it moved to.
  await page.goto(`/rooms/${SLUG}`);
  await expect(page.getByRole("heading", { name: EXHIBIT })).toBeVisible();

  await page.goto("/exhibits/terracotta-horse");
  await expect(page.getByRole("link", { name: NAME, exact: true })).toBeVisible();
});

test("a room with objects cannot be deleted until they move out", async ({ page }) => {
  await signIn(page, ADMIN);

  await page.goto("/studio/rooms");
  await page.getByRole("link", { name: NAME }).click();

  // Still holding Terracotta Horse from the previous test.
  await expect(page.getByText("Move its object out to delete this room")).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete room" })).toHaveCount(0);

  await page.getByRole("combobox").selectOption({ label: "Material Worlds" });
  await expect(page.getByRole("checkbox", { name: new RegExp(EXHIBIT) })).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete room" }).click();

  await expect(page).toHaveURL("/studio/rooms");
  await expect(page.getByRole("link", { name: NAME })).toHaveCount(0);
});
