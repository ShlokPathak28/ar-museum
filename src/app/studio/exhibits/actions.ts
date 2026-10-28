"use server";

import { createHash } from "node:crypto";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { inspectGlb, safeFilename } from "@/lib/model-upload";
import { revalidateMuseum } from "@/lib/revalidate";
import { exhibitAdminSchema, type ExhibitAdminValues } from "@/lib/schemas";

export type SaveExhibitResult =
  | { ok: true; id: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export type ExhibitMutationResult = { ok: true } | { ok: false; error: string };

export type UploadModelResult =
  | { ok: true; url: string; filename: string; size: number; draco: boolean }
  | { ok: false; error: string };

export type ModelCreditResult = { ok: true } | { ok: false; error: string };

const MODEL_PREFIX = "/api/models/";

/** A blank optional field is stored as NULL, not as an empty string. */
function blankToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/** The facts textarea is one fact per line; the column is a JSON string[]. */
function parseFacts(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseYear(value: string): number | null {
  return value.trim() === "" ? null : Number(value);
}

function parseTags(value: string): string {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .join(",");
}

function duplicateMessage(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;

  const candidate = error as { code?: string; meta?: { target?: unknown } };
  if (candidate.code !== "P2002") return null;

  const target = Array.isArray(candidate.meta?.target)
    ? candidate.meta.target.join(",")
    : String(candidate.meta?.target ?? "");

  if (target.includes("code")) return "That short code is already printed on another card.";
  if (target.includes("slug")) return "That slug already belongs to another exhibit.";
  return "That value is already used by another exhibit.";
}

/**
 * Create or update an exhibit. Every rule is re-checked here: the form's
 * validation is only a convenience, and this action is reachable without it.
 */
export async function saveExhibit(
  input: { id?: string } & ExhibitAdminValues,
): Promise<SaveExhibitResult> {
  await requireAdmin();

  const parsed = exhibitAdminSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};

    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }

    return { ok: false, error: "Check the highlighted fields.", fieldErrors };
  }

  const values = parsed.data;
  const modelUrl = blankToNull(values.modelUrl);
  const uploadedId = modelUrl?.startsWith(MODEL_PREFIX)
    ? modelUrl.slice(MODEL_PREFIX.length)
    : null;

  if (input.id) {
    const exists = await prisma.exhibit.findUnique({
      where: { id: input.id },
      select: { id: true },
    });

    if (!exists) return { ok: false, error: "That exhibit no longer exists." };
  }

  // An uploaded model is only addressable through the exhibit it belongs to.
  // Without this check a typo would point the viewer at another object's scan,
  // or at nothing at all, and the page would only fail in the browser.
  if (uploadedId) {
    const asset = input.id
      ? await prisma.modelAsset.findUnique({
          where: { exhibitId: input.id },
          select: { id: true },
        })
      : null;

    if (!asset || asset.id !== uploadedId) {
      return {
        ok: false,
        error: "That model URL does not belong to this exhibit. Upload the model again.",
        fieldErrors: { modelUrl: "Upload the model again." },
      };
    }
  }

  const previous = input.id
    ? await prisma.exhibit.findUnique({
        where: { id: input.id },
        select: { slug: true, room: { select: { slug: true } } },
      })
    : null;

  const data = {
    slug: values.slug,
    code: values.code.toUpperCase(),
    title: values.title,
    subtitle: blankToNull(values.subtitle),
    era: values.era,
    yearStart: parseYear(values.yearStart),
    yearEnd: parseYear(values.yearEnd),
    roomId: values.roomId,
    summary: values.summary,
    body: values.body,
    facts: JSON.stringify(parseFacts(values.facts)),
    tags: parseTags(values.tags),
    heroImage: values.heroImage,
    modelUrl,
    modelUsdz: blankToNull(values.modelUsdz),
    status: values.status,
  };

  try {
    const saved = input.id
      ? await prisma.exhibit.update({
          where: { id: input.id },
          data,
          select: { id: true, slug: true, room: { select: { slug: true } } },
        })
      : await prisma.exhibit.create({
          data,
          select: { id: true, slug: true, room: { select: { slug: true } } },
        });

    // If the slug or room moved, the old URLs are still cached.
    if (previous && previous.slug !== saved.slug) {
      revalidateMuseum({ slug: previous.slug, roomSlug: previous.room.slug });
    }

    if (previous && previous.room.slug !== saved.room.slug) {
      revalidateMuseum({ roomSlug: previous.room.slug });
    }

    // The field now points at a repository path (or nowhere), so the uploaded
    // bytes are no longer reachable and would only take space in the database.
    // After the update, so a rejected save never destroys the file.
    if (input.id && !uploadedId) {
      await prisma.modelAsset
        .deleteMany({ where: { exhibitId: input.id } })
        .catch(() => undefined);
    }

    revalidateMuseum({ slug: saved.slug, roomSlug: saved.room.slug });

    return { ok: true, id: saved.id };
  } catch (error) {
    return {
      ok: false,
      error: duplicateMessage(error) ?? "The exhibit could not be saved. Try again.",
    };
  }
}

