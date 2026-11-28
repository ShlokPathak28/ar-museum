import type { Metadata } from "next";
import { redirect } from "next/navigation";

import PageMasthead from "@/components/site/PageMasthead";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import { safeNextPath } from "@/lib/next-path";
import { canDeliverPasswordResetEmails } from "@/lib/password-reset";
import { getViewer } from "@/lib/session";

import ForgotPasswordForm from "./ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot password",
  description: "Request a link to choose a new password for your museum account.",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ next?: string }> };

export default async function ForgotPasswordPage({ searchParams }: Props) {
  const next = safeNextPath((await searchParams).next);

  // The same rule as /login: someone already signed in has no use for this page.
  if (await getViewer()) redirect(next);

  const available = canDeliverPasswordResetEmails();

  return (
    <>
      <SiteHeader />
      <PageMasthead
        eyebrow="Visitor account"
        title="Forgot your password?"
        lede="A reset link lets you choose a new password without losing your stamps, reviews or passport."
      />

      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-md px-5 py-12 sm:px-8">
        <div className="border border-ink/12 bg-paper p-6">
          {!available ? (
            <p role="alert" className="mb-5 border border-oxblood/30 bg-oxblood/10 px-3 py-2 text-sm leading-relaxed text-oxblood">
              Password reset email is not configured on this deployment, so a link cannot be sent.
              Ask the museum office to enable it.
            </p>
          ) : null}

          <ForgotPasswordForm next={next} available={available} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
