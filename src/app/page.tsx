import Image from "next/image";
import Link from "next/link";

import ExhibitCard from "@/components/exhibit/ExhibitCard";
import GalleryDoors from "@/components/site/GalleryDoors";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import { accentForTags } from "@/lib/accent";
import { prisma } from "@/lib/db";

// Revalidate the landing page every minute (ISR demo).
export const revalidate = 60;

const MODES = [
  {
    label: "3D",
    verb: "Turn it over",
    body: "A real-time scan you can rotate, with numbered notes on the parts a wall label cannot point to.",
  },
  {
    label: "AR",
    verb: "Set it down",
    body: "One tap places the object in your room at true scale, through the phone's camera.",
  },
  {
    label: "VR",
    verb: "Step inside",
    body: "Both rooms are photographed in 360°. Drag to look, or move the phone and the room moves with you.",
  },
];

const pad = (value: number) => String(value).padStart(2, "0");

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
        {/* The hall. One object under one light, the rest of the room in shadow. */}
        <section className="grain relative isolate overflow-hidden bg-vault text-chalk">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-[18%] -top-[30%] h-[90%] w-[78%] rounded-full bg-[radial-gradient(closest-side,rgba(240,214,164,0.2),transparent)] blur-2xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-vault to-transparent"
          />

          <div className="relative z-[2] mx-auto grid w-full max-w-6xl gap-16 px-5 pb-20 pt-16 sm:px-8 lg:grid-cols-[1.06fr_0.94fr] lg:items-center lg:gap-14 lg:pb-28 lg:pt-24">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-brass-light">
                Gallery 01 · Ground floor · Now on view
              </p>

              <h1 className="mt-7 font-serif text-[clamp(3.2rem,5.4vw,4.8rem)] leading-[0.92] tracking-[-0.04em]">
                Nothing here is
                <br />
                behind glass.
              </h1>

              <p className="mt-8 max-w-md text-[16px] leading-[1.75] text-chalk/60">
                Dharohar is a small museum of material culture. Point your phone at a marker and
                the object opens: its history, the material it is made from, a model you can turn
                over, and the room it lives in.
              </p>

              <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-5">
                <Link
                  href="/exhibits"
                  className="bg-brass-light px-6 py-3.5 text-[13px] font-medium text-vault transition-colors hover:bg-chalk"
                >
                  Enter the collection
                </Link>
                <Link
                  href="/scan"
                  className="group inline-flex items-center gap-3 text-[13px] text-chalk/60 transition-colors hover:text-chalk"
                >
                  Scan a marker
                  <span
                    aria-hidden
                    className="h-px w-7 bg-chalk/30 transition-[width] duration-300 group-hover:w-12 group-hover:bg-brass-light"
                  />
                </Link>
              </div>

              <dl className="mt-14 grid max-w-md grid-cols-3 gap-6 border-t border-chalk/15 pt-6">
                <div>
                  <dt className="font-mono text-[9px] uppercase tracking-[0.22em] text-chalk/40">
                    Objects
                  </dt>
                  <dd className="mt-2 font-serif text-3xl leading-none">
                    {pad(exhibits.length)}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[9px] uppercase tracking-[0.22em] text-chalk/40">
                    Rooms
                  </dt>
                  <dd className="mt-2 font-serif text-3xl leading-none">{pad(rooms.length)}</dd>
                </div>
                <div>
                  <dt className="font-mono text-[9px] uppercase tracking-[0.22em] text-chalk/40">
                    Models
                  </dt>
                  <dd className="mt-2 font-serif text-3xl leading-none">{pad(modelCount)}</dd>
                </div>
              </dl>
            </div>

            {lead ? (
              <figure className="relative mx-auto w-full max-w-[27rem] lg:max-w-none">
                <div className="relative aspect-[4/5] overflow-hidden">
                  <div
                    aria-hidden
                    className="absolute inset-0 bg-[radial-gradient(50%_45%_at_50%_42%,rgba(240,214,164,0.3),rgba(240,214,164,0.05)_56%,transparent_76%)]"
                  />
                  <Image
                    src={lead.heroImage}
                    alt={lead.title}
                    fill
                    sizes="(min-width: 1024px) 44vw, 90vw"
                    unoptimized
                    priority
                    className="object-cover opacity-90 saturate-[0.9]"
                    style={{
                      maskImage:
                        "radial-gradient(72% 68% at 50% 46%, #000 36%, transparent 76%)",
                      WebkitMaskImage:
                        "radial-gradient(72% 68% at 50% 46%, #000 36%, transparent 76%)",
                    }}
                  />
                  <div
                    aria-hidden
                    className="absolute bottom-[15%] left-1/2 h-px w-[62%] -translate-x-1/2 bg-gradient-to-r from-transparent via-brass-light/50 to-transparent"
                  />
                </div>

                <figcaption className="relative -mt-10 ml-0 w-[88%] border-t-2 border-brass bg-chalk p-5 text-ink shadow-[0_36px_90px_-30px_rgba(0,0,0,0.9)] sm:p-6">
                  <div className="flex items-baseline justify-between gap-4 border-b border-ink/15 pb-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-oxblood">
                      {lead.code}
                    </p>
                    <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-soft">
                      {lead.era}
                    </p>
                  </div>
                  <p className="mt-3 font-serif text-2xl leading-tight tracking-tight">
                    {lead.title}
                  </p>
                  <p className="mt-1.5 text-[13px] text-ink-soft">
                    {lead.room.name} · {lead.room.floor}
                  </p>
                </figcaption>
              </figure>
            ) : null}
          </div>
        </section>

        {/* The reading room. Cool plaster after the dark hall. */}
        <section className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8">
          <div className="grid gap-12 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-oxblood">
                The guide
              </p>
              <h2 className="mt-4 text-balance font-serif text-[clamp(2rem,3.6vw,3rem)] leading-[1.02] tracking-tight">
                Three ways to look at one object.
              </h2>
              <p className="mt-5 max-w-xs text-sm leading-relaxed text-ink-soft">
                The label is the beginning, not the exhibit. Each page opens the object in the way
                the screen in your hand allows.
              </p>
            </div>

            <div className="grid gap-10 sm:grid-cols-3 sm:gap-0">
              {MODES.map((mode, index) => (
                <article
                  key={mode.label}
                  className={`${index > 0 ? "sm:border-l sm:border-ink/10 sm:pl-8" : ""} ${
                    index < MODES.length - 1 ? "sm:pr-8" : ""
                  }`}
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">
                    {mode.label}
                  </p>
                  <h3 className="mt-4 font-serif text-[2rem] leading-[0.98] tracking-tight">
                    {mode.verb}
                  </h3>
                  <p className="mt-4 max-w-[15rem] text-sm leading-relaxed text-ink-soft">
                    {mode.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-5 pb-20 sm:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-ink/15 pb-5">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-oxblood">
                On view
              </p>
              <h2 className="mt-2 font-serif text-4xl tracking-tight">From the collection</h2>
            </div>
            <Link
              href="/exhibits"
              className="whitespace-nowrap text-[13px] text-ink-soft transition-colors hover:text-ink"
            >
              All {exhibits.length} objects
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

        {/* The building at night. The panoramas are the only bright things. */}
        <section className="grain relative isolate overflow-hidden bg-vault text-chalk">
          <div className="relative z-[2] mx-auto w-full max-w-6xl px-5 py-20 sm:px-8">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-chalk/15 pb-5">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-brass-light">
                  The building
                </p>
                <h2 className="mt-2 font-serif text-4xl tracking-tight">Walk the rooms</h2>
              </div>
              <Link
                href="/rooms"
                className="whitespace-nowrap text-[13px] text-chalk/55 transition-colors hover:text-chalk"
              >
                Both rooms
              </Link>
            </div>

            <ul className="mt-10 grid gap-8 sm:grid-cols-2">
              {rooms.map((room) => (
                <li key={room.id}>
                  <Link href={`/rooms/${room.slug}`} className="group block">
                    <div className="relative aspect-[16/10] overflow-hidden border border-chalk/10">
                      {room.panoramaUrl ? (
                        <Image
                          src={room.panoramaUrl}
                          alt={`Panorama of ${room.name}`}
                          fill
                          sizes="(min-width: 640px) 45vw, 100vw"
                          unoptimized
                          className="object-cover opacity-80 transition duration-700 group-hover:scale-[1.03] group-hover:opacity-100"
                        />
                      ) : null}
                      <div
                        aria-hidden
                        className="absolute inset-0 bg-gradient-to-t from-vault via-vault/10 to-transparent"
                      />
                      <span className="absolute right-4 top-4 border border-chalk/30 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.2em] text-chalk/70">
                        360°
                      </span>
                      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5">
                        <div>
                          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-brass-light">
                            {room.floor}
                          </p>
                          <h3 className="mt-1 font-serif text-3xl tracking-tight">
                            {room.name}
                          </h3>
                        </div>
                        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-chalk/45">
                          {room._count.exhibits} objects
                        </span>
                      </div>
                    </div>
                    <p className="mt-3 max-w-md text-[13px] leading-relaxed text-chalk/50">
                      {room.intro}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
