# Dharohar AR — Smart Museum Guide
### Project plan v3 · Next.js · INT252 + INT257

> **One website.** Scan a QR code next to an exhibit → its page opens with narrated history, photos, a 3D model you can spin, an **AR mode** that places the object in your room, and a **VR mode** that walks you through the gallery in 360°. Admins manage everything from `/studio`; visitors can collect stamps and leave reviews.

**Scope:** QR-first website · 3D guaranteed · AR + VR additive · 6 weeks · Android + laptop demo · ₹0

---

## 1. The 3-minute demo

| # | Beat | Tech on screen |
|---|------|----------------|
| 1 | Laptop: home → gallery → search/filter → exhibit page, fast and shareable (OG preview) | SSG/ISR, `next/image`, Metadata API |
| 2 | Phone scans the QR card on the desk → exhibit page opens in ~1s | `/x/[code]` redirect, ISR cache hit |
| 3 | Drag to rotate the model, tap hotspot ("cracked glaze"), switch **wireframe → clay → textured** | `model-viewer`, hotspots, 3 material states |
| 4 | Tap **View in your room** → model drops onto the desk at real scale | WebXR / ARCore Scene Viewer |
| 5 | Tap **VR walkthrough** → 360° gallery, look around by moving the phone, hotspot jumps to another exhibit | react-three-fiber, gyro, fullscreen |
| 6 | Add to Passport → stamp + progress; sign in → post a 5★ review and see it appear instantly | Zustand persist, Better Auth, `useOptimistic` |
| 7 | Admin: edit that exhibit, upload a photo, Publish → public page updates, no redeploy | RBAC, Server Action, `revalidateTag` |

**Safety net:** every beat works on a laptop (`?demo=1` swaps AR/VR for a recorded clip + static panorama). Never let venue wifi kill the demo.

---

## 2. Architecture — one app

```
                    ┌─────────────────────────────────────────┐
   phone (QR/AR/VR) │  Next.js 16 App Router                  │
   desktop          │  RSC + SSG/ISR · Server Actions          │
                    │  /exhibits · /scan · /rooms · /passport  │
                    │  /studio · /api/v1 · /x/[code]           │
                    └───────┬──────────────────────┬──────────┘
                            │                      │
                    ┌───────▼───────┐      ┌───────▼────────┐
                    │ Postgres      │      │ Cloudinary     │
                    │ via Prisma    │      │ images/models  │
                    └───────────────┘      └────────────────┘
```

Everything ships from `next build` to one Vercel project. No monorepo, no workspace, no second build, no route rewrites. `npm install && npm run dev`.

**Server vs client boundary:**

| Route | Rendering | Why |
|---|---|---|
| `/`, `/exhibits`, `/exhibits/[slug]`, `/rooms/[slug]` | SSG + ISR | crawlable, instant, same for everyone |
| `/exhibits` search results | client (TanStack Query) | type-ahead + infinite scroll |
| `/passport` | SSR (dynamic) | personalised, must not be cached |
| `/scan`, 3D, AR, VR | client only (`dynamic(..., { ssr: false })`) | camera + WebGL |
| `/studio/**` | SSR + Server Actions | admin, always fresh |
| `/x/[code]` | Node route handler | redirect + Prisma scan log (see §6 — not edge, see note) |

---

