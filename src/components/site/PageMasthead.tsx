import type { ReactNode } from "react";

type Props = {
  /** Small line above the title: a floor, a count, a status. */
  eyebrow?: string;
  title: string;
  /** One or two sentences, set to the right of the title on wide screens. */
  lede?: string;
  /** Optional link or note under the lede. */
  aside?: ReactNode;
};

/**
 * The dark wall text that opens a page. The building has one threshold, but
 * every room inside it gets a title wall: ink plaster, brass rules, the page
 * name at exhibition scale, and the reading copy below on chalk.
 */
export default function PageMasthead({ eyebrow, title, lede, aside }: Props) {
  return (
    <section className="grain relative isolate overflow-hidden bg-vault text-chalk">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-[12%] -top-[70%] h-[170%] w-[62%] rounded-full bg-[radial-gradient(closest-side,rgba(240,214,164,0.13),transparent)] blur-2xl"
      />
      <div className="relative z-[2] mx-auto w-full max-w-6xl px-5 pb-12 pt-14 sm:px-8 sm:pb-14 sm:pt-16">
        <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
          <div>
            {eyebrow ? (
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-brass-light">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="mt-5 text-balance font-serif text-[clamp(2.8rem,6vw,4.8rem)] leading-[0.92] tracking-[-0.035em]">
              {title}
            </h1>
          </div>

          {lede || aside ? (
            <div className="max-w-md text-[15px] leading-relaxed text-chalk/55">
              {lede ? <p>{lede}</p> : null}
              {aside ? <div className="mt-5">{aside}</div> : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
