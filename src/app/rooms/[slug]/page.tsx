import type { Metadata } from "next";
import { notFound } from "next/navigation";

import ExhibitCard from "@/components/exhibit/ExhibitCard";
import RoomStage from "@/components/room/RoomStage";
import PageMasthead from "@/components/site/PageMasthead";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import { accentForTags } from "@/lib/accent";
import { prisma } from "@/lib/db";
import { ROOM_MARKERS } from "@/lib/room-markers";
import { absoluteUrl, siteName } from "@/lib/site";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const rooms = await prisma.room.findMany({ select: { slug: true } });
  return rooms.map((room) => ({ slug: room.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const room = await prisma.room.findUnique({
    where: { slug },
    select: { name: true, floor: true, intro: true },
  });

  if (!room) return { title: "Room not found" };

  const description = room.intro ?? `${room.name}, ${room.floor}, at ${siteName}.`;

  return {
    title: room.name,
    description,
    alternates: { canonical: `/rooms/${slug}` },
    openGraph: {
      type: "website",
      title: `${room.name} · ${siteName}`,
      description,
      url: absoluteUrl(`/rooms/${slug}`),
    },
  };
}

export default async function RoomPage({ params }: Props) {
  const { slug } = await params;

  const room = await prisma.room.findUnique({
    where: { slug },
    include: {
      exhibits: {
        where: { status: "PUBLISHED" },
        orderBy: { code: "asc" },
      },
    },
  });

  if (!room) notFound();

  // Markers exist for every exhibit in the room's marker table; an unpublished
  // object drops out without leaving a dead link.
  const hotspots = (ROOM_MARKERS[room.slug] ?? []).flatMap((marker) => {
    const exhibit = room.exhibits.find((item) => item.code === marker.code);
    if (!exhibit) return [];

    return [
      {
        id: exhibit.id,
        code: exhibit.code,
        label: exhibit.title,
        href: `/exhibits/${exhibit.slug}`,
        u: marker.u,
        v: marker.v,
      },
    ];
  });

  const credit = room.panoramaCredit;

  return (
    <>
      <SiteHeader back={{ href: "/rooms", label: "Rooms" }} />
      <PageMasthead
        eyebrow={`${room.floor} · ${room.exhibits.length} ${
          room.exhibits.length === 1 ? "object" : "objects"
        }`}
        title={room.name}
        lede={room.intro ?? undefined}
      />

      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-6xl px-5 pb-24 sm:px-8">
        <div className="pt-12">
          {room.panoramaUrl ? (
            <>
              <RoomStage
                src={room.panoramaUrl}
                alt={`360° panorama of ${room.name}`}
                hotspots={hotspots}
              />
              <p className="mt-3 flex flex-wrap justify-between gap-2 border-t border-ink/10 pt-3 text-[11px] leading-relaxed text-ink-soft">
                <span>Drag to look. Tap a marker to open the object.</span>
                <span>Panorama: {credit ?? "Dharohar"}</span>
              </p>
            </>
          ) : (
            <div className="border border-dashed border-ink/20 bg-paper/60 px-6 py-16 text-center">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft">
                360° scan pending
              </p>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-ink-soft">
                This room has not been photographed yet. The objects below are ready to browse.
              </p>
            </div>
          )}
        </div>

        <section aria-labelledby="room-exhibits" className="mt-14 border-t border-ink/10 pt-8">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="room-exhibits" className="font-serif text-2xl tracking-tight">
              In this room
            </h2>
            <span className="font-mono text-[11px] uppercase tracking-widest text-ink-soft">
              {room.exhibits.length} {room.exhibits.length === 1 ? "object" : "objects"}
            </span>
          </div>

          {room.exhibits.length === 0 ? (
            <p className="mt-6 border border-dashed border-ink/20 px-5 py-8 text-center text-sm text-ink-soft">
              Nothing published in this room yet.
            </p>
          ) : (
            <ul className="exhibit-grid mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {room.exhibits.map((exhibit) => (
                <li key={exhibit.id}>
                  <ExhibitCard
                    showSummary
                    exhibit={{
                      slug: exhibit.slug,
                      code: exhibit.code,
                      title: exhibit.title,
                      era: exhibit.era,
                      roomName: room.name,
                      summary: exhibit.summary,
                      heroImage: exhibit.heroImage,
                      hasModel: Boolean(exhibit.modelUrl),
                      accent: accentForTags(exhibit.tags).color,
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
