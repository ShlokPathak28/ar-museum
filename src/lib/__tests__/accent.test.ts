import { describe, expect, it } from "vitest";

import { ACCENTS, accentForTags } from "@/lib/accent";

/**
 * The accent is decoration, but it is also the only place a material shows up
 * on a card. The order of the checks matters: "terracotta" wins over a generic
 * "clay" tag so a fired object keeps its own colour.
 */
describe("accentForTags", () => {
  it.each([
    ["terracotta, clay", ACCENTS.clay],
    ["brass, bidri", ACCENTS.brass],
    ["metal, inlaid", ACCENTS.brass],
    ["textile, dye", ACCENTS.madder],
    ["painting", ACCENTS.madder],
    ["wood, inlay", ACCENTS.umber],
    ["bone, ivory", ACCENTS.bone],
  ])("maps %s to %s", (tags, expected) => {
    expect(accentForTags(tags)).toEqual(expected);
  });

  it("is case-insensitive", () => {
    expect(accentForTags("TERRACOTTA")).toEqual(ACCENTS.clay);
    expect(accentForTags("Brass")).toEqual(ACCENTS.brass);
  });

  it("prefers terracotta when several materials are listed", () => {
    expect(accentForTags("terracotta, brass, wood")).toEqual(ACCENTS.clay);
  });

  it("falls back to bone for an empty or unknown tag string", () => {
    expect(accentForTags("")).toEqual(ACCENTS.bone);
    expect(accentForTags("stone")).toEqual(ACCENTS.bone);
  });

  it("gives every accent a distinct colour", () => {
    const colours = Object.values(ACCENTS).map((accent) => accent.color);
    expect(new Set(colours).size).toBe(colours.length);
  });
});
