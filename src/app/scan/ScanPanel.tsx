"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type QrScanner from "qr-scanner";

type ScanStatus = "idle" | "starting" | "scanning" | "found" | "error";
type Notice = { source: "camera" | "manual"; text: string };

const CAMERA_HELP: Record<string, string> = {
  NotAllowedError:
    "Camera permission was denied. Allow it in the address bar, or use the short code.",
  NotFoundError: "No camera found on this device. Use the short code.",
  NotReadableError: "The camera is already in use by another app. Close it and try again.",
  OverconstrainedError: "No rear camera matched. Try again, or use the short code.",
  SecurityError: "The browser blocked the camera. The page must be served over HTTPS.",
};

function describeCameraError(error: unknown): string {
  if (error instanceof Error) {
    return (
      CAMERA_HELP[error.name] ??
      `The camera could not start (${error.name}). Use the short code.`
    );
  }
  return "The camera could not start. Use the short code.";
}

/**
 * A printed card may hold a full URL (generated for a LAN address) or a bare
 * short code. Either way the path is kept on the *current* origin, so a card
 * printed for 192.168.x.x still works when the site is open on localhost.
 */
export function resolveScanTarget(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;

  try {
    const url = new URL(text, window.location.origin);
    const short = url.pathname.match(/^\/x\/([a-z0-9]+)$/i);
    if (short) return `/x/${short[1].toUpperCase()}`;
    const exhibit = url.pathname.match(/^\/exhibits\/[a-z0-9-]+$/i);
    if (exhibit) return url.pathname;
  } catch {
    // Not a URL — fall through to the bare-code check.
  }

  if (/^[a-z0-9]{4,12}$/i.test(text)) return `/x/${text.toUpperCase()}`;
  return null;
}

