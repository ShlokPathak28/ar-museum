"use client";

import Link from "next/link";

import { authClient } from "@/lib/auth-client";

import SignOutButton from "./SignOutButton";

/**
 * Signed-in state for the site header.
 *
 * Deliberately client-side: the pages that use it are ISR-cached, and reading
 * cookies on the server would make every one of them dynamic. The trade-off is
 * one hydration tick, covered by a placeholder so the header does not jump.
 */
export default function AuthMenu() {
  const { data, isPending } = authClient.useSession();

  if (isPending) {
    return <span aria-hidden className="h-6 w-16 animate-pulse rounded-full bg-ink/5" />;
  }

  if (!data?.user) {
    return (
      <Link
        href="/login"
        className="rounded-full border border-ink/15 px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-ink-soft transition-colors hover:border-ink/40 hover:text-ink"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/passport"
        className="rounded-full border border-ink/15 px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-ink-soft transition-colors hover:border-ink/40 hover:text-ink"
      >
        Passport
      </Link>
      <span className="hidden max-w-[10rem] truncate text-sm text-ink-soft sm:inline">
        {data.user.name}
      </span>
      <SignOutButton />
    </div>
  );
}
