import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import ExhibitViewer from "@/components/exhibit/ExhibitViewer";
import { prisma } from "@/lib/db";
import { absoluteUrl, siteName, siteUrl } from "@/lib/site";
import type { HotspotData } from "@/types/exhibit";

import ReviewSection from "./ReviewSection";

export const revalidate = 60;

type Params = { params: Promise<{ slug: string }> };

/** Exhibits published at build time get prerendered; anything added later is ISR. */
export async function generateStaticParams() {
  const exhibits = await prisma.exhibit.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true },
  });

  return exhibits.map((exhibit) => ({ slug: exhibit.slug }));
}

/** `facts` is a JSON string column, so it has to be parsed defensively. */
function parseFacts(raw: string): string[] {
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value)
      ? value.filter((fact): fact is string => typeof fact === "string")
      : [];
  } catch {
    return [];
  }
}

function formatYear(year: number): string {
  return year < 0 ? `${Math.abs(year)} BCE` : `${year} CE`;
}

function formatRange(start: number | null, end: number | null): string | null {
  if (start === null && end === null) return null;
  if (start !== null && end !== null) {
    return start === end ? formatYear(start) : `${formatYear(start)} – ${formatYear(end)}`;
  }
  return formatYear((start ?? end) as number);
}

/** schema.org wants an ISO date; the collection only knows a year. */
function isoYear(year: number | null): string | undefined {
  if (year === null || year === 0) return undefined;
  const magnitude = String(Math.abs(year)).padStart(4, "0");
  return year < 0 ? `-${magnitude}` : magnitude;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const exhibit = await prisma.exhibit.findUnique({
    where: { slug },
    select: { title: true, subtitle: true, summary: true, heroImage: true },
  });

  if (!exhibit) return { title: "Exhibit not found" };

  const description = exhibit.subtitle ?? exhibit.summary;

  return {
    title: exhibit.title,
    description,
    alternates: { canonical: `/exhibits/${slug}` },
    openGraph: {
      type: "article",
      title: `${exhibit.title} · ${siteName}`,
      description,
      url: absoluteUrl(`/exhibits/${slug}`),
    },
    twitter: {
      card: "summary_large_image",
      title: `${exhibit.title} · ${siteName}`,
      description,
    },
  };
}

