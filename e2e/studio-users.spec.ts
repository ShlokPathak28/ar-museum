import { createClient } from "@libsql/client";
import { expect, test } from "@playwright/test";

import { ADMIN, signIn } from "./accounts";

/**
 * The fixture account is inserted directly because `/register` signs the new
 * user in and would replace the admin session under test. It has no password
 * account, so it cannot sign in — the test only needs a row the Studio can see,
 * promote and remove.
 */
const EMAIL = `e2e-users-${Date.now()}@dharohar.test`;
const NAME = "E2E Account";
const ID = crypto.randomUUID();

const db = createClient({ url: process.env.DATABASE_URL ?? "file:./prisma/dev.db" });

// Both tests share the fixture and the admin session, so they take turns. With
// fullyParallel, each worker would run beforeAll and delete the other's row.
test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  // A previous run that failed before cleanup should not accumulate rows.
  await db.execute({
    sql: 'DELETE FROM "User" WHERE email LIKE ?',
    args: ["e2e-users-%@dharohar.test"],
  });

  const now = new Date().toISOString();
  await db.execute({
    sql: 'INSERT INTO "User" ("id", "email", "name", "role", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?)',
    args: [ID, EMAIL, NAME, "VISITOR", now, now],
  });
});

test.afterAll(async () => {
  await db.execute({ sql: 'DELETE FROM "User" WHERE id = ?', args: [ID] });
  db.close();
});

test("an admin changes a role and removes an account", async ({ page }) => {
  await signIn(page, ADMIN);

  await page.goto(`/studio/users?q=${encodeURIComponent(EMAIL)}`);
  await expect(page.getByRole("heading", { level: 1, name: "People" })).toBeVisible();

  const row = page.getByRole("row").filter({ hasText: EMAIL });
  await expect(row).toBeVisible();
  await expect(row.getByText("VISITOR", { exact: true })).toBeVisible();

  await row.getByRole("button", { name: `Make ${NAME} an admin` }).click();
  await expect(row.getByText("ADMIN", { exact: true })).toBeVisible();

  await row.getByRole("button", { name: `Make ${NAME} a visitor` }).click();
  await expect(row.getByText("VISITOR", { exact: true })).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await row.getByRole("button", { name: `Delete ${NAME}` }).click();

  await expect(row).toHaveCount(0);
  await expect(page.getByText(`No accounts match “${EMAIL}”.`)).toBeVisible();
});

test("the signed-in admin cannot change or delete their own account", async ({ page }) => {
  await signIn(page, ADMIN);
  await page.goto(`/studio/users?q=${encodeURIComponent(ADMIN.email)}`);

  const selfRow = page.getByRole("row").filter({ hasText: ADMIN.email });

  await expect(selfRow.getByText("This is you")).toBeVisible();
  await expect(selfRow.getByRole("button")).toHaveCount(0);
});
