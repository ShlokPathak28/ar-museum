"use client";

import { useState, useTransition } from "react";

import { setExhibitStatus } from "./actions";

type Props = { id: string; published: boolean };

export default function PublishToggle({ id, published }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onToggle() {
    setError(null);

    startTransition(async () => {
      const result = await setExhibitStatus(id, published ? "DRAFT" : "PUBLISHED");
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onToggle}
        disabled={pending}
        className="text-[13px] text-oxblood hover:underline disabled:opacity-50"
      >
        {pending ? "Saving…" : published ? "Unpublish" : "Publish"}
      </button>
      {error ? (
        <span role="alert" className="text-[11px] text-oxblood">
          {error}
        </span>
      ) : null}
    </span>
  );
}