## 3. Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16.4 (App Router), React 19.3 | one app, SSR + SPA routes together |
| Language | TypeScript (strict) | |
| Styling | Tailwind CSS 4.3 (`@theme` tokens), Radix primitives | fast, accessible |
| DB | Prisma 7.10 + SQLite → Postgres/Neon | typed ORM, free hosting |
| Auth | Better Auth 1.7 (email+password, roles) | stable on Next 16, sessions in cookies |
| Validation | Zod 4.6 | one schema for form + action + route |
| Forms | React Hook Form 7.90 + `zodResolver` | |
| Server state | RSC + Prisma; TanStack Query 5.104 for client search/infinite | |
| Client state | Zustand 5.0 (passport) · Context (camera/AR) · RTK 2.13 (studio draft) | CO6 comparison |
| 3D / AR | `@google/model-viewer` 4.4 | built-in AR, hotspots, material swap |
| VR 360 | `three` + `@react-three/fiber` + `drei` | sphere pano, gyro, stereo — plain `three` is already installed in week 1 for the reconstruction states |
| QR | `qrcode` (generate), `qr-scanner` (camera scan) | |
| Media | Cloudinary free tier | transforms + uploads |
| Tests | Vitest + RTL, Playwright, MSW | |
| Deploy | Vercel + Neon + Cloudinary | HTTPS mandatory for camera |

---

## 4. Routes

```
app/
├─ (site)/
│  ├─ page.tsx                        home
│  ├─ exhibits/page.tsx               gallery + search + filters
│  ├─ exhibits/[slug]/page.tsx        exhibit: 3D/AR/VR, audio, reviews
│  ├─ rooms/[slug]/page.tsx           VR walkthrough + room exhibits
│  └─ @modal/(.)exhibits/[slug]/…     quick-look modal (intercepting route)
├─ (visit)/
│  ├─ scan/page.tsx                   in-browser QR scanner + code entry
│  └─ passport/page.tsx               protected: stamps, badges, my reviews
├─ (studio)/studio/                   protected admin
│  ├─ page.tsx                        dashboard (scans, top exhibits)
│  ├─ exhibits/[id]/page.tsx          edit, media, hotspots, QR
│  ├─ tours/page.tsx                  tour builder
│  ├─ reviews/page.tsx                moderation
│  └─ analytics/page.tsx
├─ login/page.tsx · register/page.tsx
├─ spike/ar · spike/panorama          throwaway week-0 probes (noindex)
├─ x/[code]/route.ts                  short QR link → redirect + scan log (Node)
├─ api/qr/[code]/route.ts             QR PNG for a short code
├─ api/v1/…                           REST for client components (week 2)
├─ api/auth/[...all]/route.ts         Better Auth
├─ sitemap.ts · robots.ts · opengraph-image.tsx
└─ markers/page.tsx                   printable QR cards

components/{ui,exhibit,three,qr,forms,studio}/
hooks/{useQrScanner,useModelAr,usePanorama,useTourProgress,useMediaQuery}.ts
lib/{db,auth,api,schemas,env}.ts
prisma/{schema.prisma,seed.ts}
public/{models,panoramas,posters}/
```

---

## 5. Data model

