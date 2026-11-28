/**
 * Parse the one `MAIL_FROM` setting into the `{ email, name }` shape SendGrid
 * expects. Kept pure (no `server-only`, no env) so the parser can be tested
 * without booting a server — a malformed header is the easiest way to send a
 * request SendGrid refuses.
 */
export function parseMailFrom(raw: string): { email: string; name: string } {
  const trimmed = raw.trim();
  const header = trimmed.match(/^(?:(.+?)\s*)?<([^<>]+)>$/);

  if (header) {
    return {
      name: (header[1] ?? "").trim().replace(/^"|"$/g, ""),
      email: header[2]!.trim(),
    };
  }

  if (/^[^\s<>@]+@[^\s<>@]+$/.test(trimmed)) {
    return { email: trimmed, name: "" };
  }

  throw new Error('MAIL_FROM must be an email address or a "Name <email>" header.');
}
