"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";

export type ModerationResult = { ok: true } | { ok: false; error: string };

/**
 * Hiding a review keeps it in the database (and visible to its author on
 * /passport) but removes it from the public exhibit page and from the average.
 */
export async function setReviewStatus(
  id: string,
  status: "VISIBLE" | "HIDDEN",
): Promise<ModerationResult> {
  await requireAdmin();

  if (status !== "VISIBLE" && status !== "HIDDEN") {
    return { ok: false, error: "Unknown review status." };
  }

  try {
    const review = await prisma.review.update({
      where: { id },
      data: { status },
      select: { exhibit: { select: { slug: true } } },
    });

    revalidatePath(`/exhibits/${review.exhibit.slug}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "That review could not be updated." };
  }
}

/** Admin-only permanent removal. The author's own delete lives on the exhibit page. */
export async function deleteReviewAsAdmin(id: string): Promise<ModerationResult> {
  await requireAdmin();

  const review = await prisma.review.findUnique({
    where: { id },
    select: { exhibit: { select: { slug: true } } },
  });

  if (!review) return { ok: false, error: "That review no longer exists." };

  await prisma.review.delete({ where: { id } });

  revalidatePath(`/exhibits/${review.exhibit.slug}`);
  return { ok: true };
}
