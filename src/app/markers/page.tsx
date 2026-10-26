import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import QRCode from "qrcode";

import { prisma } from "@/lib/db";
import { resolveOrigin } from "@/lib/origin";

import { PrintButton } from "./PrintButton";

// The QR payload depends on the host the page was opened from, so this page
// cannot be prerendered.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Marker cards",
  description: "Printable QR cards that open each exhibit in the museum guide.",
};

export default async function MarkersPage() {
  const exhibits = await prisma.exhibit.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { code: "asc" },
    include: { room: true },
  });

  // Encode whatever address the page was reached on: print from the laptop and
  // the card points at the laptop's LAN address, which is what the phone needs.
  const baseUrl = resolveOrigin(await headers());

  const cards = await Promise.all(
    exhibits.map(async (exhibit) => ({
      ...exhibit,
      qrSvg: await QRCode.toString(`${baseUrl}/x/${exhibit.code}`, {
        type: "svg",
        margin: 1,
        width: 160,
        errorCorrectionLevel: "M",
      }),
    })),
  );

  return (
    <main className="markers-page mx-auto w-full max-w-6xl px-5 pb-24 sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4 py-6 print:hidden">
        <Link
          href="/exhibits"
          className="font-mono text-[11px] uppercase tracking-widest text-ink-soft hover:text-ink"
        >
          ← Collection
        </Link>
        <PrintButton />
      </header>

      <section className="border-t border-ink/10 pt-10 print:border-0 print:pt-0">
        <h1 className="font-serif text-4xl tracking-tight">Marker cards</h1>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft print:hidden">
          Print these on A6 card and set each one beside its object. Scanning the code opens the
          exhibit, and the code is printed large enough to type if the camera is refused.
        </p>
        <p className="mt-2 font-mono text-[11px] text-ink-soft print:hidden">
          Links point at {baseUrl}
        </p>
      </section>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 print:mt-0 print:grid-cols-2 print:gap-0">
        {cards.map((card) => (
          <article
            key={card.id}
            className="flex flex-col rounded-xl border border-ink/10 bg-paper p-5 print:break-inside-avoid print:rounded-none print:border-ink/30"
          >
            <div className="flex items-start gap-4">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-sand-deep">
                <Image
                  src={card.heroImage}
                  alt={card.title}
                  width={160}
                  height={160}
                  unoptimized
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ochre">
                  Dharohar
                </p>
                <h2 className="mt-1 font-serif text-lg leading-snug">{card.title}</h2>
                <p className="mt-1 text-xs text-ink-soft">{card.room.name}</p>
              </div>
            </div>

            <div className="mt-5 flex items-end justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">
                  Scan or type
                </p>
                <p className="mt-1 font-mono text-2xl tracking-[0.15em]">{card.code}</p>
                <a
                  href={`/api/qr/${card.code}`}
                  className="mt-1 inline-block font-mono text-[10px] uppercase tracking-widest text-ochre hover:underline print:hidden"
                >
                  QR PNG →
                </a>
              </div>
              <div
                aria-hidden
                className="h-28 w-28 shrink-0 [&>svg]:h-full [&>svg]:w-full"
                dangerouslySetInnerHTML={{ __html: card.qrSvg }}
              />
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
