import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format-date";

import ExhibitForm from "../ExhibitForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Edit exhibit",
};

type Props = { params: Promise<{ id: string }> };

function parseFacts(raw: string): string[] {
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value)
      ? value.filter((fact): fact is string => typeof fact === "string")
      : [];
  } catch {
    return [];
  }
}

export default async function EditExhibitPage({ params }: Props) {
  const { id } = await params;

  const [exhibit, rooms] = await Promise.all([
    prisma.exhibit.findUnique({
      where: { id },
      include: {
        room: { select: { name: true } },
        _count: { select: { reviews: true, stamps: true } },
      },
    }),
    prisma.room.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, floor: true },
    }),
  ]);

  if (!exhibit) notFound();

  const published = exhibit.status === "PUBLISHED";

  return (
    <main id="main" tabIndex={-1} className="mx-auto w-full max-w-4xl px-5 pb-24 pt-10 sm:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-ink/15 pb-5">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-oxblood">
            {exhibit.room.name} · {exhibit.code} · {published ? "On view" : "Draft"}
          </p>
          <h1 className="mt-2 font-serif text-4xl tracking-tight">{exhibit.title}</h1>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
            Edited {formatDate(exhibit.updatedAt)} · {exhibit._count.reviews} reviews ·{" "}
            {exhibit._count.stamps} stamps
          </p>
        </div>

        <Link
          href="/studio/exhibits"
          className="text-[13px] text-ink-soft transition-colors hover:text-ink"
        >
          ← All exhibits
        </Link>
      </div>

      <div className="mt-8">
        <ExhibitForm
          rooms={rooms}
          exhibit={{
            id: exhibit.id,
            slug: exhibit.slug,
            code: exhibit.code,
            title: exhibit.title,
            subtitle: exhibit.subtitle ?? "",
            era: exhibit.era,
            yearStart: exhibit.yearStart === null ? "" : String(exhibit.yearStart),
            yearEnd: exhibit.yearEnd === null ? "" : String(exhibit.yearEnd),
            roomId: exhibit.roomId,
            summary: exhibit.summary,
            body: exhibit.body,
            facts: parseFacts(exhibit.facts).join("\n"),
            tags: exhibit.tags,
            heroImage: exhibit.heroImage,
            modelUrl: exhibit.modelUrl ?? "",
            modelUsdz: exhibit.modelUsdz ?? "",
            status: published ? "PUBLISHED" : "DRAFT",
          }}
        />
      </div>
    </main>
  );
}
