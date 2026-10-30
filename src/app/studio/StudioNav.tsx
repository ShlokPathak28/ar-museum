"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const NAV = [
  { href: "/studio", label: "Overview" },
  { href: "/studio/exhibits", label: "Exhibits" },
  { href: "/studio/rooms", label: "Rooms" },
  { href: "/studio/reviews", label: "Reviews" },
  { href: "/studio/users", label: "People" },
];

/**
 * Inside a `<Link>`: dims the label while that navigation is in flight.
 *
 * The Studio renders per request, so a click waits for the server before the
 * page changes. Without a sign of work the old page just sits there and the
 * click looks ignored. `loading.tsx` cannot help here — React keeps an
 * already-revealed Suspense boundary's content during a transition — so the
 * feedback has to come from the link itself.
 */
function PendingLabel({ children }: { children: ReactNode }) {
  const { pending } = useLinkStatus();

  return (
    <span className={pending ? "opacity-45 transition-opacity" : "transition-opacity"}>
      {children}
      {pending ? <span className="sr-only"> (loading)</span> : null}
    </span>
  );
}

/**
 * The five Studio sections. Rendered inside the layout's `<nav>`, so this
 * component only supplies the links: the active one is underlined and
 * `aria-current="page"`, and a link dims while its navigation is in flight.
 */
export default function StudioNav() {
  const pathname = usePathname();

  return (
    <>
      {NAV.map((item) => {
        // `/studio` would otherwise match every child, so it is exact.
        const active =
          item.href === "/studio"
            ? pathname === "/studio"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`relative text-[12px] transition-colors after:absolute after:-bottom-1 after:left-0 after:h-px after:bg-brass-light after:transition-[width] after:duration-300 sm:text-[13px] ${
              active
                ? "text-chalk after:w-full"
                : "text-chalk/60 hover:text-chalk hover:after:w-full"
            }`}
          >
            <PendingLabel>{item.label}</PendingLabel>
          </Link>
        );
      })}
    </>
  );
}
