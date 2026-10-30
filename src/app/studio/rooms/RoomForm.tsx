"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { roomAdminSchema, type RoomAdminValues } from "@/lib/schemas";

import { saveRoom } from "./actions";
import PanoramaUpload from "./PanoramaUpload";

export type RoomFormInitial = RoomAdminValues & { id: string };

type Props = {
  /** Omitted when creating a new room. */
  room?: RoomFormInitial;
};

const fieldClass =
  "mt-1.5 w-full border border-ink/15 bg-paper px-3 py-2 text-sm outline-none focus-visible:border-oxblood";
const labelClass = "font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft";
const hintClass = "mt-1 text-xs leading-relaxed text-ink-soft";

export default function RoomForm({ room }: Props) {
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
  } = useForm<RoomAdminValues>({
    resolver: zodResolver(roomAdminSchema),
    defaultValues: room ?? {
      slug: "",
      name: "",
      floor: "",
      intro: "",
      panoramaUrl: "",
      panoramaCredit: "",
    },
  });

  const panoramaUrl = useWatch({ control, name: "panoramaUrl" }) ?? "";

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setSaved(false);

    const result = await saveRoom({ ...values, id: room?.id });

    if (!result.ok) {
      setFormError(result.error);

      for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
        if (field in values) {
          setError(field as keyof RoomAdminValues, { message });
        }
      }

      return;
    }

    if (!room) {
      router.replace(`/studio/rooms/${result.id}`);
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
        <legend className="font-serif text-2xl tracking-tight">The room</legend>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="name" className={labelClass}>
              Name
            </label>
            <input id="name" {...register("name")} className={fieldClass} />
            {errors.name ? (
              <p role="alert" className="mt-1 text-sm text-oxblood">
                {errors.name.message}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="slug" className={labelClass}>
              Slug
            </label>
            <input id="slug" {...register("slug")} className={fieldClass} aria-describedby="slug-hint" />
            <p id="slug-hint" className={hintClass}>
              Becomes <code className="font-mono text-[11px]">/rooms/&lt;slug&gt;</code>. Lowercase
              letters, numbers and single hyphens.
            </p>
            {errors.slug ? (
              <p role="alert" className="mt-1 text-sm text-oxblood">
                {errors.slug.message}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="floor" className={labelClass}>
              Floor
            </label>
            <input id="floor" {...register("floor")} className={fieldClass} />
            {errors.floor ? (
              <p role="alert" className="mt-1 text-sm text-oxblood">
                {errors.floor.message}
              </p>
            ) : null}
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="intro" className={labelClass}>
              Introduction <span className="normal-case tracking-normal">(optional)</span>
            </label>
            <textarea
              id="intro"
              rows={3}
              {...register("intro")}
              className={fieldClass}
              aria-describedby="intro-hint"
            />
            <p id="intro-hint" className={hintClass}>
              Two sentences under the room title, on the public page.
            </p>
            {errors.intro ? (
              <p role="alert" className="mt-1 text-sm text-oxblood">
                {errors.intro.message}
              </p>
            ) : null}
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-5 border-t border-ink/10 pt-8">
        <legend className="font-serif text-2xl tracking-tight">The 360° view</legend>

        <div>
          <p className={labelClass}>Panorama</p>

          {room ? (
            <PanoramaUpload
              roomId={room.id}
              onUploaded={(url) => {
                setValue("panoramaUrl", url, { shouldDirty: true });
                setSaved(false);
              }}
            />
          ) : (
            <p className={hintClass}>
              Save the room once, then upload its panorama. A room without one says “360° scan
              pending” and still lists its objects.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="panoramaUrl" className={labelClass}>
            Or point at a file
          </label>
          <input
            id="panoramaUrl"
            {...register("panoramaUrl")}
            placeholder="/panoramas/material-worlds.webp"
            className={fieldClass}
            aria-describedby="panorama-hint"
          />
          <p id="panorama-hint" className={hintClass}>
            A path inside <code className="font-mono text-[11px]">/public</code>, for an image that
            ships with the site. Uploading is the alternative that needs no redeploy.
          </p>
          {errors.panoramaUrl ? (
            <p role="alert" className="mt-1 text-sm text-oxblood">
              {errors.panoramaUrl.message}
            </p>
          ) : null}
        </div>

        {panoramaUrl ? (
          <div className="space-y-2">
            <div className="relative aspect-[2/1] w-full max-w-lg overflow-hidden border border-ink/15 bg-vault">
              <Image
                src={panoramaUrl}
                alt="Current panorama, flattened"
                fill
                sizes="(min-width: 640px) 32rem, 100vw"
                className="object-cover opacity-90"
              />
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => {
                  setValue("panoramaUrl", "", { shouldDirty: true });
                  setSaved(false);
                }}
                className="font-mono text-[11px] uppercase tracking-widest text-rust hover:underline"
              >
                Remove panorama
              </button>
              <span className="text-xs text-ink-soft">
                Removing a stored image happens when you save.
              </span>
            </div>
          </div>
        ) : null}

        <div>
          <label htmlFor="panoramaCredit" className={labelClass}>
            Panorama credit <span className="normal-case tracking-normal">(optional)</span>
          </label>
          <input
            id="panoramaCredit"
            {...register("panoramaCredit")}
            placeholder="Museum of Ethnography by Oliksiy Yakovlyev · Poly Haven · CC0"
            className={fieldClass}
            aria-describedby="credit-hint"
          />
          <p id="credit-hint" className={hintClass}>
            Shown under the viewer. Leave it blank and the room is credited to Dharohar.
          </p>
          {errors.panoramaCredit ? (
            <p role="alert" className="mt-1 text-sm text-oxblood">
              {errors.panoramaCredit.message}
            </p>
          ) : null}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-4 border-t border-ink/10 pt-6">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-oxblood disabled:opacity-60"
        >
          {isSubmitting ? "Saving…" : room ? "Save room" : "Create room"}
        </button>
        <Link href="/studio/rooms" className="text-[13px] text-ink-soft hover:text-ink">
          ← All rooms
        </Link>
        {room ? (
          <Link
            href={`/rooms/${room.slug}`}
            className="ml-auto font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft hover:text-ink"
          >
            View public page ↗
          </Link>
        ) : null}
      </div>
    </form>
  );
}
