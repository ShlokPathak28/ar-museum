"use server";

import { createHash } from "node:crypto";

import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { inspectPanorama, safePanoramaFilename } from "@/lib/panorama-upload";
import { revalidateMuseum } from "@/lib/revalidate";
import { checkRoomDeletion } from "@/lib/room-admin";
import { roomAdminSchema, type RoomAdminValues } from "@/lib/schemas";

export type SaveRoomResult =
  | { ok: true; id: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export type RoomMutationResult = { ok: true } | { ok: false; error: string };

export type MoveExhibitsResult =
  | { ok: true; moved: number }
  | { ok: false; error: string };

export type UploadPanoramaResult =
  | { ok: true; url: string; filename: string; size: number; width: number; height: number }
  | { ok: false; error: string };

const PANORAMA_PREFIX = "/api/panoramas/";

/** A blank optional field is stored as NULL, not as an empty string. */
function blankToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function duplicateMessage(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;

  const candidate = error as { code?: string; meta?: { target?: unknown } };
  if (candidate.code !== "P2002") return null;

  const target = Array.isArray(candidate.meta?.target)
    ? candidate.meta.target.join(",")
    : String(candidate.meta?.target ?? "");

  if (target.includes("slug")) return "That slug already belongs to another room.";
  return "That value is already used by another room.";
}

/**
 * Create or update a room. As with every Studio action, the form's validation
 * is a convenience: the same schema is parsed again here because the action is
 * a public endpoint.
 */
export async function saveRoom(
  input: { id?: string } & RoomAdminValues,
): Promise<SaveRoomResult> {
  await requireAdmin();

  const parsed = roomAdminSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};

    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }

    return { ok: false, error: "Check the highlighted fields.", fieldErrors };
  }

  const values = parsed.data;
  const panoramaUrl = blankToNull(values.panoramaUrl);
  const uploadedId = panoramaUrl?.startsWith(PANORAMA_PREFIX)
    ? panoramaUrl.slice(PANORAMA_PREFIX.length)
    : null;

  const previous = input.id
    ? await prisma.room.findUnique({
        where: { id: input.id },
        select: { slug: true, panorama: { select: { id: true } } },
      })
    : null;

  if (input.id && !previous) {
    return { ok: false, error: "That room no longer exists." };
  }

  // An uploaded panorama is only addressable through the room it belongs to,
  // so a pasted URL cannot point the viewer at another room's picture.
  if (uploadedId && previous?.panorama?.id !== uploadedId) {
    return {
      ok: false,
      error: "That panorama URL does not belong to this room. Upload it again.",
      fieldErrors: { panoramaUrl: "Upload the panorama again." },
    };
  }

  const data = {
    slug: values.slug,
    name: values.name,
    floor: values.floor,
    intro: blankToNull(values.intro),
    panoramaUrl,
    panoramaCredit: blankToNull(values.panoramaCredit),
  };

  try {
    const saved = input.id
      ? await prisma.room.update({ where: { id: input.id }, data, select: { id: true, slug: true } })
      : await prisma.room.create({ data, select: { id: true, slug: true } });

    // The field no longer points at the uploaded bytes, so they are unreachable
    // and only take space. After the update, so a rejected save never destroys
    // the image. The new URL, if any, was checked above.
    if (input.id && !uploadedId) {
      await prisma.roomPanorama
        .deleteMany({ where: { roomId: input.id } })
        .catch(() => undefined);
    }

    if (previous && previous.slug !== saved.slug) {
      revalidateMuseum({ roomSlug: previous.slug });
    }

    revalidateMuseum({ roomSlug: saved.slug });

    return { ok: true, id: saved.id };
  } catch (error) {
    return {
      ok: false,
      error: duplicateMessage(error) ?? "The room could not be saved. Try again.",
    };
  }
}

/**
 * Delete an empty room. The objects check and the write happen in one
 * transaction so a room cannot become occupied between the count and the
 * delete, and the cascade on `Exhibit.roomId` never runs.
 */
export async function deleteRoom(id: string): Promise<RoomMutationResult> {
  await requireAdmin();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const room = await tx.room.findUnique({
        where: { id },
        select: { id: true, name: true, slug: true },
      });

      if (!room) return { ok: false as const, error: "That room no longer exists." };

      const [roomCount, exhibitCount] = await Promise.all([
        tx.room.count(),
        tx.exhibit.count({ where: { roomId: id } }),
      ]);

      const check = checkRoomDeletion({ roomCount, exhibitCount, roomName: room.name });
      if (!check.ok) return { ok: false as const, error: check.error };

      await tx.room.delete({ where: { id } });
      return { ok: true as const, slug: room.slug };
    });

    if (!result.ok) return result;

    revalidateMuseum({ roomSlug: result.slug });
    return { ok: true };
  } catch {
    return { ok: false, error: "That room could not be deleted. Try again." };
  }
}

/**
 * Move one object into another room. `roomId` is required on an exhibit, so
 * this is also how an object leaves a room: there is no "unassigned" state.
 */
