import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/session";

// The bytes come from the database, so there is nothing to prerender.
export const dynamic = "force-dynamic";

/**
 * `GET /api/models/<id>` → the uploaded GLB itself.
 *
 * The id changes on every upload, so the content behind a URL never changes and
 * the response can be cached for a year. A replacement model is a new row with
 * a new id; the old one is deleted in the same transaction that swaps the
 * exhibit's `modelUrl`.
 *
 * A draft's model is not public: the exhibit page is a 404 for visitors, and a
 * copied URL should not leak the scan either.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const asset = await prisma.modelAsset.findUnique({
    where: { id },
    select: {
      filename: true,
      mimeType: true,
      bytes: true,
      sha256: true,
      exhibit: { select: { status: true } },
    },
  });

  if (!asset) {
    return NextResponse.json({ error: "Unknown model" }, { status: 404 });
  }

  if (asset.exhibit.status !== "PUBLISHED" && !(await isAdmin())) {
    return NextResponse.json({ error: "Unknown model" }, { status: 404 });
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