```prisma
enum Role       { VISITOR ADMIN }          // CURATOR reserved
enum Status     { DRAFT PUBLISHED ARCHIVED }
enum ScanMethod { QR MANUAL AR VR }

model Exhibit {
  id          String   @id @default(cuid())
  slug        String   @unique
  code        String   @unique          // "TH01" — printed under the QR
  title       String
  subtitle    String?
  era         String
  yearStart   Int?
  yearEnd     Int?
  roomId      String
  summary     String
  body        String                    // long-form content
  facts       String[]
  heroImage   String
  audioUrl    String?
  transcript  String?                   // a11y + SEO
  modelUrl    String?                   // .glb
  modelUsdz   String?                   // iOS Quick Look
  modelScale  Float    @default(1)
  tags        String[]
  status      Status   @default(DRAFT)
  updatedAt   DateTime @updatedAt
  room        Room     @relation(fields: [roomId], references: [id])
  hotspots    Hotspot[]
  gallery     Media[]
  scans       Scan[]
  reviews     Review[]
  stops       TourStop[]
  stamps      Stamp[]
}

model Hotspot {
  id        String  @id @default(cuid())
  exhibitId String
  label     String
  body      String
  position  Float[]                 // [x,y,z] on the model
}

model Room {
  id          String    @id @default(cuid())
  slug        String    @unique
  name        String
  floor       String
  panoramaUrl String?               // equirectangular JPG for VR
  exhibits    Exhibit[]
}

model Tour {
  id String @id @default(cuid())
  slug String @unique
  title String
  description String
  theme String
  durationMin Int
  status Status @default(DRAFT)
  stops TourStop[]
}

model TourStop {
  id String @id @default(cuid())
  tourId String
  exhibitId String
  position Int
  blurb String?
  @@unique([tourId, exhibitId])
}

model User {
  id String @id @default(cuid())
  email String @unique
  name String
  role Role @default(VISITOR)
  createdAt DateTime @default(now())
  reviews Review[]
  stamps  Stamp[]
  scans   Scan[]
  // Better Auth owns sessions/accounts
}

model Review {
  id String @id @default(cuid())
  exhibitId String
  userId String
  rating Int                        // 1–5
  body String                       // 10–800 chars
  status String @default("VISIBLE") // VISIBLE | HIDDEN
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  exhibit Exhibit @relation(fields: [exhibitId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([userId, exhibitId])     // one review per exhibit per visitor
  @@index([exhibitId, status, createdAt])
}

model Scan {
  id String @id @default(cuid())
  exhibitId String
  method ScanMethod
  deviceId String
  userId String?
  createdAt DateTime @default(now())
  @@index([exhibitId, createdAt])
}

model Stamp {
  id String @id @default(cuid())
  deviceId String
  userId String?
  exhibitId String
  firstSeenAt DateTime @default(now())
  user User? @relation(fields: [userId], references: [id])
  @@unique([deviceId, exhibitId])
}

model Feedback {
  id String @id @default(cuid())
  exhibitId String?
  rating Int
  message String
  contact String?
  status String @default("NEW")
  createdAt DateTime @default(now())
}

model Media {
  id String @id @default(cuid())
  url String
  kind String                    // IMAGE | AUDIO | VIDEO | MODEL | PANORAMA
  alt String
  credit String?
  exhibitId String?
}
```

**Seed:** 6 exhibits / 2 rooms · 3 with GLB models · 2 with narration + transcript · 1 room panorama · 2 tours · 6 QR cards. CC0 assets (Smithsonian Open Access, Scan the World, Wikimedia) + `/credits`. Demo accounts: `visitor@demo.dev` / `admin@demo.dev`, password `demo1234`.

---

## 6. QR mechanics

```
printed card ──▶ https://site.app/x/TH01        (route handler)
                     ├─ log Scan { method: QR, deviceId }
                     └─ 302 ─▶ /exhibits/terracotta-horse?src=qr
                                     └─▶ ISR cache hit, instant

/scan page ──▶ qr-scanner reads the same URL ──▶ navigate directly
```

- `code` is short and typeable (`TH01`) — the manual fallback when no camera.
- `/x/[code]/route.ts` is a **Node** route handler, not edge: it writes the scan through Prisma/libSQL, and that driver has no edge build. The redirect waits on a single indexed insert; if that ever costs too much, the fix is to hand the log to `waitUntil(fetch(...))` and move the route to edge, not to drop the analytics.
- `/api/qr/[code]` returns a PNG; `/markers` prints A6 cards with title + code.
- **Dev gotcha:** `localhost` QRs won't scan from a phone. Use `NEXT_PUBLIC_SITE_URL=http://<LAN-IP>:3000` while testing — but camera APIs need HTTPS, so test the in-browser scanner on the deployed URL or via a tunnel.

---

## 7. 3D → AR → VR

### 7.1 3D viewer (always works, no permissions)
- `<model-viewer>` in a client component (`dynamic(..., { ssr: false })`).
- `camera-controls`, `auto-rotate`, `environment-image`, `shadow-intensity`, `poster`.
- **Hotspots:** `<button slot="hotspot-1" data-position="…">` → real DOM popover (keyboard accessible).
- **Reconstruction tab:** same GLB in three material states — wireframe → clay → textured — plus a short methodology note.
  `model-viewer` exposes no material API, so this tab is a separate three.js scene (`ReconstructionViewer`) that loads the same file on demand. It shares the page with the viewer but never with its bundle: the tab is `dynamic(..., { ssr: false })`.
