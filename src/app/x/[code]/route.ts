import { randomUUID } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/db";
import { DEVICE_COOKIE } from "@/lib/device";
import { resolveOrigin } from "@/lib/origin";
import { getViewer } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * The QR entry point. A printed card encodes `/x/TH01`; this handler resolves the
 * short code, records the scan, then forwards to the real exhibit page.
 *
 * It is a route handler rather than a page because a redirect response is the
 * only place a device cookie can be set during a plain GET.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  // `request.url` is normalised to the dev server's own origin, which would send
  // a phone back to localhost. The Host header is what the visitor actually used.
  const origin = resolveOrigin(request.headers);

  const exhibit = await prisma.exhibit.findUnique({
    where: { code: code.toUpperCase() },
    select: { id: true, slug: true, status: true },
  });

  if (!exhibit || exhibit.status !== "PUBLISHED") {
    return NextResponse.redirect(new URL("/exhibits", origin));
  }

  const deviceId = request.cookies.get(DEVICE_COOKIE)?.value ?? randomUUID();

  try {
    await prisma.scan.create({
      data: { exhibitId: exhibit.id, method: "QR", deviceId },
    });
  } catch (error) {
    // Analytics must never stand between a visitor and the exhibit.
    console.error("Could not record scan", error);
  }

  // A stamp is the visitor-facing twin of a scan: one per object per device,
  // claimed by an account on the next passport visit.
  try {
    const viewer = await getViewer();
    const userId = viewer?.user.id ?? null;

    await prisma.stamp.upsert({
      where: { deviceId_exhibitId: { deviceId, exhibitId: exhibit.id } },
      create: { deviceId, exhibitId: exhibit.id, userId },
      update: userId ? { userId } : {},
    });
  } catch (error) {
    console.error("Could not record stamp", error);
  }

  const response = NextResponse.redirect(
    new URL(`/exhibits/${exhibit.slug}`, origin),
  );
  response.cookies.set(DEVICE_COOKIE, deviceId, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });

  return response;
}
