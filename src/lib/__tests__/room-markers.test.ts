import { describe, expect, it } from "vitest";

import { ROOM_MARKERS } from "@/lib/room-markers";

/**
 * Bearings are guessed from the stand-in panoramas, so they will move to the
 * database later. Until then these invariants keep a marker from landing behind
 * the visitor or off the edge of the image.
 */
describe("ROOM_MARKERS", () => {
  const rooms = Object.entries(ROOM_MARKERS);

  it("has a marker set for both seeded rooms", () => {
    expect(Object.keys(ROOM_MARKERS).sort()).toEqual(["everyday-objects", "material-worlds"]);
  });

  it.each(rooms)("keeps every %s bearing inside the image", (_room, markers) => {
    expect(markers.length).toBeGreaterThan(0);
    for (const marker of markers) {
      expect(marker.u).toBeGreaterThanOrEqual(0);
      expect(marker.u).toBeLessThanOrEqual(1);
      expect(marker.v).toBeGreaterThanOrEqual(0);
      expect(marker.v).toBeLessThanOrEqual(1);
    }
  });

  it.each(rooms)("does not repeat a code within %s", (_room, markers) => {
    const codes = markers.map((marker) => marker.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("uses the same code format as the printed cards", () => {
    for (const markers of Object.values(ROOM_MARKERS)) {
      for (const marker of markers) {
        expect(marker.code).toMatch(/^[A-Z]{2}\d{2}$/);
      }
    }
  });
});
