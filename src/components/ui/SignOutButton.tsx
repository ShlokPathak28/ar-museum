"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";

export default function SignOutButton({ redirectTo }: { redirectTo?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    await authClient.signOut();
    if (redirectTo) {
      router.replace(redirectTo);
    }
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={pending}
      className="font-mono text-[11px] uppercase tracking-widest opacity-60 transition-opacity hover:opacity-100 disabled:opacity-40"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
