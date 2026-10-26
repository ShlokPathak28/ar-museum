"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";

export default function LoginForm() {
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

    router.replace("/");
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
          className="mt-1.5 w-full rounded-lg border border-ink/15 bg-paper px-3 py-2 text-sm outline-none focus-visible:border-ochre"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-1.5 w-full rounded-lg border border-ink/15 bg-paper px-3 py-2 text-sm outline-none focus-visible:border-ochre"
        />
      </div>

      {error ? (
        <p role="alert" className="rounded-lg bg-ochre/10 px-3 py-2 text-sm text-ochre">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-paper disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>

      <p className="text-sm text-ink-soft">
        No account yet?{" "}
        <Link href="/register" className="font-medium text-ochre hover:underline">
          Create one
        </Link>
      </p>
    </form>
  );
}
