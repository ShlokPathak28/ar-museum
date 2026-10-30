/**
 * The rules that stop a room edit from emptying the museum.
 *
 * Pure and separate from the Server Action for the same reason as
 * `user-admin.ts`: the page can explain the rule, the action can enforce it,
 * and a test can prove both agree without a database.
 *
 * `Exhibit.roomId` is required and cascades, so "delete this room" would take
 * its objects — and their reviews, stamps and hotspots — with it. Deleting the
 * last room is the other dead end: with no rooms there is nowhere to put an
 * object, and `/studio/exhibits/new` can only tell the admin to run the seed.
 */

export type RoomDeletionCheck = { ok: true } | { ok: false; error: string };

export function checkRoomDeletion(input: {
  roomCount: number;
  exhibitCount: number;
  roomName: string;
}): RoomDeletionCheck {
  if (input.roomCount <= 1) {
    return {
      ok: false,
      error: "The museum needs at least one room. Create another room before deleting this one.",
    };
  }

  if (input.exhibitCount > 0) {
    const objects = input.exhibitCount === 1 ? "object" : "objects";
    return {
      ok: false,
      error: `“${input.roomName}” still holds ${input.exhibitCount} ${objects}. Move them to another room first.`,
    };
  }

  return { ok: true };
}