/**
 * Store a model the admin chose, attached to the exhibit that will use it.
 *
 * The bytes go into the database because the deployed filesystem is read-only
 * (see `ModelAsset` in the schema). The exhibit's `modelUrl` is updated in the
 * same transaction, so the public page can never point at a model that was
 * deleted or half-written — and a replacement upload gets a new id, which is
 * what makes the immutable cache header on `/api/models/[id]` honest.
 *
 * The client is a convenience: everything below is re-checked here, including
 * the file's own header bytes, because this action is a public endpoint.
 */
export async function uploadModel(formData: FormData): Promise<UploadModelResult> {
  await requireAdmin();

  const exhibitId = String(formData.get("exhibitId") ?? "").trim();
  const credit = String(formData.get("credit") ?? "").trim().slice(0, 200);
  const file = formData.get("file");

  if (exhibitId === "") {
    return { ok: false, error: "Save the exhibit once, then upload its model." };
  }

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose a .glb file first." };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const inspection = inspectGlb(file.name, bytes);

  if (!inspection.ok) {
    return { ok: false, error: inspection.error };
  }

  const exhibit = await prisma.exhibit.findUnique({
    where: { id: exhibitId },
    select: { slug: true, room: { select: { slug: true } } },
  });

  if (!exhibit) return { ok: false, error: "That exhibit no longer exists." };

  const filename = safeFilename(file.name);
  const sha256 = createHash("sha256").update(bytes).digest("hex");

  try {
    const asset = await prisma.$transaction(async (tx) => {
      await tx.modelAsset.deleteMany({ where: { exhibitId } });

      const created = await tx.modelAsset.create({
        data: {
          filename,
          mimeType: "model/gltf-binary",
          size: bytes.byteLength,
          sha256,
          draco: inspection.draco,
          credit: credit === "" ? null : credit,
          bytes,
          exhibitId,
        },
        select: { id: true },
      });

      await tx.exhibit.update({
        where: { id: exhibitId },
        data: { modelUrl: `${MODEL_PREFIX}${created.id}` },
      });

      return created;
    });

    revalidateMuseum({ slug: exhibit.slug, roomSlug: exhibit.room.slug });

    return {
      ok: true,
      url: `${MODEL_PREFIX}${asset.id}`,
      filename,
      size: bytes.byteLength,
      draco: inspection.draco,
    };
  } catch {
    return { ok: false, error: "The model could not be stored. Try again." };
  }
}

/**
 * Correct the source line on an upload without replacing the file.
 *
 * The credit is what `/credits` answers a licence question from, so it should
 * not require re-uploading 4 MB of bytes to fix a typo. An empty value clears
 * it, which the page then flags rather than hiding.
 */
export async function updateModelCredit(input: {
  exhibitId: string;
  credit: string;
}): Promise<ModelCreditResult> {
  await requireAdmin();

  const credit = input.credit.trim().slice(0, 200);

  const asset = await prisma.modelAsset.findUnique({
    where: { exhibitId: input.exhibitId },
    select: {
      id: true,
      exhibit: { select: { slug: true, room: { select: { slug: true } } } },
    },
  });

  if (!asset) {
    return { ok: false, error: "Upload a model first, then record its source." };
  }

  try {
    await prisma.modelAsset.update({
      where: { id: asset.id },
      data: { credit: credit === "" ? null : credit },
    });

    revalidateMuseum({ slug: asset.exhibit.slug, roomSlug: asset.exhibit.room.slug });

    return { ok: true };
  } catch {
    return { ok: false, error: "The source line could not be saved. Try again." };
  }
}

/** Publish or unpublish from the list, without opening the editor. */
export async function setExhibitStatus(
  id: string,
  status: "DRAFT" | "PUBLISHED",
): Promise<ExhibitMutationResult> {
  await requireAdmin();

  if (status !== "DRAFT" && status !== "PUBLISHED") {
    return { ok: false, error: "Unknown status." };
  }

  try {
    const exhibit = await prisma.exhibit.update({
      where: { id },
      data: { status },
      select: { slug: true, room: { select: { slug: true } } },
    });

    revalidateMuseum({ slug: exhibit.slug, roomSlug: exhibit.room.slug });
    return { ok: true };
  } catch {
    return { ok: false, error: "That exhibit could not be updated." };
  }
}

/**
 * Delete an exhibit. Its hotspots, media, reviews, stamps and tour stops are
 * cascaded by the schema; the confirmation lives in the UI.
 */
export async function deleteExhibit(id: string): Promise<ExhibitMutationResult> {
  await requireAdmin();

  const exhibit = await prisma.exhibit.findUnique({
    where: { id },
    select: { slug: true, room: { select: { slug: true } } },
  });

  if (!exhibit) return { ok: false, error: "That exhibit no longer exists." };

  await prisma.exhibit.delete({ where: { id } });

  revalidateMuseum({ slug: exhibit.slug, roomSlug: exhibit.room.slug });
  return { ok: true };
}
