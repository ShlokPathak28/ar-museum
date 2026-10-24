import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { prisma } from "@/lib/db";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "The collection",
  description: "Every exhibit in Dharohar's collection, with 3D models where available.",
};

export default async function ExhibitsPage() {
  const exhibits = await prisma.exhibit.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { code: "asc" },
    include: {
      room: true,
      gallery: { where: { kind: "MODEL" }, select: { id: true }, take: 1 },
    },
  });

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-24 sm:px-8">
      <header className="flex items-center justify-between gap-4 py-6">
        <Link href="/" className="flex items-baseline gap-3">
          <span className="font-mono text-sm uppercase tracking-[0.2em] text-ochre">
            Dharohar
          </span>
          <span className="hidden text-sm text-ink-soft sm:inline">
            Museum of Material Culture
          </span>
        </Link>
        <Link
          href="/markers"
          className="rounded-full border border-ink/15 px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-ink-soft transition-colors hover:border-ink/40"
        >
          Marker cards
        </Link>
      </header>

      <section className="border-t border-ink/10 pt-10">
        <h1 className="font-serif text-4xl tracking-tight sm:text-5xl">The collection</h1>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          {exhibits.length} objects across two rooms. Each entry opens with its history, the
          material it is made from, and — where a model exists — an object you can turn over.
        </p>
      </section>

      <div className="mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {exhibits.map((exhibit) => (
          <article key={exhibit.id}>
            <Link href={`/exhibits/${exhibit.slug}`} className="group block">
              <div className="overflow-hidden rounded-xl border border-ink/10 bg-sand-deep">
                <Image
                  src={exhibit.heroImage}
                  alt={exhibit.title}
                  width={1200}
                  height={900}
                  unoptimized
                  className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              </div>
              <div className="mt-3 flex items-baseline justify-between gap-3">
                <h2 className="font-medium group-hover:text-ochre">{exhibit.title}</h2>
                <span className="font-mono text-[11px] text-ink-soft">{exhibit.code}</span>
              </div>
              <p className="mt-1 text-sm text-ink-soft">
                {exhibit.era} · {exhibit.room.name}
              </p>
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-soft">
                {exhibit.summary}
              </p>
            </Link>
            {exhibit.gallery.length > 0 ? (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-ochre/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-ochre">
                3D model
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </main>
  );
}
