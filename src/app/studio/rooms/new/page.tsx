import type { Metadata } from "next";
import Link from "next/link";

import RoomForm from "../RoomForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "New room",
};

export default function NewRoomPage() {
  return (
    <main id="main" tabIndex={-1} className="mx-auto w-full max-w-4xl px-5 pb-24 pt-10 sm:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-ink/15 pb-5">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-oxblood">
            A new room
          </p>
          <h1 className="mt-2 font-serif text-4xl tracking-tight">New room</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
            A room is a place: a floor, a 360° view, and the objects that sit in it. Create it
            here, then move objects in from its page.
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
        <RoomForm />
      </div>
    </main>
  );
}
