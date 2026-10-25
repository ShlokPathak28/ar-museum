import type { Metadata } from "next";
import Link from "next/link";

import PanoramaProbe from "./PanoramaProbe";

export const metadata: Metadata = {
  title: "Panorama spike",
  robots: { index: false, follow: false },
};

export default function PanoramaSpikePage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8">
      <header className="flex flex-wrap items-baseline justify-between gap-4 border-b border-ink/10 pb-4">
        <h1 className="font-serif text-3xl">Panorama spike</h1>
        <div className="flex items-baseline gap-4">
          <Link
            href="/spike/ar"
            className="font-mono text-[11px] uppercase tracking-widest text-ochre hover:underline"
          >
            AR spike →
          </Link>
          <span className="rounded-full border border-ink/15 px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-ink-soft">
            Throwaway · feeds week 3
          </span>
        </div>
      </header>

      <p className="mt-5 max-w-2xl text-sm leading-relaxed text-ink-soft">
        Week 0 only needs one answer from this page: does a single equirectangular texture render
        upright and steer on the demo phone? The image is drawn at runtime — a calibration card,
        not museum content — because the real room panorama is shot in week 3.
      </p>

      <div className="mt-8">
        <PanoramaProbe />
      </div>
    </main>
  );
}
