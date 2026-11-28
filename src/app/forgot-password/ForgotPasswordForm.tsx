"use client";

import Link from "next/link";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";
import { withNext } from "@/lib/next-path";
import { forgotPasswordSchema } from "@/lib/schemas";

const fieldClass =
  "mt-1.5 w-full border border-ink/15 bg-paper px-3 py-2 text-sm outline-none focus-visible:border-oxblood";
const labelClass = "font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft";

type Props = {
  next: string;
  /** False when this deployment has no mail provider and is not in development. */
  available: boolean;
};

export default function ForgotPasswordForm({ next, available }: Props) {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a valid email address.");
      return;
    }

    setPending(true);

    const { error: requestError } = await authClient.requestPasswordReset({
      email: parsed.data.email,
      redirectTo: "/reset-password",
    });

    setPending(false);

    if (requestError) {
      // The endpoint answers with the same success shape for an address that is
      // not registered, so this is a delivery or server failure, not a "no such
      // account" message.
      setError("The reset email could not be sent just now. Please try again in a moment.");
      return;
    }

    setSentTo(parsed.data.email);
  }

  if (sentTo) {
    return (
      <div role="status" aria-live="polite" className="space-y-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-oxblood">
            Link requested
          </p>
          <h2 className="mt-2 font-serif text-2xl tracking-tight">Check your inbox</h2>
        </div>

        <p className="text-sm leading-relaxed text-ink-soft">
          If an account exists for <span className="font-medium text-ink">{sentTo}</span>, a
          reset link is on its way. It expires in one hour and works once.
        </p>
        <p className="text-sm leading-relaxed text-ink-soft">
          Nothing yet? Check the spam folder before asking for another link.
        </p>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-ink/15 pt-4">
          <button
            type="button"
            onClick={() => {
              setSentTo(null);
              setError(null);
            }}
            className="text-sm font-medium text-oxblood hover:underline"
          >
            Use a different address
          </button>
          <Link href={withNext("/login", next)} className="text-sm text-ink-soft hover:text-ink">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="text-sm leading-relaxed text-ink-soft">
        Enter the address you use for Dharohar. We will send a link to choose a new password.
      </p>

      <div>
        <label htmlFor="email" className={labelClass}>
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={!available}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={fieldClass}
        />
      </div>

      {error ? (
        <p role="alert" className="bg-oxblood/10 px-3 py-2 text-sm text-oxblood">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending || !available}
        className="w-full bg-ink px-4 py-2.5 text-sm font-medium text-paper disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send reset link"}
      </button>

      <p className="text-sm text-ink-soft">
        Remembered it?{" "}
        <Link href={withNext("/login", next)} className="font-medium text-oxblood hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
