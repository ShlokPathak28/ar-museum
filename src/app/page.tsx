import Image from "next/image";
import Link from "next/link";

import ExhibitCard from "@/components/exhibit/ExhibitCard";
import GalleryDoors from "@/components/site/GalleryDoors";
import SiteHeader from "@/components/site/SiteHeader";
import { accentForTags } from "@/lib/accent";
import { prisma } from "@/lib/db";

// Revalidate the landing page every minute (ISR demo).
export const revalidate = 60;

const MODES = [
  {
    label: "3D",
    title: "Turn it over",
    body: "Every modelled object loads as a real-time scan, with hotspots that name the parts you cannot read from the label.",
  },
  {
    label: "AR",
    title: "Set it on the table",
    body: "One tap places the object in your room at true scale, through the phone's camera.",
  },
  {
    label: "VR",
    title: "Step into the room",
    body: "Both rooms are photographed in 360°. Drag to look around, or move your phone and the room moves with you.",
  },
];

export default async function HomePage() {
  const [exhibits, rooms] = await Promise.all([
    prisma.exhibit.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { code: "asc" },
      include: { room: true },
    }),
    prisma.room.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { exhibits: { where: { status: "PUBLISHED" } } } },
      },
    }),
  ]);

  const lead = exhibits.find((exhibit) => exhibit.code === "BH02") ?? exhibits[0];
  const strip = exhibits.filter((exhibit) => exhibit.id !== lead?.id).slice(0, 3);
  const modelCount = exhibits.filter((exhibit) => exhibit.modelUrl).length;

  return (
    <>
      <SiteHeader />
      <GalleryDoors />

      <main>
        <section className="relative overflow-hidden border-b border-ink/10">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(65%_55%_at_74%_-8%,#fffdf7_0%,rgba(255,253,247,0)_72%)]"
          />

          <div className="relative mx-auto grid w-full max-w-6xl gap-14 px-5 pb-20 pt-14 sm:px-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:gap-10 lg:pb-24 lg:pt-20">
            <div>
              <p className="font-mono text-[11px] tracking-[0.18em] text-ink-soft">
                Gallery 01, ground floor
              </p>

              <h1 className="mt-6 text-balance font-serif text-[clamp(2.9rem,7vw,4.9rem)] leading-[0.97] tracking-[-0.02em]">
                The exhibit explains itself.
              </h1>

              <p className="mt-7 max-w-lg text-[17px] leading-relaxed text-ink-soft">
                Point your camera at the code beside an object. Its page opens with the history,
                the material, a model you can turn over, and the room it came from.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-4">
                <Link
                  href="/exhibits"
                  className="bg-ink px-5 py-3 text-[13px] text-chalk transition-colors hover:bg-oxblood"
                >
                  Enter the collection
                </Link>
                <Link
                  href="/scan"
                  className="group inline-flex items-center gap-2 text-[13px] text-ink-soft transition-colors hover:text-ink"
                >
                  Scan a code
                  <span
                    aria-hidden
                    className="h-px w-6 bg-ink/30 transition-[width] duration-300 group-hover:w-10 group-hover:bg-oxblood"
                  />
                </Link>
              </div>

              <dl className="mt-12 grid max-w-sm grid-cols-3 gap-6 border-t border-ink/15 pt-5">
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
                    Objects
                  </dt>
                  <dd className="mt-1 font-serif text-2xl">{exhibits.length}</dd>
                </div>
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
                    Rooms
                  </dt>
                  <dd className="mt-1 font-serif text-2xl">{rooms.length}</dd>
                </div>
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
                    Models
                  </dt>
                  <dd className="mt-1 font-serif text-2xl">{modelCount}</dd>
                </div>
              </dl>
            </div>

            {lead ? (
              <figure>
                <Link href={`/exhibits/${lead.slug}`} className="group block">
                  <div className="border border-ink/15 bg-paper p-3 shadow-[0_24px_60px_-40px_rgba(22,20,15,0.65)]">
                    <div className="relative overflow-hidden bg-chalk-deep">
                      <Image
                        src={lead.heroImage}
                        alt={lead.title}
                        width={1200}
                        height={900}
                        unoptimized
                        priority
                        className="aspect-[4/3] w-full object-cover transition-transform duration-[900ms] group-hover:scale-[1.025]"
                      />
                    </div>
                  </div>

                  <figcaption className="mx-auto -mt-6 w-[88%] border border-ink/15 bg-paper px-5 py-4 shadow-[0_14px_36px_-30px_rgba(22,20,15,0.7)]">
                    <div className="flex items-baseline justify-between gap-4">
                      <p className="font-serif text-lg leading-tight tracking-tight">
                        {lead.title}
                      </p>
                      <p className="font-mono text-[10px] tracking-[0.16em] text-ink-soft">
                        {lead.code}
                      </p>
                    </div>
                    <p className="mt-1 text-[13px] text-ink-soft">
                      {lead.era} · {lead.room.name}
                    </p>
                  </figcaption>
                </Link>
              </figure>
            ) : null}
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8">
          <div className="grid gap-10 border-t border-ink/10 pt-10 sm:grid-cols-3 sm:gap-0">
            {MODES.map((mode, index) => (
              <article
                key={mode.label}
                className={`sm:px-8 ${index === 0 ? "sm:pl-0" : ""} ${
                  index > 0 ? "sm:border-l sm:border-ink/10" : ""
                }`}
              >
                <p className="font-mono text-[11px] tracking-[0.2em] text-oxblood">{mode.label}</p>
                <h2 className="mt-3 font-serif text-2xl tracking-tight">{mode.title}</h2>
                <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-soft">{mode.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-5 pb-20 sm:px-8">
          <div className="flex items-end justify-between gap-4 border-b border-ink/10 pb-4">
            <h2 className="font-serif text-3xl tracking-tight">From the collection</h2>
            <Link
              href="/exhibits"
              className="whitespace-nowrap text-[13px] text-ink-soft transition-colors hover:text-ink"
            >
              All {exhibits.length} objects →
            </Link>
          </div>

          <div className="exhibit-grid mt-8 grid gap-x-7 gap-y-10 sm:grid-cols-3">
            {strip.map((exhibit) => (
              <ExhibitCard
                key={exhibit.id}
                exhibit={{
                  slug: exhibit.slug,
                  code: exhibit.code,
                  title: exhibit.title,
                  era: exhibit.era,
                  roomName: exhibit.room.name,
                  summary: exhibit.summary,
                  heroImage: exhibit.heroImage,
                  hasModel: Boolean(exhibit.modelUrl),
                  accent: accentForTags(exhibit.tags).color,
                }}
              />
            ))}
          </div>
        </section>

        <section className="border-y border-ink/10 bg-chalk-deep/40">
          <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8">
            <div className="flex items-end justify-between gap-4">
              <h2 className="font-serif text-3xl tracking-tight">Walk the rooms</h2>
              <Link
                href="/rooms"
                className="whitespace-nowrap text-[13px] text-ink-soft transition-colors hover:text-ink"
              >
                Both rooms →
              </Link>
            </div>

            <ul className="mt-8 grid gap-7 sm:grid-cols-2">
              {rooms.map((room) => (
                <li key={room.id}>
                  <Link href={`/rooms/${room.slug}`} className="group block">
                    <div className="border border-ink/12 bg-paper p-2">
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
                        ) : null}
                        <span className="absolute left-2 top-2 bg-paper/95 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-soft">
                          360°
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-baseline justify-between gap-3">
                      <h3 className="font-serif text-xl tracking-tight transition-colors group-hover:text-oxblood">
                        {room.name}
                      </h3>
                      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
                        {room._count.exhibits} objects
                      </span>
                    </div>
                    <p className="mt-1 text-[13px] text-ink-soft">{room.floor}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <footer className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="font-serif text-sm">Dharohar · Museum of Material Culture</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
            Next.js 16 · Prisma · SQLite · WebXR
          </p>
        </footer>
      </main>
    </>
  );
}
