import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getViewer } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * The exhibit page is ISR, so it cannot know who is reading it. The review form
 * asks this endpoint which review (if any) already belongs to the visitor, so
 * that a second visit edits instead of duplicating.
 */
export async function GET(request: Request) {
  const viewer = await getViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Sign in to review." }, { status: 401 });
  }

  const exhibitId = new URL(request.url).searchParams.get("exhibitId");
  if (!exhibitId) {
    return NextResponse.json({ error: "exhibitId is required." }, { status: 400 });
  }

  const review = await prisma.review.findUnique({
    where: { userId_exhibitId: { userId: viewer.user.id, exhibitId } },
    select: { id: true, rating: true, body: true, createdAt: true },
  });

  return NextResponse.json({ review });
}
