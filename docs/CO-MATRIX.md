# Course-outcome matrix

Where each INT252 outcome and INT257 area is actually demonstrated, with the
file to open and the line to say. The plan's original table named a few files
that were cut; this is the as-built version.

## INT252 — React and modern JavaScript

| CO | Concept | Where | What to show |
|---|---|---|---|
| **CO1** | ES6+, immutability | `src/lib/schemas.ts`, `src/components/exhibit/ExhibitBrowser.tsx`, `src/app/exhibits/[slug]/ReviewSection.tsx`, `src/lib/accent.ts`, `src/lib/room-markers.ts` | Schemas are `const` objects with inferred types. `update()` in the browser returns `{ ...current, ...patch }`, never mutates. The optimistic reducer returns `state.filter(...)` / `[...state, ...]`, never `push`. `accentForTags` and `ROOM_MARKERS` are pure lookups with unit tests. |
| **CO2** | Components and props | `src/components/exhibit/ExhibitCard.tsx`, `src/components/site/PageMasthead.tsx`, `src/components/site/SiteHeader.tsx`, `src/components/room/RoomStage.tsx`, `src/components/three/ModelViewer.tsx` | `ExhibitCard` takes one data object plus two behaviour props (`showSummary`, `eager`) — variants without a boolean explosion. `PageMasthead` has named slots (`eyebrow`, `title`, `lede`, `aside`). `SiteHeader` takes an optional `back`. `RoomStage` composes a still, a dynamic viewer and a vignette. Conditional rendering: the 3D badge, the empty-filter state, the AR button hidden when unsupported. |
| **CO3** | Hooks, effects and cleanup | `src/app/scan/ScanPanel.tsx`, `src/components/room/RoomViewer.tsx`, `src/components/three/ReconstructionViewer.tsx`, `src/components/three/ModelViewer.tsx` | `ScanPanel`'s effect stops the camera track on unmount. `RoomViewer` cancels its `requestAnimationFrame`, removes listeners and disposes geometry/material/renderer. `ReconstructionViewer` disposes all three materials, the renderer **and** the Draco decoder. `ModelViewer` cancels the idle callback and guards the async import with a `cancelled` flag. Derived state is `useMemo`, not an effect chain. |
| **CO4** | Forms and validation | `src/app/studio/exhibits/ExhibitForm.tsx`, `src/app/exhibits/[slug]/ReviewSection.tsx`, `src/app/login/LoginForm.tsx`, `src/app/register/RegisterForm.tsx`, `src/lib/schemas.ts` | Studio and review forms use React Hook Form + `zodResolver` with inline messages. The Server Actions (`saveExhibit`, `saveReview`) parse the **same** schema again — the client check is a convenience, the action is the boundary. Login/register are deliberately plain `useState` (three fields, one server error). |
| **CO5** | Routing and data fetching | `src/app/exhibits/[slug]/page.tsx`, `src/app/rooms/[slug]/page.tsx`, `src/app/x/[code]/route.ts`, `src/components/exhibit/ExhibitBrowser.tsx`, `src/components/room/RoomStage.tsx`, `src/proxy.ts` | Dynamic segments and `generateStaticParams`; query-string state with `history.replaceState` + `popstate`; protected `/passport` via proxy **and** a server `redirect`; code splitting with `dynamic(..., { ssr: false })` for the room and reconstruction viewers; loading (`Suspense` fallback grid, "Preparing the 360° viewer"), empty ("Nothing in the collection matches that") and error (viewer status) states. |
| **CO6** | Shared state | `docs/STATE-DECISIONS.md` | The full inventory: `useState` for UI, refs for render-loop values, `useMemo` for derived lists, URL for filters, RSC for server data, cookie + `Stamp` for cross-route anonymous state, `useOptimistic` for the review write. The document also argues why Redux, Zustand, RTK and TanStack Query were not used. |

## INT257 — Next.js

