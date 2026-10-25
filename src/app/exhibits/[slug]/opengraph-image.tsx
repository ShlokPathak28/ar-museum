import { ImageResponse } from "next/og";

import { prisma } from "@/lib/db";

export const alt = "An exhibit in the Dharohar collection";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * One share card per published exhibit, generated from the same row the page
 * uses — so a title edited in the studio changes the preview on the next
 * revalidation, with no asset to regenerate by hand.
 */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const exhibit = await prisma.exhibit.findUnique({
    where: { slug },
    include: { room: true },
  });

  const title = exhibit?.title ?? "Dharohar collection";
  const era = exhibit?.era ?? "Museum of Material Culture";
  const room = exhibit?.room.name ?? "";
  const code = exhibit?.code ?? "";
  const subtitle = exhibit?.subtitle ?? exhibit?.summary ?? "";

  // Long titles wrap instead of running off the card.
  const titleSize = title.length > 46 ? 58 : title.length > 28 ? 70 : 84;

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
          padding: "64px 72px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 22,
            letterSpacing: 6,
            color: "#b45309",
          }}
        >
          <span>DHAROHAR</span>
          <span style={{ color: "#574c42", letterSpacing: 4 }}>{code}</span>
        </div>

        <div style={{ display: "flex", flex: 1, flexDirection: "column", justifyContent: "center" }}>
          <div
            style={{
              display: "flex",
              fontSize: titleSize,
              lineHeight: 1.05,
              letterSpacing: -1.5,
              maxHeight: 210,
              overflow: "hidden",
            }}
          >
            {title}
          </div>
          {subtitle ? (
            <div
              style={{
                display: "flex",
                marginTop: 22,
                fontSize: 28,
                lineHeight: 1.3,
                color: "#574c42",
                maxWidth: 900,
                maxHeight: 76,
                overflow: "hidden",
              }}
            >
              {subtitle}
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ display: "flex", width: 64, height: 4, background: "#b45309" }} />
          <div style={{ display: "flex", fontSize: 26, color: "#574c42" }}>
            {[era, room].filter(Boolean).join(" · ")}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
