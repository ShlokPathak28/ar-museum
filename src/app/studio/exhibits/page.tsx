import type { Metadata } from "next";
import Link from "next/link";

import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format-date";
import { formatBytes } from "@/lib/model-upload";

import PublishToggle from "./PublishToggle";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Exhibits",
};

type Props = { searchParams: Promise<{ status?: string }> };

const TABS = [
  { label: "All", value: "ALL" },
  { label: "Published", value: "PUBLISHED" },
  { label: "Drafts", value: "DRAFT" },
] as const;

export default async function StudioExhibitsPage({ searchParams }: Props) {
  const requested = (await searchParams).status;
  const status =
    requested === "PUBLISHED" || requested === "DRAFT" ? requested : ("ALL" as const);

  const [exhibits, grouped] = await Promise.all([
    prisma.exhibit.findMany({
      where: status === "ALL" ? {} : { status },
      orderBy: [{ updatedAt: "desc" }],
      include: {
        room: { select: { name: true, slug: true } },
        // Which objects have a 3D model is the thing the Studio could not show:
        // a missing upload was invisible from this table.
        modelAsset: { select: { size: true } },
        _count: { select: { reviews: true, stamps: true } },
      },
    }),
    prisma.exhibit.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const total = grouped.reduce((sum, group) => sum + group._count._all, 0);
  const counts: Record<string, number> = {
    ALL: total,
    PUBLISHED: grouped.find((group) => group.status === "PUBLISHED")?._count._all ?? 0,
    DRAFT: grouped.find((group) => group.status === "DRAFT")?._count._all ?? 0,
  };

  return (
    <main id="main" tabIndex={-1} className="mx-auto w-full max-w-6xl px-5 pb-24 pt-10 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-ink/15 pb-5">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-oxblood">
            {counts.PUBLISHED} published · {counts.DRAFT} drafts
          </p>
          <h1 className="mt-2 font-serif text-4xl tracking-tight">Exhibits</h1>
        </div>
        <Link
          href="/studio/exhibits/new"
          className="bg-ink px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-oxblood"
        >
          New exhibit
        </Link>
      </div>

      <nav aria-label="Filter by status" className="mt-6 flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const active = status === tab.value;
          const href = tab.value === "ALL" ? "/studio/exhibits" : `/studio/exhibits?status=${tab.value}`;

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

      {exhibits.length === 0 ? (
        <p className="mt-8 border border-dashed border-ink/20 px-5 py-10 text-center text-sm text-ink-soft">
          Nothing in this filter yet.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto border border-ink/12 bg-paper">
          <table className="w-full min-w-[46rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-ink/15 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
                <th scope="col" className="px-4 py-3 font-normal">
                  Code
                </th>
                <th scope="col" className="px-4 py-3 font-normal">
                  Object
                </th>
                <th scope="col" className="px-4 py-3 font-normal">
                  Room
                </th>
                <th scope="col" className="px-4 py-3 font-normal">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 font-normal">
                  Visitor data
                </th>
                <th scope="col" className="px-4 py-3 font-normal">
                  Edited
                </th>
                <th scope="col" className="px-4 py-3 text-right font-normal">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {exhibits.map((exhibit) => {
                const published = exhibit.status === "PUBLISHED";

                return (
                  <tr key={exhibit.id} className="border-b border-ink/10 last:border-0">
                    <td className="px-4 py-3 font-mono text-[11px] tracking-[0.16em] text-ink-soft">
                      {exhibit.code}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/studio/exhibits/${exhibit.id}`}
                        className="font-medium hover:underline"
                      >
                        {exhibit.title}
                      </Link>
                      <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.16em]">
                        {exhibit.modelAsset ? (
                          <span className="text-ink-soft">
                            3D · {formatBytes(exhibit.modelAsset.size)}
                          </span>
                        ) : exhibit.modelUrl ? (
                          <span className="text-ink-soft">3D · linked</span>
                        ) : (
                          <Link
                            href={`/studio/exhibits/${exhibit.id}#the-3d-model`}
                            className="text-rust hover:underline"
                          >
                            3D · none — add a model
                          </Link>
                        )}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{exhibit.room.name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-mono text-[9px] uppercase tracking-[0.16em] ${
                          published ? "text-ink" : "text-rust"
                        }`}
                      >
                        {exhibit.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                      {exhibit._count.reviews} reviews · {exhibit._count.stamps} stamps
                    </td>
                    <td className="px-4 py-3 text-[13px] text-ink-soft">
                      {formatDate(exhibit.updatedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-4">
                        {published ? (
                          <Link
                            href={`/exhibits/${exhibit.slug}`}
                            className="text-[13px] text-ink-soft hover:text-ink"
                          >
                            View
                          </Link>
                        ) : null}
                        <PublishToggle id={exhibit.id} published={published} />
                        <Link
                          href={`/studio/exhibits/${exhibit.id}`}
                          className="text-[13px] text-ink-soft hover:text-ink"
                        >
                          Edit
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
