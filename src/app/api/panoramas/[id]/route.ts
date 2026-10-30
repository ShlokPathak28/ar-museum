import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

// The bytes come from the database, so there is nothing to prerender.
export const dynamic = "force-dynamic";

/**
 * `GET /api/panoramas/<id>` → an uploaded room panorama.
 *
 * The id changes on every upload, so the content behind a URL never changes and
 * the response can be cached for a year. A replacement panorama is a new row
 * with a new id; the old one is deleted in the same transaction that swaps the
 * room's `panoramaUrl`.
 *
 * Rooms have no draft state, so unlike `/api/models/[id]` there is no visibility
 * check: a panorama is as public as the room page that shows it.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const asset = await prisma.roomPanorama.findUnique({
    where: { id },
    select: { filename: true, mimeType: true, bytes: true, sha256: true },
  });

  if (!asset) {
    return NextResponse.json({ error: "Unknown panorama" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(asset.bytes), {
    headers: {
      "content-type": asset.mimeType,
      "content-length": String(asset.bytes.byteLength),
      // Safe because the id is new for every upload.
      "cache-control": "public, max-age=31536000, immutable",
      etag: `"${asset.sha256}"`,
      "content-disposition": `inline; filename="${asset.filename}"`,
      "x-content-type-options": "nosniff",
    },
  });
}
