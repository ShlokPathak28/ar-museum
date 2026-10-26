/**
 * Only same-origin paths may be used as a post-sign-in destination. Anything
 * that looks like a protocol-relative URL (`//evil.example`) or a Windows path
 * falls back to the home page, so `?next=` cannot become an open redirect.
 */
export function safeNextPath(raw: string | undefined | null): string {
  if (!raw) return "/";
  if (!raw.startsWith("/")) return "/";
  if (raw.startsWith("//") || raw.includes("\\")) return "/";
  // A signed-in visitor who lands on /login?next=/login would bounce between
  // the two auth pages forever; auth pages always resolve to home.
  if (/^\/(login|register)(\/|\?|$)/.test(raw)) return "/";
  return raw;
}

/** Appends `?next=` only when there is somewhere to go back to. */
export function withNext(path: string, next: string): string {
  return next === "/" ? path : `${path}?next=${encodeURIComponent(next)}`;
}
