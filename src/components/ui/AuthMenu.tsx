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
    return <span aria-hidden className="h-2.5 w-9 animate-pulse bg-ink/[0.07]" />;
  }

  if (!data?.user) {
    return (
      <Link
        href="/login"
        className="text-[12px] text-ink-soft transition-colors hover:text-ink sm:text-[13px]"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3 sm:gap-4">
      <Link
        href="/passport"
        className="text-[12px] text-ink-soft transition-colors hover:text-ink sm:text-[13px]"
      >
        Passport
      </Link>
      <SignOutButton />
    </div>
  );
}
