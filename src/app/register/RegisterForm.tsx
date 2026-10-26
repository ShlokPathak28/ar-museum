"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";
import { withNext } from "@/lib/next-path";

const MIN_PASSWORD = 8;

export default function RegisterForm({ next }: { next: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD) {
      setError(`Use at least ${MIN_PASSWORD} characters.`);
      return;
    }

    setPending(true);
    const { error: signUpError } = await authClient.signUp.email({ name, email, password });

    if (signUpError) {
      setError(signUpError.message ?? "That account could not be created.");
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
          htmlFor="name"
          className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft"
        >
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="mt-1.5 w-full rounded-lg border border-ink/15 bg-paper px-3 py-2 text-sm outline-none focus-visible:border-ochre"
        />
      </div>

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
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-1.5 w-full rounded-lg border border-ink/15 bg-paper px-3 py-2 text-sm outline-none focus-visible:border-ochre"
        />
        <p className="mt-1.5 text-xs text-ink-soft">At least {MIN_PASSWORD} characters.</p>
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
        {pending ? "Creating account…" : "Create account"}
      </button>

      <p className="text-sm text-ink-soft">
        Already registered?{" "}
        <Link href={withNext("/login", next)} className="font-medium text-ochre hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
