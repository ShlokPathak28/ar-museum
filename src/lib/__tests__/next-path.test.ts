import { describe, expect, it } from "vitest";

import { safeNextPath, withNext } from "@/lib/next-path";

/**
 * `?next=` is attacker-controlled and lands in `router.push`. A regression here
 * is an open redirect, so the cases below are the contract, not samples.
 */
describe("safeNextPath", () => {
  it.each([undefined, null, "", "   "])("falls back to home for %s", (raw) => {
    // A bare space is not a path either; it must not survive as a relative URL.
    expect(safeNextPath(raw as string)).toBe("/");
  });

  it.each(["/", "/passport", "/studio", "/exhibits/bidri-hookah-base", "/passport?tab=reviews"])(
    "keeps the same-origin path %s",
    (raw) => {
      expect(safeNextPath(raw)).toBe(raw);
    },
  );

  it.each([
    "https://evil.example",
    "http://localhost:3000/passport",
    "javascript:alert(1)",
    "//evil.example",
    "///evil.example",
    "\\\\evil.example\\share",
    "/\\evil.example",
  ])("rejects the off-site value %s", (raw) => {
    expect(safeNextPath(raw)).toBe("/");
  });

  it.each(["/login", "/login?next=/passport", "/register", "/register?x=1", "/loginx"])(
    "sends auth pages home to avoid a loop: %s",
    (raw) => {
      // `/loginx` is a different page; only the two auth routes are absorbed.
      expect(safeNextPath(raw)).toBe(raw.startsWith("/loginx") ? raw : "/");
    },
  );
});

describe("withNext", () => {
  it("leaves the path alone when there is nowhere to go back to", () => {
    expect(withNext("/login", "/")).toBe("/login");
  });

  it("encodes the destination so a query string survives the trip", () => {
    expect(withNext("/login", "/studio/exhibits?tab=drafts")).toBe(
      "/login?next=%2Fstudio%2Fexhibits%3Ftab%3Ddrafts",
    );
  });
});
