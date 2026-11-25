"use client";

import { useRef, useState } from "react";

import { MAX_MODEL_BYTES, checkModelFile, formatBytes } from "@/lib/model-upload";

const fieldClass =
  "mt-1.5 w-full border border-ink/15 bg-paper px-3 py-2 text-sm outline-none focus-visible:border-oxblood";
const labelClass = "font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft";
const hintClass = "mt-1 text-xs leading-relaxed text-ink-soft";

type Props = {
  /** The file staged in the form, if one has been chosen. */
  file: File | null;
  credit: string;
  onFile: (file: File | null) => void;
  onCredit: (credit: string) => void;
};

/**
 * The picker shown while an exhibit is still being created.
 *
 * `ModelUpload` cannot run here: it posts to `uploadModel`, which needs an
 * exhibit id, and the row does not exist until the form is submitted. So the
 * file is held in memory — never read, never sent — and `ExhibitForm` uploads it
 * to the new id immediately after `saveExhibit` returns. One page, one button,
 * and the two server round trips are reported separately so a dropped upload
 * does not read as a failed create.
 *
 * The checks are the same ones the uploader runs, and the same ones the action
 * runs again: this is a convenience, not the boundary.
 */
export default function ModelPicker({ file, credit, onFile, onCredit }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  function choose(next: File | undefined) {
    setError(null);

    if (!next) {
      onFile(null);
      return;
    }

    const check = checkModelFile(next.name, next.size);
    if (!check.ok) {
      setError(check.error);
      onFile(null);
      // Clearing the input means the rejected file cannot be submitted later;
      // the visitor has to choose something else.
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    onFile(next);
  }

  return (
    <div className="border border-ink/15 bg-chalk-deep/40 p-4">
      <p className={labelClass}>Upload a .glb</p>
      <p className={hintClass}>
        Held on this page and uploaded the moment the exhibit is created — no second screen. Up to{" "}
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

          {file ? (
            <p className="mt-1 text-xs leading-relaxed text-ink-soft">
              Selected <span className="font-medium text-ink">{file.name}</span> —{" "}
              {formatBytes(file.size)}. Uploads with the exhibit.
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="modelCredit" className={labelClass}>
            Source and licence{" "}
            <span className="normal-case tracking-normal">(shown on /credits)</span>
          </label>
          <input
            id="modelCredit"
            value={credit}
            onChange={(event) => onCredit(event.target.value)}
            maxLength={200}
            placeholder="e.g. Smithsonian 3D, CC0"
            className={fieldClass}
          />
        </div>
      </div>

      {error ? (
        <p role="alert" className="mt-3 bg-oxblood/10 px-3 py-2 text-sm text-oxblood">
          {error}
        </p>
      ) : null}
    </div>
  );
}