export default async function ExhibitPage({ params }: Params) {
  const { slug } = await params;

  const [exhibit, reviewStats] = await Promise.all([
    prisma.exhibit.findUnique({
      where: { slug },
      include: {
        room: true,
        hotspots: { orderBy: { order: "asc" } },
        gallery: { orderBy: { order: "asc" } },
        reviews: {
          where: { status: "VISIBLE" },
          orderBy: { createdAt: "desc" },
          take: 12,
          select: {
            id: true,
            rating: true,
            body: true,
            createdAt: true,
            user: { select: { name: true } },
          },
        },
      },
    }),
    // A separate aggregate so the average covers every review, not just the
    // twelve rendered below.
    prisma.review.aggregate({
      where: { exhibit: { slug }, status: "VISIBLE" },
      _avg: { rating: true },
      _count: { _all: true },
    }),
  ]);

  if (!exhibit || exhibit.status !== "PUBLISHED") notFound();

  const facts = parseFacts(exhibit.facts);
  const paragraphs = exhibit.body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const modelMedia = exhibit.gallery.find((media) => media.kind === "MODEL");
  const modelUrl = exhibit.modelUrl ?? modelMedia?.url;
  const period = formatRange(exhibit.yearStart, exhibit.yearEnd);

  const hotspots: HotspotData[] = exhibit.hotspots.map((hotspot) => ({
    id: hotspot.id,
    label: hotspot.label,
    body: hotspot.body,
    x: hotspot.posX,
    y: hotspot.posY,
    z: hotspot.posZ,
  }));

  const caption = modelMedia?.credit
    ? `${modelMedia.credit}. Placeholder asset until this object is scanned.`
    : "Placeholder model, pending a scan of the object.";

  const reviews = exhibit.reviews.map((review) => ({
    id: review.id,
    rating: review.rating,
    body: review.body,
    createdAt: review.createdAt.toISOString(),
    authorName: review.user.name,
  }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: exhibit.title,
    alternateName: exhibit.subtitle ?? undefined,
    description: exhibit.summary,
    identifier: exhibit.code,
    url: absoluteUrl(`/exhibits/${exhibit.slug}`),
    image: absoluteUrl(exhibit.heroImage),
    dateCreated: isoYear(exhibit.yearStart),
    temporalCoverage: exhibit.era,
    keywords: exhibit.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .join(", "),
    isPartOf: {
      "@type": "Museum",
      name: "Dharohar Museum of Material Culture",
      url: siteUrl,
    },
    contentLocation: { "@type": "Place", name: exhibit.room.name },
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-24 sm:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <header className="flex items-center justify-between gap-4 py-6">
        <Link href="/exhibits" className="font-mono text-[11px] uppercase tracking-widest text-ink-soft hover:text-ink">
          ← Collection
        </Link>
        <span className="font-mono text-[11px] uppercase tracking-widest text-ink-soft">
          {exhibit.code}
        </span>
      </header>

      <div className="grid gap-10 border-t border-ink/10 pt-10 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-ochre">
            {exhibit.room.name}
          </p>
          <h1 className="mt-3 text-balance font-serif text-4xl leading-tight tracking-tight sm:text-5xl">
            {exhibit.title}
          </h1>
          {exhibit.subtitle ? (
            <p className="mt-3 text-lg leading-relaxed text-ink-soft">{exhibit.subtitle}</p>
          ) : null}

          {modelUrl ? (
            <ExhibitViewer
              modelUrl={modelUrl}
              alt={exhibit.title}
              hotspots={hotspots}
              caption={caption}
              usdzUrl={exhibit.modelUsdz}
            />
          ) : (
            <div className="mt-8 rounded-2xl border border-dashed border-ink/20 bg-paper/60 px-6 py-10 text-center">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft">
                No 3D model yet
              </p>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-ink-soft">
                This object is documented in text and images. Its scan is scheduled for a later
                phase of the project.
              </p>
            </div>
          )}

          <div className="mt-10 space-y-5 text-[15px] leading-relaxed text-ink/90">
            {paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-8 lg:self-start">
          <div className="overflow-hidden rounded-xl border border-ink/10 bg-paper">
            <Image
              src={exhibit.heroImage}
              alt={exhibit.title}
              width={1200}
              height={900}
              unoptimized
              className="aspect-[4/3] w-full object-cover"
            />
            <dl className="divide-y divide-ink/10 text-sm">
              <div className="flex justify-between gap-4 px-4 py-2.5">
                <dt className="text-ink-soft">Code</dt>
                <dd className="font-mono">{exhibit.code}</dd>
              </div>
              <div className="flex justify-between gap-4 px-4 py-2.5">
                <dt className="text-ink-soft">Room</dt>
                <dd>{exhibit.room.name}</dd>
              </div>
              <div className="flex justify-between gap-4 px-4 py-2.5">
                <dt className="text-ink-soft">Era</dt>
                <dd className="text-right">{exhibit.era}</dd>
              </div>
              {period ? (
                <div className="flex justify-between gap-4 px-4 py-2.5">
                  <dt className="text-ink-soft">Date</dt>
                  <dd className="text-right">{period}</dd>
                </div>
              ) : null}
            </dl>
          </div>

          {facts.length > 0 ? (
            <section className="rounded-xl border border-ink/10 bg-paper p-5">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft">
                Four things to notice
              </h2>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed">
                {facts.map((fact) => (
                  <li key={fact} className="flex gap-2">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ochre" />
                    <span>{fact}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="rounded-xl border border-ink/10 bg-paper p-5 text-sm">
            <p className="leading-relaxed text-ink-soft">
              {modelUrl
                ? "Open this page on a phone and tap “Place in your room” to set the object down at real scale."
                : "This exhibit has no AR mode yet."}
            </p>
            <Link
              href="/markers"
              className="mt-3 inline-block font-medium text-ochre hover:underline"
            >
              Print the marker card →
            </Link>
          </div>
        </aside>
      </div>

      <ReviewSection
        exhibitId={exhibit.id}
        slug={exhibit.slug}
        reviews={reviews}
        average={reviewStats._avg.rating}
        count={reviewStats._count._all}
      />
    </main>
  );
}
