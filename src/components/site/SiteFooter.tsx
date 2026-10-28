import Link from "next/link";

/**
 * The closing wall. Every reading room ends in the same dark threshold, so the
 * building feels like one place rather than a set of pages that each stopped
 * when their content ran out.
 */
export default function SiteFooter() {
  return (
    <footer className="border-t border-chalk/10 bg-vault text-chalk print:hidden">
      <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8">
        <div className="grid gap-10 border-b border-chalk/15 pb-10 sm:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <p className="font-serif text-2xl tracking-tight">Dharohar</p>
            <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.22em] text-chalk/50">
              Museum of Material Culture
            </p>
            <p className="mt-6 max-w-xs text-sm leading-relaxed text-chalk/50">
              A small museum of the things people made, and the rooms they made them in.
            </p>
          </div>

          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-brass-light">
              Visit
            </p>
            <p className="mt-3 text-sm leading-relaxed text-chalk/50">
              Tuesday to Sunday{" "}
              <br />
              10.00–18.00{" "}
              <br />
              Closed Mondays
            </p>
          </div>

          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-brass-light">
              Find
            </p>
            <div className="mt-3 flex flex-col gap-2 text-sm text-chalk/50">
              <Link href="/exhibits" className="transition-colors hover:text-chalk">
                Collection
              </Link>
              <Link href="/rooms" className="transition-colors hover:text-chalk">
                Rooms
              </Link>
              <Link href="/scan" className="transition-colors hover:text-chalk">
                Scan a marker
              </Link>
              <Link href="/markers" className="transition-colors hover:text-chalk">
                Printable cards
              </Link>
              <Link href="/credits" className="transition-colors hover:text-chalk">
                Credits
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2 text-[11px] text-chalk/50 sm:flex-row sm:items-center sm:justify-between">
          <p>Built for INT252 and INT257. A fictional museum; objects and panoramas are stand-ins.</p>
          <p className="font-mono uppercase tracking-[0.16em]">Next.js 16 · Prisma · SQLite · WebXR</p>
        </div>
      </div>
    </footer>
  );
}
