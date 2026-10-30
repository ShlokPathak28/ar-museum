/**
 * The Studio renders on the server, so a navigation waits for the session check
 * and the page's queries before anything changes on screen. Without this file
 * the old page just sits there, which reads as "the click didn't work" and
 * invites a second click.
 *
 * A skeleton in the museum's own type and colours instead: the layout's header
 * stays put, the content area says it is working. `role="status"` announces it
 * once; the bars are decorative.
 */
export default function StudioLoading() {
  return (
    <main id="main" tabIndex={-1} className="mx-auto w-full max-w-6xl px-5 pb-24 pt-10 sm:px-8">
      <p
        role="status"
        className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft"
      >
        Loading…
      </p>

      <div
        aria-hidden
        className="mt-6 animate-pulse motion-reduce:animate-none space-y-3"
      >
        <div className="h-10 w-2/3 max-w-sm bg-ink/10" />
        <div className="h-px w-full bg-ink/10" />
        <div className="grid gap-3 pt-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="h-24 border border-ink/10 bg-ink/5" />
          ))}
        </div>
      </div>
    </main>
  );
}
