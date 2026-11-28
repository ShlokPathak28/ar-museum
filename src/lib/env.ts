import "server-only";

import { z } from "zod";

/**
 * Server-side environment validation. Fails fast at boot instead of
 * exploding halfway through a request.
 *
 * Never import this from a client component — it contains secrets.
 */
const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  BETTER_AUTH_SECRET: z.string().min(32).optional(),
  BETTER_AUTH_URL: z.string().url().optional(),
  // Comma-separated LAN hosts the dev server answers on (no scheme, no port).
  DEV_ALLOWED_ORIGINS: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  // Password-reset mail. Both are optional: without them the reset page says so
  // instead of accepting a request whose email can never arrive. SendGrid is used
  // through `fetch`, so no mail package joins the bundle.
  SENDGRID_API_KEY: z.string().trim().optional(),
  MAIL_FROM: z.string().trim().optional(),
});

const parsed = serverEnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables — see .env.example");
}

export const env = parsed.data;