- Only 3 exhibits ship models; each < 5 MB (Draco/meshopt, 2K textures), lazily loaded.

### 7.2 AR mode (one tap, no markers)
```html
<model-viewer ar ar-modes="webxr scene-viewer quick-look"
              ar-scale="auto" ios-src="/models/terracotta.usdz">
```
- **HTTPS is mandatory.** WebXR (`immersive-ar`) only exists in a secure context. Over plain `http://` Chrome hides it, model-viewer falls back to handing the model to the Google app's Scene Viewer, and that hand-off fails on the test phone (verified week 0).
- With HTTPS, Android Chrome opens the camera inside the page (WebXR) — no second app, no Google-app dependency. This is the path the demo uses; `npm run dev:https` + `docs/HTTPS.md`.
- iOS: Quick Look needs `.usdz` (Reality Converter on a Mac) — optional, Android is enough for the demo.
- Hide the button when `modelViewer.canActivateAR` is false. No CV, no lighting conditions, no tracking images.
- Laptop fallback: recorded clip + "open this on your phone" QR.

### 7.3 VR mode (360° room)
- One equirectangular JPG per room (4096×2048, q80, ~1.5 MB), shot with any panorama app — your desk can be "Room 1".
- r3f: inverted sphere + `useTexture`, damped pointer look, gyro via `DeviceOrientationEvent` (request permission on a tap for iOS), fullscreen API, `<Html>` hotspots.
- Stretch: cardboard split-screen stereo (two offset cameras, ~1 day).
- Fallback: static panorama with drag-to-look.

### 7.4 Optional stretch
MindAR image tracking ("point at the object") — bonus only, never the demo's spine.

### Honesty line for the report
**3D** = real-time model · **AR** = placed in your space via ARCore/Quick Look · **VR** = 360° immersive walkthrough (cardboard optional, not a headset game). Don't overclaim.

---

## 8. Accounts & permissions

| Capability | Guest | Visitor | Admin |
|---|---|---|---|
| Browse, 3D / AR / VR | ✅ | ✅ | ✅ |
| Scan QR, collect stamps | ✅ device-local | ✅ synced | ✅ |
| Post / edit / delete own review | ❌ → sign-in prompt | ✅ 1 per exhibit | ✅ |
| Studio: exhibits, models, hotspots, tours, QR | ❌ | ❌ | ✅ |
| Review moderation, analytics | ❌ | ❌ | ✅ |

- **No login wall.** Guests browse and scan; accounts only own things. On first sign-in, claim device-local stamps (`UPDATE Stamp SET userId … WHERE deviceId …`).
- **Better Auth:** email+password, httpOnly session cookie, `role` on session.
- **Middleware** guards `/studio/**` and `/passport`; **every Server Action re-checks the role server-side** — middleware is UX, not a security boundary.
- `(studio)/layout.tsx` calls `requireAdmin()` server-side (no flash of admin UI).
- Protected-route proof: `/passport` without a session → `/login?next=/passport` → back to the page.
- **Reviews:** unique `(userId, exhibitId)`, `useOptimistic` insert with rollback, admin can hide (then `revalidateTag`).
- Security checklist for the report: hashed passwords, `httpOnly/secure/sameSite`, Zod at every boundary, server-side authorisation, 404 over 403 where existence would leak, no secrets in `NEXT_PUBLIC_*`, rate-limit login + writes.

---

