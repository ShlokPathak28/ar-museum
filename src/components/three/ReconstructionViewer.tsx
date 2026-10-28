"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import type { MaterialMode } from "@/types/exhibit";

type ReconstructionViewerProps = {
  src: string;
  alt: string;
  mode: MaterialMode;
};

/**
 * The "how it was reconstructed" view: the same GLB, three material states.
 *
 * `<model-viewer>` deliberately exposes no material API, so the material switch
 * needs a real three.js scene. This is also the smallest honest way to show the
 * difference between the scanned surface and the interpreted form: wireframe is
 * the raw mesh, clay is the geometry with surface detail removed, textured is
 * the scan itself.
 */
export default function ReconstructionViewer({ src, alt, mode }: ReconstructionViewerProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const modeRef = useRef<MaterialMode>(mode);
  const applyRef = useRef<((next: MaterialMode) => void) | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let disposed = false;
    let cleanup: (() => void) | undefined;

    // The scene is built inside an async body so a failed WebGL context is
    // reported from a callback, not as a synchronous state update in the effect.
    void (async () => {
      let renderer: THREE.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      } catch (cause) {
        setStatus("error");
        setError(`WebGL is unavailable: ${(cause as Error).message}`);
        return;
      }

      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(mount.clientWidth, Math.max(mount.clientHeight, 1), false);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      renderer.domElement.style.display = "block";
      renderer.domElement.style.touchAction = "none";
      mount.appendChild(renderer.domElement);

      const scene = new THREE.Scene();

      const camera = new THREE.PerspectiveCamera(
        40,
        mount.clientWidth / Math.max(mount.clientHeight, 1),
        0.01,
        100,
      );
      camera.position.set(0, 0.35, 2.4);

      scene.add(new THREE.HemisphereLight(0xfffdf9, 0x6b5a46, 1.4));
      const key = new THREE.DirectionalLight(0xffffff, 2.2);
      key.position.set(2, 3, 2.5);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0xfff1dc, 0.7);
      fill.position.set(-2, 1, -2);
      scene.add(fill);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.enablePan = false;
      controls.minDistance = 1;
      controls.maxDistance = 5;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.7;

      // Shared stand-ins, created once per mounted viewer.
      const clay = new THREE.MeshStandardMaterial({
        color: 0xd9c9b2,
        roughness: 0.95,
        metalness: 0,
      });
      const wire = new THREE.MeshBasicMaterial({
        color: 0x6b4a2a,
        wireframe: true,
      });

      const originals = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
      let root: THREE.Object3D | null = null;

      const applyMode = (next: MaterialMode) => {
        if (!root) return;
        root.traverse((child) => {
          const mesh = child as THREE.Mesh;
          if (!mesh.isMesh) return;
          const original = originals.get(mesh);
          if (!original) return;
          mesh.material = next === "textured" ? original : next === "clay" ? clay : wire;
        });
      };

      // The GLBs ship Draco-compressed (16.5 MB of scans became 1.7 MB), so the
      // loader needs a decoder. It is served from our own origin rather than a
      // CDN: the demo has to work on a venue network. The 188 KB wasm is only
      // fetched when this tab is opened, never on the exhibit's first paint.
      const draco = new DRACOLoader();
      draco.setDecoderPath("/draco/");

      const loader = new GLTFLoader();
      loader.setDRACOLoader(draco);
      loader.load(
        src,
        (gltf) => {
          if (disposed) return;

          root = gltf.scene;

          // Normalise: every model is scaled to the same on-screen size,
          // whatever units the scan was authored in, then recentred on origin.
          const box = new THREE.Box3().setFromObject(root);
          const size = new THREE.Vector3();
          const center = new THREE.Vector3();
          box.getSize(size);
          box.getCenter(center);

          const maxDimension = Math.max(size.x, size.y, size.z) || 1;
          const scale = 1.5 / maxDimension;
          root.scale.setScalar(scale);
          root.position.sub(center.multiplyScalar(scale));

          root.traverse((child) => {
            const mesh = child as THREE.Mesh;
            if (!mesh.isMesh) return;
            originals.set(mesh, mesh.material);
          });

          scene.add(root);
          applyMode(modeRef.current);
          controls.target.set(0, 0, 0);
          controls.update();
          setStatus("ready");
        },
        undefined,
        (cause) => {
          if (disposed) return;
          console.error("Could not load reconstruction model", cause);
          setStatus("error");
          setError("The model file could not be loaded.");
        },
      );

      applyRef.current = applyMode;

      let frame = 0;
      const render = () => {
        controls.update();
        renderer.render(scene, camera);
        frame = requestAnimationFrame(render);
      };
      render();

      const resize = new ResizeObserver(() => {
        const width = mount.clientWidth;
        const height = Math.max(mount.clientHeight, 1);
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      });
      resize.observe(mount);

      cleanup = () => {
        disposed = true;
        cancelAnimationFrame(frame);
        resize.disconnect();
        applyRef.current = null;
        controls.dispose();

        root?.traverse((child) => {
          const mesh = child as THREE.Mesh;
          if (!mesh.isMesh) return;
          mesh.geometry.dispose();
        });

        originals.forEach((material) => {
          const list = Array.isArray(material) ? material : [material];
          for (const entry of list) {
            const map = (entry as THREE.MeshStandardMaterial).map;
            map?.dispose();
            entry.dispose();
          }
        });

        clay.dispose();
        wire.dispose();
        draco.dispose();
        renderer.dispose();
        if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      };
    })();

    return () => {
      cleanup?.();
    };
  }, [src]);

  // Material changes are a ref call, not a scene rebuild: the model loads once.
  useEffect(() => {
    modeRef.current = mode;
    applyRef.current?.(mode);
  }, [mode]);

  return (
    <div className="relative h-full w-full">
      <div
        ref={mountRef}
        role="img"
        aria-label={`${alt} — reconstruction mesh, ${mode} state`}
        className="h-full w-full"
      />
      {status === "loading" ? (
        <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-ink-soft">
          Preparing the reconstruction…
        </p>
      ) : null}
      {status === "error" ? (
        <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-rust">
          {error ?? "The reconstruction could not be shown."}
        </p>
      ) : null}
    </div>
  );
}
