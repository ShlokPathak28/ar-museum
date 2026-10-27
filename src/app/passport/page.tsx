import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import PageMasthead from "@/components/site/PageMasthead";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import SignOutButton from "@/components/ui/SignOutButton";
import { formatDate } from "@/lib/format-date";
import { claimDeviceStamps, getPassport } from "@/lib/passport";
import { getViewer } from "@/lib/session";

// Personal data: never cached, never shared between visitors.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your passport",
  description: "The exhibits you have seen and the reviews you have left.",
  robots: { index: false, follow: false },
};

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default async function PassportPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/passport");

  // Stamps collected as a guest belong to this account from now on.
  await claimDeviceStamps(viewer.user.id);

  const passport = await getPassport(viewer.user);
  const dash = (passport.percent / 100) * CIRCUMFERENCE;
  const remaining = passport.total - passport.collected;

  return (
    <>
      <SiteHeader />
      <PageMasthead
        eyebrow="Collected on site"
        title="Your passport"
        lede="Every QR card you open stamps this page. An account keeps the stamps, so the collection follows you to another device, and anything you scanned as a guest is claimed the first time you sign in."
        aside={
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span>Signed in as {passport.name}</span>
            <SignOutButton redirectTo="/" />
          </div>
        }
      />

      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-5xl px-5 pb-24 sm:px-8">
        <div className="mt-10 grid gap-8 sm:grid-cols-[auto_1fr] sm:items-center">
          <div className="relative grid place-items-center">
            <svg viewBox="0 0 120 120" className="h-32 w-32 -rotate-90" aria-hidden="true">
              <circle
                cx="60"
                cy="60"
                r={RADIUS}
                fill="none"
                strokeWidth="7"
                className="stroke-ink/10"
              />
              <circle
                cx="60"
                cy="60"
                r={RADIUS}
                fill="none"
                strokeWidth="7"
                strokeLinecap="round"
                className="stroke-oxblood"
                strokeDasharray={`${dash} ${CIRCUMFERENCE}`}
              />
            </svg>
            <div className="absolute text-center">
              <p className="font-serif text-3xl">
                {passport.collected}
                <span className="text-ink-soft">/{passport.total}</span>
              </p>
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-soft">stamps</p>
            </div>
          </div>

          <div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink/10">
              <div
                className="h-full rounded-full bg-oxblood"
                style={{ width: `${passport.percent}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-ink-soft">
              {remaining === 0
                ? "Every published object seen. The passport is full."
                : `${remaining} object${remaining === 1 ? "" : "s"} still to open.`}
            </p>

            <ul className="mt-5 grid gap-2 sm:grid-cols-2">
              {passport.badges.map((badge) => (
                <li
                  key={badge.id}
                  className={`border px-4 py-3 ${
                    badge.earned ? "border-oxblood/30 bg-paper" : "border-dashed border-ink/15"
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <p className={`text-sm font-medium ${badge.earned ? "" : "text-ink-soft"}`}>
                      {badge.label}
                    </p>
                    <span
                      className={`font-mono text-[10px] uppercase tracking-widest ${
                        badge.earned ? "text-oxblood" : "text-ink-soft"
                      }`}
                    >
                      {badge.earned ? "Earned" : "Locked"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-ink-soft">{badge.detail}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <section aria-labelledby="stamps-heading" className="mt-14 border-t border-ink/10 pt-8">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="stamps-heading" className="font-serif text-2xl tracking-tight">
              Stamps
            </h2>
            <Link
              href="/scan"
              className="font-mono text-[11px] uppercase tracking-widest text-oxblood hover:underline"
            >
              Scan another card →
            </Link>
          </div>

          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {passport.exhibits.map((exhibit) => {
              const collected = exhibit.seenAt !== null;

              return (
                <li
                  key={exhibit.id}
                  className={`border p-4 ${
                    collected ? "border-oxblood/30 bg-paper" : "border-dashed border-ink/15"
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span
                      className={`font-mono text-[11px] tracking-[0.2em] ${
                        collected ? "text-oxblood" : "text-ink-soft"
                      }`}
                    >
                      {exhibit.code}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-ink-soft">
                      {exhibit.seenAt ? formatDate(exhibit.seenAt) : "—"}
                    </span>
                  </div>
                  <Link
                    href={`/exhibits/${exhibit.slug}`}
                    className="mt-2 block font-medium hover:underline"
                  >
                    {exhibit.title}
                  </Link>
                  <p className="mt-1 text-xs text-ink-soft">{exhibit.room}</p>
                  <p
                    className={`mt-3 font-mono text-[10px] uppercase tracking-widest ${
                      collected ? "text-oxblood" : "text-ink-soft"
                    }`}
                  >
                    {collected ? "Collected" : "Not collected"}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="my-reviews-heading" className="mt-14 border-t border-ink/10 pt-8">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="my-reviews-heading" className="font-serif text-2xl tracking-tight">
              Your reviews
            </h2>
            <p className="font-mono text-[11px] uppercase tracking-widest text-ink-soft">
              {passport.reviews.length} written
            </p>
          </div>

          {passport.reviews.length === 0 ? (
            <p className="mt-6 border border-dashed border-ink/20 px-5 py-8 text-center text-sm text-ink-soft">
              No reviews yet. Open an exhibit and tell the next visitor what to notice.
            </p>
          ) : (
            <ul className="mt-6 space-y-3">
              {passport.reviews.map((review) => (
                <li key={review.id} className="border border-ink/10 bg-paper p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <Link
                      href={`/exhibits/${review.exhibit.slug}`}
                      className="font-medium hover:underline"
                    >
                      {review.exhibit.title}
                    </Link>
                    <p
                      aria-label={`${review.rating} out of 5`}
                      className="font-mono text-xs tracking-widest text-oxblood"
                    >
                      {"★".repeat(review.rating)}
                      {"☆".repeat(5 - review.rating)}
                    </p>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{review.body}</p>
                  <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-ink-soft">
                    {formatDate(review.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

      </main>
      <SiteFooter />
    </>
  );
}
