import type { Metadata } from "next";
import Link from "next/link";

import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Rooms",
};

export default async function StudioRoomsPage() {
  const rooms = await prisma.room.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { exhibits: true } },
      panorama: { select: { size: true, width: true, height: true } },
    },
  });

  const withPanorama = rooms.filter((room) => room.panoramaUrl !== null).length;
  const floors = new Set(rooms.map((room) => room.floor)).size;

  return (
    <main id="main" tabIndex={-1} className="mx-auto w-full max-w-6xl px-5 pb-24 pt-10 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-ink/15 pb-5">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-oxblood">
            {rooms.length} {rooms.length === 1 ? "room" : "rooms"} · {floors}{" "}
            {floors === 1 ? "floor" : "floors"} · {withPanorama} with a 360° view
          </p>
          <h1 className="mt-2 font-serif text-4xl tracking-tight">Rooms</h1>
        </div>
        <Link
          href="/studio/rooms/new"
          className="bg-ink px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-oxblood"
        >
          New room
        </Link>
      </div>

      {rooms.length === 0 ? (
        <p className="mt-8 border border-dashed border-ink/20 px-5 py-8 text-center text-sm text-ink-soft">
          No rooms yet. Create one before adding an object to the collection.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-ink/10 border-y border-ink/10">
          {rooms.map((room) => (
            <li key={room.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 py-4">
                <div className="min-w-0">
                  <Link
                    href={`/studio/rooms/${room.id}`}
                    className="font-serif text-xl tracking-tight hover:text-oxblood"
                  >
                    {room.name}
                  </Link>
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
                    {room.floor} · {room.slug}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
                  <span>
                    {room._count.exhibits} {room._count.exhibits === 1 ? "object" : "objects"}
                  </span>
                  <span className={room.panoramaUrl ? "text-ink" : "text-rust"}>
                    {room.panoramaUrl
                      ? room.panorama
                        ? `Uploaded ${room.panorama.width}×${room.panorama.height}`
                        : "Path only"
                      : "No panorama"}
                  </span>
                  <Link
                    href={`/rooms/${room.slug}`}
                    className="text-ink-soft transition-colors hover:text-ink"
                  >
                    View ↗
                  </Link>
                  <Link
                    href={`/studio/rooms/${room.id}`}
                    className="text-ink-soft transition-colors hover:text-ink"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
