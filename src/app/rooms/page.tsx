import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

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

  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl px-5 pb-24 sm:px-8">
        <section className="border-b border-ink/10 pb-10 pt-12">
          <p className="font-mono text-[11px] tracking-[0.18em] text-ink-soft">
            {rooms.length} rooms · two floors
          </p>
          <h1 className="mt-4 font-serif text-4xl tracking-tight sm:text-5xl">Rooms</h1>
          <p className="mt-5 max-w-2xl leading-relaxed text-ink-soft">
            Each room has a 360° view you can steer by hand or by moving your phone. The markers
            on the panorama open the object they sit beside.
          </p>
        </section>

        <ul className="exhibit-grid mt-10 grid gap-8 sm:grid-cols-2">
          {rooms.map((room) => (
            <li key={room.id}>
              <Link href={`/rooms/${room.slug}`} className="group block">
                <div className="border border-ink/12 bg-paper p-2 transition-colors duration-300 group-hover:border-ink/30">
                  <div className="relative aspect-[2/1] overflow-hidden bg-chalk-deep">
                    {room.panoramaUrl ? (
                      <Image
                        src={room.panoramaUrl}
                        alt={`Panorama of ${room.name}`}
                        fill
                        sizes="(min-width: 640px) 45vw, 100vw"
                        unoptimized
                        className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="grid h-full place-items-center px-4 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
                        Panorama pending
                      </div>
                    )}
                    <span className="absolute left-2 top-2 bg-paper/95 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-soft">
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
    </>
  );
}
