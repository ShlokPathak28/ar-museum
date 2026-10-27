import type { Metadata } from "next";

import { prisma } from "@/lib/db";

import ExhibitForm from "../ExhibitForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "New exhibit",
};

export default async function NewExhibitPage() {
  const rooms = await prisma.room.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, floor: true },
  });

  return (
    <main className="mx-auto w-full max-w-4xl px-5 pb-24 pt-10 sm:px-8">
      <div className="border-b border-ink/15 pb-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-oxblood">
          New object
        </p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight">Add to the collection</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
          Save it as a draft first. Nothing reaches the gallery until the status is Published, and
          the QR code on the marker cards keeps working the moment it is.
        </p>
      </div>

      {rooms.length === 0 ? (
        <p className="mt-8 border border-dashed border-ink/20 px-5 py-10 text-center text-sm text-ink-soft">
          A room is needed before an object can be placed. Run the seed to create the two rooms.
        </p>
      ) : (
        <div className="mt-8">
          <ExhibitForm rooms={rooms} />
        </div>
      )}
    </main>
  );
}
