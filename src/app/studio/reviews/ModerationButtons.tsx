"use client";

import { useState, useTransition } from "react";

import { deleteReviewAsAdmin, setReviewStatus } from "./actions";

type Props = {
  id: string;
  status: "VISIBLE" | "HIDDEN";
};

export default function ModerationButtons({ id, status }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null);

    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error);
    });
  }

  function onDelete() {
    if (!window.confirm("Delete this review permanently? This cannot be undone.")) return;
    run(() => deleteReviewAsAdmin(id));
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      {error ? (
        <span role="alert" className="text-sm text-oxblood">
          {error}
        </span>
      ) : null}

      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => setReviewStatus(id, status === "HIDDEN" ? "VISIBLE" : "HIDDEN"))}
        className="text-[13px] text-oxblood hover:underline disabled:opacity-50"
      >
        {status === "HIDDEN" ? "Restore" : "Hide"}
      </button>

      <button
        type="button"
        disabled={pending}
        onClick={onDelete}
        className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft hover:text-rust disabled:opacity-50"
      >
        Delete
      </button>
    </div>
  );
}