## 9. API surface

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | `/api/v1/exhibits?q=&room=&tag=&cursor=` | public | search + infinite scroll |
| GET | `/api/v1/exhibits/[slug]` | public | single exhibit |
| GET | `/api/v1/me` | session | role, passport, my reviews |
| GET | `/x/[code]` | public | QR redirect + scan log |
| GET | `/api/qr/[code]` | public | QR PNG |
| POST | `/api/v1/scans` | public | idempotent on `clientEventId` |
| POST | `/api/v1/stamps` | device/session | passport sync |
| POST | `/api/v1/reviews` | VISITOR | create |
| PATCH/DELETE | `/api/v1/reviews/[id]` | owner | edit / delete |
| PATCH | `/api/v1/reviews/[id]/moderate` | ADMIN | hide / restore |
| POST | `/api/v1/feedback` | public | general feedback, rate-limited |
| POST | `/api/v1/uploads/sign` | ADMIN | Cloudinary signed upload |
| GET | `/api/v1/analytics/summary` | ADMIN | dashboard |
| GET | `/api/health` | public | uptime + build SHA |

Content mutations live in **Server Actions** (progressive enhancement + `revalidateTag`); route handlers exist for client components and to demonstrate REST. Explain both choices in `docs/ARCHITECTURE.md`.

---

## 10. State strategy (CO6)

| Kind | Example | Tool |
|---|---|---|
| Local UI | open sheet, active tab, viewer mode | `useState` |
| Derived | filtered exhibits, passport % | compute / `useMemo` |
| Shared subtree | camera stream, permission, AR status | **Context** |
| Cross-route client | guest stamps, narration prefs | **Zustand** + `persist` |
| Admin draft | tour reorder + undo | **RTK** slice |
| Server state | exhibits, reviews, analytics | RSC + **TanStack Query** |

Write `docs/STATE-DECISIONS.md` with a paragraph on "why not Redux everywhere" and "why not `useEffect` + `fetch`". Free marks.

---

## 11. Course outcomes

### INT252

| CO | Where | Evidence |
|---|---|---|
| CO1 ES6+/immutability | `lib/schemas.ts`, `studioSlice`, `useTourProgress` | pure updaters, spread/rest, `structuredClone`, `PERF-NOTES.md` on mutation vs `memo` |
| CO2 components/props | `components/ui`: `ExhibitCard`, `MediaCarousel`, `Timeline`, `StampRing`, `Sheet` | variants, `children` composition, conditional rendering |
| CO3 hooks/state | `useQrScanner`, `useModelAr`, `usePanorama` | effect cleanup stops camera + disposes geometry; derived state over effect chains |
| CO4 forms/validation | `ReviewForm`, `FeedbackForm`, `StudioExhibitForm` | RHF + Zod, inline errors, server re-validation |
| CO5 routing/fetching | App Router dynamic segments, search params, protected `/passport`, `dynamic()` splitting, TanStack Query | loading/error/empty, retry, infinite scroll |
| CO6 shared state | Zustand, Context, RTK | §10 matrix |

> **INT252 caveat, say it before your teacher does:** the syllabus lists *Vite* and *react-router* explicitly; this build uses Next.js's App Router — same client-side navigation model, and every concept (dynamic routes, nested layouts, protected routes, code splitting, route params) is demonstrated. The React content (hooks, props, state, forms) is unchanged. If the React faculty insists on Vite specifically, tell me and we'll discuss a second build — but it costs you the Next.js marks.

### INT257

| Area | Evidence |
|---|---|
| Routing | App Router, route groups, nested layouts, `@modal` + intercepting route, dynamic `/x/[code]` |
| Rendering | `generateStaticParams` + ISR on exhibits, SSR passport, Suspense streaming, client search |
| Fetching | RSC → Prisma; `fetch(..., { next: { tags } })`; `revalidateTag` on publish |
| API | route handlers, dynamic + catch-all segments, `NextResponse` redirects, cookies set from a route handler |
| Server Actions | exhibit CRUD, upload, publish, reorder, review moderation (`useActionState`, `useOptimistic`, `revalidatePath`) |
| Auth/RBAC | Better Auth, roles, middleware + server checks |
| DB | Prisma schema, migrations, seed, CRUD, Zod at the boundary |
| Perf/SEO | Metadata API, dynamic OG, `sitemap.ts`, JSON-LD, `next/image`, `dynamic()` for 3D |
| Advanced | parallel + intercepting routes (week 4), generated OG images via `next/og`, i18n (stretch). Edge runtime is **not** used — see §6 |
| Deploy | Vercel, `env.ts` Zod validation, logs |

