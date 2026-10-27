import type { Metadata } from "next";

import PageMasthead from "@/components/site/PageMasthead";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import { prisma } from "@/lib/db";

import ScanPanel from "./ScanPanel";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Scan an exhibit",
  description:
    "Point your camera at the QR card beside an exhibit, or type its short code to open the object.",
  alternates: { canonical: "/scan" },
};

const STEPS = [
  {
    step: "01",
    title: "Find the card",
    body: "Every object in the gallery has an A6 card with a QR and a short code printed under it.",
  },
  {
    step: "02",
    title: "Scan or type",
    body: "The camera stays on this device — nothing is uploaded. No camera? Type the four-character code.",
  },
  {
    step: "03",
    title: "The object opens",
    body: "History, materials, the 3D model, AR placement and the room walkthrough, all on one page.",
  },
];

export default async function ScanPage() {
  const exhibits = await prisma.exhibit.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { code: "asc" },
    select: { code: true, title: true },
  });

  return (
    <>
      <SiteHeader />
      <PageMasthead
        eyebrow="Entry point"
        title="Scan the card"
        lede="The QR is the front door. Point the camera at a card and the exhibit opens by itself; if the camera is unavailable, the short code does the same job."
      />

      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-4xl px-5 pb-24 sm:px-8">
        <ScanPanel codes={exhibits} />

        <section aria-labelledby="how-heading" className="mt-16 border-t border-ink/10 pt-8">
          <h2 id="how-heading" className="font-serif text-2xl tracking-tight">
            How the entry works
          </h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-3">
            {STEPS.map((item) => (
              <li key={item.step} className="border border-ink/10 bg-paper p-5">
                <span className="font-mono text-[11px] tracking-[0.2em] text-oxblood">
                  {item.step}
                </span>
                <h3 className="mt-2 font-medium">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{item.body}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-sm leading-relaxed text-ink-soft">
            Camera access requires a secure context — HTTPS in production, or{" "}
            <code className="rounded bg-chalk-deep px-1.5 py-0.5 font-mono text-xs">
              npm run dev:https
            </code>{" "}
            locally. The code path works everywhere.
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
