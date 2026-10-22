/**
 * Starts Prisma Studio against the local SQLite file.
 *
 * Why this exists:
 * 1. Prisma Studio 7.10.1 rejects relative SQLite URLs (`file:./prisma/dev.db`)
 *    with "not supported for the file:./... protocol". An absolute `file:///`
 *    URL works.
 * 2. pathToFileURL() percent-encodes spaces (%20), and Studio does not decode
 *    them — and this project lives under a path containing a space.
 * 3. Spawning `npx.cmd` throws EINVAL on modern Node, so we run the Prisma CLI
 *    with the current Node binary instead.
 *
 * Usage: npm run db:studio  [-- --port 5556 --browser none]
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const dbPath = resolve(process.cwd(), "prisma", "dev.db");
const posix = dbPath.replaceAll("\\", "/");
const url = posix.startsWith("/") ? `file://${posix}` : `file:///${posix}`;

const cli = resolve(process.cwd(), "node_modules", "prisma", "build", "index.js");
if (!existsSync(cli)) {
  console.error("Prisma CLI not found. Run `npm install` first.");
  process.exit(1);
}

console.log(`Prisma Studio → ${dbPath}`);

const child = spawn(
  process.execPath,
  [cli, "studio", "--url", url, ...process.argv.slice(2)],
  { stdio: "inherit" },
);

child.on("exit", (code) => process.exit(code ?? 0));
