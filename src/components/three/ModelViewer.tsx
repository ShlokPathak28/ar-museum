"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import type { HotspotData } from "@/types/exhibit";
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
  /** Points of interest, positioned in model space. */
  hotspots?: HotspotData[];
  /** id of the hotspot whose detail is open, if any. */
  selectedHotspot?: string | null;
  onSelectHotspot?: (id: string | null) => void;
  /** iOS Quick Look file, if one exists. Android does not need it. */
  iosSrc?: string | null;
  /** Report loading/AR capability back to the parent. */
  onStatus?: (status: ViewerStatus) => void;
  /** Still photograph shown behind the poster text until the GLB decodes. */
  posterSrc?: string;
};

/**
 * Client wrapper around the `<model-viewer>` web component.
 *
 * The component reads `window` as soon as it is imported, so the import has to
 * happen in an effect rather than at module scope.
 *
 * Hotspots are real `<button>` elements in the light DOM that model-viewer
 * repositions into the 3D scene, so they stay keyboard focusable and screen
 * readers get a normal button with a label.
 */
export default function ModelViewer({
  src,
  alt,
  className,
  hotspots = [],
  selectedHotspot = null,
  onSelectHotspot,
  iosSrc,
  onStatus,
  posterSrc,
}: ModelViewerProps) {
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

  const arProps = iosSrc ? { "ios-src": iosSrc } : {};

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
      {...arProps}
    >
      <button
        slot="ar-button"
        className="bg-brass-light px-4 py-2 text-[13px] font-medium text-vault transition-colors hover:bg-chalk"
      >
        Place in your room
      </button>

      {hotspots.map((hotspot, index) => {
        const active = hotspot.id === selectedHotspot;
        return (
          <button
            key={hotspot.id}
            slot={`hotspot-${index + 1}`}
            type="button"
            data-position={`${hotspot.x}m ${hotspot.y}m ${hotspot.z}m`}
            data-normal="0m 1m 0m"
            aria-label={`${index + 1}. ${hotspot.label}`}
            aria-pressed={active}
            onClick={() => onSelectHotspot?.(active ? null : hotspot.id)}
            className={`flex h-7 w-7 items-center justify-center rounded-full border font-mono text-[11px] font-medium shadow-sm transition-colors ${
              active
                ? "border-brass-light bg-brass-light text-vault"
                : "border-chalk/50 bg-vault/80 text-chalk hover:bg-vault"
            }`}
          >
            {index + 1}
          </button>
        );
      })}

      <div slot="poster" className="relative h-full w-full overflow-hidden">
        {posterSrc && !failed ? (
          <Image
            src={posterSrc}
            alt=""
            fill
            sizes="(min-width: 1024px) 55vw, 100vw"
            unoptimized
            className="object-contain"
          />
        ) : null}
        <div className="absolute inset-0 grid place-items-center px-6 text-center text-sm text-chalk/55">
          <p className="max-w-sm border border-chalk/10 bg-vault/85 px-3 py-1.5">
            {failed
              ? "The 3D viewer could not load. Reload the page, and check the browser console if it happens again."
              : ready
                ? "Loading model…"
                : "Preparing viewer…"}
          </p>
        </div>
      </div>
    </model-viewer>
  );
}
