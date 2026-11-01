"use client";

import { useEffect, useRef, useState } from "react";

import { MAX_MODEL_BYTES, checkModelFile, formatBytes } from "@/lib/model-upload";

import { uploadModel, updateModelCredit } from "./actions";

const fieldClass =
  "mt-1.5 w-full border border-ink/15 bg-paper px-3 py-2 text-sm outline-none focus-visible:border-oxblood";
const labelClass = "font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft";
const hintClass = "mt-1 text-xs leading-relaxed text-ink-soft";

type Props = {
  exhibitId: string;
  /** The value of the form's `modelUrl` field. */
  value: string;
  /** The source line stored with an existing upload, if any. */
  initialCredit?: string;
  onChange: (url: string) => void;
};

type Stored = { filename: string; size: number; draco: boolean };

/**
 * Upload a `.glb` into the database and point the exhibit at it.
 *
 * Vercel's filesystem is read-only at runtime, so there is nowhere on disk to
 * put an upload; the file becomes a `ModelAsset` row and is served by
 * `/api/models/[id]`. The upload takes effect immediately (the action swaps the
 * exhibit's URL in the same transaction and revalidates), which is why the
 * button says so rather than hiding behind "Save".
 *
 * The file is checked here before a byte is sent, with the same helper the
 * action uses. A 40 MB export used to spend minutes uploading only to be told
 * it was always too big; now it is refused in the time it takes to read the
 * name. A slow connection still takes minutes for a legitimate 4 MB model, so
 * the button reports the size and how long it has been sending — a static
 * "Uploading…" reads as a hang.
 */
