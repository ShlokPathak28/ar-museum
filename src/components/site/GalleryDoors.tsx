"use client";

import { useEffect, useState } from "react";

/**
 * The entrance on the home page: two plaster panels part to reveal the room.
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
    const timer = window.setTimeout(() => setOpen(true), 700);

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

      <div className="gallery-door gallery-door-left" onTransitionEnd={() => setGone(true)}>
        <div className="absolute inset-y-0 right-7 flex flex-col items-end justify-center gap-3 sm:right-14">
          <span className="font-serif text-3xl leading-none tracking-tight sm:text-4xl">
            Dharohar
          </span>
          <span className="h-px w-14 bg-oxblood/50" />
          <span className="max-w-[9rem] text-right text-[10px] uppercase leading-relaxed tracking-[0.18em] text-ink-soft sm:text-[11px]">
            Museum of Material Culture
          </span>
        </div>
      </div>

      <div className="gallery-door gallery-door-right">
        <div className="absolute inset-y-0 left-7 flex flex-col items-start justify-center gap-1.5 sm:left-14">
          <span className="text-[10px] uppercase tracking-[0.2em] text-ink-soft sm:text-[11px]">
            Enter
          </span>
          <span className="font-serif text-lg italic text-ink-soft sm:text-xl">
            the collection
          </span>
        </div>
      </div>
    </div>
  );
}
