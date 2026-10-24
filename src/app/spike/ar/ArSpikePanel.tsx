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
  const [xr, setXr] = useState("not checked");

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

  // A hand-built Scene Viewer intent, independent of model-viewer. Scene Viewer
  // now ships inside the Google app (com.google.android.googlequicksearchbox),
  // not ARCore — model-viewer 4.x targets that package with Scene Viewer 1.2.
  const fallbackUrl = isClient ? window.location.href : "https://example.com";
  const sceneViewerHref = `intent://arvr.google.com/scene-viewer/1.2?mode=ar_preferred&file=${encodeURIComponent(
    "https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@main/Models/BoxTextured/glTF-Binary/BoxTextured.glb",
  )}#Intent;scheme=https;package=com.google.android.googlequicksearchbox;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(
    fallbackUrl,
  )};end;`;

  const checkWebXr = async () => {
    const nav = navigator as Navigator & {
      xr?: { isSessionSupported: (mode: string) => Promise<boolean> };
    };
    if (!nav.xr) {
      setXr("navigator.xr missing");
      return;
    }
    try {
      setXr((await nav.xr.isSessionSupported("immersive-ar")) ? "supported" : "not supported");
    } catch (error) {
      setXr(`error: ${(error as Error).message}`);
    }
  };

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
            Device AR diagnostics
          </p>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-soft">navigator.xr</dt>
              <dd className="font-mono">
                {isClient ? ("xr" in navigator ? "present" : "missing") : "—"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-ink-soft">WebXR immersive-ar</dt>
              <dd className="flex items-center gap-2">
                <span className="font-mono">{xr}</span>
                <button
                  type="button"
                  onClick={checkWebXr}
                  className="rounded-full border border-ink/20 px-2 py-0.5 text-[11px] text-ink-soft hover:border-ink/40"
                >
                  check
                </button>
              </dd>
            </div>
          </dl>
          <a
            href={sceneViewerHref}
            className="mt-4 inline-block rounded-full bg-ochre px-4 py-2 text-sm font-medium text-paper"
          >
            Open Scene Viewer directly
          </a>
          <p className="mt-3 text-xs leading-relaxed text-ink-soft">
            Legacy fallback: this bypasses model-viewer and asks the Google app&apos;s Scene Viewer
            to open a tiny test model. It does not work on the test phone, which is why the app
            requires HTTPS and WebXR. Kept only to re-check the hand-off on other devices.
          </p>
          <p className="mt-4 border-t border-ink/10 pt-3 text-xs leading-relaxed text-ink-soft">
            <a href="/dev-ca.crt" download className="font-medium text-ochre hover:underline">
              Download this machine&apos;s CA certificate
            </a>{" "}
            and install it under Settings → Security → Encryption &amp; credentials → Install a
            certificate → CA certificate. Reload after installing; the padlock should go normal and
            “Secure context” should read <span className="font-mono">yes</span>.
          </p>
          <div className="mt-3 flex flex-col gap-1">
            <a
              href="https://play.google.com/store/apps/details?id=com.google.ar.core"
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-ochre hover:underline"
            >
              Google Play Services for AR →
            </a>
            <a
              href="https://play.google.com/store/apps/details?id=com.google.android.googlequicksearchbox"
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-ochre hover:underline"
            >
              Google app (contains Scene Viewer) →
            </a>
          </div>
        </div>

        <div className="rounded-xl border border-ink/10 bg-paper p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft">
            What to check on the phone
          </p>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-ink-soft">
            <li>
              Confirm <span className="font-mono">Secure context</span> reads{" "}
              <span className="font-mono">yes</span>.
            </li>
            <li>
              Tap <span className="font-mono">check</span> next to WebXR and expect{" "}
              <span className="font-mono">supported</span>.
            </li>
            <li>
              Tap <span className="font-mono">Place in your room</span> — the camera opens inside
              Chrome (WebXR), not in a separate app.
            </li>
            <li>
              <span className="font-mono">Local HTTP</span> is expected to fail: without a secure
              context Chrome hides WebXR and the viewer falls back to Scene Viewer.
            </li>
          </ol>
          <p className="mt-4 border-t border-ink/10 pt-3 text-sm text-ink-soft">
            Verified on the demo phone: WebXR placement works over HTTPS. The Scene Viewer
            hand-off is the path that bounces back, so the project does not depend on it.
          </p>
        </div>

        <p className="font-mono text-[11px] leading-relaxed text-ink-soft">
          {userAgent || "reading user agent…"}
        </p>
      </div>
    </div>
  );
}
