"use client";

import { useRef, useState, useTransition } from "react";

import { formatBytes } from "@/lib/model-upload";

import { uploadPanorama } from "./actions";

type Props = {
  roomId: string;
  onUploaded: (url: string) => void;
};

/**
 * Choose a file, send it to the Server Action, and hand the resulting URL back
 * to the form. Like a model upload, this is live as soon as it finishes: the
 * action swaps the room's `panoramaUrl` in the same transaction that stores the
 * bytes, so the public room page shows the new picture without a second save.
 * The form value is updated to match, so a later save keeps it.
 */
export default function PanoramaUpload({ roomId, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  function onChoose() {
    const file = inputRef.current?.files?.[0];
    if (!file) return;

    const data = new FormData();
    data.set("roomId", roomId);
    data.set("file", file);

    setError(null);
    setNote(null);

    startTransition(async () => {
      const result = await uploadPanorama(data);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      onUploaded(result.url);
      setNote(
        `Stored ${result.filename} · ${result.width}×${result.height} · ${formatBytes(result.size)}`,
      );

      if (inputRef.current) inputRef.current.value = "";
    });
  }

  return (
    <div className="mt-2">
      <label
        htmlFor="panorama-file"
        className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft"
      >
        Panorama file
      </label>
      <div className="mt-1.5 flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          id="panorama-file"
          type="file"
          accept="image/webp,image/jpeg,.webp,.jpg,.jpeg"
          onChange={onChoose}
          disabled={pending}
          className="block w-full max-w-xs text-sm file:mr-3 file:border file:border-ink/20 file:bg-paper file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:border-ink/50"
        />
        {pending ? (
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
            Uploading…
          </span>
        ) : null}
      </div>

      <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
        Equirectangular, twice as wide as it is tall — 3072×1536 WebP is the house size. The
        file is stored in the database and served from this site, so no redeploy is needed.
      </p>

      {note ? (
        <p role="status" className="mt-2 text-sm text-ink-soft">
          {note}
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="mt-2 text-sm text-oxblood">
          {error}
        </p>
      ) : null}
    </div>
  );
}