export async function moveExhibitToRoom(
  exhibitId: string,
  roomId: string,
): Promise<RoomMutationResult> {
  await requireAdmin();

  try {
    const moved = await prisma.$transaction(async (tx) => {
      const exhibit = await tx.exhibit.findUnique({
        where: { id: exhibitId },
        select: { slug: true, roomId: true, room: { select: { slug: true } } },
      });

      if (!exhibit) return { ok: false as const, error: "That object no longer exists." };

      const room = await tx.room.findUnique({
        where: { id: roomId },
        select: { slug: true },
      });

      if (!room) return { ok: false as const, error: "That room no longer exists." };

      if (exhibit.roomId === roomId) {
        return {
          ok: true as const,
          changed: false,
          slug: exhibit.slug,
          from: exhibit.room.slug,
          to: room.slug,
        };
      }

      await tx.exhibit.update({ where: { id: exhibitId }, data: { roomId } });

      return {
        ok: true as const,
        changed: true,
        slug: exhibit.slug,
        from: exhibit.room.slug,
        to: room.slug,
      };
    });

    if (!moved.ok) return moved;

    if (moved.changed) {
      revalidateMuseum({ slug: moved.slug, roomSlug: moved.from });
      revalidateMuseum({ roomSlug: moved.to });
    }

    return { ok: true };
  } catch {
    return { ok: false, error: "That object could not be moved. Try again." };
  }
}

/**
 * Move a batch from the room page. One transaction and one revalidation pass,
 * so a half-applied list is not a state the public pages can see.
 */
export async function moveExhibitsToRoom(
  exhibitIds: string[],
  roomId: string,
): Promise<MoveExhibitsResult> {
  await requireAdmin();

  const ids = Array.from(new Set(exhibitIds.map((id) => id.trim()).filter(Boolean))).slice(0, 100);

  if (ids.length === 0) {
    return { ok: false, error: "Tick at least one object to move." };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const room = await tx.room.findUnique({ where: { id: roomId }, select: { slug: true } });
      if (!room) return { ok: false as const, error: "That room no longer exists." };

      const exhibits = await tx.exhibit.findMany({
        where: { id: { in: ids }, roomId: { not: roomId } },
        select: { id: true, slug: true, room: { select: { slug: true } } },
      });

      if (exhibits.length === 0) {
        return { ok: false as const, error: "Those objects are already in this room." };
      }

      await tx.exhibit.updateMany({
        where: { id: { in: exhibits.map((exhibit) => exhibit.id) } },
        data: { roomId },
      });

      return {
        ok: true as const,
        slugs: exhibits.map((exhibit) => exhibit.slug),
        from: Array.from(new Set(exhibits.map((exhibit) => exhibit.room.slug))),
        to: room.slug,
      };
    });

    if (!result.ok) return result;

    for (const slug of result.slugs) {
      revalidateMuseum({ slug });
    }
    for (const from of result.from) {
      revalidateMuseum({ roomSlug: from });
    }
    revalidateMuseum({ roomSlug: result.to });

    return { ok: true, moved: result.slugs.length };
  } catch {
    return { ok: false, error: "Those objects could not be moved. Try again." };
  }
}

/**
 * Store a panorama the admin chose, attached to the room that will show it.
 *
 * Same reasoning as `uploadModel`: the deployed filesystem is read-only, so the
 * bytes are a row, and the room's `panoramaUrl` is swapped in the same
 * transaction so the public page can never point at a half-written image. The
 * id changes on every upload, which is what makes the immutable cache header on
 * `/api/panoramas/[id]` honest.
 */
export async function uploadPanorama(formData: FormData): Promise<UploadPanoramaResult> {
  await requireAdmin();

  const roomId = String(formData.get("roomId") ?? "").trim();
  const file = formData.get("file");

  if (roomId === "") {
    return { ok: false, error: "Save the room once, then upload its panorama." };
  }

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose a WebP or JPEG panorama first." };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const inspection = inspectPanorama(file.name, bytes);

  if (!inspection.ok) {
    return { ok: false, error: inspection.error };
  }

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { slug: true },
  });

  if (!room) return { ok: false, error: "That room no longer exists." };

  const filename = safePanoramaFilename(file.name);
  const sha256 = createHash("sha256").update(bytes).digest("hex");

  try {
    const asset = await prisma.$transaction(async (tx) => {
      await tx.roomPanorama.deleteMany({ where: { roomId } });

      const created = await tx.roomPanorama.create({
        data: {
          filename,
          mimeType: inspection.mimeType,
          size: bytes.byteLength,
          sha256,
          width: inspection.width,
          height: inspection.height,
          bytes,
          roomId,
        },
        select: { id: true },
      });

      await tx.room.update({
        where: { id: roomId },
        data: { panoramaUrl: `${PANORAMA_PREFIX}${created.id}` },
      });

      return created;
    });

    revalidateMuseum({ roomSlug: room.slug });

    return {
      ok: true,
      url: `${PANORAMA_PREFIX}${asset.id}`,
      filename,
      size: bytes.byteLength,
      width: inspection.width,
      height: inspection.height,
    };
  } catch {
    return { ok: false, error: "The panorama could not be stored. Try again." };
  }
}
