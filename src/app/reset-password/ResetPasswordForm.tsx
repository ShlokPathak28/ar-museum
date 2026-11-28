"use client";

import Link from "next/link";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";
import { MIN_PASSWORD_LENGTH, resetPasswordSchema } from "@/lib/schemas";

const fieldClass =
  "mt-1.5 w-full border border-ink/15 bg-paper px-3 py-2 text-sm outline-none focus-visible:border-oxblood";
const labelClass = "font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft";

export default function ResetPasswordForm({ token }: { token: string }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [linkExpired, setLinkExpired] = useState(false);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLinkExpired(false);

    const parsed = resetPasswordSchema.safeParse({ newPassword, confirmPassword });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the new password.");
      return;
    }

    setPending(true);

    const { error: resetError } = await authClient.resetPassword({
      newPassword: parsed.data.newPassword,
      token,
    });

    setPending(false);

    if (resetError) {
      const code = (resetError as { code?: string }).code;
      const expired = Boolean(
        code === "INVALID_TOKEN" || resetError.message?.toLowerCase().includes("token"),
      );

      setLinkExpired(expired);
      setError(
        expired
          ? "This reset link has expired or has already been used. Request a new one."
          : (resetError.message ?? "The password could not be changed. Please try again."),
      );
      return;
    }

    setDone(true);
  }

  if (done) {
    return (
      <div role="status" aria-live="polite" className="space-y-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-oxblood">
            Password changed
          </p>
          <h2 className="mt-2 font-serif text-2xl tracking-tight">You can sign in again</h2>
        </div>

        <p className="text-sm leading-relaxed text-ink-soft">
          Every other session for this account has been signed out. Use the new password from now
          on.
        </p>

        <Link
          href="/login"
          className="inline-block w-full bg-ink px-4 py-2.5 text-center text-sm font-medium text-paper"
        >
          Sign in with the new password
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="text-sm leading-relaxed text-ink-soft">
        Choose a new password for your account. It must be at least {MIN_PASSWORD_LENGTH}{" "}
        characters.
      </p>

      <div>
        <label htmlFor="newPassword" className={labelClass}>
          New password
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          maxLength={128}
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          className={fieldClass}
          aria-describedby="newPasswordHint"
        />
        <p id="newPasswordHint" className="mt-1.5 text-xs text-ink-soft">
          At least {MIN_PASSWORD_LENGTH} characters.
        </p>
      </div>

      <div>
        <label htmlFor="confirmPassword" className={labelClass}>
          Repeat new password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          maxLength={128}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className={fieldClass}
        />
      </div>

      {error ? (
        <div role="alert" className="bg-oxblood/10 px-3 py-2 text-sm text-oxblood">
          <p>{error}</p>
          {linkExpired ? (
            <Link href="/forgot-password" className="mt-1 inline-block font-medium underline">
              Request a new link
            </Link>
          ) : null}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-ink px-4 py-2.5 text-sm font-medium text-paper disabled:opacity-60"
      >
        {pending ? "Saving…" : "Set new password"}
      </button>

      <p className="text-sm text-ink-soft">
        <Link href="/login" className="hover:text-ink">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
