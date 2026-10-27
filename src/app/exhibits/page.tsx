import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import ExhibitBrowser, { type BrowseExhibit } from "@/components/exhibit/ExhibitBrowser";
import ExhibitCard from "@/components/exhibit/ExhibitCard";
import PageMasthead from "@/components/site/PageMasthead";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import { accentForTags } from "@/lib/accent";
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
    accent: accentForTags(exhibit.tags).color,
  }));

  return (
    <>
      <SiteHeader />
      <PageMasthead
        eyebrow={`${exhibits.length} objects · two rooms`}
        title="The collection"
        lede="Each entry opens with its history, the material it is made from, and, where a model exists, an object you can turn over."
        aside={
          <Link
            href="/markers"
            className="text-chalk/60 underline-offset-4 transition-colors hover:text-chalk hover:underline"
          >
            Printable marker cards
          </Link>
        }
      />

      <main className="mx-auto w-full max-w-6xl px-5 pb-24 sm:px-8">
        <Suspense
          fallback={
            <>
              <div className="mt-8 border border-ink/12 bg-paper p-4 sm:p-5" aria-hidden>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="h-9 flex-1 animate-pulse bg-chalk-deep" />
                  <div className="h-9 w-36 animate-pulse bg-chalk-deep" />
                  <div className="h-9 w-32 animate-pulse bg-chalk-deep" />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <div className="h-7 w-20 animate-pulse bg-chalk-deep" />
                  <div className="h-7 w-28 animate-pulse bg-chalk-deep" />
                  <div className="h-7 w-24 animate-pulse bg-chalk-deep" />
                </div>
              </div>
              <div className="exhibit-grid mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
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
      <SiteFooter />
    </>
  );
}
