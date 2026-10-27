"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import ExhibitCard, { type ExhibitCardData } from "./ExhibitCard";

export type BrowseExhibit = ExhibitCardData & {
  roomSlug: string;
  tags: string[];
};

type Filters = {
  q: string;
  room: string;
  tag: string;
  only3d: boolean;
};

const ALL = "all";

function readFilters(search: URLSearchParams): Filters {
  return {
    q: search.get("q") ?? "",
    room: search.get("room") ?? ALL,
    tag: search.get("tag") ?? ALL,
    only3d: search.get("model") === "1",
  };
}

function isDefault(filters: Filters): boolean {
  return !filters.q && filters.room === ALL && filters.tag === ALL && !filters.only3d;
}

/**
 * Client-side browser for the six-object collection.
 *
 * The grid is delivered fully rendered by the server and filtered in the
 * browser, so typing never round-trips. Filter state is mirrored into the query
 * string with `history.replaceState` — a link like
 * `/exhibits?room=everyday-objects&tag=textile` is shareable, and back/forward
 * re-applies it, without turning the page into a dynamic route.
 */
export default function ExhibitBrowser({ exhibits }: { exhibits: BrowseExhibit[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<Filters>(() => readFilters(searchParams));

  // Mirror state into the address bar. replaceState keeps the back button
  // useful for leaving the page rather than undoing every keystroke.
  useEffect(() => {
    const next = new URLSearchParams();
    if (filters.q.trim()) next.set("q", filters.q.trim());
    if (filters.room !== ALL) next.set("room", filters.room);
    if (filters.tag !== ALL) next.set("tag", filters.tag);
    if (filters.only3d) next.set("model", "1");

    const query = next.toString();
    window.history.replaceState(null, "", query ? `${pathname}?${query}` : pathname);
  }, [filters, pathname]);

  // Keyboard/back-button loads arrive that don't remount this component, so the
  // URL has to be read again on popstate.
  useEffect(() => {
    const onPopState = () => setFilters(readFilters(new URLSearchParams(window.location.search)));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const rooms = useMemo(() => {
    const seen = new Map<string, string>();
    for (const exhibit of exhibits) seen.set(exhibit.roomSlug, exhibit.roomName);
    return [...seen].map(([slug, name]) => ({ slug, name }));
  }, [exhibits]);

  const tags = useMemo(() => {
    const seen = new Set<string>();
    for (const exhibit of exhibits) for (const tag of exhibit.tags) seen.add(tag);
    return [...seen].sort();
  }, [exhibits]);

  const visible = useMemo(() => {
    const needle = filters.q.trim().toLowerCase();

    return exhibits.filter((exhibit) => {
      if (filters.room !== ALL && exhibit.roomSlug !== filters.room) return false;
      if (filters.tag !== ALL && !exhibit.tags.includes(filters.tag)) return false;
      if (filters.only3d && !exhibit.hasModel) return false;
      if (!needle) return true;

      const haystack = [
        exhibit.title,
        exhibit.code,
        exhibit.era,
        exhibit.roomName,
        exhibit.summary,
        ...exhibit.tags,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(needle);
    });
  }, [exhibits, filters]);

  const update = (patch: Partial<Filters>) => setFilters((current) => ({ ...current, ...patch }));

  return (
    <div>
      <form
        role="search"
        onSubmit={(event) => event.preventDefault()}
        className="mt-8 flex flex-col gap-4 border border-ink/12 bg-paper p-4 sm:p-5"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <label htmlFor="exhibit-search" className="sr-only">
              Search the collection
            </label>
            <input
              id="exhibit-search"
              type="search"
              value={filters.q}
              onChange={(event) => update({ q: event.target.value })}
              placeholder="Search title, era, or tag…"
              className="w-full border border-ink/15 bg-chalk px-3 py-2 text-sm placeholder:text-ink-soft/70"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="exhibit-tag" className="sr-only">
              Filter by tag
            </label>
            <select
              id="exhibit-tag"
              value={filters.tag}
              onChange={(event) => update({ tag: event.target.value })}
              className="border border-ink/15 bg-chalk px-3 py-2 text-sm"
            >
              <option value={ALL}>All tags</option>
              {tags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>

            <label className="inline-flex cursor-pointer items-center gap-2 border border-ink/15 px-3 py-2 text-sm text-ink-soft">
              <input
                type="checkbox"
                checked={filters.only3d}
                onChange={(event) => update({ only3d: event.target.checked })}
                className="accent-oxblood"
              />
              Has 3D model
            </label>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">
            Room
          </span>
          {[{ slug: ALL, name: "All rooms" }, ...rooms].map((room) => {
            const active = filters.room === room.slug;
            return (
              <button
                key={room.slug}
                type="button"
                aria-pressed={active}
                onClick={() => update({ room: room.slug })}
                className={`border px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? "border-ink bg-ink text-paper"
                    : "border-ink/20 text-ink-soft hover:border-ink/40"
                }`}
              >
                {room.name}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 pt-3">
          <p className="text-sm text-ink-soft" aria-live="polite">
            {visible.length} of {exhibits.length} objects
            {filters.q ? ` matching “${filters.q.trim()}”` : ""}
          </p>
          <button
            type="button"
            onClick={() => setFilters({ q: "", room: ALL, tag: ALL, only3d: false })}
            disabled={isDefault(filters)}
            className="font-mono text-[11px] uppercase tracking-widest text-oxblood enabled:hover:underline disabled:opacity-40"
          >
            Clear filters
          </button>
        </div>
      </form>

      {visible.length > 0 ? (
        <div className="exhibit-grid mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((exhibit) => (
            <ExhibitCard key={exhibit.slug} exhibit={exhibit} showSummary />
          ))}
        </div>
      ) : (
        <div className="mt-10 border border-dashed border-ink/20 bg-paper/60 px-6 py-14 text-center">
          <p className="font-serif text-xl">Nothing in the collection matches that.</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">
            Try a broader term, or clear the filters to see all {exhibits.length} objects.
          </p>
          <button
            type="button"
            onClick={() => setFilters({ q: "", room: ALL, tag: ALL, only3d: false })}
            className="mt-5 bg-ink px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-oxblood"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
