import Image from "next/image";
import Link from "next/link";

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
};

type ExhibitCardProps = {
  exhibit: ExhibitCardData;
  /** Full-collection cards carry the summary; the home strip stays compact. */
  showSummary?: boolean;
};

export default function ExhibitCard({ exhibit, showSummary = false }: ExhibitCardProps) {
  return (
    <article>
      <Link href={`/exhibits/${exhibit.slug}`} className="group block">
        <div className="overflow-hidden rounded-xl border border-ink/10 bg-sand-deep">
          <Image
            src={exhibit.heroImage}
            alt={exhibit.title}
            width={1200}
            height={900}
            unoptimized
            className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        </div>
        <div className="mt-3 flex items-baseline justify-between gap-3">
          <h2 className="font-medium group-hover:text-ochre">{exhibit.title}</h2>
          <span className="font-mono text-[11px] text-ink-soft">{exhibit.code}</span>
        </div>
        <p className="mt-1 text-sm text-ink-soft">
          {exhibit.era} · {exhibit.roomName}
        </p>
        {showSummary ? (
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-soft">
            {exhibit.summary}
          </p>
        ) : null}
      </Link>
      {exhibit.hasModel ? (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-ochre/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-ochre">
          3D model
        </p>
      ) : null}
    </article>
  );
}
