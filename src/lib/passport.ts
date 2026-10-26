import "server-only";

import { cookies } from "next/headers";

import { prisma } from "@/lib/db";
import { DEVICE_COOKIE } from "@/lib/device";

export type PassportExhibit = {
  id: string;
  code: string;
  slug: string;
  title: string;
  room: string;
  /** null until the object has been opened from its QR card. */
  seenAt: Date | null;
};

export type PassportReview = {
  id: string;
  rating: number;
  body: string;
  createdAt: Date;
  exhibit: { code: string; slug: string; title: string };
};

export type PassportBadge = {
  id: string;
  label: string;
  detail: string;
  earned: boolean;
};

export type Passport = {
  name: string;
  exhibits: PassportExhibit[];
  reviews: PassportReview[];
  collected: number;
  total: number;
  percent: number;
  badges: PassportBadge[];
};

/**
 * Stamps collected as a guest live under the device cookie. The first time that
 * device is used by a signed-in visitor, the unclaimed stamps become theirs —
 * a guest can scan all afternoon and only sign up at the end.
 */
export async function claimDeviceStamps(userId: string): Promise<number> {
  const deviceId = (await cookies()).get(DEVICE_COOKIE)?.value;
  if (!deviceId) return 0;

  const { count } = await prisma.stamp.updateMany({
    // Only unowned stamps move: a stamp another account already claimed on this
    // device stays with that account.
    where: { deviceId, userId: null },
    data: { userId },
  });

  return count;
}

export async function getPassport(
  user: { id: string; name: string },
): Promise<Passport> {
  const [published, stamps, reviews] = await Promise.all([
    prisma.exhibit.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { code: "asc" },
      select: {
        id: true,
        code: true,
        slug: true,
        title: true,
        room: { select: { name: true } },
      },
    }),
    prisma.stamp.findMany({
      where: { userId: user.id },
      select: { exhibitId: true, firstSeenAt: true },
    }),
    prisma.review.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        rating: true,
        body: true,
        createdAt: true,
        exhibit: { select: { code: true, slug: true, title: true } },
      },
    }),
  ]);

  const seenAt = new Map(stamps.map((stamp) => [stamp.exhibitId, stamp.firstSeenAt]));

  const exhibits: PassportExhibit[] = published.map((exhibit) => ({
    id: exhibit.id,
    code: exhibit.code,
    slug: exhibit.slug,
    title: exhibit.title,
    room: exhibit.room.name,
    seenAt: seenAt.get(exhibit.id) ?? null,
  }));

  const collected = exhibits.filter((exhibit) => exhibit.seenAt !== null).length;
  const total = exhibits.length;
  const half = Math.ceil(total / 2);

  const badges: PassportBadge[] = [
    {
      id: "first-stamp",
      label: "First stamp",
      detail: "Opened the first exhibit from its card.",
      earned: collected >= 1,
    },
    {
      id: "half-way",
      label: "Half the gallery",
      detail: `Seen ${half} of ${total} objects.`,
      earned: total > 0 && collected >= half,
    },
    {
      id: "full-passport",
      label: "Full passport",
      detail: "Every published object seen.",
      earned: total > 0 && collected === total,
    },
    {
      id: "reviewer",
      label: "Reviewer",
      detail: "Left a review for an exhibit.",
      earned: reviews.length >= 1,
    },
  ];

  return {
    name: user.name,
    exhibits,
    reviews,
    collected,
    total,
    percent: total === 0 ? 0 : Math.round((collected / total) * 100),
    badges,
  };
}
