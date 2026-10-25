"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import ModelViewer from "@/components/three/ModelViewer";
import type { HotspotData, MaterialMode } from "@/types/exhibit";

// three.js is only needed once someone opens the reconstruction tab, so it
// stays out of the exhibit page's initial bundle and never renders on the
// server.
const ReconstructionViewer = dynamic(() => import("@/components/three/ReconstructionViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-ink-soft">
      Preparing the reconstruction…
    </div>
  ),
});

const MATERIALS: { mode: MaterialMode; label: string; body: string }[] = [
  { mode: "textured", label: "Textured", body: "the scan itself" },
  { mode: "clay", label: "Clay", body: "form without surface colour" },
  { mode: "wireframe", label: "Wireframe", body: "the raw triangle mesh" },
];

type ExhibitViewerProps = {
  modelUrl: string;
  alt: string;
  hotspots: HotspotData[];
  caption?: string | null;
  usdzUrl?: string | null;
};

export default function ExhibitViewer({
  modelUrl,
  alt,
  hotspots,
  caption,
  usdzUrl,
}: ExhibitViewerProps) {
  const [tab, setTab] = useState<"object" | "reconstruction">("object");
  const [material, setMaterial] = useState<MaterialMode>("textured");
  const [selected, setSelected] = useState<string | null>(null);

  const hotspot = hotspots.find((entry) => entry.id === selected) ?? null;

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-ink/15 bg-paper p-1" role="group" aria-label="Viewer mode">
          <button
            type="button"
            aria-pressed={tab === "object"}
            onClick={() => setTab("object")}
            className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${
              tab === "object" ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"
            }`}
          >
            Object
          </button>
          <button
            type="button"
            aria-pressed={tab === "reconstruction"}
            onClick={() => setTab("reconstruction")}
            className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${
              tab === "reconstruction" ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"
            }`}
          >
            Reconstruction
          </button>
        </div>

        {tab === "reconstruction" ? (
          <div className="inline-flex rounded-full border border-ink/15 bg-paper p-1" role="group" aria-label="Material state">
            {MATERIALS.map((entry) => (
              <button
                key={entry.mode}
                type="button"
                aria-pressed={material === entry.mode}
                onClick={() => setMaterial(entry.mode)}
                className={`rounded-full px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest transition-colors ${
                  material === entry.mode ? "bg-ochre text-paper" : "text-ink-soft hover:text-ink"
                }`}
              >
                {entry.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-3 h-[55vh] min-h-[320px] overflow-hidden rounded-2xl border border-ink/10 bg-sand-deep">
        {tab === "object" ? (
          <ModelViewer
            src={modelUrl}
            alt={alt}
            hotspots={hotspots}
            selectedHotspot={selected}
            onSelectHotspot={setSelected}
            iosSrc={usdzUrl}
          />
        ) : (
          <ReconstructionViewer src={modelUrl} alt={alt} mode={material} />
        )}
      </div>

      {tab === "reconstruction" ? (
        <p className="mt-2 text-xs leading-relaxed text-ink-soft">
          {MATERIALS.find((entry) => entry.mode === material)?.body}. The mesh, not the object:
          surface colour is photographic, so the shaded states show what was measured and what was
          interpreted.
        </p>
      ) : null}

      {tab === "object" && hotspots.length > 0 ? (
        <div className="mt-3">
          <div className="flex flex-wrap gap-2">
            {hotspots.map((entry, index) => {
              const active = entry.id === selected;
              return (
                <button
                  key={entry.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelected(active ? null : entry.id)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    active
                      ? "border-ochre bg-ochre/10 text-ochre"
                      : "border-ink/20 text-ink-soft hover:border-ink/40"
                  }`}
                >
                  <span className="mr-1.5 font-mono text-[11px]">{index + 1}</span>
                  {entry.label}
                </button>
              );
            })}
          </div>

          <div aria-live="polite" className="min-h-[1px]">
            {hotspot ? (
              <div className="mt-3 rounded-xl border border-ochre/25 bg-ochre/5 p-4">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="font-medium">{hotspot.label}</h3>
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="font-mono text-[11px] uppercase tracking-widest text-ink-soft hover:text-ink"
                  >
                    Close
                  </button>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{hotspot.body}</p>
              </div>
            ) : (
              <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                Tap a number on the model, or one of the labels above, to read what it marks.
              </p>
            )}
          </div>
        </div>
      ) : null}

      {caption ? (
        <p className="mt-3 text-xs leading-relaxed text-ink-soft">{caption}</p>
      ) : null}
    </section>
  );
}
