import type { Metadata } from "next";

import ArSpikePanel from "./ArSpikePanel";

export const metadata: Metadata = {
  title: "AR spike",
  robots: { index: false, follow: false },
};

export default function ArSpikePage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8">
      <header className="flex items-baseline justify-between gap-4 border-b border-ink/10 pb-4">
        <h1 className="font-serif text-3xl">AR spike</h1>
        <span className="rounded-full border border-ink/15 px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-ink-soft">
          Throwaway · delete after week 3
        </span>
      </header>

      <p className="mt-5 max-w-2xl text-sm leading-relaxed text-ink-soft">
        One model, one question: does AR placement work on the demo phone? The asset is a CC0 glass
        vase from the Khronos glTF sample set — a stand-in, not exhibit content. It is offered from
        two origins because Android hands the model URL to Scene Viewer, which only accepts an
        HTTPS address with a glTF MIME type. A LAN <span className="font-mono">http://</span> URL
        cannot be placed in AR, however reachable it is from the phone.
      </p>

      <div className="mt-8">
        <ArSpikePanel />
      </div>
    </main>
  );
}
