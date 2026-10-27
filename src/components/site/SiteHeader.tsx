import Link from "next/link";

import AuthMenu from "@/components/ui/AuthMenu";

const NAV = [
  { href: "/exhibits", label: "Collection" },
  { href: "/rooms", label: "Rooms" },
  { href: "/scan", label: "Scan" },
];

type Props = {
  /** Optional way back, used by detail pages (the exhibit, a room). */
  back?: { href: string; label: string };
};

/**
 * The one header. Sticky and translucent so the wall stays visible behind it,
 * which is what makes the site feel like one building rather than a set of
 * pages that each invented their own chrome.
 */
export default function SiteHeader({ back }: Props) {
  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-chalk/90 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-3.5 sm:px-8">
        <div className="flex min-w-0 items-baseline gap-3">
          <Link href="/" className="font-serif text-[19px] leading-none tracking-tight">
            Dharohar
          </Link>
          <span aria-hidden className="hidden h-3 w-px bg-ink/20 sm:block" />
          <span className="hidden text-[11px] uppercase tracking-[0.14em] text-ink-soft sm:block">
            Museum of Material Culture
          </span>
          {back ? (
            <Link
              href={back.href}
              className="ml-1 whitespace-nowrap text-[13px] text-ink-soft transition-colors hover:text-ink"
            >
              ← {back.label}
            </Link>
          ) : null}
        </div>

        <nav aria-label="Site" className="flex items-center gap-3 sm:gap-6">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="relative text-[12px] text-ink-soft transition-colors after:absolute after:-bottom-1 after:left-0 after:h-px after:w-0 after:bg-oxblood after:transition-[width] after:duration-300 hover:text-ink hover:after:w-full sm:text-[13px]"
            >
              {item.label}
            </Link>
          ))}
          <span aria-hidden className="h-3 w-px bg-ink/15" />
          <AuthMenu />
        </nav>
      </div>
    </header>
  );
}
