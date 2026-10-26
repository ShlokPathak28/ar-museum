import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getViewer } from "@/lib/session";

import RegisterForm from "./RegisterForm";

export const metadata: Metadata = {
  title: "Create an account",
  description: "Create a visitor account to collect stamps and review exhibits.",
  robots: { index: false, follow: false },
};

export default async function RegisterPage() {
  if (await getViewer()) redirect("/");

  return (
    <main className="mx-auto w-full max-w-md px-5 py-16 sm:px-8">
      <Link
        href="/"
        className="font-mono text-[11px] uppercase tracking-widest text-ink-soft hover:text-ink"
      >
        ← Dharohar
      </Link>

      <h1 className="mt-8 font-serif text-4xl tracking-tight">Create an account</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        A visitor account keeps your stamps across devices and lets you review an exhibit once.
        Everything else stays open to guests.
      </p>

      <div className="mt-8 rounded-xl border border-ink/10 bg-paper p-6">
        <RegisterForm />
      </div>
    </main>
  );
}
