import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import PageMasthead from "@/components/site/PageMasthead";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import { prisma } from "@/lib/db";

// Room copy changes from the studio, rarely.
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Rooms",
  description: "The rooms of the Dharohar Museum, each with a 360° view and its objects.",
  alternates: { canonical: "/rooms" },
};

export default async function RoomsPage() {
  const rooms = await prisma.room.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { exhibits: { where: { status: "PUBLISHED" } } } },
    },
  });

  const floors = new Set(rooms.map((room) => room.floor)).size;

  return (
    <>
      <SiteHeader />
      <PageMasthead
        eyebrow={`${rooms.length} ${rooms.length === 1 ? "room" : "rooms"} · ${floors} ${
          floors === 1 ? "floor" : "floors"
        }`}
        title="The rooms"
        lede="Each room has a 360° view you can steer by hand or by moving your phone. The markers on the panorama open the object they sit beside."
      />

      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-5xl px-5 pb-24 sm:px-8">
        <ul className="exhibit-grid mt-12 grid gap-8 sm:grid-cols-2">
          {rooms.map((room, index) => (
            <li key={room.id}>
              <Link href={`/rooms/${room.slug}`} className="group block">
                <div className="bg-ink p-2 shadow-[0_32px_70px_-45px_rgba(22,20,15,0.85)] transition-transform duration-500 group-hover:-translate-y-1">
                  <div className="relative aspect-[2/1] overflow-hidden bg-vault">
                    {room.panoramaUrl ? (
                      <Image
                        src={room.panoramaUrl}
                        alt={`Panorama of ${room.name}`}
                        fill
                        sizes="(min-width: 640px) 45vw, 100vw"
                        // The first two are the first row on a desktop grid and
                        // the whole page above the fold on a phone; the rest can
                        // wait. The card only needs a thumbnail, so the optimizer
                        // serves one instead of the 700 KB panorama.
                        loading={index < 2 ? "eager" : "lazy"}
                        fetchPriority={index === 0 ? "high" : undefined}
                        className="object-cover opacity-90 transition duration-700 group-hover:scale-[1.03] group-hover:opacity-100"
                      />
                    ) : (
                      <div className="grid h-full place-items-center px-4 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-chalk/50">
                        Panorama pending
                      </div>
                    )}
                    <span className="absolute left-2 top-2 border border-chalk/25 bg-vault/80 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-chalk/70">
                      360°
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-serif text-2xl tracking-tight transition-colors group-hover:text-oxblood">
                    {room.name}
                  </h2>
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
                    {room._count.exhibits} {room._count.exhibits === 1 ? "object" : "objects"}
                  </span>
                </div>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
                  {room.floor}
                </p>
                {room.intro ? (
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-soft">{room.intro}</p>
                ) : null}
                <span className="mt-3 block h-px w-8 bg-oxblood transition-[width] duration-500 group-hover:w-full" />
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <SiteFooter />
    </>
  );
}
