import type { Metadata } from "next";
import Link from "next/link";

import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format-date";

import UserActions from "./UserActions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "People",
};

type Props = { searchParams: Promise<{ role?: string; q?: string }> };

const TABS = [
  { label: "All", value: "ALL" },
  { label: "Admins", value: "ADMIN" },
  { label: "Visitors", value: "VISITOR" },
] as const;

function tabHref(role: string, q: string) {
  const params = new URLSearchParams();
  if (role !== "ALL") params.set("role", role);
  if (q) params.set("q", q);
  const query = params.toString();
  return query ? `/studio/users?${query}` : "/studio/users";
}

function countLabel(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

export default async function StudioUsersPage({ searchParams }: Props) {
  const viewer = await requireAdmin();

  const params = await searchParams;
  const requestedRole = params.role;
  const role =
    requestedRole === "ADMIN" || requestedRole === "VISITOR" ? requestedRole : ("ALL" as const);
  const q = (params.q ?? "").trim().slice(0, 80);

  const [users, grouped] = await Promise.all([
    prisma.user.findMany({
      where: {
        ...(role === "ALL" ? {} : { role }),
        ...(q
          ? {
              OR: [{ name: { contains: q } }, { email: { contains: q } }],
            }
          : {}),
      },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: { select: { reviews: true, stamps: true } },
      },
    }),
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
  ]);

  const counts: Record<string, number> = {
    ALL: grouped.reduce((sum, group) => sum + group._count._all, 0),
    ADMIN: grouped.find((group) => group.role === "ADMIN")?._count._all ?? 0,
    VISITOR: grouped.find((group) => group.role === "VISITOR")?._count._all ?? 0,
  };

  const lastAdmin = counts.ADMIN <= 1;

  return (
    <main id="main" tabIndex={-1} className="mx-auto w-full max-w-6xl px-5 pb-24 pt-10 sm:px-8">
      <div className="border-b border-ink/15 pb-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-oxblood">
          {countLabel(counts.ADMIN, "admin", "admins")} ·{" "}
          {countLabel(counts.VISITOR, "visitor", "visitors")}
        </p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight">People</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
          Accounts are created at <code className="font-mono text-[12px]">/register</code>. The
          Studio can promote a visitor to admin or remove an account; passwords are hashed by
          Better Auth and are never visible here. Deleting an account removes its reviews and
          sign-in, and leaves its stamps and scans in the visitor numbers, anonymised.
        </p>
      </div>

      <nav aria-label="Filter by role" className="mt-6 flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const active = role === tab.value;

          return (
            <Link
              key={tab.value}
              href={tabHref(tab.value, q)}
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

      <form action="/studio/users" method="get" role="search" className="mt-4 flex flex-wrap items-end gap-2">
        {role !== "ALL" ? <input type="hidden" name="role" value={role} /> : null}
        <div>
          <label
            htmlFor="user-search"
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft"
          >
            Search accounts
          </label>
          <input
            id="user-search"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Name or email"
            maxLength={80}
            className="mt-1.5 w-64 border border-ink/15 bg-paper px-3 py-2 text-sm outline-none focus-visible:border-oxblood"
          />
        </div>
        <button
          type="submit"
          className="border border-ink/25 px-4 py-2 text-sm transition-colors hover:border-ink/60 hover:bg-ink hover:text-paper"
        >
          Search
        </button>
        {q ? (
          <Link
            href={tabHref(role, "")}
            className="px-1 py-2 text-[13px] text-ink-soft underline decoration-ink/20 underline-offset-2 hover:text-ink"
          >
            Clear
          </Link>
        ) : null}
      </form>

      {users.length === 0 ? (
        <p className="mt-8 border border-dashed border-ink/20 px-5 py-10 text-center text-sm text-ink-soft">
          {q ? `No accounts match “${q}”.` : "No accounts in this filter."}
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto border border-ink/12 bg-paper">
          <table className="w-full min-w-[52rem] border-collapse text-left text-sm">
            <caption className="sr-only">Registered accounts</caption>
            <thead>
              <tr className="border-b border-ink/15 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
                <th scope="col" className="px-4 py-3 font-normal">
                  Person
                </th>
                <th scope="col" className="px-4 py-3 font-normal">
                  Role
                </th>
                <th scope="col" className="px-4 py-3 font-normal">
                  Joined
                </th>
                <th scope="col" className="px-4 py-3 font-normal">
                  Activity
                </th>
                <th scope="col" className="px-4 py-3 text-right font-normal">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isSelf = user.id === viewer.user.id;
                const isAdmin = user.role === "ADMIN";

                return (
                  <tr key={user.id} className="border-b border-ink/10 align-top last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="font-medium">{user.name}</span>
                        {isSelf ? (
                          <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-oxblood">
                            You
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 font-mono text-[11px] break-all text-ink-soft">
                        {user.email}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-mono text-[9px] uppercase tracking-[0.16em] ${
                          isAdmin ? "text-oxblood" : "text-ink-soft"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[13px] whitespace-nowrap text-ink-soft">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                      {countLabel(user._count.reviews, "review", "reviews")} ·{" "}
                      {countLabel(user._count.stamps, "stamp", "stamps")}
                    </td>
                    <td className="px-4 py-3">
                      <UserActions
                        id={user.id}
                        name={user.name}
                        email={user.email}
                        role={isAdmin ? "ADMIN" : "VISITOR"}
                        isSelf={isSelf}
                        isLastAdmin={lastAdmin}
                      />
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
