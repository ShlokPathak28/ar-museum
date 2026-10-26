"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { reviewSchema } from "@/lib/schemas";
import { getViewer } from "@/lib/session";

export type SavedReview = {
  id: string;
  rating: number;
  body: string;
  createdAt: string;
  authorName: string;
};

export type SaveReviewResult =
  | { ok: true; review: SavedReview }
  | { ok: false; error: string };

/**
 * Create or update the signed-in visitor's review. Server Actions are public
 * endpoints, so the session and the payload are both checked here — the form's
 * validation is only a convenience.
 */
export async function saveReview(input: {
  exhibitId: string;
  rating: number;
  body: string;
}): Promise<SaveReviewResult> {
  const viewer = await getViewer();
  if (!viewer) {
    return { ok: false, error: "Your session has expired. Sign in again to review." };
  }

  const parsed = reviewSchema.safeParse({ rating: input.rating, body: input.body });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the review and try again." };
  }

  const exhibit = await prisma.exhibit.findUnique({
    where: { id: input.exhibitId },
    select: { id: true, slug: true, status: true },
  });

  if (!exhibit || exhibit.status !== "PUBLISHED") {
    return { ok: false, error: "That exhibit is not available for review." };
  }

  const review = await prisma.review.upsert({
    where: { userId_exhibitId: { userId: viewer.user.id, exhibitId: exhibit.id } },
    create: {
      userId: viewer.user.id,
      exhibitId: exhibit.id,
      rating: parsed.data.rating,
      body: parsed.data.body,
    },
    // Editing a hidden review puts it back in the queue as visible.
    update: { rating: parsed.data.rating, body: parsed.data.body, status: "VISIBLE" },
    select: { id: true, rating: true, body: true, createdAt: true },
  });

  // The exhibit page is ISR; without this it would serve the old review list
  // for up to a minute after the visitor posts.
  revalidatePath(`/exhibits/${exhibit.slug}`);
  revalidatePath("/passport");

  return {
    ok: true,
    review: {
      id: review.id,
      rating: review.rating,
      body: review.body,
      createdAt: review.createdAt.toISOString(),
      authorName: viewer.user.name,
    },
  };
}

export type DeleteReviewResult = { ok: true } | { ok: false; error: string };

export async function deleteReview(id: string): Promise<DeleteReviewResult> {
  const viewer = await getViewer();
  if (!viewer) {
    return { ok: false, error: "Your session has expired. Sign in again." };
  }

  const review = await prisma.review.findUnique({
    where: { id },
    select: { userId: true, exhibit: { select: { slug: true } } },
  });

  if (!review) {
    return { ok: false, error: "That review no longer exists." };
  }

  if (review.userId !== viewer.user.id && viewer.user.role !== "ADMIN") {
    return { ok: false, error: "You can only delete your own review." };
  }

  await prisma.review.delete({ where: { id } });

  revalidatePath(`/exhibits/${review.exhibit.slug}`);
  revalidatePath("/passport");

  return { ok: true };
}
