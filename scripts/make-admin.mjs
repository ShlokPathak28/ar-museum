/**
 * Promote a registered visitor to ADMIN (or demote back to VISITOR).
 *
 * Accounts are created through /register, so Better Auth owns the password
 * hash. This script only flips the `role` column — it never touches Account.
 *
 * Usage:
 *   npm run db:admin                 # list users and their roles
 *   npm run db:admin -- you@mail.com # make that user an ADMIN
 *   npm run db:admin -- you@mail.com --visitor
 */
import { createClient } from "@libsql/client";

const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const authToken = process.env.DATABASE_AUTH_TOKEN;
const db = createClient(authToken ? { url, authToken } : { url });

const [email, flag] = process.argv.slice(2);

if (!email) {
  const users = await db.execute("SELECT email, name, role FROM User ORDER BY createdAt");
  if (users.rows.length === 0) {
    console.log("No users yet. Create one at /register, then run this again.");
    process.exit(0);
  }
  console.log("Registered users:");
  for (const row of users.rows) {
    console.log(`  ${String(row.role).padEnd(7)}  ${row.email}  (${row.name})`);
  }
  console.log("\nPromote one with: npm run db:admin -- <email>");
  process.exit(0);
}

const role = flag === "--visitor" ? "VISITOR" : "ADMIN";

const result = await db.execute({
  sql: "UPDATE User SET role = ?, updatedAt = ? WHERE lower(email) = lower(?)",
  args: [role, new Date().toISOString(), email],
});

if (result.rowsAffected === 0) {
  console.error(`No account for ${email}. Register it at /register first.`);
  process.exit(1);
}

console.log(`${email} is now ${role}. Sign out and back in to refresh the session.`);