export default function ModelUpload({
  exhibitId,
  value,
  initialCredit = "",
  onChange,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const startedAt = useRef(0);
  const [credit, setCredit] = useState(initialCredit);
  const [savedCredit, setSavedCredit] = useState(initialCredit);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [stored, setStored] = useState<Stored | null>(null);
  const [selected, setSelected] = useState<{ name: string; size: number } | null>(null);
  const [seconds, setSeconds] = useState(0);

  const uploaded = value.startsWith("/api/models/");
  const creditChanged = credit.trim() !== savedCredit.trim();

  // A count, not a progress bar: the bytes go out in one Server Action request,
  // which cannot report how much of the body has arrived.
  useEffect(() => {
    if (!busy) return;

    const timer = setInterval(() => {
      setSeconds(Math.round((Date.now() - startedAt.current) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [busy]);

  function choose(file: File | undefined) {
    setError(null);
    setNotice(null);

    if (!file) {
      setSelected(null);
      return;
    }

    setSelected({ name: file.name, size: file.size });

    const check = checkModelFile(file.name, file.size);
    if (!check.ok) {
      setError(check.error);
      setSelected(null);
      // Clearing the input means the rejected file cannot be submitted by a
      // later click on Upload; the visitor has to choose something else.
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function submit() {
    setError(null);
    setNotice(null);

    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Choose a .glb file first.");
      return;
    }

    // The input can outlive the check (a file chosen before this code shipped,
    // or a browser that keeps the value), so the rule runs again here.
    const check = checkModelFile(file.name, file.size);
    if (!check.ok) {
      setError(check.error);
      return;
    }

    setBusy(true);
    setSeconds(0);
    startedAt.current = Date.now();

    try {
      const data = new FormData();
      data.set("file", file);
      data.set("exhibitId", exhibitId);
      data.set("credit", credit);

      const result = await uploadModel(data);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      onChange(result.url);
      setStored({ filename: result.filename, size: result.size, draco: result.draco });
      setSavedCredit(credit.trim());
      setSelected(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (cause) {
      const elapsed = Math.round((Date.now() - startedAt.current) / 1000);
      setError(failureMessage(cause, elapsed));
    } finally {
      setBusy(false);
    }
  }

  async function saveCredit() {
    setError(null);
    setNotice(null);
    setBusy(true);
    startedAt.current = Date.now();

    try {
      const result = await updateModelCredit({ exhibitId, credit });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setSavedCredit(credit.trim());
      setNotice("Source line saved. /credits now shows it.");
    } catch {
      setError("The source line could not be saved. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border border-ink/15 bg-chalk-deep/40 p-4">
      <p className={labelClass}>Upload a .glb</p>
      <p className={hintClass}>
        Stored in the database and served from{" "}
        <code className="font-mono text-[11px]">/api/models/…</code>. Up to{" "}
        {formatBytes(MAX_MODEL_BYTES)}; compress first with{" "}
        <code className="font-mono text-[11px]">npx @gltf-transform/cli optimize</code>.
      </p>

      <div className="mt-3 space-y-3">
        <div>
          <label htmlFor="modelFile" className={labelClass}>
            GLB file
          </label>
          <input
            ref={fileRef}
            id="modelFile"
            type="file"
            accept=".glb,model/gltf-binary"
            onChange={(event) => choose(event.currentTarget.files?.[0])}
            className={`${fieldClass} file:mr-3 file:border-0 file:bg-ink file:px-3 file:py-1 file:text-xs file:text-paper`}
            aria-describedby="modelFileHint"
          />
          <p id="modelFileHint" className={hintClass}>
            Only binary glTF. A Draco-compressed file is what keeps the exhibit page light.
          </p>

          {selected && !error ? (
            <p className="mt-1 text-xs leading-relaxed text-ink-soft">
              Selected <span className="font-medium text-ink">{selected.name}</span> —{" "}
              {formatBytes(selected.size)}. Ready to upload.
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="modelCredit" className={labelClass}>
            Source and licence <span className="normal-case tracking-normal">(shown on /credits)</span>
          </label>
          <input
            id="modelCredit"
            value={credit}
            onChange={(event) => setCredit(event.target.value)}
            maxLength={200}
            placeholder="e.g. Smithsonian 3D, CC0"
            className={fieldClass}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="border border-ink/30 bg-paper px-4 py-2 text-sm font-medium transition-colors hover:bg-ink hover:text-paper disabled:opacity-60"
          >
            {busy ? "Uploading…" : uploaded ? "Replace model" : "Upload model"}
          </button>

          {uploaded ? (
            <>
              <button
                type="button"
                onClick={saveCredit}
                disabled={busy || !creditChanged}
                className="border border-ink/30 bg-paper px-4 py-2 text-sm font-medium transition-colors hover:bg-ink hover:text-paper disabled:opacity-60"
              >
                Save source line
              </button>

              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setStored(null);
                  setNotice(null);
                }}
                className="font-mono text-[10px] uppercase tracking-widest text-oxblood underline decoration-oxblood/30 underline-offset-2"
              >
                Detach — deletes the stored file on save
              </button>
            </>
          ) : null}
        </div>

        {busy && selected ? (
          <p role="status" className="text-sm leading-relaxed text-ink-soft">
            Sending {formatBytes(selected.size)}… {seconds} s.{" "}
            {seconds >= 20
              ? "A slow connection can take minutes; the file is stored only when it finishes."
              : "Nothing is stored until the whole file arrives."}
          </p>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="mt-3 bg-oxblood/10 px-3 py-2 text-sm text-oxblood">
          {error}
        </p>
      ) : null}

      {notice ? (
        <p role="status" className="mt-3 text-sm leading-relaxed text-ink-soft">
          {notice}
        </p>
      ) : null}

      {stored ? (
        <p role="status" className="mt-3 text-sm leading-relaxed">
          <span className="font-medium">{stored.filename}</span> —{" "}
          {formatBytes(stored.size)},{" "}
          {stored.draco ? "Draco-compressed" : "not Draco-compressed (heavier on the phone)"}. Live
          now.
        </p>
      ) : null}

      {uploaded && !stored ? (
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          This exhibit uses an uploaded model. Replacing it gives the new file a new URL, so no
          browser keeps serving the old scan.
        </p>
      ) : null}
    </div>
  );
}

/**
 * What to say when the Server Action throws. The client cannot see the response
 * body of a rejected request, so the only honest options are "the server refused
 * this before reading it" (a body-size rejection) and "it did not finish".
 * Telling someone to check their connection when the file was simply too big is
 * the message that made this look like a broken uploader.
 */
function failureMessage(cause: unknown, seconds: number): string {
  const text = cause instanceof Error ? cause.message : String(cause ?? "");
  const refused = /413|body exceeded|too large|maximum size|payload too large/i.test(text);

  if (refused) {
    return `The server refused the file before reading it — it is over the ${formatBytes(
      MAX_MODEL_BYTES,
    )} cap. Compress it and try again.`;
  }

  if (seconds >= 60) {
    return `The upload had not finished after ${seconds} s, so nothing was stored. A slow connection can take minutes for a model this size; try again, or compress the file first.`;
  }

  return "The upload did not finish, so nothing was stored. Try again — if it keeps failing, compress the file below the 4 MB cap.";
}