| Area | Where | What to show |
|---|---|---|
| **Routing** | `src/app/**/page.tsx`, `src/app/studio/layout.tsx`, `src/app/x/[code]/route.ts`, `src/app/api/auth/[...all]/route.ts` | Nested layouts (root shell, admin shell), dynamic segments, a catch-all for Better Auth, a short-code redirect route. **Not used:** route groups, intercepting/parallel routes — the collection is small enough that a full-page navigation is the simpler correct answer. |
| **Rendering** | `src/app/page.tsx`, `exhibits/page.tsx`, `exhibits/[slug]/page.tsx`, `rooms/page.tsx`, `passport/page.tsx`, `markers/page.tsx` | SSG + ISR (`generateStaticParams`, `revalidate = 60`) for every public content page; `force-dynamic` for `/passport` (personal), `/markers` (host-dependent), `/studio/**` (admin). `Suspense` around the client filter with a prerendered fallback grid. |
| **Data fetching** | every `page.tsx`; `src/lib/revalidate.ts` | RSC reads Prisma directly — no client fetch for page data. Mutations revalidate by **path** (`revalidateMuseum`, `revalidatePath`), not by `fetch` cache tag, because every public read is a direct Prisma call and there is no tagged `fetch` to bust. The one client read is `/api/v1/reviews/mine`, explained in `STATE-DECISIONS.md`. |
| **API** | `src/app/x/[code]/route.ts`, `src/app/api/qr/[code]/route.ts`, `src/app/api/models/[id]/route.ts`, `src/app/api/v1/reviews/mine/route.ts`, `src/app/api/auth/[...all]/route.ts` | Route handlers with dynamic and catch-all segments, `NextResponse.redirect`, JSON responses with correct status codes, a `Set-Cookie` from a route handler (the only place a plain GET can set one), and binary responses with an immutable cache header for uploaded models. |
| **Server Actions** | `src/app/studio/exhibits/actions.ts`, `src/app/studio/reviews/actions.ts`, `src/app/studio/users/actions.ts`, `src/app/exhibits/[slug]/actions.ts` | Exhibit create/update/delete, publish/unpublish, GLB upload, user role change and account removal, review hide/restore, review create/delete. `useTransition` for pending states, `useOptimistic` for the review list, `revalidatePath`/`revalidateMuseum` after every write, typed `{ ok }` results rendered inline. |
| **Auth / RBAC** | `src/lib/auth.ts`, `src/lib/session.ts`, `src/lib/admin.ts`, `src/proxy.ts`, `src/app/login`, `src/app/register` | Better Auth with email + password, httpOnly session cookie, `role` on the session. `proxy.ts` is a cookie-presence check for UX only; `requireAdmin()` reads the real session in the studio layout **and in every action**, including the user role/delete actions. A signed-in non-admin gets a 404, not a 403. Self-role changes and removing the last admin are refused inside the transaction. |
| **Database** | `prisma/schema.prisma`, `prisma/migrations/`, `prisma/seed.ts`, `src/lib/db.ts` | Fifteen models, four migrations, a seed with 2 rooms / 6 exhibits / 2 tours / 6 codes. Prisma 7 with the libSQL adapter. SQLite has no enums or scalar lists, so `role`/`status`/`method` are Zod-validated strings, `facts` is JSON and `tags` is comma-separated — stated in the README and `ARCHITECTURE.md`. `ModelAsset` stores uploaded GLB bytes in the same database. |
| **Performance / SEO** | `src/app/layout.tsx`, `src/app/opengraph-image.tsx`, `src/app/exhibits/[slug]/opengraph-image.tsx`, `src/app/sitemap.ts`, `src/app/robots.ts`, `src/app/exhibits/[slug]/page.tsx`, `docs/PERF-NOTES.md` | Metadata API with a title template and canonical URLs, generated OG images via `next/og`, sitemap and robots, `CreativeWork` JSON-LD, `next/image` with layout-matched `sizes`, `dynamic()` for three.js, deferred model-viewer import. The measured before/after is in `PERF-NOTES.md`. |
| **Advanced** | `src/app/opengraph-image.tsx`, `src/components/room/RoomStage.tsx`, `src/components/three/ModelViewer.tsx` | Dynamic OG generation at request time, `dynamic()` code splitting, a custom element wrapped in React with property (not attribute) assignment, and an idle-callback scheduler with a visibility fallback. **Not used:** edge runtime (libSQL has no edge build), i18n, MindAR. |
| **Deploy** | `src/lib/env.ts`, `.env.example`, `docs/HTTPS.md` | Environment is validated by Zod at boot, so a missing `DATABASE_URL` fails immediately with a readable error. The deploy itself is the remaining Week 5 step: one Vercel project, Postgres, HTTPS for WebXR. |

## The two caveats to say before they are asked

**INT252 names Vite and react-router; this build uses Next.js.** The React
content is unchanged — hooks, props, state, forms, effects, cleanup — and every
routing concept the syllabus lists (dynamic routes, nested layouts, protected
routes, code splitting, route params, query params) is demonstrated in the App
Router. `docs/ARCHITECTURE.md` maps each one to a file. If the React faculty
requires Vite specifically, that is a conversation, not a silent substitution.

**Three plan features were cut, not forgotten.** TanStack Query (client search),
Zustand/RTK (global state) and the tours builder were removed when the build
showed they were not carrying their weight; `STATE-DECISIONS.md` and
`ARCHITECTURE.md` say what would bring each one back. Everything the demo needs
— browse, QR, 3D, reconstruction, AR, 360°, passport, reviews, Studio — is
present.

## A five-minute viva path

1. `src/app/x/[code]/route.ts` — QR redirect, scan log, stamp, device cookie.
2. `src/app/exhibits/[slug]/page.tsx` — ISR, metadata, JSON-LD, viewer.
3. `src/components/three/ModelViewer.tsx` — deferred three.js, poster overlay,
   AR hand-off.
4. `src/components/three/ReconstructionViewer.tsx` — the second renderer and its
   Draco decoder.
5. `src/app/studio/exhibits/actions.ts` + `src/lib/admin.ts` — the authorisation
   boundary.
6. `src/app/exhibits/[slug]/ReviewSection.tsx` — `useOptimistic` and the one
   justified client fetch.
7. `docs/PERF-NOTES.md` — the LCP investigation and the honest trade-offs.
