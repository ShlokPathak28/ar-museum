/**
 * A point of interest on a 3D model. Positions are model-space metres, which is
 * what `model-viewer`'s `data-position` expects — not normalised 0–1 values.
 */
export type HotspotData = {
  id: string;
  label: string;
  body: string;
  x: number;
  y: number;
  z: number;
};

export type MaterialMode = "textured" | "clay" | "wireframe";
