"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { MAX_MODEL_BYTES, checkModelFile, formatBytes } from "@/lib/model-upload";
import { exhibitAdminSchema, type ExhibitAdminValues } from "@/lib/schemas";

import { saveExhibit, uploadModel } from "./actions";
import DeleteExhibitButton from "./DeleteExhibitButton";
import ModelPicker from "./ModelPicker";
import ModelUpload from "./ModelUpload";

export type RoomOption = { id: string; name: string; floor: string };

export type ExhibitFormInitial = ExhibitAdminValues & { id: string; modelCredit?: string };

type Props = {
  rooms: RoomOption[];
  /** Omitted when creating a new exhibit. */
  exhibit?: ExhibitFormInitial;
  /** Set when the edit page was reached after a create whose upload failed. */
  modelNotice?: string;
};

const fieldClass =
  "mt-1.5 w-full border border-ink/15 bg-paper px-3 py-2 text-sm outline-none focus-visible:border-oxblood";
const labelClass = "font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft";
const hintClass = "mt-1 text-xs leading-relaxed text-ink-soft";

export default function ExhibitForm({ rooms, exhibit, modelNotice }: Props) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Create mode only: the file chosen here has nowhere to go until the exhibit
  // exists, so it waits in memory and is uploaded straight after the save.
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [modelCredit, setModelCredit] = useState("");
  const [modelFileError, setModelFileError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSeconds, setUploadSeconds] = useState(0);

  // The clock starts when the upload stage begins, not when the form renders:
  // an effect is the only place allowed to read the wall clock.
  useEffect(() => {
    if (!uploading) return;

    const startedAt = Date.now();
    const timer = setInterval(() => {
      setUploadSeconds(Math.round((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [uploading]);

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ExhibitAdminValues>({
    resolver: zodResolver(exhibitAdminSchema),
    defaultValues: exhibit ?? {
      slug: "",
      code: "",
      title: "",
      subtitle: "",
      era: "",
      yearStart: "",
      yearEnd: "",
      roomId: rooms[0]?.id ?? "",
      summary: "",
      body: "",
      facts: "",
      tags: "",
      heroImage: "",
      modelUrl: "",
      modelUsdz: "",
      status: "DRAFT",
    },
  });

  // `watch()` cannot be memoised by the React Compiler (react-hooks/
  // incompatible-library); `useWatch` subscribes to one field instead.
  const modelUrl = useWatch({ control, name: "modelUrl" }) ?? "";

  // The button says what the press will actually do: a staged file makes the
  // save two server round trips, and hiding that would be a surprise.
  const submitLabel = exhibit
    ? "Save changes"
    : modelFile
      ? "Create exhibit and upload model"
      : "Create exhibit";

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setSaved(false);
    setModelFileError(null);

    // The picker checked this already; the rule runs again because the input can
    // outlive the check and a rejected file must never be sent.
    if (modelFile) {
      const check = checkModelFile(modelFile.name, modelFile.size);
      if (!check.ok) {
        setModelFileError(check.error);
        return;
      }
    }

    const result = await saveExhibit({ ...values, id: exhibit?.id });

    if (!result.ok) {
      setFormError(result.error);

      for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
        if (field in values) {
          setError(field as keyof ExhibitAdminValues, { message });
        }
      }

      return;
    }

    if (!exhibit) {
      // The row exists now, so a staged file has somewhere to attach. The two
      // steps report separately: an upload that fails must not be blamed on the
      // create, which succeeded and left a usable draft behind.
      if (!modelFile) {
        // No file chosen: land where the earlier fix put people — the model
        // section — since a missing scan is the next thing to deal with.
        router.replace(`/studio/exhibits/${result.id}#the-3d-model`);
        router.refresh();
        return;
      }

      setUploading(true);
      setUploadSeconds(0);

      const data = new FormData();
      data.set("file", modelFile);
      data.set("exhibitId", result.id);
      data.set("credit", modelCredit);

      try {
        const upload = await uploadModel(data);

        router.replace(
          upload.ok
            ? `/studio/exhibits/${result.id}`
            : `/studio/exhibits/${result.id}?model=failed#the-3d-model`,
        );
      } catch {
        // A body-limit rejection throws rather than returning; the exhibit is
        // still created, so the editor explains and offers the picker again.
        router.replace(`/studio/exhibits/${result.id}?model=failed#the-3d-model`);
      }

      router.refresh();
      return;
    }

    setSaved(true);
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-10">
      {formError ? (
        <p role="alert" className="bg-oxblood/10 px-4 py-3 text-sm text-oxblood">
          {formError}
        </p>
      ) : null}

      {saved ? (
        <p role="status" className="border border-ink/15 bg-paper px-4 py-3 text-sm">
          Saved. The public pages have been refreshed.
        </p>
      ) : null}

      {/* Four screens of form. The model upload is the thing people come here
          for, and it was the last section — reachable, but only by scrolling
          past everything else and guessing that "Media and model" held it. */}
      <nav
        aria-label="Sections of this form"
        className="flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-ink/10 py-3 font-mono text-[10px] uppercase tracking-[0.16em]"
      >
        <span className="text-ink-soft">Jump to</span>
        {[
          { href: "#the-label", label: "The label" },
          { href: "#the-wall-text", label: "The wall text" },
          { href: "#the-photograph", label: "The photograph" },
          { href: "#the-3d-model", label: "The 3D model ↓" },
        ].map((section) => (
          <a
            key={section.href}
            href={section.href}
            className="text-oxblood underline decoration-oxblood/30 underline-offset-2 hover:decoration-oxblood"
          >
            {section.label}
          </a>
        ))}
      </nav>

      <fieldset id="the-label" className="scroll-mt-28 space-y-5">
        <legend className="font-serif text-2xl tracking-tight">The label</legend>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="title" className={labelClass}>
              Title
            </label>
            <input id="title" {...register("title")} className={fieldClass} />
            {errors.title ? (
              <p role="alert" className="mt-1 text-sm text-oxblood">
                {errors.title.message}
              </p>
            ) : null}
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="subtitle" className={labelClass}>
              Subtitle <span className="normal-case tracking-normal">(optional)</span>
            </label>
            <input id="subtitle" {...register("subtitle")} className={fieldClass} />
            {errors.subtitle ? (
              <p role="alert" className="mt-1 text-sm text-oxblood">
                {errors.subtitle.message}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="slug" className={labelClass}>
              URL slug
            </label>
            <input id="slug" {...register("slug")} className={fieldClass} />
            <p className={hintClass}>Lands at /exhibits/&lt;slug&gt;.</p>
            {errors.slug ? (
              <p role="alert" className="mt-1 text-sm text-oxblood">
                {errors.slug.message}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="code" className={labelClass}>
              Short code
            </label>
            <input id="code" {...register("code")} className={fieldClass} />
            <p className={hintClass}>Printed on the QR card, e.g. BH02.</p>
            {errors.code ? (
              <p role="alert" className="mt-1 text-sm text-oxblood">
                {errors.code.message}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="roomId" className={labelClass}>
              Room
            </label>
            <select id="roomId" {...register("roomId")} className={fieldClass}>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name} · {room.floor}
                </option>
              ))}
            </select>
            {errors.roomId ? (
              <p role="alert" className="mt-1 text-sm text-oxblood">
                {errors.roomId.message}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="status" className={labelClass}>
              Status
            </label>
            <select id="status" {...register("status")} className={fieldClass}>
              <option value="DRAFT">Draft — hidden from visitors</option>
              <option value="PUBLISHED">Published — on view</option>
            </select>
            {errors.status ? (
              <p role="alert" className="mt-1 text-sm text-oxblood">
                {errors.status.message}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="era" className={labelClass}>
              Era
            </label>
            <input id="era" {...register("era")} className={fieldClass} />
            {errors.era ? (
              <p role="alert" className="mt-1 text-sm text-oxblood">
                {errors.era.message}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="yearStart" className={labelClass}>
                Year from
              </label>
              <input
                id="yearStart"
                inputMode="numeric"
                {...register("yearStart")}
                className={fieldClass}
              />
              {errors.yearStart ? (
                <p role="alert" className="mt-1 text-sm text-oxblood">
                  {errors.yearStart.message}
                </p>
              ) : null}
            </div>
            <div>
              <label htmlFor="yearEnd" className={labelClass}>
                Year to
              </label>
              <input
                id="yearEnd"
                inputMode="numeric"
                {...register("yearEnd")}
                className={fieldClass}
              />
              {errors.yearEnd ? (
                <p role="alert" className="mt-1 text-sm text-oxblood">
                  {errors.yearEnd.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="tags" className={labelClass}>
              Tags
            </label>
            <input id="tags" {...register("tags")} className={fieldClass} />
            <p className={hintClass}>
              Comma separated, e.g. brass, ceremonial. The first matching tag sets the card accent.
            </p>
            {errors.tags ? (
              <p role="alert" className="mt-1 text-sm text-oxblood">
                {errors.tags.message}
              </p>
            ) : null}
          </div>
        </div>
      </fieldset>

      <fieldset id="the-wall-text" className="scroll-mt-28 space-y-5">
        <legend className="font-serif text-2xl tracking-tight">The wall text</legend>

        <div>
          <label htmlFor="summary" className={labelClass}>
            Summary
          </label>
          <textarea id="summary" rows={3} {...register("summary")} className={fieldClass} />
          <p className={hintClass}>One or two sentences for the collection card.</p>
          {errors.summary ? (
            <p role="alert" className="mt-1 text-sm text-oxblood">
              {errors.summary.message}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="body" className={labelClass}>
            Exhibit text
          </label>
          <textarea id="body" rows={12} {...register("body")} className={fieldClass} />
          <p className={hintClass}>Separate paragraphs with a blank line.</p>
          {errors.body ? (
            <p role="alert" className="mt-1 text-sm text-oxblood">
              {errors.body.message}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="facts" className={labelClass}>
            Four things to notice
          </label>
          <textarea id="facts" rows={4} {...register("facts")} className={fieldClass} />
          <p className={hintClass}>One fact per line; up to eight.</p>
          {errors.facts ? (
            <p role="alert" className="mt-1 text-sm text-oxblood">
              {errors.facts.message}
            </p>
          ) : null}
        </div>
      </fieldset>

      <fieldset id="the-photograph" className="scroll-mt-28 space-y-5">
        <legend className="font-serif text-2xl tracking-tight">The photograph</legend>

        <div>
          <label htmlFor="heroImage" className={labelClass}>
            Hero image
          </label>
          <input id="heroImage" {...register("heroImage")} className={fieldClass} />
          <p className={hintClass}>A path under /public, such as /images/terracotta-horse.jpg.</p>
          {errors.heroImage ? (
            <p role="alert" className="mt-1 text-sm text-oxblood">
              {errors.heroImage.message}
            </p>
          ) : null}
        </div>
      </fieldset>

      {/* The uploader used to sit inside "Media and model", below two URL
          fields, where it read as a third path input and was easy to miss. It
          is the usual way a model arrives, so it gets its own section and comes
          first; the URL fields are the fallback for files already on the site.
          On the create page the same section holds a picker that stages the
          file, so a new object and its model are one save rather than two
          screens. */}
      <fieldset id="the-3d-model" className="scroll-mt-28 space-y-5">
        <legend className="font-serif text-2xl tracking-tight">The 3D model</legend>

        {exhibit ? (
          <>
            {modelNotice ? (
              <p role="alert" className="border border-oxblood/30 bg-oxblood/10 px-4 py-3 text-sm text-oxblood">
                {modelNotice}
              </p>
            ) : null}

            <p className={hintClass}>
              Choose a file and it uploads immediately — the model is live before you press
              Save. Up to {formatBytes(MAX_MODEL_BYTES)}.
            </p>
            <ModelUpload
              exhibitId={exhibit.id}
              value={modelUrl}
              initialCredit={exhibit.modelCredit ?? ""}
              onChange={(url) => setValue("modelUrl", url, { shouldDirty: true })}
            />
          </>
        ) : (
          <>
            <p className={hintClass}>
              Optional. The file you choose is uploaded as part of this save, so the object
              arrives with its model already attached. A chosen file wins over the URL field
              below.
            </p>
            <ModelPicker
              file={modelFile}
              credit={modelCredit}
              onFile={(file) => {
                setModelFile(file);
                setModelFileError(null);
              }}
              onCredit={setModelCredit}
            />
            {modelFileError ? (
              <p role="alert" className="bg-oxblood/10 px-3 py-2 text-sm text-oxblood">
                {modelFileError}
              </p>
            ) : null}
          </>
        )}

        <div className="border-t border-ink/10 pt-5">
          <p className={labelClass}>Or point at a model that already exists</p>

          <div className="mt-3 grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="modelUrl" className={labelClass}>
                GLB model <span className="normal-case tracking-normal">(optional)</span>
              </label>
              <input id="modelUrl" {...register("modelUrl")} className={fieldClass} />
              <p className={hintClass}>
                A path under /public, an https URL, or{" "}
                <code className="font-mono text-[11px]">/api/models/…</code> once uploaded above.
              </p>
              {errors.modelUrl ? (
                <p role="alert" className="mt-1 text-sm text-oxblood">
                  {errors.modelUrl.message}
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="modelUsdz" className={labelClass}>
                USDZ for iOS <span className="normal-case tracking-normal">(optional)</span>
              </label>
              <input id="modelUsdz" {...register("modelUsdz")} className={fieldClass} />
              {errors.modelUsdz ? (
                <p role="alert" className="mt-1 text-sm text-oxblood">
                  {errors.modelUsdz.message}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-4 border-t border-ink/15 pt-6">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-oxblood disabled:opacity-60"
        >
          {isSubmitting ? (uploading ? `Uploading… ${uploadSeconds} s` : "Saving…") : submitLabel}
        </button>

        {uploading && modelFile ? (
          <p role="status" className="w-full text-sm leading-relaxed text-ink-soft">
            Exhibit created. Uploading {modelFile.name} ({formatBytes(modelFile.size)})…{" "}
            {uploadSeconds} s. Nothing is lost if this fails — the draft stays, and you can
            choose the file again on the next screen.
          </p>
        ) : null}

        <Link
          href="/studio/exhibits"
          className="text-sm text-ink-soft transition-colors hover:text-ink"
        >
          Cancel
        </Link>

        {exhibit?.status === "PUBLISHED" ? (
          <Link
            href={`/exhibits/${exhibit.slug}`}
            className="text-sm text-ink-soft transition-colors hover:text-ink"
          >
            View on site ↗
          </Link>
        ) : null}

        <span className="flex-1" />

        {exhibit ? <DeleteExhibitButton id={exhibit.id} title={exhibit.title} /> : null}
      </div>
    </form>
  );
}
