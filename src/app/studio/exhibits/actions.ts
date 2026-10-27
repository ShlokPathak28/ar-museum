"use server";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { revalidateMuseum } from "@/lib/revalidate";
import { exhibitAdminSchema, type ExhibitAdminValues } from "@/lib/schemas";

export type SaveExhibitResult =
  | { ok: true; id: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export type ExhibitMutationResult = { ok: true } | { ok: false; error: string };

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

  if (input.id) {
    const exists = await prisma.exhibit.findUnique({
      where: { id: input.id },
      select: { id: true },
    });

    if (!exists) return { ok: false, error: "That exhibit no longer exists." };
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
    modelUrl: blankToNull(values.modelUrl),
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

    revalidateMuseum({ slug: saved.slug, roomSlug: saved.room.slug });

    return { ok: true, id: saved.id };
  } catch (error) {
    return {
      ok: false,
      error: duplicateMessage(error) ?? "The exhibit could not be saved. Try again.",
    };
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
