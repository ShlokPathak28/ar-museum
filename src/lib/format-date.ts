/**
 * Fixed locale and time zone: the same string is rendered on the server and in
 * the browser, so a review date cannot cause a hydration mismatch. Kolkata is
 * the museum's local day, not the server's or the visitor's.
 */
const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

export function formatDate(value: Date | string): string {
  return dateFormat.format(typeof value === "string" ? new Date(value) : value);
}