---

## 12. Six-week schedule (@ ~12 hrs/week)

| Week | Focus | Ships by Friday |
|---|---|---|
| **0** (3 days) | Next app + Tailwind + Prisma + seed, design tokens, **AR spike on the phone** (model-viewer AR + one panorama) | Site runs locally; AR placement verified on device |
| **1** | Home, gallery + filters, exhibit page, 3D viewer + hotspots + materials, ISR/SEO/OG, QR generation + `/markers` | Shareable, fast exhibit pages |
| **2** | `/api/v1`, Better Auth + roles, `/scan` QR scanner, `/passport` (Zustand + sync), reviews (RHF + Zod) | Full visit flow |
| **3** | **AR + VR**: AR mode on device, 360° room viewer with gyro + hotspots, fallbacks, `?demo=1` | The headline features |
| **4** | Tours, Studio CRUD via Server Actions + upload + publish/revalidate, moderation, small RTK slice | Admin can run the museum |
| **5** | a11y, Vitest/Playwright, Lighthouse/Profiler, deploy, print cards, demo video, rehearse twice | Submitted |

**If you get extra time:** cardboard stereo, i18n (en/hi), offline PWA, analytics charts, MindAR tracking.

**Status (end of week 0):** AR placement verified on the Android demo phone. It works over HTTPS via WebXR; the Scene Viewer fallback does not work on that handset, so HTTPS is now part of the dev loop (`npm run dev:https`, `docs/HTTPS.md`). Design tokens live in `globals.css` (`@theme`), and `/spike/panorama` probes the equirectangular path the VR mode will need.

**Status (end of week 1):** home, collection grid, exhibit pages, 3D viewer + hotspots + the three material states, `/markers`, `/api/qr/[code]`, ISR via `generateStaticParams`, canonical metadata, JSON-LD, `sitemap.ts`, `robots.ts`, generated OG images. Gallery search/filter is **client-side over the prerendered grid** (URL-synced with `history.replaceState`) rather than the TanStack Query version in §10 — that version needs the `/api/v1` routes from week 2. Remaining: all of week 2.

**Cut order:** RTK slice → analytics charts → VR hotspots → iOS USDZ → tours → VR mode. 3D + AR survive every cut.

---

## 18. Progress log

Keep this section append-only: one entry per completed week, with what shipped,
what changed from the plan, and what the next week inherits.

### Week 0 — closed

- Next 16 app, Tailwind 4 tokens, Prisma 7 + libSQL, seeded catalogue (6 exhibits / 2 rooms / 2 tours).
- AR spike verified on the Android phone over HTTPS/WebXR. Scene Viewer hand-off confirmed broken on that handset → HTTPS is mandatory (`npm run dev:https`, `docs/HTTPS.md`).
- Added the other half of the week-0 spike: `/spike/panorama`, a draggable/gyro equirectangular probe with a runtime-drawn calibration card (no asset, no licence). Feeds week 3's `/rooms`.
- Extra dependencies installed early: `three` (+ types) for the recreation states; `zod` promoted to a direct dependency (`src/lib/env.ts` already imported it).

### Week 1 — closed

