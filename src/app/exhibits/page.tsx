import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import ExhibitBrowser, { type BrowseExhibit } from "@/components/exhibit/ExhibitBrowser";
import ExhibitCard from "@/components/exhibit/ExhibitCard";
import { prisma } from "@/lib/db";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "The collection",
  description: "Every exhibit in Dharohar's collection, with 3D models where available.",
  alternates: { canonical: "/exhibits" },
};

function splitTags(raw: string): string[] {
  return raw
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export default async function ExhibitsPage() {
  const exhibits = await prisma.exhibit.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { code: "asc" },
    include: {
      room: true,
      gallery: { where: { kind: "MODEL" }, select: { id: true }, take: 1 },
    },
  });

  // The fallback grid below only covers the moment before the browser hydrates;
  // filtering is client-side, so the page itself stays statically rendered.
  const browse: BrowseExhibit[] = exhibits.map((exhibit) => ({
    slug: exhibit.slug,
    code: exhibit.code,
    title: exhibit.title,
    era: exhibit.era,
    roomName: exhibit.room.name,
    summary: exhibit.summary,
    heroImage: exhibit.heroImage,
    hasModel: Boolean(exhibit.modelUrl) || exhibit.gallery.length > 0,
    roomSlug: exhibit.room.slug,
    tags: splitTags(exhibit.tags),
  }));

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

      <Suspense
        fallback={
          <>
            <div className="mt-8 h-[172px] rounded-xl border border-ink/10 bg-paper" aria-hidden />
            <div className="mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {browse.map((exhibit) => (
                <ExhibitCard key={exhibit.slug} exhibit={exhibit} showSummary />
              ))}
            </div>
          </>
        }
      >
        <ExhibitBrowser exhibits={browse} />
      </Suspense>
    </main>
  );
}
