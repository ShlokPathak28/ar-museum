import { describe, expect, it } from "vitest";

import { parseMailFrom } from "@/lib/mail-from";

/**
 * `MAIL_FROM` is a single free-text setting, but SendGrid wants an address and
 * an optional name in separate fields. These are the shapes people actually put
 * in the variable, including the one that must not silently become a bad API
 * request.
 */
describe("parseMailFrom", () => {
  it("accepts a bare address with no display name", () => {
    expect(parseMailFrom("hello@example.com")).toEqual({
      email: "hello@example.com",
      name: "",
    });
  });

  it("splits a friendly name from the address", () => {
    expect(parseMailFrom("Dharohar <hello@example.com>")).toEqual({
      email: "hello@example.com",
      name: "Dharohar",
    });
  });

  it("unquotes a display name", () => {
    expect(parseMailFrom('"Dharohar Museum" <hello@example.com>')).toEqual({
      email: "hello@example.com",
      name: "Dharohar Museum",
    });
  });

  it("trims surrounding whitespace", () => {
    expect(parseMailFrom("  Dharohar <hello@example.com>  ")).toEqual({
      email: "hello@example.com",
      name: "Dharohar",
    });
  });

  it.each(["", "not-an-address", "Dharohar <>", "hello@example.com, other@example.com"])(
    "rejects %s instead of sending a malformed request",
    (raw) => {
      expect(() => parseMailFrom(raw)).toThrow(/MAIL_FROM/);
    },
  );
});
