import { describe, expect, it } from "vitest";

import {
  MAX_PANORAMA_BYTES,
  inspectPanorama,
  safePanoramaFilename,
} from "@/lib/panorama-upload";

/**
 * Headers only — the Studio never decodes the image, it reads the size out of
 * the container. These builders produce the smallest bytes that carry the same
 * header shape as a real WebP or JPEG, which is what the check has to survive.
 */
function webpLossy(width: number, height: number) {
  const bytes = new Uint8Array(40);
  bytes.set([0x52, 0x49, 0x46, 0x46], 0); // RIFF
  bytes.set([0x57, 0x45, 0x42, 0x50], 8); // WEBP
  bytes.set([0x56, 0x50, 0x38, 0x20], 12); // "VP8 "
  bytes.set([0x9d, 0x01, 0x2a], 23); // start code
  const view = new DataView(bytes.buffer);
  view.setUint16(26, width, true);
  view.setUint16(28, height, true);
  return bytes;
}

function webpLossless(width: number, height: number) {
  const bytes = new Uint8Array(40);
  bytes.set([0x52, 0x49, 0x46, 0x46], 0);
  bytes.set([0x57, 0x45, 0x42, 0x50], 8);
  bytes.set([0x56, 0x50, 0x38, 0x4c], 12); // "VP8L"
  bytes[20] = 0x2f;
  const bits = ((width - 1) & 0x3fff) | (((height - 1) & 0x3fff) << 14);
  bytes[21] = bits & 0xff;
  bytes[22] = (bits >>> 8) & 0xff;
  bytes[23] = (bits >>> 16) & 0xff;
  bytes[24] = (bits >>> 24) & 0xff;
  return bytes;
}

function webpExtended(width: number, height: number) {
  const bytes = new Uint8Array(40);
  bytes.set([0x52, 0x49, 0x46, 0x46], 0);
  bytes.set([0x57, 0x45, 0x42, 0x50], 8);
  bytes.set([0x56, 0x50, 0x38, 0x58], 12); // "VP8X"
  const w = width - 1;
  const h = height - 1;
  bytes[24] = w & 0xff;
  bytes[25] = (w >>> 8) & 0xff;
  bytes[26] = (w >>> 16) & 0xff;
  bytes[27] = h & 0xff;
  bytes[28] = (h >>> 8) & 0xff;
  bytes[29] = (h >>> 16) & 0xff;
  return bytes;
}

function jpeg(width: number, height: number) {
  const bytes = new Uint8Array(40);
  const view = new DataView(bytes.buffer);
  bytes.set([0xff, 0xd8], 0); // SOI
  bytes.set([0xff, 0xe0], 2); // APP0
  view.setUint16(4, 16, false);
  bytes.set([0xff, 0xc0], 20); // SOF0
  view.setUint16(22, 17, false);
  bytes[24] = 8; // precision
  view.setUint16(25, height, false);
  view.setUint16(27, width, false);
  bytes[29] = 3; // components
  return bytes;
}

describe("inspectPanorama", () => {
  it("accepts the house size in every container the browser produces", () => {
    expect(inspectPanorama("room.webp", webpLossy(3072, 1536))).toEqual({
      ok: true,
      mimeType: "image/webp",
      width: 3072,
      height: 1536,
      size: 40,
    });
    expect(inspectPanorama("room.webp", webpLossless(3072, 1536)).ok).toBe(true);
    expect(inspectPanorama("room.webp", webpExtended(3072, 1536)).ok).toBe(true);
    expect(inspectPanorama("room.jpg", jpeg(3072, 1536))).toMatchObject({
      ok: true,
      mimeType: "image/jpeg",
      width: 3072,
      height: 1536,
    });
  });

  it("rejects a normal photograph, and says what a panorama is", () => {
    const result = inspectPanorama("room.webp", webpLossy(3000, 2000));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("twice as wide as it is tall");
  });

  it("allows a couple of pixels of rounding but not a different shape", () => {
    expect(inspectPanorama("room.webp", webpLossy(2049, 1024)).ok).toBe(true);
    expect(inspectPanorama("room.webp", webpLossy(2200, 1024)).ok).toBe(false);
  });

  it("rejects a thumbnail and an oversized texture", () => {
    expect(inspectPanorama("room.webp", webpLossy(800, 400)).ok).toBe(false);
    expect(inspectPanorama("room.webp", webpLossy(10240, 5120)).ok).toBe(false);
  });

  it("rejects a file over the cap before reading it", () => {
    const bytes = new Uint8Array(MAX_PANORAMA_BYTES + 1);
    const result = inspectPanorama("room.webp", bytes);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("cap is 4.0 MB");
  });

  it.each(["room.png", "room.gif", "room.txt"])("rejects the extension %s", (filename) => {
    expect(inspectPanorama(filename, webpLossy(3072, 1536)).ok).toBe(false);
  });

  it("rejects bytes that are not an image whatever the extension says", () => {
    const png = new Uint8Array(40);
    png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);

    const result = inspectPanorama("room.webp", png);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("not a WebP or JPEG");
  });

  it("rejects a truncated file instead of guessing", () => {
    expect(inspectPanorama("room.webp", new Uint8Array(10)).ok).toBe(false);
  });
});

describe("safePanoramaFilename", () => {
  it("keeps the base name and drops a path", () => {
    expect(safePanoramaFilename("C:\\shots\\room one.webp")).toBe("room one.webp");
  });

  it("strips quotes and control characters that would break a header", () => {
    expect(safePanoramaFilename('ro"om\u0000.webp')).toBe("room.webp");
  });

  it("falls back to a name when nothing is left", () => {
    expect(safePanoramaFilename("")).toBe("panorama.webp");
    expect(safePanoramaFilename("   ")).toBe("panorama.webp");
  });
});
