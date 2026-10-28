import type { Metadata } from "next";
import Link from "next/link";

import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format-date";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Overview",
};

const STATS = [
  { key: "published", label: "Published", href: "/studio/exhibits" },
  { key: "drafts", label: "Drafts", href: "/studio/exhibits?status=DRAFT" },
  { key: "reviews", label: "Visible reviews", href: "/studio/reviews" },
  { key: "hidden", label: "Hidden reviews", href: "/studio/reviews?status=HIDDEN" },
  { key: "stamps", label: "Stamps collected", href: "/passport" },
] as const;

export default async function StudioPage() {
  const [published, drafts, rooms, visibleReviews, hiddenReviews, stamps, recentReviews, draftList] =
    await Promise.all([
      prisma.exhibit.count({ where: { status: "PUBLISHED" } }),
      prisma.exhibit.count({ where: { status: "DRAFT" } }),
      prisma.room.count(),
      prisma.review.count({ where: { status: "VISIBLE" } }),
      prisma.review.count({ where: { status: "HIDDEN" } }),
      prisma.stamp.count(),
      prisma.review.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          user: { select: { name: true } },
          exhibit: { select: { title: true, slug: true } },
        },
      }),
      prisma.exhibit.findMany({
        where: { status: "DRAFT" },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: { id: true, title: true, code: true, updatedAt: true },
      }),
    ]);

  const counts = {
    published,
    drafts,
    reviews: visibleReviews,
    hidden: hiddenReviews,
    stamps,
  };

  return (
    <main id="main" tabIndex={-1} className="mx-auto w-full max-w-6xl px-5 pb-24 pt-10 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-ink/15 pb-5">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-oxblood">
            {rooms} rooms · {published + drafts} objects
          </p>
          <h1 className="mt-2 font-serif text-4xl tracking-tight">The museum office</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/studio/exhibits/new"
            className="bg-ink px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-oxblood"
          >
            New exhibit
          </Link>
          <Link
            href="/studio/exhibits"
            className="border border-ink/20 px-4 py-2 text-sm transition-colors hover:border-ink/50"
          >
            Manage exhibits
          </Link>
          <Link
            href="/studio/users"
            className="border border-ink/20 px-4 py-2 text-sm transition-colors hover:border-ink/50"
          >
            Manage people
          </Link>
        </div>
      </div>

      <dl className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {STATS.map((stat) => (
          <div key={stat.key} className="border border-ink/12 bg-paper p-4">
            <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">
              {stat.label}
            </dt>
            <dd className="mt-2 flex items-baseline justify-between gap-2">
              <span className="font-serif text-3xl leading-none">
                {String(counts[stat.key]).padStart(2, "0")}
              </span>
              <Link
                href={stat.href}
                className="font-mono text-[10px] uppercase tracking-[0.14em] text-oxblood hover:underline"
              >
                Open
              </Link>
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_1fr]">
        <section aria-labelledby="drafts-heading">
          <div className="flex items-baseline justify-between gap-3 border-b border-ink/10 pb-3">
            <h2 id="drafts-heading" className="font-serif text-2xl tracking-tight">
              Waiting to be published
            </h2>
            <Link
              href="/studio/exhibits?status=DRAFT"
              className="font-mono text-[10px] uppercase tracking-[0.14em] text-oxblood hover:underline"
            >
              All drafts
            </Link>
          </div>

          {draftList.length === 0 ? (
            <p className="mt-5 border border-dashed border-ink/20 px-4 py-6 text-sm text-ink-soft">
              No drafts. Every object in the collection is on view.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-ink/10">
              {draftList.map((exhibit) => (
                <li key={exhibit.id} className="flex items-baseline justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <Link
                      href={`/studio/exhibits/${exhibit.id}`}
                      className="font-medium hover:underline"
                    >
                      {exhibit.title}
                    </Link>
                    <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
                      {exhibit.code} · edited {formatDate(exhibit.updatedAt)}
                    </p>
                  </div>
                  <Link
                    href={`/studio/exhibits/${exhibit.id}`}
                    className="shrink-0 text-[13px] text-ink-soft hover:text-ink"
                  >
                    Edit
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="reviews-heading">
          <div className="flex items-baseline justify-between gap-3 border-b border-ink/10 pb-3">
            <h2 id="reviews-heading" className="font-serif text-2xl tracking-tight">
              Latest reviews
            </h2>
            <Link
              href="/studio/reviews"
              className="font-mono text-[10px] uppercase tracking-[0.14em] text-oxblood hover:underline"
            >
              Moderate
            </Link>
          </div>

          {recentReviews.length === 0 ? (
            <p className="mt-5 border border-dashed border-ink/20 px-4 py-6 text-sm text-ink-soft">
              No visitor has reviewed an object yet.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-ink/10">
              {recentReviews.map((review) => (
                <li key={review.id} className="py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <Link
                      href={`/studio/reviews?status=${review.status}`}
                      className="font-medium hover:underline"
                    >
                      {review.exhibit.title}
                    </Link>
                    <span
                      className={`font-mono text-[9px] uppercase tracking-[0.16em] ${
                        review.status === "HIDDEN" ? "text-rust" : "text-ink-soft"
                      }`}
                    >
                      {review.status}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-ink-soft">
                    {review.body}
                  </p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
                    {review.user.name} · {formatDate(review.createdAt)} · {review.rating}/5
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
