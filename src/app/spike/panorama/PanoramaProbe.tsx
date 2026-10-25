"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
} from "react";
import * as THREE from "three";

/**
 * Throwaway VR probe for week 0.
 *
 * It renders a procedurally drawn equirectangular test card on the inside of a
 * sphere and lets you look around. Nothing here ships into `/rooms` — the point
 * is to answer three questions on the demo phone before week 3 depends on them:
 *
 *   1. Does an equirectangular texture land upright (horizon level, N at the
 *      seam) at 2048×1024, or does the projection need rotating?
 *   2. Can we take over touch drag without fighting the page scroll?
 *   3. Can `DeviceOrientationEvent` drive the camera on this handset?
 *
 * Drawing the card instead of shipping a photo keeps the probe licence-free and
 * makes coordinate mistakes obvious: every 30° meridian is labelled.
 */

const TEXTURE_W = 2048;
const TEXTURE_H = 1024;

function drawTestCard(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = TEXTURE_W;
  canvas.height = TEXTURE_H;

  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const horizon = TEXTURE_H / 2;

  // Sky above the horizon, ground below: the seam should meet at eye level.
  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, "#3b2f26");
  sky.addColorStop(1, "#e6d6bd");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, TEXTURE_W, horizon);

  const ground = ctx.createLinearGradient(0, horizon, 0, TEXTURE_H);
  ground.addColorStop(0, "#7a5a3a");
  ground.addColorStop(1, "#241a13");
  ctx.fillStyle = ground;
  ctx.fillRect(0, horizon, TEXTURE_W, TEXTURE_H - horizon);

  // Horizon. If this is not level on the phone, the mapping is wrong.
  ctx.strokeStyle = "#fffdf9";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(0, horizon);
  ctx.lineTo(TEXTURE_W, horizon);
  ctx.stroke();

  // Meridians every 30°, labelled every 90°.
  const compass = ["N", "E", "S", "W"];
  for (let deg = 0; deg < 360; deg += 30) {
    const x = (deg / 360) * TEXTURE_W;
    ctx.strokeStyle = deg % 90 === 0 ? "rgba(255,253,249,0.75)" : "rgba(255,253,249,0.28)";
    ctx.lineWidth = deg % 90 === 0 ? 4 : 2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, TEXTURE_H);
    ctx.stroke();

    if (deg % 90 === 0) {
      ctx.fillStyle = "#fffdf9";
      ctx.font = "bold 96px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(compass[deg / 90]!, x, horizon - 90);
    }
  }

  // Elevation rings every 15° above and below the horizon.
  for (let step = 1; step <= 5; step += 1) {
    const offset = (step * 15 * TEXTURE_H) / 180;
    for (const y of [horizon - offset, horizon + offset]) {
      ctx.strokeStyle = "rgba(255,253,249,0.22)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(TEXTURE_W, y);
      ctx.stroke();
    }
  }

  // Centre label, so "looking north" is unambiguous in a photo of the phone.
  ctx.fillStyle = "#fffdf9";
  ctx.font = "bold 64px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("360° calibration card", TEXTURE_W / 4, horizon + 70);

  return canvas;
}

type OrientationPermission = "unknown" | "granted" | "denied" | "unsupported";

