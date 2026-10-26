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
  databaseAdapter: prismaAdapter(prisma, { provider: "sqlite" }),
  plugins: [jwt(), nextCookies()],
  // Week 2 asks for verbose logging so the team can see session/user ops in
  // dev. Better Auth has no "silent" level, so the logger is only configured
  // when there is a secret (i.e. a real auth environment).
  ...(env.BETTER_AUTH_SECRET ? { logger: { level: "info" as const } } : {}),
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
