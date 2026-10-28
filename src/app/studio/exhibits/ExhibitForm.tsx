"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { exhibitAdminSchema, type ExhibitAdminValues } from "@/lib/schemas";

import { saveExhibit } from "./actions";
import DeleteExhibitButton from "./DeleteExhibitButton";
import ModelUpload from "./ModelUpload";

export type RoomOption = { id: string; name: string; floor: string };

export type ExhibitFormInitial = ExhibitAdminValues & { id: string; modelCredit?: string };

type Props = {
  rooms: RoomOption[];
  /** Omitted when creating a new exhibit. */
  exhibit?: ExhibitFormInitial;
};

const fieldClass =
  "mt-1.5 w-full border border-ink/15 bg-paper px-3 py-2 text-sm outline-none focus-visible:border-oxblood";
const labelClass = "font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft";
const hintClass = "mt-1 text-xs leading-relaxed text-ink-soft";

export default function ExhibitForm({ rooms, exhibit }: Props) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

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

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setSaved(false);

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
      router.replace(`/studio/exhibits/${result.id}`);
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

      <fieldset className="space-y-5">
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

      <fieldset className="space-y-5">
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

      <fieldset className="space-y-5">
        <legend className="font-serif text-2xl tracking-tight">Media and model</legend>

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

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="modelUrl" className={labelClass}>
              GLB model <span className="normal-case tracking-normal">(optional)</span>
            </label>
            <input id="modelUrl" {...register("modelUrl")} className={fieldClass} />
            <p className={hintClass}>
              A path under /public, an https URL, or an uploaded file — see below.
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

        {exhibit ? (
          <ModelUpload
            exhibitId={exhibit.id}
            value={modelUrl}
            initialCredit={exhibit.modelCredit ?? ""}
            onChange={(url) => setValue("modelUrl", url, { shouldDirty: true })}
          />
        ) : (
          <p className={hintClass}>
            Save the exhibit once, then upload its .glb here. A file in{" "}
            <code className="font-mono text-[11px]">/public/models</code> can be typed in now
            instead.
          </p>
        )}
      </fieldset>

      <div className="flex flex-wrap items-center gap-4 border-t border-ink/15 pt-6">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-oxblood disabled:opacity-60"
        >
          {isSubmitting ? "Saving…" : exhibit ? "Save changes" : "Create exhibit"}
        </button>

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
