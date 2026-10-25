import { ImageResponse } from "next/og";

export const alt = "Dharohar — scan an exhibit, inspect it in 3D, place it in your room";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Generated at build time and cached. Kept purely typographic: the hero images
 * are SVG, which satori cannot rasterise, and a drawn card reads better at
 * 630 px than a cropped photograph.
 */
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#f7f1e7",
          color: "#1a1613",
          padding: "72px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 24,
            letterSpacing: 6,
            color: "#b45309",
          }}
        >
          <span>DHAROHAR</span>
          <span style={{ color: "#574c42", letterSpacing: 3 }}>MUSEUM OF MATERIAL CULTURE</span>
        </div>

        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div style={{ fontSize: 86, lineHeight: 1.04, letterSpacing: -2, maxWidth: 940 }}>
            The exhibit explains itself.
          </div>
          <div style={{ display: "flex", marginTop: 30, fontSize: 30, color: "#574c42" }}>
            Scan · listen · inspect · place it in your room
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {["3D model", "AR placement", "360° gallery"].map((label, index) => (
            <div
              key={label}
              style={{
                display: "flex",
                padding: "12px 22px",
                borderRadius: 999,
                fontSize: 24,
                background: index === 0 ? "#b45309" : index === 1 ? "#1a1613" : "#ece1d0",
                color: index === 2 ? "#1a1613" : "#fffdf9",
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
