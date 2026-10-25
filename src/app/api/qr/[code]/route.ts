import { NextResponse, type NextRequest } from "next/server";
import QRCode from "qrcode";

import { prisma } from "@/lib/db";

// The payload embeds the host the request arrived on, so it cannot be cached at
// build time.
export const dynamic = "force-dynamic";

/**
 * `GET /api/qr/TH01` → a PNG of the QR a printed card carries.
 *
 * Same resolution rule as `/x/[code]` and `/markers`: the Host header is what
 * the visitor actually used, so a phone scanning from the LAN gets a LAN URL
 * instead of `localhost`.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  const exhibit = await prisma.exhibit.findUnique({
    where: { code: code.toUpperCase() },
    select: { code: true, status: true },
  });

  if (!exhibit || exhibit.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Unknown exhibit code" }, { status: 404 });
  }

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") ?? "http";
  const origin = host ? `${protocol}://${host}` : request.nextUrl.origin;

  const png = await QRCode.toBuffer(`${origin}/x/${exhibit.code}`, {
    type: "png",
    width: 1024,
    margin: 2,
    errorCorrectionLevel: "M",
  });

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "content-type": "image/png",
      "cache-control": "public, max-age=300",
      "content-disposition": `inline; filename="dharohar-${exhibit.code}.png"`,
    },
  });
}
