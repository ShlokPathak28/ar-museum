/**
 * What the Studio will accept as a model, and how it reads the file.
 *
 * Pure on purpose: the rule is the part worth testing, and it should be
 * testable without a database, a browser or a 4 MB fixture on disk.
 *
 * A `.glb` is a 12-byte header (magic, version, total length) followed by
 * chunks; the first chunk is the JSON scene description, stored uncompressed.
 * That is enough to tell a real export from a renamed `.obj` and to notice
 * whether the geometry is Draco-compressed before it reaches the viewer.
 */

/**
 * 4 MB. Vercel caps a function's request body at 4.5 MB, and the cap is a
 * design decision as much as a limit: the exhibit page already carries 1.3 MB,
 * and an uncompressed scan would undo the performance pass.
 */
export const MAX_MODEL_BYTES = 4 * 1024 * 1024;

const GLB_MAGIC = 0x46546c67; // "glTF", little-endian
const CHUNK_JSON = 0x4e4f534a; // "JSON", little-endian

export type GlbInspection =
  | { ok: true; size: number; draco: boolean }
  | { ok: false; error: string };

export type FileCheck = { ok: true } | { ok: false; error: string };

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** A filename that is safe in a Content-Disposition header and a table cell. */
export function safeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const cleaned = base.replace(/[\u0000-\u001f\u007f"]/g, "").trim().slice(0, 120);
  return cleaned === "" ? "model.glb" : cleaned;
}

/**
 * The checks that need only a name and a size, shared by the browser and the
 * server so a file is refused with the same sentence in both places.
 *
 * The browser can run this the moment a file is chosen: a 40 MB Blender export
 * should not spend two minutes uploading only to be told it was always too big.
 * The server still calls it (through `inspectGlb`), because a Server Action is
 * a public endpoint and the input field is not a gate.
 */
export function checkModelFile(filename: string, size: number): FileCheck {
  if (!/\.glb$/i.test(filename.trim())) {
    return {
      ok: false,
      error: "Only binary glTF (.glb) files can be uploaded. Export the model as .glb first.",
    };
  }

  if (size > MAX_MODEL_BYTES) {
    return {
      ok: false,
      error: `That file is ${formatBytes(size)}. The cap is ${formatBytes(
        MAX_MODEL_BYTES,
      )} — compress it with \`npx @gltf-transform/cli optimize\` first.`,
    };
  }

  return { ok: true };
}

export function inspectGlb(filename: string, bytes: Uint8Array): GlbInspection {
  const check = checkModelFile(filename, bytes.byteLength);
  if (!check.ok) return check;

  // Header (12) + one chunk header (8).
  if (bytes.byteLength < 20) {
    return { ok: false, error: "That file is too small to be a glTF binary." };
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  if (view.getUint32(0, true) !== GLB_MAGIC) {
    return { ok: false, error: "That is not a binary glTF file — the glTF magic bytes are missing." };
  }

  const version = view.getUint32(4, true);
  if (version !== 2) {
    return { ok: false, error: `glTF version ${version} is not supported. Export a version 2 .glb.` };
  }

  if (view.getUint32(16, true) !== CHUNK_JSON) {
    return { ok: false, error: "The file's first chunk is not JSON, so it is probably corrupt." };
  }

  const jsonEnd = Math.min(20 + view.getUint32(12, true), bytes.byteLength);

  let scene: { extensionsUsed?: unknown; extensionsRequired?: unknown };
  try {
    scene = JSON.parse(new TextDecoder().decode(bytes.subarray(20, jsonEnd)));
  } catch {
    return { ok: false, error: "The file's JSON chunk could not be read, so it is probably corrupt." };
  }

  const extensions = [scene.extensionsUsed, scene.extensionsRequired]
    .flatMap((value) => (Array.isArray(value) ? value : []))
    .filter((value): value is string => typeof value === "string");

  return {
    ok: true,
    size: bytes.byteLength,
    draco: extensions.includes("KHR_draco_mesh_compression"),
  };
}
