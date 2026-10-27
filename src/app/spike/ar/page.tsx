import type { Metadata } from "next";
import Link from "next/link";

import ArSpikePanel from "./ArSpikePanel";

export const metadata: Metadata = {
  title: "AR spike",
  robots: { index: false, follow: false },
};

export default function ArSpikePage() {
  return (
    <main id="main" tabIndex={-1} className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8">
      <header className="flex flex-wrap items-baseline justify-between gap-4 border-b border-ink/10 pb-4">
        <h1 className="font-serif text-3xl">AR spike</h1>
        <div className="flex items-baseline gap-4">
          <Link
            href="/spike/panorama"
            className="font-mono text-[11px] uppercase tracking-widest text-oxblood hover:underline"
          >
            Panorama spike →
          </Link>
          <span className="rounded-full border border-ink/15 px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-ink-soft">
            Throwaway · delete after week 3
          </span>
        </div>
      </header>

      <p className="mt-5 max-w-2xl text-sm leading-relaxed text-ink-soft">
        One model, one question: does AR placement work on the demo phone? The asset is a CC0 glass
        vase from the Khronos glTF sample set — a stand-in, not exhibit content.
      </p>

      <div className="mt-5 max-w-2xl rounded-xl border border-ink/10 bg-chalk-deep/50 p-5 text-sm leading-relaxed">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft">Result</p>
        <p className="mt-2">
          Placement works over <strong>HTTPS</strong>, where model-viewer uses <strong>WebXR</strong>{" "}
          and the camera opens inside Chrome. Over plain <span className="font-mono">http://</span>{" "}
          Chrome hides WebXR, so the viewer falls back to handing the model to the Google app&apos;s
          Scene Viewer — and that hand-off fails on the test device. Every route that needs the
          camera, the AR session or device orientation therefore runs on{" "}
          <span className="font-mono">npm run dev:https</span>. See{" "}
          <span className="font-mono">docs/HTTPS.md</span>.
        </p>
      </div>

      <div className="mt-8">
        <ArSpikePanel />
      </div>
    </main>
  );
}
