"use client";

import Image from "next/image";
import dynamic from "next/dynamic";

import type { RoomHotspot } from "./RoomViewer";

/**
 * `three` is ~600 kB, and only this page needs it. The dynamic import keeps it
 * out of the room page's first payload. The panorama itself is painted behind
 * the viewer immediately, so the room is visible while the chunk loads instead
 * of leaving a black hole where the image should be.
 */
const RoomViewer = dynamic(() => import("./RoomViewer"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center px-6 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-paper/80">
        Preparing the 360° viewer…
      </p>
    </div>
  ),
});

type Props = {
  src: string;
  alt: string;
  hotspots: RoomHotspot[];
};

export default function RoomStage({ src, alt, hotspots }: Props) {
  return (
    <div className="relative h-[60vh] min-h-[360px] w-full overflow-hidden border border-ink/15 bg-vault shadow-[0_40px_80px_-50px_rgba(22,20,15,0.9)]">
      {/* The still is the first paint, so it is allowed to be a smaller copy:
          the 360 texture behind it is the sharp one, and it arrives later. */}
      <Image
        src={src}
        alt=""
        fill
        sizes="100vw"
        loading="eager"
        fetchPriority="high"
        className="object-cover opacity-90"
      />
      <div className="absolute inset-0">
        <RoomViewer src={src} alt={alt} hotspots={hotspots} />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 shadow-[inset_0_0_110px_20px_rgba(0,0,0,0.5)]"
      />
    </div>
  );
}
