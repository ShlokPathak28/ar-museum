"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteExhibit } from "./actions";

type Props = { id: string; title: string };

export default function DeleteExhibitButton({ id, title }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onDelete() {
    const confirmed = window.confirm(
      `Delete “${title}”? Its reviews, stamps, hotspots and tour stops are deleted with it. This cannot be undone.`,
    );

    if (!confirmed) return;

    setError(null);

    startTransition(async () => {
      const result = await deleteExhibit(id);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      router.push("/studio/exhibits");
      router.refresh();
    });
  }

  return (
    <span className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={onDelete}
        disabled={pending}
        className="font-mono text-[11px] uppercase tracking-widest text-rust hover:underline disabled:opacity-50"
      >
        {pending ? "Deleting…" : "Delete exhibit"}
      </button>
      {error ? (
        <span role="alert" className="text-sm text-oxblood">
          {error}
        </span>
      ) : null}
    </span>
  );
}
