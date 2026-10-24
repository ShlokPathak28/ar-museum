import Image from "next/image";
import Link from "next/link";

import { prisma } from "@/lib/db";

// Revalidate the landing page every minute (ISR demo).
export const revalidate = 60;

const MODES = [
  {
    label: "3D",
    title: "Turn it over",
    body: "Every modelled exhibit loads as a real-time 3D object with annotated hotspots.",
  },
  {
    label: "AR",
    title: "Put it on your desk",
    body: "One tap hands the model to your phone, which places it in the room at true scale.",
  },
  {
    label: "VR",
    title: "Walk the gallery",
    body: "A 360° panorama of each room, steered by moving your phone.",
  },
];

export default async function HomePage() {
  const exhibits = await prisma.exhibit.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { title: "asc" },
    take: 3,
    include: { room: true },
  });

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-24 sm:px-8">
      <header className="flex items-center justify-between gap-4 py-6">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-sm uppercase tracking-[0.2em] text-ochre">
            Dharohar
          </span>
          <span className="hidden text-sm text-ink-soft sm:inline">
            Museum of Material Culture
          </span>
        </div>
        <span className="rounded-full border border-ink/15 px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-ink-soft">
          Week 1 · collection
        </span>
      </header>

      <section className="grid gap-12 border-t border-ink/10 pt-14 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-ink-soft">
            Scan · Listen · Inspect · Place
          </p>
          <h1 className="mt-5 text-balance font-serif text-5xl leading-[1.05] tracking-tight sm:text-6xl">
            The exhibit explains itself.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
            Point your camera at the code beside an object and its page opens —
            the history, the material, a narrated walkthrough, a model you can
            rotate, and an AR mode that puts the object in your room.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <span className="rounded-full bg-ochre px-4 py-2 text-sm font-medium text-paper">
              3D model
            </span>
            <span className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper">
              AR placement
            </span>
            <span className="rounded-full border border-ink/20 px-4 py-2 text-sm font-medium">
              360° walkthrough
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-paper p-6 shadow-[0_1px_0_rgba(26,22,19,0.04)]">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft">
            QR route
          </p>
          <div className="mt-4 rounded-xl bg-sand-deep px-4 py-3 font-mono text-sm">
            /x/BH02
          </div>
          <p className="mt-4 text-sm leading-relaxed text-ink-soft">
            Each printed card carries a short code. The code is also typeable —
            the fallback when a camera is denied.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-ink/10 p-3">
              <div className="font-medium">6 exhibits</div>
              <div className="text-ink-soft">2 rooms</div>
            </div>
            <div className="rounded-lg border border-ink/10 p-3">
              <div className="font-medium">2 tours</div>
              <div className="text-ink-soft">seeded</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-20 grid gap-4 sm:grid-cols-3">
        {MODES.map((mode) => (
          <article
            key={mode.label}
            className="rounded-xl border border-ink/10 bg-paper p-5"
          >
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ochre">
              {mode.label}
            </span>
            <h2 className="mt-2 text-lg font-medium">{mode.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              {mode.body}
            </p>
          </article>
        ))}
      </section>

      <section className="mt-20">
        <div className="flex items-end justify-between gap-4 border-b border-ink/10 pb-4">
          <h2 className="font-serif text-2xl">From the collection</h2>
          <div className="flex items-baseline gap-4">
            <Link
              href="/exhibits"
              className="font-mono text-[11px] uppercase tracking-[0.2em] text-ochre hover:underline"
            >
              All exhibits →
            </Link>
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft">
              {exhibits.length} of 6
            </span>
          </div>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          {exhibits.map((exhibit) => (
            <article key={exhibit.id} className="group">
              <Link href={`/exhibits/${exhibit.slug}`} className="block">
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
                  <h3 className="font-medium group-hover:text-ochre">{exhibit.title}</h3>
                  <span className="font-mono text-[11px] text-ink-soft">
                    {exhibit.code}
                  </span>
                </div>
                <p className="text-sm text-ink-soft">
                  {exhibit.era} · {exhibit.room.name}
                </p>
              </Link>
            </article>
          ))}
        </div>
      </section>

      <footer className="mt-24 flex flex-col gap-2 border-t border-ink/10 pt-6 text-sm text-ink-soft sm:flex-row sm:items-center sm:justify-between">
        <span>Dharohar AR — Next.js 16 · Prisma · SQLite</span>
        <span className="font-mono text-[11px] uppercase tracking-widest">
          Plan: docs/PLAN.md
        </span>
      </footer>
    </main>
  );
}
