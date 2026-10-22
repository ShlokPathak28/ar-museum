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

  return new PrismaClient({ adapter: new PrismaLibSql({ url }) });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
