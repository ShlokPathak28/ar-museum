import type { Metadata } from "next";
import { redirect } from "next/navigation";

import SiteHeader from "@/components/site/SiteHeader";
import { safeNextPath } from "@/lib/next-path";
import { getViewer } from "@/lib/session";

import RegisterForm from "./RegisterForm";

export const metadata: Metadata = {
  title: "Create an account",
  description: "Create a visitor account to collect stamps and review exhibits.",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ next?: string }> };

export default async function RegisterPage({ searchParams }: Props) {
  const next = safeNextPath((await searchParams).next);

  if (await getViewer()) redirect(next);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-md px-5 py-16 sm:px-8">
        <p className="font-mono text-[11px] tracking-[0.18em] text-ink-soft">Visitor account</p>
        <h1 className="mt-4 font-serif text-4xl tracking-tight">Create an account</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          A visitor account keeps your stamps across devices and lets you review an exhibit once.
          Everything else stays open to guests.
        </p>

        <div className="mt-8 border border-ink/12 bg-paper p-6">
          <RegisterForm next={next} />
        </div>
      </main>
    </>
  );
}