export default function ScanPanel({
  codes,
}: {
  codes: { code: string; title: string }[];
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [manual, setManual] = useState("");
  const [canUseFlash, setCanUseFlash] = useState(false);
  const [flashOn, setFlashOn] = useState(false);

  const stopCamera = useCallback(() => {
    scannerRef.current?.destroy();
    scannerRef.current = null;
    setCanUseFlash(false);
    setFlashOn(false);
  }, []);

  const go = useCallback(
    (target: string) => {
      // A full navigation, not router.push: /x/[code] is a route handler that
      // 307s and sets the device cookie, which the client router cannot follow.
      stopCamera();
      setStatus("found");
      window.location.assign(target);
    },
    [stopCamera],
  );

  const handleScan = useCallback(
    (raw: string) => {
      const target = resolveScanTarget(raw);
      if (!target) {
        setNotice({
          source: "camera",
          text: `"${raw.slice(0, 40)}" is not a Dharohar code.`,
        });
        return;
      }
      go(target);
    },
    [go],
  );

  const startCamera = useCallback(async () => {
    if (!window.isSecureContext) {
      setStatus("error");
      setCameraError(
        "The camera needs HTTPS. Open the site with `npm run dev:https`, or use the short code.",
      );
      return;
    }
    if (!videoRef.current || scannerRef.current) return;

    setStatus("starting");
    setCameraError(null);
    setNotice(null);

    try {
      const { default: QrScannerClass } = await import("qr-scanner");
      const scanner = new QrScannerClass(
        videoRef.current,
        (result) => handleScan(result.data),
        {
          preferredCamera: "environment",
          maxScansPerSecond: 8,
          highlightScanRegion: true,
          highlightCodeOutline: true,
          returnDetailedScanResult: true,
        },
      );
      scannerRef.current = scanner;
      await scanner.start();
      setStatus("scanning");
      if (await scanner.hasFlash()) setCanUseFlash(true);
    } catch (error) {
      stopCamera();
      setStatus("error");
      setCameraError(describeCameraError(error));
    }
  }, [handleScan, stopCamera]);

  // Release the camera when the visitor leaves the page.
  useEffect(() => stopCamera, [stopCamera]);

  async function toggleFlash() {
    const scanner = scannerRef.current;
    if (!scanner) return;
    try {
      if (scanner.isFlashOn()) {
        await scanner.turnFlashOff();
        setFlashOn(false);
      } else {
        await scanner.turnFlashOn();
        setFlashOn(true);
      }
    } catch {
      // Some cameras advertise a flash but refuse to switch it on.
      setCanUseFlash(false);
    }
  }

  function onManualSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const target = resolveScanTarget(manual);
    if (!target) {
      setNotice({
        source: "manual",
        text: `"${manual.trim().slice(0, 40)}" is not a Dharohar code.`,
      });
      return;
    }
    go(target);
  }

  const statusText =
    status === "starting"
      ? "Requesting the camera…"
      : status === "scanning"
        ? "Point the camera at a QR card."
        : status === "found"
          ? "Found it — opening the exhibit…"
          : status === "error"
            ? (cameraError ?? "The camera is unavailable.")
            : "Camera off. Start it, or type the short code.";

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <section aria-labelledby="camera-heading">
        <h2 id="camera-heading" className="sr-only">
          Camera scanner
        </h2>

        <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-ink/10 bg-ink">
          {/* The library sets playsInline/muted itself; the attributes keep SSR honest. */}
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            playsInline
            muted
            aria-label="Camera preview"
          />

          {status !== "scanning" ? (
            <div className="absolute inset-0 grid place-items-center bg-ink/85 p-6 text-center">
              {status === "starting" || status === "found" ? (
                <p className="font-mono text-[11px] uppercase tracking-widest text-paper/70">
                  {statusText}
                </p>
              ) : (
                <div className="max-w-xs">
                  <p className="text-sm leading-relaxed text-paper/80">
                    {status === "error" ? statusText : "The camera is off."}
                  </p>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="mt-4 rounded-full bg-paper px-4 py-2 text-sm font-medium text-ink"
                  >
                    {status === "error" ? "Try the camera again" : "Start camera"}
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p aria-live="polite" className="text-sm text-ink-soft">
            {statusText}
          </p>
          {status === "scanning" ? (
            <button
              type="button"
              onClick={() => {
                stopCamera();
                setStatus("idle");
                setCameraError(null);
              }}
              className="ml-auto font-mono text-[11px] uppercase tracking-widest text-ink-soft hover:text-ink"
            >
              Stop camera
            </button>
          ) : null}
          {status === "scanning" && canUseFlash ? (
            <button
              type="button"
              onClick={toggleFlash}
              aria-pressed={flashOn}
              className="rounded-full border border-ink/15 px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-ink-soft hover:border-ink/40"
            >
              {flashOn ? "Torch off" : "Torch on"}
            </button>
          ) : null}
        </div>

        {notice?.source === "camera" ? (
          <p role="alert" className="mt-3 rounded-lg bg-ochre/10 px-3 py-2 text-sm text-ochre">
            {notice.text}
          </p>
        ) : null}
      </section>

      <section aria-labelledby="code-heading" className="rounded-xl border border-ink/10 bg-paper p-6">
        <h2 id="code-heading" className="font-serif text-2xl tracking-tight">
          No card to hand?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Every card has a short code printed under the QR. Type it here — same result, no
          camera.
        </p>

        <form onSubmit={onManualSubmit} className="mt-5">
          <label
            htmlFor="code"
            className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft"
          >
            Short code
          </label>
          <div className="mt-1.5 flex gap-2">
            <input
              id="code"
              name="code"
              value={manual}
              onChange={(event) => setManual(event.target.value)}
              placeholder="BH02"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={12}
              aria-describedby={notice?.source === "manual" ? "code-error" : undefined}
              className="w-full rounded-lg border border-ink/15 bg-paper px-3 py-2 font-mono text-sm uppercase tracking-widest outline-none focus-visible:border-ochre"
            />
            <button
              type="submit"
              className="shrink-0 rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper"
            >
              Open
            </button>
          </div>
        </form>

        {notice?.source === "manual" ? (
          <p
            id="code-error"
            role="alert"
            className="mt-3 rounded-lg bg-ochre/10 px-3 py-2 text-sm text-ochre"
          >
            {notice.text}
          </p>
        ) : null}

        <div className="mt-6 border-t border-ink/10 pt-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft">
            On display
          </p>
          <ul className="mt-2 space-y-1.5">
            {codes.map((exhibit) => (
              <li key={exhibit.code}>
                {/* Plain <a>: /x/[code] is a redirecting route handler, not a page. */}
                <a href={`/x/${exhibit.code}`} className="group flex items-baseline gap-3 text-sm">
                  <span className="font-mono text-xs tracking-widest text-ochre group-hover:underline">
                    {exhibit.code}
                  </span>
                  <span className="text-ink-soft group-hover:text-ink">{exhibit.title}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
