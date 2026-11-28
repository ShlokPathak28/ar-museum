import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";

import { nextCookies } from "@/lib/better-auth-next-js.mjs";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { sendPasswordResetEmail } from "@/lib/password-reset";
import { MIN_PASSWORD_LENGTH } from "@/lib/schemas";

/**
 * Server-side auth instance. Uses the app's single Prisma client (libSQL
 * adapter) so sessions and exhibit data share one connection pool.
 *
 * The session cookie is set through `nextCookies()`, which is why the plugin
 * has to be last in the list.
 */
export const auth = betterAuth({
  // The option is `database`, not `databaseAdapter`. A wrong key is silently
  // ignored and Better Auth falls back to an in-memory store, so sign-up
  // appears to work and nothing is ever written to SQLite.
  database: prismaAdapter(prisma, { provider: "sqlite" }),
  // `nextCookies()` must stay last: it forwards Set-Cookie from Better Auth to
  // Next's cookie store.
  plugins: [nextCookies()],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: MIN_PASSWORD_LENGTH,
    // Signing up also signs you in; the visitor lands back on the site.
    autoSignIn: true,
    // A reset link is valid for an hour and exactly once. Better Auth stores the
    // token as a Verification row and consumes it inside the same transaction
    // as the password write, so a failed reset can be retried with the same
    // link but a successful one cannot be replayed.
    resetPasswordTokenExpiresIn: 60 * 60,
    // Changing a password logs out every other device. A visitor who reset
    // because someone else had their password should not leave that session
    // alive.
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url, token }) => {
      await sendPasswordResetEmail({ user, url, token });
    },
  },
  // Verbose session logging in dev only; there is no "silent" level, so the
  // logger is omitted entirely when no secret is configured.
  ...(env.BETTER_AUTH_SECRET ? { logger: { level: "info" as const } } : {}),
  secret: env.BETTER_AUTH_SECRET ?? undefined,
  // The dev server answers on localhost and on whichever LAN address the phone
  // used; both must be accepted or sign-in fails the CSRF origin check. The LAN
  // hosts come from the same list next.config.ts allows.
  trustedOrigins: [
    env.NEXT_PUBLIC_SITE_URL,
    ...(env.DEV_ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((host) => host.trim())
      .filter(Boolean)
      .flatMap((host) => [`http://${host}:3000`, `https://${host}:3000`]),
    "http://localhost:3000",
    "https://localhost:3000",
    "http://127.0.0.1:3000",
    "https://127.0.0.1:3000",
  ],
  user: {
    // The app's public field for a display name is already `name`.
    fields: { name: "name" },
    additionalFields: {
      // Existing column on User. `input: false` means a visitor cannot promote
      // themselves by posting `role` to the sign-up endpoint.
      role: { type: "string", required: false, defaultValue: "VISITOR", input: false },
    },
  },
  session: {
    // A museum visit lasts an afternoon; a week keeps a demo account usable.
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  trustInternalToken: true,
});
