import type { Metadata } from "next";
import Link from "next/link";

import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format-date";

import ModerationButtons from "./ModerationButtons";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reviews",
};

type Props = { searchParams: Promise<{ status?: string }> };

const TABS = [
  { label: "All", value: "ALL" },
  { label: "Visible", value: "VISIBLE" },
  { label: "Hidden", value: "HIDDEN" },
] as const;

export default async function StudioReviewsPage({ searchParams }: Props) {
  const requested = (await searchParams).status;
  const status =
    requested === "VISIBLE" || requested === "HIDDEN" ? requested : ("ALL" as const);

  const [reviews, grouped] = await Promise.all([
    prisma.review.findMany({
      where: status === "ALL" ? {} : { status },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: { select: { name: true, email: true } },
        exhibit: { select: { title: true, slug: true } },
      },
    }),
    prisma.review.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const total = grouped.reduce((sum, group) => sum + group._count._all, 0);
  const counts: Record<string, number> = {
    ALL: total,
    VISIBLE: grouped.find((group) => group.status === "VISIBLE")?._count._all ?? 0,
    HIDDEN: grouped.find((group) => group.status === "HIDDEN")?._count._all ?? 0,
  };

  return (
    <main id="main" tabIndex={-1} className="mx-auto w-full max-w-5xl px-5 pb-24 pt-10 sm:px-8">
      <div className="border-b border-ink/15 pb-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-oxblood">
          {counts.VISIBLE} visible · {counts.HIDDEN} hidden
        </p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight">Review moderation</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
          Hiding a review removes it from the exhibit page and from the average, but keeps it in
          the database and on the author&apos;s passport. Deleting removes it for good.
        </p>
      </div>

      <nav aria-label="Filter by status" className="mt-6 flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const active = status === tab.value;
          const href = tab.value === "ALL" ? "/studio/reviews" : `/studio/reviews?status=${tab.value}`;

          return (
            <Link
              key={tab.value}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors ${
                active
                  ? "border-ink bg-ink text-paper"
                  : "border-ink/15 text-ink-soft hover:border-ink/40 hover:text-ink"
              }`}
            >
              {tab.label} ({counts[tab.value]})
            </Link>
          );
        })}
      </nav>

      {reviews.length === 0 ? (
        <p className="mt-8 border border-dashed border-ink/20 px-5 py-10 text-center text-sm text-ink-soft">
          No reviews in this filter.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {reviews.map((review) => {
            const hidden = review.status === "HIDDEN";

            return (
              <li
                key={review.id}
                className={`border p-5 ${hidden ? "border-rust/30 bg-rust/[0.04]" : "border-ink/12 bg-paper"}`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <div>
                    <Link
                      href={`/exhibits/${review.exhibit.slug}`}
                      className="font-medium hover:underline"
                    >
                      {review.exhibit.title}
                    </Link>
                    <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
                      {review.user.name} · {review.user.email} · {formatDate(review.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-baseline gap-3">
                    <span
                      aria-label={`${review.rating} out of 5`}
                      className="font-mono text-xs tracking-widest text-oxblood"
                    >
                      {"★".repeat(review.rating)}
                      {"☆".repeat(5 - review.rating)}
                    </span>
                    <span
                      className={`font-mono text-[9px] uppercase tracking-[0.16em] ${
                        hidden ? "text-rust" : "text-ink-soft"
                      }`}
                    >
                      {review.status}
                    </span>
                  </div>
                </div>

                <p className="mt-3 text-sm leading-relaxed text-ink/90">{review.body}</p>

                <div className="mt-4 flex justify-end">
                  <ModerationButtons id={review.id} status={hidden ? "HIDDEN" : "VISIBLE"} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
