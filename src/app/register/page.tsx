import type { Metadata } from "next";
import { redirect } from "next/navigation";

import PageMasthead from "@/components/site/PageMasthead";
import SiteFooter from "@/components/site/SiteFooter";
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
      <PageMasthead
        eyebrow="Visitor account"
        title="Create an account"
        lede="A visitor account keeps your stamps across devices and lets you review an exhibit once. Everything else stays open to guests."
      />

      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-md px-5 py-12 sm:px-8">
        <div className="border border-ink/12 bg-paper p-6">
          <RegisterForm next={next} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
