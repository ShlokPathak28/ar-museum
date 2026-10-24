"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

import ModelViewer from "@/components/three/ModelViewer";
import type { ViewerStatus } from "@/components/three/ModelViewer";

const INITIAL: ViewerStatus = { loaded: false, canActivateAR: null, arStatus: "" };

/**
 * Throwaway AR probe. Its only job is to answer one question on a real phone:
 * does the AR entry point appear and place the model? Not part of the exhibit
 * flow — delete once week 3's AR mode is built.
 */
export default function ArSpikePanel() {
  const [status, setStatus] = useState<ViewerStatus>(INITIAL);

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

  const arVerdict =
    status.canActivateAR === null
      ? "waiting for model"
      : status.canActivateAR
        ? "AR available on this device"
        : "no AR on this device";

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="h-[60vh] overflow-hidden rounded-2xl border border-ink/10 bg-sand-deep">
        <ModelViewer
          src="/models/spike-vase.glb"
          alt="A glass vase with flowers, used to test AR placement"
          onStatus={onStatus}
        />
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
            <li>The model renders and drag-rotates.</li>
            <li>A “Place in your room” button appears.</li>
            <li>Tapping it opens Scene Viewer and asks for camera permission.</li>
            <li>The vase lands on a surface at roughly real size.</li>
          </ol>
          <p className="mt-4 border-t border-ink/10 pt-3 text-sm text-ink-soft">
            If the button never appears, note whether <span className="font-mono">canActivateAR</span>{" "}
            says <span className="font-mono">false</span> — that points at the device or the
            insecure-context rule, not the model.
          </p>
        </div>

        <p className="font-mono text-[11px] leading-relaxed text-ink-soft">
          {userAgent || "reading user agent…"}
        </p>
      </div>
    </div>
  );
}
