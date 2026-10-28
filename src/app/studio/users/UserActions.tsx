"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteUserAsAdmin, setUserRole } from "./actions";

type Role = "ADMIN" | "VISITOR";

type Props = {
  id: string;
  name: string;
  email: string;
  role: Role;
  /** The signed-in admin's own row: no role or delete controls. */
  isSelf: boolean;
  /** The only remaining admin: demoting or deleting would lock the museum out. */
  isLastAdmin: boolean;
};

/**
 * One row's controls. The server re-checks every rule in `actions.ts`; the
 * disabled states here are explanation, not enforcement.
 */
export default function UserActions({ id, name, email, role, isSelf, isLastAdmin }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function changeRole(nextRole: Role) {
    setError(null);

    startTransition(async () => {
      const result = await setUserRole(id, nextRole);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      router.refresh();
    });
  }

  function remove() {
    const confirmed = window.confirm(
      `Delete ${name} (${email})? Their reviews, sessions and sign-in are deleted. Stamps and scans stay, anonymised. This cannot be undone.`,
    );

    if (!confirmed) return;

    setError(null);

    startTransition(async () => {
      const result = await deleteUserAsAdmin(id);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      router.refresh();
    });
  }

  if (isSelf) {
    return (
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
        This is you
      </span>
    );
  }

  const locked = isLastAdmin && role === "ADMIN";
  const lockReason = locked ? "The museum needs at least one admin." : undefined;

  return (
    <span className="flex flex-wrap items-center justify-end gap-3">
      <button
        type="button"
        onClick={() => changeRole(role === "ADMIN" ? "VISITOR" : "ADMIN")}
        disabled={pending || locked}
        title={lockReason}
        aria-label={role === "ADMIN" ? `Make ${name} a visitor` : `Make ${name} an admin`}
        className="border border-ink/25 px-3 py-1.5 text-[12px] transition-colors hover:border-ink/60 hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending ? "Saving…" : role === "ADMIN" ? "Make visitor" : "Make admin"}
      </button>

      <button
        type="button"
        onClick={remove}
        disabled={pending || locked}
        title={lockReason}
        aria-label={`Delete ${name}`}
        className="font-mono text-[10px] uppercase tracking-widest text-rust hover:underline disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending ? "Working…" : "Delete"}
      </button>

      {error ? (
        <span role="alert" className="basis-full text-right text-sm text-oxblood">
          {error}
        </span>
      ) : null}
    </span>
  );
}
