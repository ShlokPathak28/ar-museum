"use client";

import { useEffect, useRef, useState } from "react";

import type { ModelViewerElement } from "@/types/model-viewer";

export type ViewerStatus = {
  /** The GLB finished decoding. */
  loaded: boolean;
  /** null until the element reports; false means no AR on this device. */
  canActivateAR: boolean | null;
  /** Last `ar-status` event, e.g. "failed". Empty when AR hasn't been tried. */
  arStatus: string;
};

type ModelViewerProps = {
  src: string;
  alt: string;
  className?: string;
  /** Report loading/AR capability back to the parent. */
  onStatus?: (status: ViewerStatus) => void;
};

/**
 * Client wrapper around the `<model-viewer>` web component.
 *
 * The component reads `window` as soon as it is imported, so the import has to
 * happen in an effect rather than at module scope.
 */
export default function ModelViewer({ src, alt, className, onStatus }: ModelViewerProps) {
  const ref = useRef<ModelViewerElement | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let detach: (() => void) | undefined;

    import("@google/model-viewer")
      .then(() => {
        if (cancelled) return;
        setReady(true);

        const el = ref.current;
        if (!el) return;

        const report = () =>
          onStatus?.({
            loaded: Boolean(el.loaded),
            canActivateAR: el.canActivateAR ?? null,
            arStatus: "",
          });

        const onArStatus = (event: Event) => {
          const status = (event as CustomEvent<{ status?: string }>).detail?.status ?? "unknown";
          onStatus?.({
            loaded: Boolean(el.loaded),
            canActivateAR: el.canActivateAR ?? null,
            arStatus: status,
          });
        };

        el.addEventListener("load", report);
        el.addEventListener("ar-status", onArStatus);
        report();

        detach = () => {
          el.removeEventListener("load", report);
          el.removeEventListener("ar-status", onArStatus);
        };
      })
      .catch((error: unknown) => {
        console.error("model-viewer failed to load", error);
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      detach?.();
    };
  }, [onStatus]);

  return (
    <model-viewer
      ref={ref}
      src={src}
      alt={alt}
      camera-controls
      auto-rotate
      auto-rotate-delay="1200"
      environment-image="neutral"
      shadow-intensity="1"
      exposure="1"
      touch-action="pan-y"
      ar
      ar-modes="webxr scene-viewer quick-look"
      ar-scale="auto"
      camera-orbit="30deg 78deg 105%"
      loading="eager"
      className={className}
      style={{ width: "100%", height: "100%" }}
    >
      <button
        slot="ar-button"
        className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper"
      >
        Place in your room
      </button>
      <div
        slot="poster"
        className="flex h-full w-full items-center justify-center px-6 text-center text-sm text-ink-soft"
      >
        {failed
          ? "The 3D viewer could not load. Reload the page, and check the browser console if it happens again."
          : ready
            ? "Loading model…"
            : "Preparing viewer…"}
      </div>
    </model-viewer>
  );
}
