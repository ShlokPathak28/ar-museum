"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

import ModelViewer from "@/components/three/ModelViewer";
import type { ViewerStatus } from "@/components/three/ModelViewer";

const INITIAL: ViewerStatus = { loaded: false, canActivateAR: null, arStatus: "" };

/**
 * The same CC0 vase, served two ways. AR on Android hands the model URL to
 * Scene Viewer, which refuses anything that isn't HTTPS with a glTF MIME type —
 * a LAN `http://` address can never work, no matter how reachable it is.
 */
const SOURCES = {
  cdn: {
    label: "HTTPS CDN",
    hint: "jsDelivr · model/gltf-binary · CORS *",
    src: "https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@main/Models/GlassVaseFlowers/glTF-Binary/GlassVaseFlowers.glb",
  },
  local: {
    label: "Local HTTP",
    hint: "this machine · http://172.19.227.217:3000",
    src: "/models/spike-vase.glb",
  },
} as const;

type SourceKey = keyof typeof SOURCES;

/**
 * Throwaway AR probe. Its only job is to answer one question on a real phone:
 * does the AR entry point appear and place the model? Not part of the exhibit
 * flow — delete once week 3's AR mode is built.
 */
export default function ArSpikePanel() {
  const [status, setStatus] = useState<ViewerStatus>(INITIAL);
  const [source, setSource] = useState<SourceKey>("cdn");

  // Browser-only values, read without an effect so the server render and the
  // hydration pass agree (server snapshot is always false).
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const secure = isClient ? (window.isSecureContext ? "yes" : "no") : "checking";
  const userAgent = isClient ? navigator.userAgent : "";

  const onStatus = useCallback((next: ViewerStatus) => setStatus(next), []);

  const pick = (next: SourceKey) => {
    setSource(next);
    setStatus(INITIAL);
  };

  const arVerdict =
    status.canActivateAR === null
      ? "waiting for model"
      : status.canActivateAR
        ? "AR available on this device"
        : "no AR on this device";

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(SOURCES) as SourceKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => pick(key)}
              className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                source === key
                  ? "border-ink bg-ink text-paper"
                  : "border-ink/20 text-ink-soft hover:border-ink/40"
              }`}
            >
              {SOURCES[key].label}
            </button>
          ))}
        </div>
        <p className="font-mono text-[11px] leading-relaxed break-all text-ink-soft">
          {SOURCES[source].hint}
          <br />
          {SOURCES[source].src}
        </p>
        <div className="h-[55vh] overflow-hidden rounded-2xl border border-ink/10 bg-sand-deep">
          <ModelViewer
            key={source}
            src={SOURCES[source].src}
            alt="A glass vase with flowers, used to test AR placement"
            onStatus={onStatus}
          />
        </div>
      </div>

      <div className="space-y-5">
        <div className="rounded-xl border border-ink/10 bg-paper p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft">
            Viewer status
          </p>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-soft">Model loaded</dt>
              <dd className="font-mono">{String(status.loaded)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-soft">canActivateAR</dt>
              <dd className="font-mono">{String(status.canActivateAR)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-soft">ar-status</dt>
              <dd className="font-mono">{status.arStatus || "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-soft">Secure context</dt>
              <dd className="font-mono">{secure}</dd>
            </div>
          </dl>
          <p className="mt-4 border-t border-ink/10 pt-3 text-sm font-medium">{arVerdict}</p>
        </div>

        <div className="rounded-xl border border-ink/10 bg-paper p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft">
            What to check on the phone
          </p>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-ink-soft">
            <li>Pick <span className="font-mono">HTTPS CDN</span> and confirm the vase renders.</li>
            <li>Tap <span className="font-mono">Place in your room</span>.</li>
            <li>Scene Viewer opens, asks for camera access, and the vase lands on a surface.</li>
            <li>Switch to <span className="font-mono">Local HTTP</span> and repeat — this is the
              case that bounced back to the page before.</li>
          </ol>
          <p className="mt-4 border-t border-ink/10 pt-3 text-sm text-ink-soft">
            If <span className="font-mono">HTTPS CDN</span> also bounces back, Scene Viewer or
            Google Play Services for AR is missing or outdated — check Settings → Apps for
            “Google Play Services for AR”.
          </p>
        </div>

        <p className="font-mono text-[11px] leading-relaxed text-ink-soft">
          {userAgent || "reading user agent…"}
        </p>
      </div>
    </div>
  );
}
