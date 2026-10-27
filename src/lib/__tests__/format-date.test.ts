import { describe, expect, it } from "vitest";

import { formatDate } from "@/lib/format-date";

/**
 * One fixed locale and time zone: the server and the browser must print the
 * same string, or React hydrates a different date than it rendered.
 */
describe("formatDate", () => {
  it("prints an en-GB day, month and year", () => {
    expect(formatDate(new Date("2026-10-27T12:00:00Z"))).toBe("27 Oct 2026");
  });

  it("reads ISO strings as the same instant as a Date", () => {
    expect(formatDate("2026-10-27T12:00:00.000Z")).toBe(formatDate(new Date("2026-10-27T12:00:00.000Z")));
  });

  it("uses the museum's Kolkata day, not UTC", () => {
    // 20:30 UTC is already 02:00 the next morning in Kolkata (+05:30).
    expect(formatDate("2026-10-27T20:30:00Z")).toBe("28 Oct 2026");
    // And 18:00 UTC is still the same day there.
    expect(formatDate("2026-10-27T18:00:00Z")).toBe("27 Oct 2026");
  });
});
