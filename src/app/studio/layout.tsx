import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import SignOutButton from "@/components/ui/SignOutButton";
import { requireAdmin } from "@/lib/admin";

export const metadata: Metadata = {
  title: { default: "Studio", template: "%s · Studio" },
  robots: { index: false, follow: false },
};

const NAV = [
  { href: "/studio", label: "Overview" },
  { href: "/studio/exhibits", label: "Exhibits" },
  { href: "/studio/reviews", label: "Reviews" },
];

/**
 * Admin chrome. The guard runs here, before any child renders, so a visitor
 * never sees a flash of studio UI — and every Server Action checks again,
 * because this layout does not wrap action calls.
 */
export default async function StudioLayout({ children }: { children: ReactNode }) {
  const viewer = await requireAdmin();

  return (
    <div className="min-h-screen bg-chalk text-ink">
      <header className="border-b border-chalk/10 bg-vault text-chalk">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-3.5 sm:px-8">
          <div className="flex min-w-0 items-baseline gap-3">
            <Link href="/studio" className="font-serif text-[20px] leading-none tracking-tight">
              Dharohar <span className="text-brass-light">Studio</span>
            </Link>
            <span aria-hidden className="hidden h-3 w-px bg-chalk/15 sm:block" />
            <span className="hidden text-[11px] uppercase tracking-[0.14em] text-chalk/40 sm:block">
              {viewer.user.name}
            </span>
          </div>

          <nav aria-label="Studio" className="flex items-center gap-3 sm:gap-6">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="relative text-[12px] text-chalk/60 transition-colors after:absolute after:-bottom-1 after:left-0 after:h-px after:w-0 after:bg-brass-light after:transition-[width] after:duration-300 hover:text-chalk hover:after:w-full sm:text-[13px]"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/"
              className="text-[12px] text-chalk/45 transition-colors hover:text-chalk sm:text-[13px]"
            >
              View site ↗
            </Link>
            <span aria-hidden className="h-3 w-px bg-chalk/15" />
            <SignOutButton redirectTo="/" />
          </nav>
        </div>
      </header>

      {children}
    </div>
  );
}
