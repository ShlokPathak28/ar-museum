"use client";

import { useEffect, useState } from "react";

/**
 * The entrance on the home page: a dark vestibule with two monumental doors.
 *
 * It is decoration, not a gate — the page behind is already rendered, the panels
 * are aria-hidden, a click or any of Escape/Enter/Space opens them immediately,
 * and `prefers-reduced-motion` removes them from the layout entirely. The
 * <noscript> rule is the one case CSS cannot cover: without JavaScript nothing
 * would ever set data-open, so the doors must not exist at all.
 */
export default function GalleryDoors() {
  const [open, setOpen] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setOpen(true), 1400);

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "Enter" || event.key === " ") {
        setOpen(true);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  if (gone) return null;

  return (
    <div
      className="gallery-doors"
      data-open={open ? "true" : "false"}
      aria-hidden="true"
      onClick={() => setOpen(true)}
    >
      <noscript dangerouslySetInnerHTML={{ __html: "<style>.gallery-doors{display:none}</style>" }} />

      <div
        className="gallery-door gallery-door-left"
        onTransitionEnd={(event) => {
          if (event.propertyName === "transform") setGone(true);
        }}
      />
      <div className="gallery-door gallery-door-right" />

      <div className="gallery-light" />
      <div className="gallery-flood" />

      <div className="gallery-veil">
        <p className="font-mono text-[9px] uppercase tracking-[0.34em] text-chalk/50 sm:text-[10px]">
          Museum of Material Culture
        </p>

        <div className="flex flex-col items-center">
          <p
            className="font-serif text-[clamp(3.4rem,9vw,7.5rem)] leading-none tracking-[-0.04em] text-brass-pale"
            style={{ textShadow: "0 0 70px rgba(240,214,164,0.28)" }}
          >
            Dharohar
          </p>
          <span aria-hidden className="mt-7 h-px w-16 bg-brass-light/50" />
          <p className="mt-6 max-w-[19rem] text-[12px] leading-relaxed text-chalk/50">
            A small museum of the things people made, and the rooms they made them in.
          </p>
        </div>

        <div className="flex flex-col items-center gap-4">
          <span className="border border-brass-light/45 px-8 py-3 font-mono text-[10px] uppercase tracking-[0.3em] text-brass-light">
            Enter
          </span>
          <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-chalk/50">
            Click anywhere · or press Enter
          </p>
        </div>
      </div>
    </div>
  );
}
