"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteRoom } from "./actions";

type Props = { id: string; name: string; exhibitCount: number };

export default function DeleteRoomButton({ id, name, exhibitCount }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // The rule is explained here and enforced in the action: a room with objects
  // cannot be deleted, because `Exhibit.roomId` cascades.
  if (exhibitCount > 0) {
    return (
      <span className="font-mono text-[11px] uppercase tracking-widest text-ink-soft">
        Move its {exhibitCount === 1 ? "object" : `${exhibitCount} objects`} out to delete this room
      </span>
    );
  }

  function onDelete() {
    const confirmed = window.confirm(
      `Delete “${name}” and its panorama? This cannot be undone.`,
    );

    if (!confirmed) return;

    setError(null);

    startTransition(async () => {
      const result = await deleteRoom(id);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      router.push("/studio/rooms");
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
        {pending ? "Deleting…" : "Delete room"}
      </button>
      {error ? (
        <span role="alert" className="text-sm text-oxblood">
          {error}
        </span>
      ) : null}
    </span>
  );
}