export default function PanoramaProbe() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const aimRef = useRef<(() => void) | null>(null);
  const lonRef = useRef(0);
  const latRef = useRef(0);
  const gyroRef = useRef(false);

  const [gyro, setGyro] = useState<OrientationPermission>("unknown");
  const [gyroActive, setGyroActive] = useState(false);
  const [heading, setHeading] = useState({ alpha: 0, beta: 0, gamma: 0 });
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Secure-context is a browser fact. Reading it off the server snapshot keeps
  // the server render ("—") and the hydration pass identical.
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const secure = isClient ? window.isSecureContext : null;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let cleanup: (() => void) | undefined;

    // The whole setup runs inside an async body so a WebGL failure can be
    // reported through setState without a synchronous update in the effect
    // body. There is no await in here: it still runs in the same tick.
    void (async () => {
      let renderer: THREE.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true });
      } catch (cause) {
        setError(`WebGL unavailable: ${(cause as Error).message}`);
        return;
      }

      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(mount.clientWidth, mount.clientHeight, false);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      renderer.domElement.style.display = "block";
      renderer.domElement.style.touchAction = "none";
      mount.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        75,
        mount.clientWidth / Math.max(mount.clientHeight, 1),
        0.1,
        200,
      );

      const texture = new THREE.CanvasTexture(drawTestCard());
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;

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
      aim();
      aimRef.current = aim;

      // Drag to look. Pointer capture means a finger that leaves the canvas
      // keeps steering until it lifts, which is what panorama viewers do.
      let pointerId: number | null = null;
      let lastX = 0;
      let lastY = 0;

      const onPointerDown = (event: PointerEvent) => {
        if (gyroRef.current) return;
        pointerId = event.pointerId;
        lastX = event.clientX;
        lastY = event.clientY;
        renderer.domElement.setPointerCapture(event.pointerId);
        setDragging(true);
      };

      const onPointerMove = (event: PointerEvent) => {
        if (pointerId !== event.pointerId || gyroRef.current) return;
        lonRef.current -= (event.clientX - lastX) * 0.12;
        latRef.current = THREE.MathUtils.clamp(
          latRef.current + (event.clientY - lastY) * 0.12,
          -85,
          85,
        );
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
        const alpha = event.alpha ?? 0;
        const beta = event.beta ?? 0;
        const gamma = event.gamma ?? 0;

        // Portrait phone held upright: alpha is the compass heading, beta
        // drives pitch. Landscape and screen-orientation offsets are week 3's
        // problem — this probe only proves the event arrives and moves the view.
        lonRef.current = 90 - alpha;
        latRef.current = THREE.MathUtils.clamp(beta - 90, -85, 85);
        aim();
        setHeading({ alpha, beta, gamma });
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

      let frame = 0;
      const render = () => {
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
      cleanup?.();
    };
  }, []);

  const enableGyro = async () => {
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
      } catch (cause) {
        setError(`Gyro permission failed: ${(cause as Error).message}`);
        setGyro("denied");
        return;
      }
    }

    gyroRef.current = true;
    setGyroActive(true);
    setGyro("granted");
  };

  const disableGyro = () => {
    gyroRef.current = false;
    setGyroActive(false);
    setHeading({ alpha: 0, beta: 0, gamma: 0 });
  };

  const resetNorth = () => {
    lonRef.current = 0;
    latRef.current = 0;
    aimRef.current?.();
  };

  // Keyboard equivalent of the drag, so the probe can be driven without a
  // touchscreen (and so the same pattern is ready for the room viewer).
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 30 : 10;
    const keys: Record<string, () => void> = {
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

    const move = keys[event.key];
    if (!move) return;
    event.preventDefault();
    move();
    aimRef.current?.();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="flex flex-col gap-3">
        <div
          ref={mountRef}
          role="group"
          tabIndex={0}
          aria-label="360° calibration panorama. Drag to look around, or focus and use the arrow keys."
          onKeyDown={onKeyDown}
          className="h-[55vh] min-h-[320px] cursor-grab overflow-hidden rounded-2xl border border-ink/10 bg-ink active:cursor-grabbing"
          data-dragging={dragging}
        />
        <p className="font-mono text-[11px] leading-relaxed text-ink-soft">
          Texture {TEXTURE_W}×{TEXTURE_H} · sphere 50 m · fov 75° · arrow keys look around (shift
          for bigger steps) · horizon must sit level and N must face the start of the sphere seam.
        </p>
      </div>

      <div className="space-y-5">
        <div className="rounded-xl border border-ink/10 bg-paper p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft">
            Probe status
          </p>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-soft">Secure context</dt>
              <dd className="font-mono">{secure === null ? "—" : String(secure)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-soft">Pointer drag</dt>
              <dd className="font-mono">{dragging ? "steering" : "idle"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-soft">Gyro</dt>
              <dd className="font-mono">
                {gyro === "granted" ? (gyroActive ? "tracking" : "stopped") : gyro}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-soft">α / β / γ</dt>
              <dd className="font-mono tabular-nums">
                {heading.alpha.toFixed(0)} / {heading.beta.toFixed(0)} /{" "}
                {heading.gamma.toFixed(0)}
              </dd>
            </div>
          </dl>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={gyroActive ? disableGyro : enableGyro}
              className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper"
            >
              {gyroActive ? "Stop gyro" : "Use device orientation"}
            </button>
            <button
              type="button"
              onClick={resetNorth}
              className="rounded-full border border-ink/20 px-4 py-2 text-sm text-ink-soft hover:border-ink/40"
            >
              Recentre north
            </button>
          </div>
          {error ? <p className="mt-3 text-sm text-brick">{error}</p> : null}
        </div>

        <div className="rounded-xl border border-ink/10 bg-paper p-5 text-sm leading-relaxed text-ink-soft">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em]">What to look for</p>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            <li>The horizon sits at eye level, not tilted.</li>
            <li>N, E, S and W appear 90° apart as you turn.</li>
            <li>Drag keeps working with a finger that leaves the box.</li>
            <li>α/β/γ change while gyro is on; the view follows.</li>
          </ul>
          <p className="mt-3">
            A real room shot replaces the drawn card in week 3 — same geometry, same camera.
          </p>
        </div>
      </div>
    </div>
  );
}
