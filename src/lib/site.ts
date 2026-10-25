/**
 * Canonical public origin. Used for metadata, JSON-LD, sitemap and robots, so
 * every absolute URL the site emits agrees with the others.
 *
 * Set `NEXT_PUBLIC_SITE_URL` in `.env` when testing from a phone (see
 * `docs/HTTPS.md`); production sets it to the deployed origin.
 */
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);

export const siteName = "Dharohar";
export const siteDescription =
  "Scan an exhibit, hear its history, inspect it in 3D, place it in your room with AR, and walk the gallery in 360°.";

/** Absolute URL for a path, so JSON-LD and OG tags never emit relative images. */
export function absoluteUrl(path: string): string {
  return path.startsWith("http") ? path : `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}
