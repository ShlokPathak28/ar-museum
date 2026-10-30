import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/db";
import { formatBytes } from "@/lib/model-upload";
import { formatDate } from "@/lib/format-date";

import DeleteRoomButton from "../DeleteRoomButton";
import RoomExhibits from "../RoomExhibits";
import RoomForm from "../RoomForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Edit room",
};

type Props = { params: Promise<{ id: string }> };

export default async function EditRoomPage({ params }: Props) {
  const { id } = await params;

  const room = await prisma.room.findUnique({
    where: { id },
    include: {
      panorama: { select: { filename: true, size: true, width: true, height: true } },
      exhibits: {
        orderBy: { code: "asc" },
        select: { id: true, code: true, title: true, status: true },
      },
    },
  });

  if (!room) notFound();

  const [elsewhere, otherRooms] = await Promise.all([
    prisma.exhibit.findMany({
      where: { roomId: { not: id } },
      orderBy: { code: "asc" },
      select: {
        id: true,
        code: true,
        title: true,
        status: true,
        room: { select: { name: true } },
      },
    }),
    prisma.room.findMany({
      where: { id: { not: id } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const panoramaState = room.panorama
    ? `Uploaded ${room.panorama.width}×${room.panorama.height} · ${formatBytes(room.panorama.size)}`
    : room.panoramaUrl
      ? "Panorama from /public"
      : "No panorama yet";

  return (
    <main id="main" tabIndex={-1} className="mx-auto w-full max-w-4xl px-5 pb-24 pt-10 sm:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-ink/15 pb-5">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-oxblood">
            {room.floor} · {room.exhibits.length}{" "}
            {room.exhibits.length === 1 ? "object" : "objects"} · {panoramaState}
          </p>
          <h1 className="mt-2 font-serif text-4xl tracking-tight">{room.name}</h1>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
            Edited {formatDate(room.updatedAt)} · /rooms/{room.slug}
          </p>
        </div>

        <Link
          href="/studio/rooms"
          className="text-[13px] text-ink-soft transition-colors hover:text-ink"
        >
          ← All rooms
        </Link>
      </div>

      <div className="mt-8">
        <RoomForm
          room={{
            id: room.id,
            slug: room.slug,
            name: room.name,
            floor: room.floor,
            intro: room.intro ?? "",
            panoramaUrl: room.panoramaUrl ?? "",
            panoramaCredit: room.panoramaCredit ?? "",
          }}
        />
      </div>

      <div className="mt-14 border-t border-ink/10 pt-10">
        <RoomExhibits
          roomId={room.id}
          roomName={room.name}
          inRoom={room.exhibits}
          elsewhere={elsewhere.map((exhibit) => ({
            id: exhibit.id,
            code: exhibit.code,
            title: exhibit.title,
            status: exhibit.status,
            roomName: exhibit.room.name,
          }))}
          otherRooms={otherRooms}
        />
      </div>

      <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-ink/10 pt-6">
        <DeleteRoomButton
          id={room.id}
          name={room.name}
          exhibitCount={room.exhibits.length}
        />
        <Link
          href={`/rooms/${room.slug}`}
          className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft hover:text-ink"
        >
          View public page ↗
        </Link>
      </div>
    </main>
  );
}
