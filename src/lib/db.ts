import "server-only";

import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Prisma 7 requires a driver adapter. libSQL is SQLite under the hood:
 * same `.db` file, same SQL dialect — only the driver differs, so no native
 * build tools are needed on Windows.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and run `npm run db:migrate`.",
    );
  }

  // A local `file:` database needs nothing else. Hosted libSQL (Turso) needs a
  // token, which we pass only when it is configured — never as an empty string,
  // because Turso treats a present-but-empty token as a bad credential.
  const authToken = process.env.DATABASE_AUTH_TOKEN;

  return new PrismaClient({
    adapter: new PrismaLibSql(authToken ? { url, authToken } : { url }),
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
