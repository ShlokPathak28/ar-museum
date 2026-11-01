/**
 * What the Studio accepts as a room panorama, and how it reads the file.
 *
 * Pure on purpose, like `model-upload.ts`: the rule is the part worth testing,
 * and it should be testable without a database, a browser or a 700 KB fixture.
 *
 * A panorama is an equirectangular image — twice as wide as it is tall — which
 * the room viewer wraps onto a sphere. A normal photograph would look like a
 * smear, so the aspect ratio is checked here rather than discovered in the
 * browser. Dimensions are read straight from the JPEG/WebP header; no decoder,
 * no dependency.
 */
import { formatBytes, type FileCheck } from "@/lib/model-upload";

/** 4 MB, the same cap as a model upload and for the same reason (Vercel's 4.5 MB body limit). */
export const MAX_PANORAMA_BYTES = 4 * 1024 * 1024;

/** Below this a 360° view is a blur; above it the texture is wasted on a sphere. */
export const MIN_PANORAMA_WIDTH = 1024;
export const MAX_PANORAMA_WIDTH = 8192;

/** How far from 2:1 an upload may be before it is refused. */
const ASPECT_TOLERANCE = 0.03;

export type PanoramaInspection =
  | {
      ok: true;
      mimeType: "image/webp" | "image/jpeg";
      width: number;
      height: number;
      size: number;
    }
  | { ok: false; error: string };

/**
 * A filename that is safe in a Content-Disposition header and a table cell.
 * The default extension is a panorama's, not a model's.
 */
export function safePanoramaFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const cleaned = base.replace(/[\u0000-\u001f\u007f"]/g, "").trim().slice(0, 120);
  return cleaned === "" ? "panorama.webp" : cleaned;
}

type Dimensions = { width: number; height: number };

function readJpegDimensions(bytes: Uint8Array, view: DataView): Dimensions | null {
  let offset = 2;

  while (offset + 9 < bytes.byteLength) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = bytes[offset + 1];

    // Fill bytes, standalone markers and restart markers carry no length.
    if (marker === 0xff) {
      offset += 1;
      continue;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
      offset += 2;
      continue;
    }
    // Start of scan: the frame header came before it, or there is none.
    if (marker === 0xda || marker === 0xd9) return null;

    const length = view.getUint16(offset + 2, false);
    if (length < 2) return null;

    const isStartOfFrame =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;

    if (isStartOfFrame) {
      return {
        height: view.getUint16(offset + 5, false),
        width: view.getUint16(offset + 7, false),
      };
    }

    offset += 2 + length;
  }

  return null;
}

function readWebpDimensions(bytes: Uint8Array, view: DataView): Dimensions | null {
  if (bytes.byteLength < 30) return null;

  const chunk = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);

  if (chunk === "VP8X") {
    return {
      width: 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16)),
      height: 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16)),
    };
  }

  if (chunk === "VP8L") {
    if (bytes[20] !== 0x2f) return null;
    const bits =
      (bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] << 24)) >>> 0;

    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >>> 14) & 0x3fff) + 1,
    };
  }

  if (chunk === "VP8 ") {
    if (bytes[23] !== 0x9d || bytes[24] !== 0x01 || bytes[25] !== 0x2a) return null;

    return {
      width: view.getUint16(26, true) & 0x3fff,
      height: view.getUint16(28, true) & 0x3fff,
    };
  }

  return null;
}

/**
 * The name-and-size checks, shared by the browser and the server so both refuse
 * a file with the same sentence. The browser runs it as soon as a file is
 * chosen — a 12 MB photograph should not be uploaded for two minutes before it
 * is told it was never going to fit. `inspectPanorama` still runs it too: the
 * action is a public endpoint, not a form.
 */
export function checkPanoramaFile(filename: string, size: number): FileCheck {
  if (!/\.(webp|jpe?g)$/i.test(filename.trim())) {
    return {
      ok: false,
      error: "Only WebP or JPEG images can be uploaded. Export the panorama as .webp first.",
    };
  }

  if (size > MAX_PANORAMA_BYTES) {
    return {
      ok: false,
      error: `That image is ${formatBytes(size)}. The cap is ${formatBytes(
        MAX_PANORAMA_BYTES,
      )} — re-encode it at 3072×1536 WebP.`,
    };
  }

  return { ok: true };
}

/**
 * Read the format and the pixel size, then decide whether this is a panorama
 * the room viewer can wrap: 2:1, at least 1024 px wide, under the cap.
 */
export function inspectPanorama(filename: string, bytes: Uint8Array): PanoramaInspection {
  const check = checkPanoramaFile(filename, bytes.byteLength);
  if (!check.ok) return check;

  if (bytes.byteLength < 30) {
    return { ok: false, error: "That file is too small to be an image." };
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  let mimeType: "image/webp" | "image/jpeg";
  let dimensions: Dimensions | null;

  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    mimeType = "image/webp";
    dimensions = readWebpDimensions(bytes, view);
  } else if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    mimeType = "image/jpeg";
    dimensions = readJpegDimensions(bytes, view);
  } else {
    return {
      ok: false,
      error: "That is not a WebP or JPEG image — the file header is something else.",
    };
  }

  if (!dimensions || dimensions.width <= 0 || dimensions.height <= 0) {
    return { ok: false, error: "The image's size could not be read, so it is probably corrupt." };
  }

  const { width, height } = dimensions;

  if (Math.abs(width / height - 2) > ASPECT_TOLERANCE) {
    return {
      ok: false,
      error: `That image is ${width}×${height}. A 360° panorama is twice as wide as it is tall — export it as ${Math.max(
        width,
        2 * height,
      )}×${Math.max(height, Math.round(width / 2))}.`,
    };
  }

  if (width < MIN_PANORAMA_WIDTH) {
    return {
      ok: false,
      error: `That image is ${width}px wide. Use at least ${MIN_PANORAMA_WIDTH}px, or 3072×1536 for the sharp view.`,
    };
  }

  if (width > MAX_PANORAMA_WIDTH) {
    return {
      ok: false,
      error: `That image is ${width}px wide. The cap is ${MAX_PANORAMA_WIDTH}px — re-encode it at 3072×1536.`,
    };
  }

  return { ok: true, mimeType, width, height, size: bytes.byteLength };
}
