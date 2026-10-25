import { PrismaClient } from "@/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { jwt } from "better-auth/plugins";
import { nextCookies } from "@/lib/better-auth-next-js.mjs";
import { env } from "@/lib/env";

const prisma = new PrismaClient({
  adapter: new PrismaLibSql({ url: env.DATABASE_URL }),
});

export const auth = betterAuth({
  databaseAdapter: prismaAdapter(prisma, {
    // better-auth expects the timestamp column as `updated_at`; our Prisma
    // schema names it `updatedAt` and the generated client still exposes that
    // camelCase field, so map the expected column name to it.
    map: { updated_at: "updatedAt" },
  }),
  plugins: [jwt(), nextCookies],
  // Week 2 asks for verbose logging so the team can see session/user ops in
  // dev. Keep it silent in production, or when there is no auth secret yet.
  logger: {
    level: env.BETTER_AUTH_SECRET ? "info" : "silent",
  },
  user: {
    // Match the app convention: the public-facing name lives on `name`.
    fields: { name: "name" },
  },
  secret: env.BETTER_AUTH_SECRET ?? undefined,
  trustInternalToken: true,
});

// Wire the Next.js cookie integration. This must be attached after creation so
// the module can lazily load `next/headers` only during real requests.
// Re-export a stable Prisma client for server code that does not need auth
// (exhibit lists, QR handlers, and so on). It shares the same adapter URL but
// is intentionally a separate instance from the auth DB so auth and app code
// never accidentally share transaction state.
export const appPrisma = prisma;
