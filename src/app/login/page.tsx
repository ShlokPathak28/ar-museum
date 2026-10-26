import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getViewer } from "@/lib/session";

import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to collect stamps and review exhibits.",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  // Someone already signed in has no use for this page.
  if (await getViewer()) redirect("/");

  return (
    <main className="mx-auto w-full max-w-md px-5 py-16 sm:px-8">
      <Link
        href="/"
        className="font-mono text-[11px] uppercase tracking-widest text-ink-soft hover:text-ink"
      >
        ← Dharohar
      </Link>

      <h1 className="mt-8 font-serif text-4xl tracking-tight">Welcome back</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        Sign in to keep your stamps and to review the exhibits you have visited. Browsing, 3D and
        AR never need an account.
      </p>

      <div className="mt-8 rounded-xl border border-ink/10 bg-paper p-6">
        <LoginForm />
      </div>
    </main>
  );
}
