import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";

/** Everything a grid card needs. Server components pass it, the filter UI reuses it. */
export type ExhibitCardData = {
  slug: string;
  code: string;
  title: string;
  era: string;
  roomName: string;
  summary: string;
  heroImage: string;
  hasModel: boolean;
  /** Material accent as a hex value; falls back to oxblood. */
  accent?: string;
};

type ExhibitCardProps = {
  exhibit: ExhibitCardData;
  /** Full-collection cards carry the summary; the home strip stays compact. */
  showSummary?: boolean;
};

export default function ExhibitCard({ exhibit, showSummary = false }: ExhibitCardProps) {
  return (
    <article
      className="group/card"
      style={{ "--accent": exhibit.accent ?? "var(--color-oxblood)" } as CSSProperties}
    >
      <Link href={`/exhibits/${exhibit.slug}`} className="block">
        <div className="relative border border-ink/12 bg-paper p-2 transition-colors duration-300 group-hover/card:border-ink/30">
          <div className="relative overflow-hidden bg-chalk-deep">
            <Image
              src={exhibit.heroImage}
              alt={exhibit.title}
              width={1200}
              height={900}
              unoptimized
              className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover/card:scale-[1.035]"
            />
            <span className="absolute bottom-2 left-2 bg-paper/95 px-2 py-0.5 font-mono text-[10px] tracking-[0.14em] text-ink-soft">
              {exhibit.code}
            </span>
            {exhibit.hasModel ? (
              <span className="absolute right-2 top-2 bg-ink/85 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-chalk">
                3D
              </span>
            ) : null}
          </div>
        </div>

        <h2 className="mt-4 font-serif text-xl leading-snug tracking-tight transition-colors duration-300 group-hover/card:text-[color:var(--accent)]">
          {exhibit.title}
        </h2>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
          {exhibit.era} · {exhibit.roomName}
        </p>
        {showSummary ? (
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-soft">
            {exhibit.summary}
          </p>
        ) : null}
        <span className="mt-3 block h-px w-8 bg-[var(--accent)] transition-[width] duration-500 group-hover/card:w-full" />
      </Link>
    </article>
  );
}
