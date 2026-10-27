import type { Metadata } from "next";
import { redirect } from "next/navigation";

import SiteHeader from "@/components/site/SiteHeader";
import { safeNextPath } from "@/lib/next-path";
import { getViewer } from "@/lib/session";

import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to collect stamps and review exhibits.",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ next?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const next = safeNextPath((await searchParams).next);

  // Someone already signed in has no use for this page.
  if (await getViewer()) redirect(next);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-md px-5 py-16 sm:px-8">
        <p className="font-mono text-[11px] tracking-[0.18em] text-ink-soft">Visitor account</p>
        <h1 className="mt-4 font-serif text-4xl tracking-tight">Welcome back</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Sign in to keep your stamps and to review the exhibits you have visited. Browsing, 3D and
          AR never need an account.
        </p>

        <div className="mt-8 border border-ink/12 bg-paper p-6">
          <LoginForm next={next} />
        </div>
      </main>
    </>
  );
}
