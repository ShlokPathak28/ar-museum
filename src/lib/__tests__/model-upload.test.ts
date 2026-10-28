import { describe, expect, it } from "vitest";

import {
  MAX_MODEL_BYTES,
  formatBytes,
  inspectGlb,
  safeFilename,
} from "@/lib/model-upload";

/**
 * A minimal, structurally valid GLB: 12-byte header, then the JSON chunk.
 * Nothing here renders — the point is the container, which is what the Studio
 * checks before it stores a file.
 */
function glb(options: { draco?: boolean; version?: number; magic?: string; json?: string } = {}) {
  const { draco = false, version = 2, magic = "glTF", json } = options;

  const text =
    json ??
    JSON.stringify({
      asset: { version: "2.0" },
      scenes: [{}],
      ...(draco ? { extensionsUsed: ["KHR_draco_mesh_compression"] } : {}),
    });

  const encoded = new TextEncoder().encode(text);
  const padded = new Uint8Array(Math.ceil(encoded.length / 4) * 4).fill(0x20);
  padded.set(encoded);

  const bytes = new Uint8Array(20 + padded.length);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, magic === "glTF" ? 0x46546c67 : 0x12345678, true);
  view.setUint32(4, version, true);
  view.setUint32(8, bytes.byteLength, true);
  view.setUint32(12, padded.byteLength, true);
  view.setUint32(16, 0x4e4f534a, true);
  bytes.set(padded, 20);
  return bytes;
}

describe("inspectGlb", () => {
  it("accepts a version 2 binary and reports its size", () => {
    const result = inspectGlb("hookah.glb", glb());
    expect(result).toEqual({ ok: true, size: expect.any(Number), draco: false });
  });

  it("sees Draco compression in extensionsUsed or extensionsRequired", () => {
    expect(inspectGlb("a.glb", glb({ draco: true }))).toMatchObject({ ok: true, draco: true });

    const required = JSON.stringify({
      asset: { version: "2.0" },
      extensionsRequired: ["KHR_draco_mesh_compression"],
    });
    expect(inspectGlb("b.glb", glb({ json: required }))).toMatchObject({ ok: true, draco: true });
  });

  it("rejects anything that is not named .glb", () => {
    const result = inspectGlb("hookah.gltf", glb());
    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ error: expect.stringContaining(".glb") });
  });

  it("rejects a renamed file with the wrong magic bytes", () => {
    expect(inspectGlb("hookah.glb", glb({ magic: "obj" }))).toMatchObject({
      ok: false,
      error: expect.stringContaining("magic"),
    });
  });

  it("rejects glTF 1 exports", () => {
    expect(inspectGlb("hookah.glb", glb({ version: 1 }))).toMatchObject({
      ok: false,
      error: expect.stringContaining("version 1"),
    });
  });

  it("rejects a file too small to hold a header", () => {
    expect(inspectGlb("hookah.glb", new Uint8Array(8))).toMatchObject({ ok: false });
  });

  it("rejects a first chunk that is not JSON", () => {
    const bytes = glb();
    new DataView(bytes.buffer).setUint32(16, 0x004e4942, true); // "BIN"
    expect(inspectGlb("hookah.glb", bytes)).toMatchObject({
      ok: false,
      error: expect.stringContaining("JSON"),
    });
  });

  it("rejects a truncated or unparseable JSON chunk", () => {
    expect(inspectGlb("hookah.glb", glb({ json: "{\"asset\":" }))).toMatchObject({
      ok: false,
      error: expect.stringContaining("JSON chunk"),
    });
  });

  it("rejects a file over the cap before looking inside it", () => {
    const bytes = new Uint8Array(MAX_MODEL_BYTES + 1);
    expect(inspectGlb("hookah.glb", bytes)).toMatchObject({
      ok: false,
      error: expect.stringContaining("4.0 MB"),
    });
  });
});

describe("formatBytes", () => {
  it("uses the unit a person would say", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(3.5 * 1024 * 1024)).toBe("3.5 MB");
  });
});

describe("safeFilename", () => {
  it("drops directories, quotes and control characters", () => {
    expect(safeFilename("C:\\scans\\hookah.glb")).toBe("hookah.glb");
    expect(safeFilename('a"b\u0000c.glb')).toBe("abc.glb");
  });

  it("never returns an empty filename", () => {
    expect(safeFilename("")).toBe("model.glb");
    expect(safeFilename("/")).toBe("model.glb");
  });
});
