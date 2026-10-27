/**
 * One accent per material, used only on object cards. Hovering a card pulls the
 * wall toward that material's colour; the page itself stays ink and oxblood.
 */
export type Accent = {
  name: string;
  color: string;
  wash: string;
};

export const ACCENTS: Record<string, Accent> = {
  clay: { name: "clay", color: "#a8532f", wash: "rgba(168, 83, 47, 0.12)" },
  brass: { name: "brass", color: "#8a6c2b", wash: "rgba(154, 123, 51, 0.14)" },
  madder: { name: "madder", color: "#7a1f1a", wash: "rgba(122, 31, 26, 0.10)" },
  umber: { name: "umber", color: "#6b4a2f", wash: "rgba(107, 74, 47, 0.12)" },
  bone: { name: "bone", color: "#7c7462", wash: "rgba(124, 116, 98, 0.12)" },
};

/** Tags are the only material hint the schema carries, so they drive the accent. */
export function accentForTags(tags: string): Accent {
  const value = tags.toLowerCase();

  if (value.includes("terracotta")) return ACCENTS.clay;
  if (value.includes("brass") || value.includes("bidri") || value.includes("metal")) return ACCENTS.brass;
  if (value.includes("textile") || value.includes("painting") || value.includes("dye")) return ACCENTS.madder;
  if (value.includes("wood") || value.includes("inlay")) return ACCENTS.umber;

  return ACCENTS.bone;
}
