import type { Metadata } from "next";
import { redirect } from "next/navigation";

import PageMasthead from "@/components/site/PageMasthead";
import SiteFooter from "@/components/site/SiteFooter";
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
      <PageMasthead
        eyebrow="Visitor account"
        title="Welcome back"
        lede="Sign in to keep your stamps and to review the exhibits you have visited. Browsing, 3D and AR never need an account."
      />

      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-md px-5 py-12 sm:px-8">
        <div className="border border-ink/12 bg-paper p-6">
          <LoginForm next={next} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
