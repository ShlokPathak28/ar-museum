# Architecture

How Dharohar is put together, in the order a request meets it. The plan is in
`PLAN.md`; this file is the as-built version, including the places where the
build differs from the plan.

## One app, one deploy

There is no monorepo, no separate API server and no second build. `next build`
produces one artefact; every route — public page, Studio, route handler, QR
redirect — is in it. The database is the only external service.

```
phone (QR → AR → 360°)        laptop (browse, Studio)
        │                              │
        └──────────────┬───────────────┘
                       ▼
        Next.js 16 App Router (one process)
        ├─ RSC pages, ISR for the collection
        ├─ Server Actions for every mutation
        ├─ route handlers: /x/[code], /api/qr, /api/v1, /api/auth
        └─ client islands: 3D, 360°, scanner, forms
                       │
                       ▼
        Prisma 7 → libSQL → prisma/dev.db
        (Postgres for deployment; see "Deployment shape")
```

## Routes and rendering

| Route | Rendering | Why |
|---|---|---|
| `/` | static shell, DB read at build/revalidate | the entrance is the same for everyone |
| `/exhibits` | static, `revalidate = 60`; filtering runs in the browser | instant, shareable filters via `?q=&room=&tag=&model=1` |
| `/exhibits/[slug]` | `generateStaticParams` + ISR 60 s | crawlable and instant; a Studio publish busts it explicitly |
| `/rooms`, `/rooms/[slug]` | static + ISR 60 s | same |
| `/scan` | static + ISR 60 s; the camera is a client island (`ScanPanel`) | the page is a shell; only the scanner needs the browser |
| `/passport` | dynamic, `force-dynamic`, `noindex` | personal data must never be cached or shared |
| `/login`, `/register` | static shell + client form | Better Auth owns the endpoints |
| `/studio/**` | dynamic, admin layout | always fresh, never cached |
| `/x/[code]` | route handler, `force-dynamic` | redirect + scan/stamp write + device cookie |
| `/api/qr/[code]` | route handler | PNG for a printed card |
| `/api/v1/reviews/mine` | route handler, dynamic | the one read an ISR page cannot do for itself |
| `/api/auth/[...all]` | Better Auth handler | sessions |
| `/credits`, `/markers` | static / dynamic | credits are content; cards encode the host they were printed from |

`/markers` is `force-dynamic` on purpose: a printed QR must encode the address
the page was opened on (laptop, LAN IP, deployed origin), so it cannot be
prerendered once.

## The QR path

```
printed card → https://host/x/TH01
                 ├─ resolveOrigin(headers)         ← Host, not request.url
                 ├─ prisma.scan.create             ← analytics, failures swallowed
                 ├─ prisma.stamp.upsert            ← one per device per object
                 ├─ Set-Cookie dharohar_device     ← only place a GET can set it
                 └─ 302 → /exhibits/terracotta-horse
```

Three things are deliberate:

- **The origin comes from the `Host` header.** `request.url` is normalised to the
  dev server's own origin, which would send a phone back to `localhost`. The
  scheme comes from `NEXT_PUBLIC_SITE_URL` because nothing sets
  `x-forwarded-proto` in `next dev`; behind a proxy the forwarded header wins.
- **Analytics never block the visit.** Both writes are wrapped in `try/catch`
  and log on failure.
- **The device cookie is set on the redirect.** A route handler is the only
  place a plain GET can set one, which is why `/x/[code]` is not a page.

An unknown or unpublished code redirects to `/exhibits` rather than 404 — the
visitor did nothing wrong, and a dead card should still land somewhere useful.

## Data layer

Prisma 7 with the libSQL driver adapter (`src/lib/db.ts`). The provider is still
`sqlite` and `DATABASE_URL` is still a file, but Prisma 7 compiles queries in
TypeScript instead of shipping a Rust engine, so a driver is required.
`@prisma/adapter-libsql` ships prebuilt binaries and needs no Visual Studio build
tools on Windows.

