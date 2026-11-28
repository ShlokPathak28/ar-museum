import { createClient } from "@libsql/client";
import { expect, test } from "@playwright/test";

/**
 * The reset path is a small chain of trust: Better Auth creates a one-use token,
 * the mail module would deliver it, and the page spends it. The suite takes the
 * token from the local database instead of an inbox, because the development
 * fallback prints the link rather than sending it.
 *
 * The account is created through `/register` so Better Auth owns the password
 * hash, then deleted with its children. No seeded account is touched.
 */
const EMAIL = `e2e-reset-${Date.now()}@dharohar.test`;
const NAME = "E2E Reset";
const OLD_PASSWORD = "museum-pass-2026";
const NEW_PASSWORD = "new-museum-pass-2026";

const db = createClient({ url: process.env.DATABASE_URL ?? "file:./prisma/dev.db" });

test.describe.configure({ mode: "serial" });

async function cleanup() {
  const users = await db.execute({
    sql: 'SELECT id FROM "User" WHERE email LIKE ?',
    args: ["e2e-reset-%@dharohar.test"],
  });

  for (const row of users.rows) {
    const id = String(row.id);
    await db.batch(
      [
        { sql: 'DELETE FROM "Verification" WHERE value = ?', args: [id] },
        { sql: 'DELETE FROM "Session" WHERE userId = ?', args: [id] },
        { sql: 'DELETE FROM "Account" WHERE userId = ?', args: [id] },
        { sql: 'DELETE FROM "Review" WHERE userId = ?', args: [id] },
        { sql: 'UPDATE "Stamp" SET userId = NULL WHERE userId = ?', args: [id] },
        { sql: 'UPDATE "Scan" SET userId = NULL WHERE userId = ?', args: [id] },
        { sql: 'DELETE FROM "User" WHERE id = ?', args: [id] },
      ],
      "write",
    );
  }
}

async function waitForResetToken(): Promise<string> {
  const deadline = Date.now() + 10_000;

  while (Date.now() < deadline) {
    const result = await db.execute({
      sql: `SELECT identifier FROM "Verification"
            WHERE value = (SELECT id FROM "User" WHERE email = ?)
              AND identifier LIKE 'reset-password:%'
            ORDER BY "createdAt" DESC LIMIT 1`,
      args: [EMAIL],
    });

    const identifier = result.rows[0]?.identifier;
    if (typeof identifier === "string") return identifier.replace("reset-password:", "");

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error("The reset token was never written to the database.");
}

test.beforeAll(cleanup);

test.afterAll(async () => {
  await cleanup();
  db.close();
});

test("an unknown address gets the same answer as a real one", async ({ page }) => {
  await page.goto("/forgot-password");
  await page.getByLabel("Email").fill(`e2e-missing-${Date.now()}@dharohar.test`);
  await page.getByRole("button", { name: "Send reset link" }).click();

  await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("If an account exists for");
});

test("a visitor sets a new password and signs in with it", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("Name").fill(NAME);
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill(OLD_PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();

  // The entry point a real visitor uses.
  await page.goto("/login");
  await page.getByRole("link", { name: "Forgot password?" }).click();
  await expect(page).toHaveURL(/\/forgot-password$/);

  await page.getByLabel("Email").fill(EMAIL);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible();

  const token = await waitForResetToken();
  await page.goto(`/reset-password?token=${encodeURIComponent(token)}`);

  await expect(page.getByRole("heading", { level: 1, name: "Choose a new password" })).toBeVisible();
  await page.getByLabel("New password", { exact: true }).fill(NEW_PASSWORD);
  await page.getByLabel("Repeat new password").fill(NEW_PASSWORD);
  await page.getByRole("button", { name: "Set new password" }).click();

  await expect(page.getByRole("heading", { name: "You can sign in again" })).toBeVisible();
  await page.getByRole("link", { name: "Sign in with the new password" }).click();

  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill(NEW_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
});

test("a token that was never issued is refused", async ({ page }) => {
  await page.goto("/reset-password?token=not-a-real-token");

  await page.getByLabel("New password", { exact: true }).fill(NEW_PASSWORD);
  await page.getByLabel("Repeat new password").fill(NEW_PASSWORD);
  await page.getByRole("button", { name: "Set new password" }).click();

  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "expired or has already been used",
  );
});
