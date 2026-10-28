/**
 * Apply `prisma/migrations` to a hosted libSQL database (Turso).
 *
 * Why this exists instead of `prisma migrate deploy`:
 *
 * 1. Prisma's migration engine only speaks `file:` SQLite. Pointing it at a
 *    `libsql://` URL fails with P1013 ("The scheme is not recognized"), so the
 *    CLI cannot create the schema on Turso.
 * 2. Turso's own CLI needs WSL on Windows.
 *
 * The migrations are plain SQLite DDL, so this sends them over the libSQL HTTP
 * API — the same transport the app uses at runtime — and records them in
 * Prisma's `_prisma_migrations` table so the history is still readable.
 *
 * Usage:
 *   npm run db:deploy            # apply pending migrations to DATABASE_URL
 *   npm run db:deploy -- --check # report what would run, change nothing
 *
 * For the local file database use `npm run db:migrate` as before; this script
 * refuses `file:` URLs so it cannot quietly touch your dev data.
 */
import { createHash, randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { createClient } from "@libsql/client";

const url = process.env.DATABASE_URL;
const authToken = process.env.DATABASE_AUTH_TOKEN;
const checkOnly = process.argv.includes("--check");

if (!url) {
  console.error("DATABASE_URL is not set. Copy .env.example to .env first.");
  process.exit(1);
}

if (url.startsWith("file:")) {
  console.error(
    "DATABASE_URL is a local file. Use `npm run db:migrate` for that; this script is for hosted libSQL.",
  );
  process.exit(1);
}

if (!authToken) {
  console.error(
    "DATABASE_AUTH_TOKEN is not set. A hosted libSQL database needs a token; see .env.example.",
  );
  process.exit(1);
}

const MIGRATIONS_DIR = join(process.cwd(), "prisma", "migrations");
const TRACKING_TABLE = "_prisma_migrations";

const db = createClient({ url, authToken });

/**
 * Split a Prisma migration into statements. Prisma generates `-- comment` lines
 * and single-quoted defaults, so a naive `split(";")` would break on both.
 */
function splitStatements(sql) {
  const statements = [];
  let current = "";
  let inString = false;

  for (let i = 0; i < sql.length; i += 1) {
    const char = sql[i];

    if (inString) {
      current += char;

      if (char === "'") {
        if (sql[i + 1] === "'") {
          // Escaped quote inside a string literal.
          current += sql[i + 1];
          i += 1;
        } else {
          inString = false;
        }
      }

      continue;
    }

    if (char === "'") {
      inString = true;
      current += char;
      continue;
    }

    if (char === "-" && sql[i + 1] === "-") {
      while (i < sql.length && sql[i] !== "\n") i += 1;
      current += "\n";
      continue;
    }

    if (char === ";") {
      if (current.trim()) statements.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  if (current.trim()) statements.push(current.trim());

  return statements;
}

async function main() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS "${TRACKING_TABLE}" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "checksum" TEXT NOT NULL,
      "finished_at" DATETIME,
      "migration_name" TEXT NOT NULL,
      "logs" TEXT,
      "rolled_back_at" DATETIME,
      "started_at" DATETIME NOT NULL DEFAULT current_timestamp,
      "applied_steps_count" INTEGER UNSIGNED NOT NULL DEFAULT 0
    )
  `);

  const applied = await db.execute(
    `SELECT "migration_name" FROM "${TRACKING_TABLE}" WHERE "finished_at" IS NOT NULL`,
  );
  const appliedNames = new Set(applied.rows.map((row) => String(row.migration_name)));

  const entries = (await readdir(MIGRATIONS_DIR, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const pending = entries.filter((name) => !appliedNames.has(name));

  if (pending.length === 0) {
    console.log(`Up to date: ${entries.length} migrations already applied.`);
    return;
  }

  // A database with tables but no migration history was not built by this
  // script. Applying CREATE TABLE on top of it would fail halfway through, so
  // stop and let a human decide.
  const tables = await db.execute(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
  );
  const foreignTables = tables.rows
    .map((row) => String(row.name))
    .filter((name) => name !== TRACKING_TABLE);

  if (foreignTables.length > 0 && appliedNames.size === 0) {
    console.error(
      `This database already has tables (${foreignTables.slice(0, 6).join(", ")}) but no migration history. Refusing to apply on top of it.`,
    );
    process.exit(1);
  }

  console.log(
    `${checkOnly ? "Would apply" : "Applying"} ${pending.length} migration(s) to ${new URL(url).host}`,
  );

  for (const name of pending) {
    const sql = await readFile(join(MIGRATIONS_DIR, name, "migration.sql"), "utf8");
    const statements = splitStatements(sql);

    if (checkOnly) {
      console.log(`  would apply  ${name}  (${statements.length} statements)`);
      continue;
    }

    const checksum = createHash("sha256").update(sql).digest("hex");

    // libSQL runs a batch inside one transaction, so a broken migration leaves
    // the database exactly as it was rather than half-created.
    await db.batch(
      statements.map((statement) => ({ sql: statement, args: [] })),
      "write",
    );

    await db.execute({
      sql: `INSERT INTO "${TRACKING_TABLE}" ("id", "checksum", "finished_at", "migration_name", "applied_steps_count") VALUES (?, ?, ?, ?, ?)`,
      args: [randomUUID(), checksum, new Date().toISOString(), name, statements.length],
    });

    console.log(`  applied      ${name}  (${statements.length} statements)`);
  }

  if (!checkOnly) {
    const after = await db.execute(
      "SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
    );
    console.log(`Done. ${after.rows[0].n} tables in ${new URL(url).host}.`);
  }
}

try {
  await main();
} catch (error) {
  console.error(`Migration failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  db.close();
}
