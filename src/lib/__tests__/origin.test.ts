import { describe, expect, it } from "vitest";

import { resolveOrigin } from "@/lib/origin";
import { siteUrl } from "@/lib/site";

const headers = (values: Record<string, string>) => ({
  get: (name: string) => values[name] ?? null,
});

/**
 * QR cards, the redirect behind them and `/markers` must name one origin.
 * `request.url` is normalised to the dev server's own address, so the Host
 * header is what the phone actually typed — and the scheme cannot come from
 * local headers at all.
 */
describe("resolveOrigin", () => {
  const scheme = new URL(siteUrl).protocol.replace(":", "");

  it("falls back to the canonical site URL when there is no Host", () => {
    expect(resolveOrigin(headers({}))).toBe(siteUrl);
  });

  it("keeps the host the visitor used, with the configured scheme", () => {
    expect(resolveOrigin(headers({ host: "10.1.2.3:3000" }))).toBe(`${scheme}://10.1.2.3:3000`);
  });

  it("lets a proxy's forwarded host and protocol win", () => {
    expect(
      resolveOrigin(
        headers({
          host: "internal:3000",
          "x-forwarded-host": "museum.example",
          "x-forwarded-proto": "https",
        }),
      ),
    ).toBe("https://museum.example");
  });

  it("takes the first value of a forwarded proto list", () => {
    expect(
      resolveOrigin(headers({ host: "museum.example", "x-forwarded-proto": "https, http" })),
    ).toBe("https://museum.example");
  });

  it("ignores a blank forwarded protocol", () => {
    expect(resolveOrigin(headers({ host: "museum.example", "x-forwarded-proto": "  " }))).toBe(
      `${scheme}://museum.example`,
    );
  });
});