- **Gallery:** `/exhibits` stays static; filters (text, room, tag, has-3D) run in the browser over the prerendered grid. State is mirrored into `?q=&room=&tag=&model=1` so links are shareable; `popstate` re-applies them. No network per keystroke.
- **3D:** hotspot buttons are real `<button>` elements positioned by `model-viewer`, mirrored by a chip row under the viewer and an `aria-live` detail panel — keyboard users never depend on hitting a 3D target.
- **Reconstruction:** `three` scene with textured / clay / wireframe states, auto-rotating, normalised to one on-screen size, disposed on unmount.
- **SEO/ISR:** `generateStaticParams` + `revalidate = 60` on exhibit routes, canonical URLs, Twitter card, JSON-LD (`CreativeWork`), `sitemap.ts`, `robots.ts` (blocks `/studio`, `/api/`, `/spike`, `/markers`, `/x/`), generated OG image at `/` and per exhibit.
- **QR:** `/markers` renders SVG cards server-side; `/api/qr/[code]` returns a 1024 px PNG (`404` for unknown or unpublished codes); both resolve the Host header so LAN scans use the LAN address.
- Seed gained hotspots for all three modelled exhibits, positioned against the GLB bounds (metres, model origin at the floor of the bounding box) — the earlier Bidri hotspot sat off the surface.
- Not verified this week: real-device rendering of the new viewers, and a browser pass on the filter interaction. Both need the phone/HTTPS loop; everything else is covered by `next build` + HTTP checks.

### Week 2 — next

API routes (`/api/v1/*`), Better Auth + roles, middleware, `/scan`, `/passport` (Zustand + stamp sync), reviews (RHF + Zod, `useOptimistic`).

---

## 13. Demo kit (build week 1, not week 6)

- 6 A6 laminated cards: exhibit image, title, QR, short code.
- A "mini museum" on a desk: 3 physical objects matching 3 seeded exhibits — makes AR placement convincing on camera.
- 360° photo of that desk/room → VR Room 1.
- Phone stand or a second pair of hands; screen mirroring if available.
- Offline recording of every AR/VR beat.

---

## 14. Risks

| Risk | P | I | Mitigation |
|---|---|---|---|
| AR fails on demo phone | L | M | verified week 0 over HTTPS/WebXR; `canActivateAR` check; recording; Android-first |
| AR only works in a secure context | H | H | `npm run dev:https` with a mkcert cert + local CA installed on the phone (`docs/HTTPS.md`); deployed site is HTTPS anyway |
| Scene Viewer hand-off fails | H | M | do not depend on it — HTTPS makes model-viewer use WebXR inside Chrome |
| iOS USDZ missing | M | L | Android-only AR, stated openly |
| Venue wifi / no HTTPS | H | M | deployed HTTPS; cached pages; offline video; manual code entry |
| 3D assets too heavy | M | M | 3 models only, Draco/meshopt, lazy chunk |
| QR cards point at localhost | M | H | generate from `NEXT_PUBLIC_SITE_URL`, test-scan before printing |
| Scope creep | M | H | the plan above is fixed; Studio is the only "nice-to-have" |
| 3D/camera code crashes SSR | M | M | all WebGL behind `dynamic(..., { ssr:false })` |

---

## 15. Deliverables

1. Repo + `README` (setup in ≤5 commands) + seeded DB
2. `docs/ARCHITECTURE.md`, `CO-MATRIX.md`, `DEMO-SCRIPT.md`, `STATE-DECISIONS.md`, `PERF-NOTES.md`
3. Printable QR cards (PDF) + `/markers`
4. 3-minute demo video + live phone demo + physical kit
5. Production deploy + demo accounts
6. `/credits` licensing page

---

## 16. Fixed decisions

- One Next.js app, one deploy, one URL
- 6 exhibits, 2 rooms, 3 models, 1 panorama
- Fictional "Dharohar Museum"
- Two roles: VISITOR + ADMIN; guests browse anonymously
- Reviews: one per exhibit per visitor, admin-moderated
- Better Auth, Cloudinary, Neon, Vercel

---

## 17. Appendix — syllabus vs. added tech

### 17.1 Straight from the syllabus (nothing to justify)

