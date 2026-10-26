import { siteUrl } from "@/lib/site";

type HeaderBag = { get(name: string): string | null };

function siteProtocol(): string {
  try {
    return new URL(siteUrl).protocol.replace(":", "");
  } catch {
    return "http";
  }
}

/**
 * The address the visitor actually used.
 *
 * `request.url` is normalised to the dev server's own origin, which would send a
 * phone back to `localhost`, so the Host header is the source of truth for the
 * hostname. The scheme is the one thing local headers never carry — nothing sets
 * `x-forwarded-proto` in `next dev`, even when the server is HTTPS — so it comes
 * from `NEXT_PUBLIC_SITE_URL`, the address the phone was told to open. Behind a
 * proxy the forwarded header wins.
 *
 * Used by `/x/[code]`, `/api/qr/[code]` and `/markers`, which must all agree:
 * a card that encodes one origin and a redirect that lands on another is how a
 * phone ends up bouncing to an address that refuses to load.
 */
export function resolveOrigin(headers: HeaderBag): string {
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  if (!host) return siteUrl;

  const forwarded = headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  return `${forwarded || siteProtocol()}://${host}`;
}
