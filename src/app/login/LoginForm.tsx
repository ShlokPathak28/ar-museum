"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";
import { withNext } from "@/lib/next-path";

export default function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const { error: signInError } = await authClient.signIn.email({ email, password });

    if (signInError) {
      setError(signInError.message ?? "Those details did not match an account.");
      setPending(false);
      return;
    }

    router.replace(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="email"
          className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-1.5 w-full border border-ink/15 bg-paper px-3 py-2 text-sm outline-none focus-visible:border-oxblood"
        />
      </div>

      <div>
        <div className="flex items-baseline justify-between gap-4">
          <label
            htmlFor="password"
            className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft"
          >
            Password
          </label>
          <Link
            href={withNext("/forgot-password", next)}
            className="text-xs text-oxblood hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-1.5 w-full border border-ink/15 bg-paper px-3 py-2 text-sm outline-none focus-visible:border-oxblood"
        />
      </div>

      {error ? (
        <p role="alert" className="bg-oxblood/10 px-3 py-2 text-sm text-oxblood">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-ink px-4 py-2.5 text-sm font-medium text-paper disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>

      <p className="text-sm text-ink-soft">
        No account yet?{" "}
        <Link href={withNext("/register", next)} className="font-medium text-oxblood hover:underline">
          Create one
        </Link>
      </p>
    </form>
  );
}