React 19 · Next.js 16 App Router · Tailwind CSS · Zod · TanStack Query · Zustand · Redux Toolkit · Fetch API · RSC / Server Actions / Route Handlers · SSG / ISR / SSR · Middleware · `next/image` · Metadata API · `dynamic()` code splitting.

That's roughly 70% of the stack, including every item either syllabus names by name.

### 17.2 Domain tech — no syllabus equivalent (the project *is* this)

| Tech | What it does | Why not the alternative |
|---|---|---|
| `@google/model-viewer` 4.4 | Renders GLB, hotspots, material swap, **one-tap AR** via ARCore/Quick Look | Hand-rolled WebXR = weeks; 8th Wall = paid license |
| `three` + `@react-three/fiber` + `drei` | 360° panorama sphere, gyro look, stereo | Could use `photo-sphere-viewer` (vanilla, ~20 lines) — swap if r3f fights you |
| `qrcode` | Generates exhibit QR PNGs server-side | Writing a QR encoder is a maths project, not a web one |
| `qr-scanner` | Reads QR from the camera in `/scan` | `@zxing/browser` works but ships a much bigger bundle |
| Cloudinary | Stores/hosts admin-uploaded images, audio, GLB; on-the-fly resizing | Serverless has no disk; Vercel Blob has no transforms |

These five are what make it an AR museum project instead of a CRUD app. Expect viva questions — each has a one-line answer above.

### 17.3 Engineering choices — concept in the syllabus, tool is mine

| Tech | Syllabus says | Why this one | Keep? |
|---|---|---|---|
| **TypeScript** | *(not mentioned)* | Type-safe props/state, and Zod schemas infer types for free — otherwise you hand-write everything twice | Keep. Biggest "extra", but it's what makes the rest safe |
| **Prisma** | "ORM Basics" | Schema-first, generated client, one-line switch SQLite → Postgres, migrations | Keep |
| **Better Auth** | "Authentication, Session Management" | Stable on Next 16 (NextAuth v5 is still beta), hashed passwords + sessions done properly | Keep |
| **React Hook Form** | "Controlled/uncontrolled, form state patterns" | Fewer re-renders, `zodResolver` integration. Build one small form by hand too, so the syllabus concept is visible in code | Keep |
| **Radix primitives** | "Accessibility fundamentals" | Keyboard/focus/ARIA behaviour for dialogs, tabs, popovers without hand-rolling it | Optional — native `<dialog>` can replace it |
| **Vitest + RTL** | *(INT257: "Testing Overview")* | Fast, Vite-native, tests hooks/schemas cheaply | Keep (cheap) |
| **Playwright + MSW** | "Testing Overview" | 3 end-to-end flows; MSW only exists to serve Playwright | Optional — drop if week 5 is tight |
| **Neon (Postgres)** | "Database Connectivity" | Free serverless Postgres, works with Prisma out of the box | Keep |
| **Vercel** | "Deployment Platforms" | Zero-config Next; ISR and route handlers behave as developed | Keep |

### 17.4 Deliberately not used

| Dropped | Replaced by | Why |
|---|---|---|
| Vite + `react-router` | Next.js App Router | Single-app decision. **The one genuine syllabus gap** — state it in the report |
| Axios | `fetch` | The syllabus allows either; one less dependency |
| NextAuth / Auth.js v5 | Better Auth | v5 still beta on Next 16 |
| Redux Toolkit (full app state) | Zustand + Context | RTK only where it earns it (tour-builder undo). The comparison itself is graded |

### 17.5 If you want a smaller stack

Remove in this order — nothing below is load-bearing:
1. Radix → native elements
2. Playwright + MSW → manual testing
3. React Hook Form → hand-written controlled forms (more code, more visible to the examiner)
4. `@react-three/fiber` → `photo-sphere-viewer`

Never remove: Prisma, Better Auth, Cloudinary, model-viewer. Each replaces days of work or a security hole.

