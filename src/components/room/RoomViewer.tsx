"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import * as THREE from "three";

export type RoomHotspot = {
  id: string;
  code: string;
  label: string;
  href: string;
  /** Fraction across the equirectangular image, 0–1. */
  u: number;
  /** Fraction down the image, 0 (up) – 1 (down). */
  v: number;
};

type Props = {
  src: string;
  alt: string;
  hotspots: RoomHotspot[];
};

type GyroState = "idle" | "granted" | "denied" | "unsupported";

/** Equirectangular pixel fractions → the sphere's spherical coordinates. */
function bearingOf(spot: RoomHotspot): { phi: number; theta: number } {
  return {
    phi: THREE.MathUtils.degToRad(spot.v * 180),
    theta: THREE.MathUtils.degToRad((spot.u - 0.25) * 360),
  };
}

export default function RoomViewer({ src, alt, hotspots }: Props) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const linkRefs = useRef(new Map<string, HTMLAnchorElement>());
  const aimRef = useRef<(() => void) | null>(null);
  const lonRef = useRef(0);
  const latRef = useRef(0);
  const homeRef = useRef({ lon: 0, lat: 0 });
  const gyroRef = useRef(false);
  const draggedRef = useRef(false);

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [progress, setProgress] = useState(0);
  const [gyro, setGyro] = useState<GyroState>("idle");
  const [gyroActive, setGyroActive] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [hint, setHint] = useState(true);

  const hotspotsRef = useRef(hotspots);
  useEffect(() => {
    hotspotsRef.current = hotspots;
  }, [hotspots]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let disposed = false;
    let cleanup: (() => void) | undefined;

    // Same shape as the week-0 probe: a sync body inside an async wrapper so a
    // WebGL failure can be reported through setState without a sync update in
    // the effect body.
    void (async () => {
      let renderer: THREE.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true });
      } catch {
        if (!disposed) setStatus("error");
        return;
      }

      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(mount.clientWidth, Math.max(mount.clientHeight, 1), false);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      renderer.domElement.style.display = "block";
      // The panorama owns the gesture inside its box; the page still scrolls
      // from anywhere outside it.
      renderer.domElement.style.touchAction = "none";
      mount.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        75,
        mount.clientWidth / Math.max(mount.clientHeight, 1),
        0.1,
        200,
      );

      const texture = new THREE.TextureLoader().load(
        src,
        (loaded) => {
          loaded.colorSpace = THREE.SRGBColorSpace;
          loaded.anisotropy = renderer.capabilities.getMaxAnisotropy();
          if (!disposed) setStatus("ready");
        },
        (event) => {
          if (disposed || !event.lengthComputable || event.total <= 0) return;
          setProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
        },
        () => {
          if (!disposed) setStatus("error");
        },
      );

      const geometry = new THREE.SphereGeometry(50, 64, 40);
      const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide });
      scene.add(new THREE.Mesh(geometry, material));

      const target = new THREE.Vector3();

      const aim = () => {
        const phi = THREE.MathUtils.degToRad(90 - latRef.current);
        const theta = THREE.MathUtils.degToRad(lonRef.current);
        target.setFromSphericalCoords(1, phi, theta);
        camera.lookAt(target);
      };

      // Start on the first object instead of an arbitrary seam.
      const first = hotspotsRef.current[0];
      if (first) {
        lonRef.current = (first.u - 0.25) * 360;
        latRef.current = 90 - first.v * 180;
      }
      homeRef.current = { lon: lonRef.current, lat: latRef.current };
      aim();
      aimRef.current = aim;

      const demo = new URLSearchParams(window.location.search).get("demo") === "1";
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      let autoPan = demo && !reduced;

      let pointerId: number | null = null;
      let lastX = 0;
      let lastY = 0;
      let moved = 0;

      const onPointerDown = (event: PointerEvent) => {
        if (gyroRef.current) return;
        pointerId = event.pointerId;
        lastX = event.clientX;
        lastY = event.clientY;
        moved = 0;
        draggedRef.current = false;
        autoPan = false;
        renderer.domElement.setPointerCapture(event.pointerId);
        setDragging(true);
        setHint(false);
      };

      const onPointerMove = (event: PointerEvent) => {
        if (pointerId !== event.pointerId || gyroRef.current) return;
        const dx = event.clientX - lastX;
        const dy = event.clientY - lastY;
        moved += Math.abs(dx) + Math.abs(dy);
        if (moved > 6) draggedRef.current = true;

        lonRef.current -= dx * 0.12;
        latRef.current = THREE.MathUtils.clamp(latRef.current + dy * 0.12, -85, 85);
        lastX = event.clientX;
        lastY = event.clientY;
        aim();
      };

      const endDrag = (event: PointerEvent) => {
        if (pointerId !== event.pointerId) return;
        pointerId = null;
        setDragging(false);
      };

      renderer.domElement.addEventListener("pointerdown", onPointerDown);
      renderer.domElement.addEventListener("pointermove", onPointerMove);
      renderer.domElement.addEventListener("pointerup", endDrag);
      renderer.domElement.addEventListener("pointercancel", endDrag);

      const onOrientation = (event: DeviceOrientationEvent) => {
        if (!gyroRef.current) return;
        lonRef.current = 90 - (event.alpha ?? 0);
        latRef.current = THREE.MathUtils.clamp((event.beta ?? 0) - 90, -85, 85);
        aim();
      };
      window.addEventListener("deviceorientation", onOrientation);

      const resize = new ResizeObserver(() => {
        const width = mount.clientWidth;
        const height = Math.max(mount.clientHeight, 1);
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      });
      resize.observe(mount);

      // Markers are positioned in the render loop, not in React state: doing it
      // in state would re-render the whole viewer sixty times a second.
      const dir = new THREE.Vector3();
      const camDir = new THREE.Vector3();

      const placeHotspots = () => {
        const width = mount.clientWidth;
        const height = mount.clientHeight;
        camera.getWorldDirection(camDir);

        for (const spot of hotspotsRef.current) {
          const element = linkRefs.current.get(spot.id);
          if (!element) continue;

          const { phi, theta } = bearingOf(spot);
          dir.setFromSphericalCoords(1, phi, theta);

          const facing = dir.dot(camDir) > 0.15;
          dir.project(camera);

          const x = (dir.x * 0.5 + 0.5) * width;
          const y = (-dir.y * 0.5 + 0.5) * height;
          const visible = facing && x > -40 && x < width + 40 && y > -40 && y < height + 40;

          element.style.transform = `translate(-50%, -50%) translate3d(${x}px, ${y}px, 0)`;
          element.style.opacity = visible ? "1" : "0";
          element.style.pointerEvents = visible ? "auto" : "none";
          element.tabIndex = visible ? 0 : -1;
        }
      };

      let frame = 0;
      const render = () => {
        if (autoPan) {
          lonRef.current += 0.05;
          aim();
        }
        placeHotspots();
        renderer.render(scene, camera);
        frame = requestAnimationFrame(render);
      };
      render();

      cleanup = () => {
        cancelAnimationFrame(frame);
        aimRef.current = null;
        resize.disconnect();
        window.removeEventListener("deviceorientation", onOrientation);
        renderer.domElement.removeEventListener("pointerdown", onPointerDown);
        renderer.domElement.removeEventListener("pointermove", onPointerMove);
        renderer.domElement.removeEventListener("pointerup", endDrag);
        renderer.domElement.removeEventListener("pointercancel", endDrag);
        geometry.dispose();
        material.dispose();
        texture.dispose();
        renderer.dispose();
        if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      };
    })();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [src]);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const enableGyro = useCallback(async () => {
    type OrientationEventCtor = typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<"granted" | "denied">;
    };

    if (typeof DeviceOrientationEvent === "undefined") {
      setGyro("unsupported");
      return;
    }

    const ctor = DeviceOrientationEvent as OrientationEventCtor;
    if (typeof ctor.requestPermission === "function") {
      try {
        const permission = await ctor.requestPermission();
        if (permission !== "granted") {
          setGyro("denied");
          return;
        }
      } catch {
        setGyro("denied");
        return;
      }
    }

    gyroRef.current = true;
    setGyro("granted");
    setGyroActive(true);
    setHint(false);
  }, []);

  const disableGyro = useCallback(() => {
    gyroRef.current = false;
    setGyroActive(false);
    lonRef.current = homeRef.current.lon;
    latRef.current = homeRef.current.lat;
    aimRef.current?.();
  }, []);

  const resetView = useCallback(() => {
    lonRef.current = homeRef.current.lon;
    latRef.current = homeRef.current.lat;
    aimRef.current?.();
  }, []);

  const toggleFullscreen = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;

    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }

    if (stage.requestFullscreen) {
      void stage.requestFullscreen().catch(() => {
        // iOS Safari refuses element fullscreen; the viewer still works.
      });
    }
  }, []);

  const onKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    // Only steer when the stage itself has focus, not a marker or a button.
    if (event.target !== event.currentTarget) return;

    const step = event.shiftKey ? 30 : 10;
    const moves: Record<string, () => void> = {
      ArrowLeft: () => {
        lonRef.current += step;
      },
      ArrowRight: () => {
        lonRef.current -= step;
      },
      ArrowUp: () => {
        latRef.current = Math.min(latRef.current + step, 85);
      },
      ArrowDown: () => {
        latRef.current = Math.max(latRef.current - step, -85);
      },
    };

    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    move();
    setHint(false);
    aimRef.current?.();
  }, []);

  const canFullscreen = typeof document !== "undefined" && Boolean(document.fullscreenEnabled);

  return (
    <div
      ref={stageRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-label={`${alt}. Drag to look around, or focus and use the arrow keys. ${hotspots.length} object markers.`}
      className="relative h-full w-full overflow-hidden bg-ink [&:fullscreen]:h-screen [&:fullscreen]:min-h-0"
    >
      <div ref={mountRef} className="absolute inset-0" />

      <div className="pointer-events-none absolute inset-0 z-10">
        {hotspots.map((spot) => (
          <Link
            key={spot.id}
            href={spot.href}
            title={spot.label}
            aria-label={`${spot.code} — ${spot.label}`}
            onClick={(event) => {
              // A drag that happens to end on a marker must not navigate.
              if (draggedRef.current) {
                event.preventDefault();
                draggedRef.current = false;
              }
            }}
            ref={(element) => {
              if (element) linkRefs.current.set(spot.id, element);
              else linkRefs.current.delete(spot.id);
            }}
            className="pointer-events-auto absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full border border-paper/70 bg-ink/80 font-mono text-[10px] font-medium text-paper opacity-0 shadow-sm transition-opacity hover:bg-oxblood focus-visible:opacity-100"
            style={{ willChange: "transform" }}
          >
            {spot.code}
          </Link>
        ))}
      </div>

      {status !== "ready" ? (
        <div className="absolute inset-0 z-20">
          {/* Same smaller still as the stage: this is the loading backdrop,
              not the texture the viewer will pan across. */}
          <Image
            src={src}
            alt=""
            fill
            sizes="100vw"
            loading="eager"
            fetchPriority="high"
            className="object-cover opacity-60"
          />
          <div className="absolute inset-0 grid place-items-center bg-ink/40 px-6 text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-paper">
              {status === "error"
                ? "360° viewer unavailable — showing the room panorama"
                : progress > 0
                  ? `Loading room ${progress}%`
                  : "Loading room…"}
            </p>
          </div>
        </div>
      ) : null}

      <div className="absolute inset-x-0 bottom-0 z-30 flex flex-wrap items-center gap-2 bg-gradient-to-t from-ink/80 to-transparent p-3">
        <button
          type="button"
          onClick={gyroActive ? disableGyro : enableGyro}
          aria-pressed={gyroActive}
          className="border border-paper/30 bg-ink/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-paper transition-colors hover:bg-ink/90"
        >
          {gyro === "unsupported"
            ? "No motion sensor"
            : gyro === "denied"
              ? "Motion blocked"
              : gyroActive
                ? "Motion on"
                : "Use motion"}
        </button>
        <button
          type="button"
          onClick={resetView}
          className="border border-paper/30 bg-ink/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-paper transition-colors hover:bg-ink/90"
        >
          Reset view
        </button>
        {canFullscreen ? (
          <button
            type="button"
            onClick={toggleFullscreen}
            className="border border-paper/30 bg-ink/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-paper transition-colors hover:bg-ink/90"
          >
            {fullscreen ? "Exit full screen" : "Full screen"}
          </button>
        ) : null}
        <span className="ml-auto hidden font-mono text-[10px] uppercase tracking-widest text-paper/70 sm:inline">
          {hint ? "Drag to look · arrow keys" : dragging ? "Steering…" : "Drag to look"}
        </span>
      </div>
    </div>
  );
}
