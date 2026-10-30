"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { moveExhibitToRoom, moveExhibitsToRoom } from "./actions";

export type RoomExhibitRow = {
  id: string;
  code: string;
  title: string;
  status: string;
  roomName?: string;
};

type Props = {
  roomId: string;
  roomName: string;
  inRoom: RoomExhibitRow[];
  elsewhere: RoomExhibitRow[];
  /** The other rooms an object can move to. `roomId` is required, so there is no "none". */
  otherRooms: { id: string; name: string }[];
};

/**
 * Two lists, because an exhibit must always be in a room: an object leaves by
 * moving to another room, never by becoming unassigned. Both actions re-check
 * the admin and re-read the rows inside a transaction.
 */
export default function RoomExhibits({
  roomId,
  roomName,
  inRoom,
  elsewhere,
  otherRooms,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }

  function onMoveOne(exhibitId: string, targetRoomId: string) {
    setError(null);
    setNote(null);

    startTransition(async () => {
      const result = await moveExhibitToRoom(exhibitId, targetRoomId);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      router.refresh();
    });
  }

  function onMoveSelected() {
    setError(null);
    setNote(null);

    startTransition(async () => {
      const result = await moveExhibitsToRoom(selected, roomId);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setSelected([]);
      setNote(
        `Moved ${result.moved} ${result.moved === 1 ? "object" : "objects"} into ${roomName}.`,
      );
      router.refresh();
    });
  }

  return (
    <div className="space-y-10">
      {error ? (
        <p role="alert" className="bg-oxblood/10 px-4 py-3 text-sm text-oxblood">
          {error}
        </p>
      ) : null}

      {note ? (
        <p role="status" className="border border-ink/15 bg-paper px-4 py-3 text-sm">
          {note}
        </p>
      ) : null}

      <section aria-labelledby="in-room-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-ink/10 pb-3">
          <h2 id="in-room-heading" className="font-serif text-2xl tracking-tight">
            In this room
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
            {inRoom.length} {inRoom.length === 1 ? "object" : "objects"}
          </span>
        </div>

        {inRoom.length === 0 ? (
          <p className="mt-5 border border-dashed border-ink/20 px-4 py-6 text-sm text-ink-soft">
            Nothing here yet. Move an object in from the list below.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-ink/10">
            {inRoom.map((exhibit) => (
              <li
                key={exhibit.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <span className="font-medium">{exhibit.title}</span>
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
                    {exhibit.code} · {exhibit.status === "PUBLISHED" ? "On view" : "Draft"}
                  </p>
                </div>

                {otherRooms.length === 0 ? (
                  <span className="text-xs text-ink-soft">The only room.</span>
                ) : (
                  <label className="flex items-center gap-2 text-xs text-ink-soft">
                    <span className="sr-only">Move {exhibit.title} to</span>
                    <select
                      defaultValue=""
                      disabled={pending}
                      onChange={(event) => {
                        const target = event.target.value;
                        event.target.value = "";
                        if (target) onMoveOne(exhibit.id, target);
                      }}
                      className="border border-ink/15 bg-paper px-2 py-1.5 text-xs outline-none focus-visible:border-oxblood"
                    >
                      <option value="" disabled>
                        Move to…
                      </option>
                      {otherRooms.map((room) => (
                        <option key={room.id} value={room.id}>
                          {room.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="elsewhere-heading" className="border-t border-ink/10 pt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-ink/10 pb-3">
          <h2 id="elsewhere-heading" className="font-serif text-2xl tracking-tight">
            Elsewhere in the museum
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
            {elsewhere.length} available
          </span>
        </div>

        {elsewhere.length === 0 ? (
          <p className="mt-5 border border-dashed border-ink/20 px-4 py-6 text-sm text-ink-soft">
            Every object is already in this room.
          </p>
        ) : (
          <>
            <ul className="mt-2 divide-y divide-ink/10">
              {elsewhere.map((exhibit) => (
                <li key={exhibit.id}>
                  <label className="flex cursor-pointer items-start gap-3 py-3">
                    <input
                      type="checkbox"
                      checked={selected.includes(exhibit.id)}
                      onChange={() => toggle(exhibit.id)}
                      className="mt-1 h-4 w-4 accent-oxblood"
                    />
                    <span className="min-w-0">
                      <span className="font-medium">{exhibit.title}</span>
                      <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
                        {exhibit.code} · {exhibit.roomName} ·{" "}
                        {exhibit.status === "PUBLISHED" ? "On view" : "Draft"}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>

            <div className="mt-5 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={onMoveSelected}
                disabled={pending || selected.length === 0}
                className="bg-ink px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-oxblood disabled:opacity-50"
              >
                {pending
                  ? "Moving…"
                  : selected.length === 0
                    ? "Move into this room"
                    : `Move ${selected.length} ${
                        selected.length === 1 ? "object" : "objects"
                      } into ${roomName}`}
              </button>
              <span className="text-xs text-ink-soft">
                Their public pages show this room straight away.
              </span>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
