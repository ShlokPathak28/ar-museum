/**
 * Placeholder bearings for the stand-in panoramas.
 *
 * `u` is the fraction across the equirectangular image (0 = left edge, 1 = right
 * edge) and `v` is the fraction down it (0 = straight up, 1 = straight down).
 * The viewer converts them to a bearing, so these can be re-picked by eye from a
 * gridded copy of any replacement panorama.
 *
 * When the museum has real room scans, these numbers move into the database next
 * to each exhibit — for now they only say "look at the cases on that wall".
 */
export type RoomMarker = { code: string; u: number; v: number };

export const ROOM_MARKERS: Record<string, RoomMarker[]> = {
  "material-worlds": [
    { code: "TH01", u: 0.16, v: 0.46 },
    { code: "BH02", u: 0.54, v: 0.5 },
    { code: "PS03", u: 0.86, v: 0.42 },
  ],
  "everyday-objects": [
    { code: "MV04", u: 0.84, v: 0.5 },
    { code: "WB06", u: 0.55, v: 0.6 },
  ],
};
