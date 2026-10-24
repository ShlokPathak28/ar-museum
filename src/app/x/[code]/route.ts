import { randomUUID } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const DEVICE_COOKIE = "dharohar_device";

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
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") ?? "http";
  const origin = host ? `${protocol}://${host}` : request.nextUrl.origin;

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
