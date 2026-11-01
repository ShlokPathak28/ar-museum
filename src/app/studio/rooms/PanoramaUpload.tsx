"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { formatBytes } from "@/lib/model-upload";
import { MAX_PANORAMA_BYTES, checkPanoramaFile } from "@/lib/panorama-upload";

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
 *
 * The name and size are checked before anything is sent, with the same helper
 * the action uses, so a 9 MB photograph is refused instantly instead of after a
 * long upload. The wait itself is reported in seconds: a panorama is smaller
 * than a model but a slow link still makes it look frozen.
 */
export default function PanoramaUpload({ roomId, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const startedAt = useRef(0);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [selected, setSelected] = useState<{ name: string; size: number } | null>(null);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!pending) return;

    const timer = setInterval(() => {
      setSeconds(Math.round((Date.now() - startedAt.current) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [pending]);

  function onChoose() {
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setSelected(null);
      return;
    }

    setError(null);
    setNote(null);
    setSelected({ name: file.name, size: file.size });

    const check = checkPanoramaFile(file.name, file.size);
    if (!check.ok) {
      setError(check.error);
      setSelected(null);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    const data = new FormData();
    data.set("roomId", roomId);
    data.set("file", file);

    startedAt.current = Date.now();
    setSeconds(0);

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
      setSelected(null);

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
        {pending && selected ? (
          <span role="status" className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
            Sending {formatBytes(selected.size)}… {seconds} s
          </span>
        ) : null}
      </div>

      <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
        Equirectangular, twice as wide as it is tall — 3072×1536 WebP is the house size, up to{" "}
        {formatBytes(MAX_PANORAMA_BYTES)}. The file is stored in the database and served from this
        site, so no redeploy is needed.
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
