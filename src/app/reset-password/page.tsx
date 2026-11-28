import type { Metadata } from "next";
import Link from "next/link";

import PageMasthead from "@/components/site/PageMasthead";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";

import ResetPasswordForm from "./ResetPasswordForm";

export const metadata: Metadata = {
  title: "Choose a new password",
  description: "Set a new password for your museum account.",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ token?: string; error?: string }> };

export default async function ResetPasswordPage({ searchParams }: Props) {
  const params = await searchParams;
  const rawToken = typeof params.token === "string" ? params.token.trim() : "";

  // Better Auth's callback adds `error=INVALID_TOKEN` when the token is missing
  // or already expired. The length cap is only a guard against a junk query
  // string reaching the auth endpoint.
  const usable = rawToken.length > 0 && rawToken.length <= 200 && params.error !== "INVALID_TOKEN";

  return (
    <>
      <SiteHeader />
      <PageMasthead
        eyebrow="Visitor account"
        title={usable ? "Choose a new password" : "This link has expired"}
        lede={
          usable
            ? "The link can be used once. Changing the password also signs out every other device."
            : "Reset links last one hour and stop working after they have been used."
        }
      />

      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-md px-5 py-12 sm:px-8">
        <div className="border border-ink/12 bg-paper p-6">
          {usable ? (
            <ResetPasswordForm token={rawToken} />
          ) : (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-ink-soft">
                Request a fresh link and it will arrive with a new one-hour window.
              </p>
              <Link
                href="/forgot-password"
                className="block w-full bg-ink px-4 py-2.5 text-center text-sm font-medium text-paper"
              >
                Request a new link
              </Link>
              <p className="text-sm text-ink-soft">
                <Link href="/login" className="hover:text-ink">
                  Back to sign in
                </Link>
              </p>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
