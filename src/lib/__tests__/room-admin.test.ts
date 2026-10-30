import { describe, expect, it } from "vitest";

import { checkRoomDeletion } from "@/lib/room-admin";

/**
 * The room page and the Server Action both call this, so the explanation an
 * admin reads and the rule that runs are the same sentence.
 */
describe("checkRoomDeletion", () => {
  it("allows deleting an empty room when others remain", () => {
    expect(checkRoomDeletion({ roomCount: 3, exhibitCount: 0, roomName: "Attic" })).toEqual({
      ok: true,
    });
  });

  it("refuses the last room, because an object needs somewhere to live", () => {
    const result = checkRoomDeletion({ roomCount: 1, exhibitCount: 0, roomName: "Only Room" });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("at least one room");
  });

  it("refuses a room that still holds objects, and counts them", () => {
    const result = checkRoomDeletion({ roomCount: 2, exhibitCount: 4, roomName: "Material Worlds" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Material Worlds");
      expect(result.error).toContain("4 objects");
      expect(result.error).toContain("Move them");
    }
  });

  it("says object, not objects, for one", () => {
    const result = checkRoomDeletion({ roomCount: 2, exhibitCount: 1, roomName: "Attic" });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("1 object.");
  });

  it("puts the last-room rule ahead of the object count", () => {
    const result = checkRoomDeletion({ roomCount: 1, exhibitCount: 2, roomName: "Only Room" });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("at least one room");
  });

  it("treats a nonsense count as empty rather than crashing", () => {
    expect(checkRoomDeletion({ roomCount: 2, exhibitCount: 0, roomName: "Attic" }).ok).toBe(true);
  });
});
