import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import ModelViewer from "@/components/three/ModelViewer";
import { prisma } from "@/lib/db";

export const revalidate = 60;

type Params = { params: Promise<{ slug: string }> };

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

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const exhibit = await prisma.exhibit.findUnique({
    where: { slug },
    select: { title: true, subtitle: true, summary: true, heroImage: true },
  });

  if (!exhibit) return { title: "Exhibit not found" };

  return {
    title: exhibit.title,
    description: exhibit.subtitle ?? exhibit.summary,
    openGraph: {
      title: `${exhibit.title} · Dharohar`,
      description: exhibit.subtitle ?? exhibit.summary,
      images: [{ url: exhibit.heroImage, alt: exhibit.title }],
    },
  };
}

export default async function ExhibitPage({ params }: Params) {
  const { slug } = await params;

  const exhibit = await prisma.exhibit.findUnique({
    where: { slug },
    include: {
      room: true,
      hotspots: { orderBy: { order: "asc" } },
      gallery: { orderBy: { order: "asc" } },
    },
  });

  if (!exhibit || exhibit.status !== "PUBLISHED") notFound();

  const facts = parseFacts(exhibit.facts);
  const paragraphs = exhibit.body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const modelMedia = exhibit.gallery.find((media) => media.kind === "MODEL");
  const modelUrl = exhibit.modelUrl ?? modelMedia?.url;
  const period = formatRange(exhibit.yearStart, exhibit.yearEnd);

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-24 sm:px-8">
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
            <section className="mt-8">
              <div className="h-[55vh] min-h-[320px] overflow-hidden rounded-2xl border border-ink/10 bg-sand-deep">
                <ModelViewer src={modelUrl} alt={exhibit.title} />
              </div>
              <p className="mt-3 text-xs leading-relaxed text-ink-soft">
                {modelMedia?.credit
                  ? `${modelMedia.credit}. Shown as a placeholder until this object is scanned.`
                  : "Placeholder model, pending a scan of the object."}
              </p>
            </section>
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

          {exhibit.hotspots.length > 0 ? (
            <section className="rounded-xl border border-ink/10 bg-paper p-5">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft">
                Details
              </h2>
              <dl className="mt-3 space-y-3 text-sm leading-relaxed">
                {exhibit.hotspots.map((hotspot) => (
                  <div key={hotspot.id}>
                    <dt className="font-medium">{hotspot.label}</dt>
                    <dd className="text-ink-soft">{hotspot.body}</dd>
                  </div>
                ))}
              </dl>
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
    </main>
  );
}