SQLite has no native enums and no scalar lists, so:

- `role`, `status`, `method` are strings validated by Zod at every boundary.
- `Exhibit.facts` is a JSON string; `tags` is comma-separated.
- `Stamp` is unique on `(deviceId, exhibitId)`; `Review` on `(userId, exhibitId)`.

Moving to Postgres is a provider change plus converting those columns back to
enums and arrays. The application code reads them through the same helpers.

## Auth and authorisation

Better Auth 1.7, email + password, sessions in an httpOnly cookie, `role` on the
session. `src/lib/auth.ts` owns the server instance; `auth-client.ts` is the
browser client; `getViewer()` in `session.ts` is the one read used by pages,
layouts and actions.

Two gates, on purpose:

1. **`src/proxy.ts`** (Next 16's name for middleware) checks only whether a
   session *cookie* exists and redirects to `/login?next=…` when it does not.
   This is UX: it prevents a flash of protected chrome. It cannot know whether
   the session is still valid.
2. **`requireAdmin()`** (`src/lib/admin.ts`) reads the real session. The studio
   layout calls it so no admin chrome renders, and **every Studio Server Action
   calls it again** — an action is a public endpoint, and a layout check does
   not protect it.

A signed-out visitor is redirected; a signed-in non-admin gets `notFound()` (404,
not 403), so the route's existence is not confirmed to them. The e2e suite
asserts both behaviours.

Review mutations follow the same rule at a smaller scale: `saveReview` and
`deleteReview` re-read the session and re-check ownership before writing.

## Mutations: Server Actions first, route handlers where they fit

Content changes are **Server Actions**: exhibit create/update/delete, publish,
review moderation, review create/delete. They validate with the same Zod schema
as the form, call `revalidateMuseum()` (or `revalidatePath` for the exhibit), and
return a typed result the client renders inline. No client-side mutation library,
no optimistic cache to invalidate by hand.

Route handlers exist where a form action is the wrong shape:

- `/x/[code]` needs a redirect and a `Set-Cookie`.
- `/api/qr/[code]` returns an image.
- `/api/v1/reviews/mine` answers "does this visitor already have a review here?"
  for an ISR page that cannot know who is reading it.
- `/api/auth/[...all]` is Better Auth's.

`revalidateMuseum()` (`src/lib/revalidate.ts`) is a single list of every public
path that reads exhibit data. Forgetting one means the museum shows an old label
for up to a minute, so the list lives in one place.

## 3D, AR and 360°

**Object viewer** — `<model-viewer>` in a client component. It renders glTF in
WebGL, exposes hotspots as real `<button>` elements, and hands the same file to
WebXR / Scene Viewer for AR. AR is hidden when `canActivateAR` is false. The
module is imported **after** the poster image loads, on `requestIdleCallback`
with a 2.5 s cap (a timer fallback for background tabs, where idle time and
frames both stop). This keeps ~400 KB of three.js out of the first paint; the
cost is TBT, documented in `PERF-NOTES.md`.

The poster sits **beside** `<model-viewer>`, not inside `slot="poster"`. The
custom element re-parents slotted children into its shadow root when it
upgrades, which paints the photograph a second time — and that second paint was
the page's LCP at 7 s.

**Reconstruction tab** — `model-viewer` exposes no material API, so the three
states (textured / clay / wireframe) are a separate `three` scene, loaded with
`dynamic(..., { ssr: false })` only when the tab is opened. It attaches
`DRACOLoader` pointed at `/draco/`: the GLBs are Draco-compressed, and
`model-viewer`'s bundled decoder does not help a hand-built `GLTFLoader`.

**360° room** — one equirectangular WebP per room on an inverted sphere, plain
`three` (not react-three-fiber), damped pointer look, gyroscope on a tap where
the browser requires permission, fullscreen API, and hotspot links positioned by
pixel fractions on the source image. The stage paints an optimizer-sized still
immediately and the full panorama becomes the texture once the viewer loads, so
the room is never a black hole.

Both 3D paths are client-only. WebGL and camera APIs cannot run during SSR, and
`dynamic(..., { ssr: false })` keeps them out of the server bundle as well as the
first payload.

## Styling and accessibility

Tailwind 4 with design tokens in `src/app/globals.css` (`@theme`): vault, chalk,
paper, ink, oxblood, brass, glow. The rules that matter are written next to the
tokens:

- **Contrast floor.** Muted text is chalk/50 or ink-soft; anything dimmer fails
  AA and is not used for text. Borders may sit below it.
- **One focus ring, two tones.** Oxblood on the chalk walls; a pale halo so the
  ring is visible on vault. One of the two always clears 3:1.
- **Skip link** first in the tab order on every public page and in the studio.
- **Motion is decoration.** The entrance doors, grain and hover dimming all
  disappear under `prefers-reduced-motion`; the `<noscript>` rule removes the
  doors entirely without JavaScript.

The accessibility pass and its measurements are recorded in the Week 5 entry of
`PLAN.md`.

## Performance

`PERF-NOTES.md` holds the traces. The short version:

- Assets are compressed at build time (`@gltf-transform/cli` via `npx`, not a
  dependency): 16.5 MB of GLB → 1.7 MB, panoramas → 3072×1536 WebP.
- Every content image goes through `next/image` with layout-matched `sizes`; the
  first row of a grid is eager. The only direct fetch is the 3D poster, which is
  the LCP image and 100 KB.
- three.js is deferred; the room viewer and reconstruction tab are dynamic
  imports.

## Tests

Two suites, split by what they can see — `TESTING.md` has the table.

- **Vitest** for pure modules: schemas, path safety, origin resolution, marker
  maths, accent selection, date formatting.
- **Playwright** for the browser spine: skip link and landmarks, auth guards,
  entrance → collection → object, filters and URL mirroring, a room's objects
  and 360 stage, a printed code redirect, the reconstruction tab's Draco path.

No component-render tests and no MSW: the only API the app calls is its own, and
mocking it would test the mock rather than the session, proxy and database
together.

## Deployment shape

The target is one Vercel project plus a hosted Postgres (Neon or Prisma
Postgres). The pieces that change:

1. `DATABASE_URL` → Postgres; Prisma provider `sqlite` → `postgresql`; the
   string columns that stand in for enums/arrays become real ones.
2. `NEXT_PUBLIC_SITE_URL` and `BETTER_AUTH_URL` → the deployed HTTPS origin.
   Better Auth's `trustedOrigins` derives from `NEXT_PUBLIC_SITE_URL`, so a
   wrong value breaks sign-in with an "Invalid origin" log.
3. `npm run db:migrate` (or `prisma migrate deploy`) + a seed on the new
   database.
4. HTTPS is not optional: WebXR and the camera only exist in a secure context.

Nothing in the app depends on the local filesystem at runtime except
`prisma/dev.db`, so the move is configuration, not code.

## Deviations from the plan, stated

| Planned | Shipped | Why |
|---|---|---|
| TanStack Query for search/infinite scroll | client filtering over the prerendered grid, URL-synced | six objects; a network round trip per keystroke would be slower |
| Zustand + RTK for passport/studio state | `useState`, `useTransition`, `useOptimistic`, cookies + DB | no cross-route client state survived the cut; the passport is server data |
| react-three-fiber + drei for 360° | plain `three` | the viewer is one sphere and a camera; r3f added a dependency for no pixels |
| Cloudinary uploads | image paths in the database; assets in `public/` | upload was cut in week 4; the schema keeps `Media` for it |
| Postgres on Neon | SQLite via libSQL locally | deployment is the remaining step; the adapter is the only change |
| `@modal` intercepting quick-look | full page navigation | the page is fast enough that a modal added complexity without a win |
| Tours builder | schema + seed only, no Studio UI | cut order put tours after the admin CRUD pass |
