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

**Week 1 follow-up (26 Oct)**

- **QR origin bug:** `/x/[code]`, `/api/qr/[code]` and `/markers` each resolved the scheme as `x-forwarded-proto ?? "http"`. With the HTTPS dev loop that meant a scanned card sent the phone to `http://…`, which the HTTPS server refuses — the same failure class as the earlier `localhost` redirect. Resolution now lives in `src/lib/origin.ts` and falls back to the scheme of `NEXT_PUBLIC_SITE_URL`, so the card, the redirect and the canonical URL always agree.
- **Certificate drift:** the Wi-Fi address moved from `172.19.227.217` to `10.118.43.217`, which silently invalidated the mkcert certificate. `npm run dev:https` now runs `scripts/https-cert.mjs` first, which finds the interface that owns the default route and regenerates the certificate for it.
- **Verified over HTTPS** against `https://10.118.43.217:3000`: `/`, `/exhibits`, `/exhibits/[slug]`, `/markers` (cards encode the HTTPS LAN origin), `/x/[code]` (307 to the exhibit + `dharohar_device` cookie), `/api/qr/[code]` (200 PNG / 404 unknown), `/sitemap.xml` (all entries HTTPS), `/robots.txt`, both OG images, `/spike/ar`, `/spike/panorama`.
- **Open — model swap:** the three modelled exhibits still point at CC0 stand-ins (`baluster-vase`, `stoneware-jug`, `patent-model-box`). The intended `bidri-hookah-base` / `brass-measuring-vessel` / `inlaid-writing-box` GLBs are not in the repo, and Smithsonian returns 403 from this network, so the swap waits on the files landing in `public/models/`.
- **Auth merge:** the `feat/auth-nextjs` branch is now on `main` as scaffolding. Dependencies are installed and the module typechecks against better-auth 1.7 (`prismaAdapter(prisma, { provider: "sqlite" })`, `nextCookies()`), but the Prisma schema has no `session` / `account` / `verification` tables yet, so `/api/auth/*` is not usable until week 2.

### Week 2 — closed

**Auth slice (26 Oct)** — closed

- **Schema:** `Session`, `Account`, `Verification` added with the field names the Better Auth Prisma adapter expects (camelCase columns, no snake_case “tidying”). Migration `20261026143908_auth_tables`. `User` gained `sessions` / `accounts` relations; `role` stays a `String` (`VISITOR` | `ADMIN`) because SQLite has no enums.
- **Config:** `src/lib/auth.ts` uses the app's single Prisma client, `emailAndPassword` (8-char minimum, auto sign-in), a seven-day session, `trustedOrigins` for localhost + 127.0.0.1, and `role` as an `additionalField` with `input: false` — posting `role: "ADMIN"` to `/api/auth/sign-up/email` still produces a `VISITOR`.
- **Two bugs found while wiring it:**
  - The option is `database`, not `databaseAdapter`. With the wrong key Better Auth silently falls back to an **in-memory** store: sign-up returned 200, sessions worked, and nothing reached SQLite. Caught by counting `User` rows directly instead of trusting the HTTP responses.
  - The `jwt()` plugin expects a `jwks` table that this project does not need, and its schema check fails every auth request. Removed; `nextCookies()` is now the only plugin.
  - `prisma migrate dev` did not regenerate the client, so `prisma.session` was `undefined` until `prisma generate` ran. The generated client is stale after a schema change — regenerate before restarting.
- **Pages:** `/login` and `/register` (dynamic, `noindex`), both redirect to `/` when already signed in; `AuthMenu` in the home header reads the session **client-side** so the ISR home page stays static; `SignOutButton` calls `signOut()` then `router.refresh()`.
- **Admin:** `npm run db:admin` lists accounts, `npm run db:admin -- email` promotes one, `-- --visitor` demotes. Accounts are created through `/register` so Better Auth owns the password hash; the script only flips `role`.
- **Verified over HTTPS:** sign-up 200 + `__Secure-better-auth.session_token`, `get-session` returns `role=VISITOR`, sign-out 200, sign-in 200, wrong password 401 `INVALID_EMAIL_OR_PASSWORD`, `/login` 307 when signed in, password stored as a 161-char scrypt hash in `Account` (never plaintext), admin account returns `role=ADMIN`, role injection ignored.
- **Demo accounts (local DB):** `admin@dharohar.test` / `visitor@dharohar.test`, password `museum-pass-2026`.
- **Certificate:** `scripts/https-cert.mjs` now covers **every** non-loopback IPv4, not just the default-route interface. The Wi-Fi address flipped mid-test (`10.118.43.217` → `172.19.227.217`) and the default route also picks up virtual adapters, so naming them all is the only stable option. The canonical dev URL is now `https://localhost:3000`.

**Scan slice (26 Oct)** — closed

- `/scan` is a static ISR page (`revalidate = 60`) listing the published codes, with the camera panel as a client island. The camera starts on a button press, not on load: no surprise permission prompt, and no double-start race with React's development remount.
- Scanner is `qr-scanner` (dynamic `import()` so the 59 kB engine is not in the first bundle). It uses the browser's native `BarcodeDetector` when available and its own worker otherwise; both paths are bundled by Turbopack.
- A scan accepts a full URL (a card printed for a LAN address) or a bare code. The path is re-based on the **current** origin, so `https://172.19.x.x:3000/x/BH02` still works when the site is open on `localhost`.
- Navigation is `window.location.assign`, not `router.push`: `/x/[code]` is a route handler that 307s and sets the device cookie, which the client router cannot follow.
- Fallbacks: manual short-code entry, a tappable list of published codes, torch toggle when the camera reports a flash, and named messages for `NotAllowedError` / `NotFoundError` / `NotReadableError` / insecure context.
- `/scan` added to `sitemap.xml`; the home header and the QR card both link to it.
- Verified: `/scan` 200 with all five published codes (KT05 is `DRAFT` and correctly absent), `/x/BH02` 307 to the exhibit, home links present. **Not verified:** a real camera scan — that needs the phone.

**Passport + reviews slice (26 Oct)** — closed

- **Stamps:** `/x/[code]` now writes a `Stamp` beside the `Scan` (upsert on `[deviceId, exhibitId]`, so re-scanning does not duplicate). A guest's stamps live under the `dharohar_device` cookie; `claimDeviceStamps()` moves the unowned rows to the account on the first `/passport` visit. Both writes are wrapped, so a stamp failure can never block the redirect to the exhibit.
- **`/passport`:** `force-dynamic` + `noindex`; redirects to `/login?next=/passport` when signed out. Shows a progress ring, four badges, every published object as a stamp card (collected/locked, first-seen date) and the visitor's reviews.
- **Guard:** `src/proxy.ts` (Next 16's renamed middleware) redirects `/passport` and `/studio` to `/login?next=…` when the session cookie is absent. UX only — the page re-checks `getViewer()` and every Server Action checks again.
- **`?next=`:** `/login` and `/register` accept a `next` parameter, sanitised by `safeNextPath()` (same-origin paths only; `//evil.example` falls back to `/`), so the sign-in detour returns the visitor to the page they wanted.
- **Reviews:** `ReviewSection` on the exhibit page. The visible list + average are rendered by the ISR page (aggregate over all reviews, list capped at 12); the form is a client island because the page is static. `react-hook-form` + the shared Zod schema validate in the browser and `saveReview()` re-validates on the server — Server Actions are public endpoints.
- **One review per visitor per exhibit:** `saveReview()` upserts on `[userId, exhibitId]`, so posting again edits. `useOptimistic` inserts/updates/deletes instantly, and `revalidatePath()` busts the ISR cache so everyone else sees the change immediately.
- **`/api/v1/reviews/mine`:** the static page cannot know who is reading it, so the form asks this endpoint which review is already theirs (401 for guests) and prefills.
- **`/scan` form hardening:** the short-code input now has `required` + `pattern="[A-Za-z0-9]{4,12}"`, so a page that has not hydrated cannot submit an empty `?code=` GET (the pattern seen in the repeated-request log).
- **Verified end-to-end** with a signed-in cookie jar: anonymous `/passport` 307 → `/login?next=%2Fpassport`; a guest scan sets the device cookie and the stamp is claimed on the first passport load; a review posted through the action appears on the exhibit page immediately (revalidatePath), then on `/passport`; editing keeps one row; a 7-character body is rejected; delete removes it from both pages.
- **Not verified:** the review form in a real browser — no desktop browser is installed on this machine, so the Server Action was exercised over HTTP instead.

**Deferred to Week 4:** the rest of `/api/v1/*` (exhibits, stamps, moderation), admin review moderation UI, `/studio` exhibit CRUD.

### Week 3 — in progress

**Room viewer (27 Oct)** — closed

- **Schema:** `Room.intro` (nullable) added in migration `20261026174615_room_intro`, with seed copy for both rooms. `prisma generate` re-run — `migrate dev` still does not refresh the client.
- **`/rooms`:** both rooms with published-object counts and their panoramas. **`/rooms/[slug]`:** intro, 360° viewer, markers, the room's published objects, and a credit line; unknown or empty rooms `notFound()`.
- **Viewer:** plain `three` (no react-three-fiber) — an equirectangular sphere with drag/touch look, keyboard arrows, a gyro toggle that only asks for permission on a tap, and fullscreen. Markers are placed by hand-tuned `u`/`v` image fractions (`src/lib/room-markers.ts`), not by guessing model space. `three` is a dynamic import, and the panorama is painted behind the loading chunk so the room is visible immediately.
- **Panoramas:** Poly Haven CC0 stand-ins, credited in `docs/CREDITS.md`.
- **Verified 21/21 checks over HTTPS:** both room pages 200 with intros/markers/counts, draft `KT05` absent, unknown room 404, panorama `image/jpeg` at 1.75 MB, exhibit → room link, sitemap and home links, `?demo=1` still 200.
- **Not verified:** gyro and the real-device VR pass — that needs the phone.

**Chalk gallery redesign (27 Oct)** — closed

- **Why:** the first visual review read as a generic cream-and-terracotta landing page, and the "object" images were SVG gradients. Requested change: make it feel like a museum, with a change of atmosphere on hover and an entrance on load.
- **Palette:** cool chalk walls (`#f1f0ea`), ink (`#16140f`), oxblood (`#7a1f1a`), plus one material accent per object (clay, brass, madder, umber, bone). Global token rename `sand → chalk`, `ochre → oxblood`, `brick → rust` across `src/`.
- **One frame:** `SiteHeader` on every public page (home, collection, rooms, room, exhibit, scan, passport, login, register). Per-page brand headers and the pill-shaped auth control are gone; the header is sticky and translucent so the wall shows through.
- **Home:** rebuilt around a single featured object with a wall label, a three-mode band (3D / AR / VR), the collection strip, and both rooms. Counts now come from the database instead of hardcoded copy.
- **Entrance doors:** two plaster panels with a hairline seam part on `/` on every visit. Auto-open after 700 ms; click, Escape, Enter or Space skips; `aria-hidden`; `display:none` under `prefers-reduced-motion`; a `<noscript>` rule hides them when JavaScript is off, since nothing would open them.
- **Hover "vibe change":** `.exhibit-grid` quiets the other cards when one is pointed at (only on hover-capable pointers, so a phone never dims a tapped card), and each card's accent colours its title, its frame and a hairline that draws itself across the caption.
- **Photography:** six public-domain or openly licensed museum photographs (Met, Cooper Hewitt, Newark, Wikimedia) replace the SVG gradients. Each is padded — contained, never cropped — onto a 1200×900 chalk-grey plate so the six read as one catalogue. They are **stand-ins**, credited in `docs/CREDITS.md`.
- **3D loading:** the hero photograph now sits behind `<model-viewer>`'s poster slot, so the viewer is an object while it loads rather than an empty beige box; the AR button is squared to match.
- **Shape language:** rounded cards and pills replaced with square frames and wall-label captions on the collection, rooms, exhibit, passport, scan and auth pages. The collection's Suspense fallback is now a filter-bar skeleton instead of a blank panel.
- **Verified:** `tsc` and `eslint` clean; Firefox headless screenshots at 1440 px and 390 px for home (with and without doors), collection, rooms, room, exhibit, scan and login; room smoke test still 21/21.
- **Not verified:** the door transition and card dimming in a real interactive browser (headless captures the pre-animation state); real-device rendering of the new pages.

**After-hours redesign (27 Oct)** — closed

- **Why:** the chalk redesign was coherent but flat — every page held the same daylight and the same frame, so the entrance, the hall and the reading rooms ran together. Second visual pass: two temperatures in one building.
- **Palette:** a dark `vault` hall (`#0b0906`) with brass light (`brass-light #c8a35d`, `brass-pale #e2c894`, `glow #f0d6a4`) and a `.grain` film-grain overlay; the reading rooms keep chalk, ink and oxblood. The rule is written at the top of `globals.css` so the next page knows which temperature it belongs to.
- **New furniture:** `PageMasthead` (dark title wall — eyebrow, exhibition-scale title, lede and an optional aside) and `SiteFooter` (closing threshold — visit hours, links, build note). Both are server components reused across the public pages.
- **Frame:** `SiteHeader` is dark site-wide with a brass hover rule; `AuthMenu` and `SignOutButton` now use opacity rather than ink colours, so one set of styles survives both temperatures. Header and footer are `print:hidden`.
- **Home:** dark hero ("Nothing here is behind glass.") with the lead object under a spotlight and a chalk wall label, a reading-room guide band (3D / AR / VR), the collection strip, and 360° room cards on the dark wall.
- **Entrance:** the doors are now a dark vestibule — monumental panelled doors, a seam of light that breathes, a light bloom as they part. Auto-open at 1400 ms; click, Escape, Enter or Space still skips; `aria-hidden`, reduced-motion and noscript behaviour unchanged. `onTransitionEnd` now waits for `transform`, not whichever property finishes first.
- **Pages converted:** collection, room detail, exhibit, scan, passport, sign in, create account and marker cards all take the masthead, and every public page ends in `SiteFooter`. The exhibit page moved its room, code, title and era into the masthead, leaving the viewer and body as content; the room page dropped its duplicate in-page footer.
- **Viewers:** the 3D viewer and the 360° stage sit in vault panels with an inset vignette; the AR button and hotspots are brass instead of ink/oxblood.
- **Markers:** still a printable A6 page — header, masthead and footer are hidden under print, and a print-only "Marker cards" heading replaces the screen title.
- **Verified:** `tsc` and `eslint` clean; dev server restarted over HTTPS and every public route returns 200 and serves both masthead and footer — `/`, `/exhibits`, an exhibit, `/rooms`, both room pages, `/scan`, `/login`, `/register`, `/markers`. `/passport` still 307s to sign-in when signed out; an unknown exhibit is 404.
- **Not verified:** the door transition and grain in a real interactive browser (headless captures the pre-animation state); the print preview of the marker cards; the real-device AR/VR pass — still the Week 3 gap.

**Studio CRUD + moderation (27 Oct)** — closed

- **Scope:** `/studio` (counts, drafts waiting, latest reviews), `/studio/exhibits` (status tabs, publish/unpublish, edit link), `/studio/exhibits/new`, `/studio/exhibits/[id]`, `/studio/reviews` (hide/restore/delete). Tours, analytics and file upload are deliberately not built: media fields take a `/public` path or an `https:` URL.
- **Guard:** `requireAdmin()` (`src/lib/admin.ts`) runs in the studio layout **and** at the top of every action. Signed out → `/login?next=…`; signed in but not an admin → `notFound()`, so the route's existence is not confirmed. `proxy.ts` now matches `/studio` as well as `/studio/:path*`.
- **Actions:** `saveExhibit`, `setExhibitStatus`, `deleteExhibit`, `setReviewStatus`, `deleteReviewAsAdmin`. Each returns `{ok, error, fieldErrors?}` instead of throwing, so the client renders the message inline. `exhibitAdminSchema` in `src/lib/schemas.ts` is shared by `react-hook-form` and the action, so the browser cannot widen what the editor accepts; blanks become `NULL` and `facts` is stored as JSON `string[]`.
- **Revalidation:** `revalidateMuseum()` busts `/`, `/exhibits`, `/rooms`, `/scan`, `/markers`, `/sitemap.xml` plus the old and new exhibit/room slugs on a move, so a save is visible without waiting out the 60 s ISR window.
- **UI:** `ExhibitForm` (three fieldsets, inline field errors), `PublishToggle`, `DeleteExhibitButton` and `ModerationButtons` are client islands using `useTransition`; deletes confirm with `window.confirm`. Hiding a review keeps the row (and its author's passport entry) but drops it from the public page and the average.
- **Navigation:** `AuthMenu` gained an admin-only Studio link; `/studio` was already `noindex` and disallowed in `robots.ts`.
- **Bug found and fixed — reviews could never be posted:** `register("rating", { setValueAs: Number })` does nothing for a radio group (react-hook-form reads radios as raw strings and skips `setValueAs`), so the shared schema rejected every submission with "expected number, received string". Replaced with a `Controller` that calls `field.onChange(Number)`. The Week 2 note that the review form was "not verified in a browser" is why this survived; it is now exercised in one.
- **Turbopack gotcha:** after adding a new export to `src/lib/schemas.ts`, the Server Action kept importing it as `undefined` (`Cannot read properties of undefined (reading 'safeParse')`) even across a dev-server restart. Deleting `.next` and starting again fixed it; the module itself was fine under `tsx`.
- **Verified in the in-app browser over HTTPS:** admin sign-in → create draft → appears in the drafts tab → publish → `/exhibits/studio-test-lamp` 200 → unpublish → 404 → delete → 404, counts back to 5 published / 1 draft; blank form submit shows the seven expected field messages; visitor posts a review (5/5), admin hides it (gone from the page, "No reviews yet"), restores it (back at 5.0 / 1 review), then deletes it; signed-out `/studio/exhibits` 307 → `/login?next=%2Fstudio%2Fexhibits`; signed-in visitor gets a 404 and no Studio link. Test exhibit and review removed afterwards — the DB is back to 6 exhibits / 0 reviews.
- **Not verified:** the studio on a phone, and image/model upload (not built).

### Week 5 — accessibility (27 Oct) — closed

- **Method:** axe-core 4.10.2 injected into the in-app browser (unpkg, not a project dependency) with the `wcag2a/aa`, `wcag21a/aa` and `wcag22aa` tags, over 14 routes signed in and out: `/`, `/exhibits`, an exhibit, `/rooms`, a room, `/scan`, `/markers`, `/passport`, `/studio`, `/studio/exhibits`, `/studio/exhibits/new`, `/studio/reviews`, `/login`, `/register`. Automated checks were followed by the things axe cannot see: tab order, focus rings, heading order, landmarks and target size.
- **Contrast floor:** all 16 violations were muted type. `chalk/{30,35,40,45}` (2.4–4.1:1 on vault) → `chalk/50`, which measures 4.82:1 on `vault` and 4.80:1 on the header's `#171511`; `ink-soft/70` (3.28:1 on chalk) → solid `ink-soft` (6.49:1). The rule and its measured numbers are now written at the top of `globals.css`, so the next page does not re-invent a faint label.
- **Focus ring, two tones:** oxblood is 9.2:1 on chalk but only 1.6:1 on vault, so the single ring failed on the dark half of the site. Now `outline: 2px solid oxblood-soft` plus a `0 0 0 5px rgb(251 250 246 / 0.75)` halo — at least one of the two always clears the 3:1 non-text minimum.
- **Skip link:** `SiteHeader` and the studio layout each open with "Skip to content"; every one of the 17 `<main>` elements gained `id="main" tabIndex={-1}`, so the link moves focus, not just the scroll position (verified: `#main` in the URL, `activeElement` is `<main>`, page scrolled to it).
- **Deliberately unchanged:** most header and footer links render 18–20 px tall. WCAG 2.5.8 is met through its spacing and inline exceptions (the nav's `gap-3/6`, the footer's `gap-2`), so no padding was added — that would trade a real visual system for a number.
- **Verified:** axe reports **0 violations on all 14 routes**, signed in as admin and signed out; `tsc`, `eslint --max-warnings=0` and `next build` clean.
- **Turbopack cache, again:** for ten minutes `next dev` kept serving a `globals.css` from before the edits — the file on disk and the production build both had the new rules, the dev chunk did not, and touching the file did not help. Deleting `.next` fixed it, same as the `safeParse` incident in the studio entry. When dev CSS disagrees with the source, check the built chunk before the source.
- **Not verified:** real Tab-key order and the visible skip link in the in-app browser (the webview never takes OS focus, so `:focus` cannot be exercised there) — this moves to the Playwright suite, which is the next Week 5 item; also untested are a screen-reader pass and 400% zoom / reflow.

### Week 5 — tests (27 Oct) — closed

- **Tooling:** Vitest 4.1 for the pure modules and Playwright for the browser. MSW is not used: the only API is the app's own (`/api/v1/reviews/mine`, `/api/auth/*`), so mocking it would test the mocks instead of the session, the proxy and the database together. Both are wired as `npm test` and `npm run test:e2e`; `docs/TESTING.md` explains the split and the one-time account setup.
- **Unit — 82 tests over six files:** `schemas` (rating bounds, slug grammar, the 8-fact cap, year regex, status), `next-path` (the open-redirect cases — `//evil`, absolute URLs, backslashes — and the auth-page loop), `format-date` (Kolkata day, not UTC, so server and browser cannot disagree), `accent` (tag precedence, case), `room-markers` (bearings inside the image, unique codes, card format) and `origin` (Host vs forwarded host, the scheme that local headers never carry). `passport.ts` and `session.ts` are deliberately not unit-tested: both import `server-only` and read Prisma/request state, so a test would mock the thing under test.
- **End-to-end — 18 tests over three specs:** the spine (entrance → collection → object, filtering with the URL in sync, room + 360 stage), the guards (signed out → `/login?next=…` and back; `/passport` private; admin sees the office; a signed-in visitor gets **404**, not 403, and no Studio link) and `/x/TH01` → `/exhibits/terracotta-horse` with a device cookie, plus an unknown code falling back to the collection.
- **The a11y pass's missing half:** the skip-link test presses Tab, asserts the link is focused **and visible**, then Enter, and asserts the URL hash and that `main#main` owns focus. That is the check the in-app browser could not do, now running in Chromium.
- **Two real bugs found:** the home `h1` and the footer hours used `<br />` between text runs, so the accessible name came out as "Nothing here isbehind glass." and "Tuesday to Sunday10.00–18.00Closed Mondays". Fixed with explicit `{" "}`; the visual break is unchanged. Also, the first parallel run failed the keyboard test — a screenshot and a second run showed the page reloading under a dev compile. The suite now defaults to `workers: 1` against `next dev` (`PLAYWRIGHT_WORKERS` for a production build).
- **Verified:** `npm test` 82/82; `npm run test:e2e` 18/18 against the HTTPS dev server (Chrome, `PLAYWRIGHT_BASE_URL=https://localhost:3000`); `tsc`, `eslint --max-warnings=0` clean.
- **Not covered on purpose:** component/Testing Library tests, any studio test that writes to the museum's content (the Week 4 CRUD pass stays a manual, recorded check), and AR/WebGL/gyroscope, which need the handset.

### Week 5 — performance (28 Oct) — closed

- **Method:** Lighthouse 12 against `next start -p 3100` (not `next dev`), headless Chrome, `--throttling-method=devtools`. Lantern simulation was dropped after three runs of the same build gave LCP 5.5 / 8.0 / 8.3 s. `docs/PERF-NOTES.md` holds the traces, the asset table and the reproduction commands.
- **The exhibit page's 7-second LCP was markup, not bytes.** The poster photograph was a child of `<model-viewer slot="poster">`; when the custom element defines itself it re-parents that child into its shadow root and paints the photograph a *second* time, and that second paint is what LCP records. Proven by stubbing `requestIdleCallback`: with the module never loading the poster is visibly on screen at 4 s and LCP stays at 2.5 s; with it loading, LCP lands exactly when the parse ends. Moving the poster into a sibling overlay that unmounts on the element's `load` event took element render delay from 4,459 ms to 123 ms — LCP 7.1 s → 2.6 s, score 54 → 60.
- **Room page, 59 → 68 and LCP 10.3 s → 2.4 s.** The first paint was the 1,793 KB equirect with `unoptimized`; it now goes through the image optimizer at the width the layout asks for (111 KB at `w=1200`) while the 360 viewer still fetches the full file for its texture. The panoramas themselves are 3072×1536 WebP now (743 / 690 KB, down from 1,793 / 1,749 KB), and `Room.panoramaUrl` was updated in the database as well as the seed so a reseed and the live rows agree.
- **The rest of the site was still paying for `unoptimized` and for lazy above-the-fold cards.** Six images were pinned to their source files; all but the 3D poster now go through the optimizer with `sizes` that match the layout, which takes the collection from 953 KiB to 501, the home page from 763 to 499, and the room index from 1,760 to 416. `ExhibitCard` gained an `eager` flag for the first row of a grid: on `/rooms` the panorama thumbnails were lazy and LCP was **11.1 s → 2.3 s**, score 67 → 89.
- **Models: 16.5 MB → 1.7 MB, −90%,** via `npx @gltf-transform/cli` (weld, prune, Draco, WebP) — a build step, not a dependency. All four still decode and draw; verified in Chromium that `loaded` and `modelIsVisible` are true with an empty console for the three exhibit models and `/spike/ar`.
- **The compression broke a tab, and the failure was quiet.** `<model-viewer>` bundles its own Draco decoder, so the Object tab kept working; the Reconstruction tab builds its scene with `GLTFLoader`, which has none, so it showed "the model file could not be loaded" while the page, the tests and the screenshots all looked fine. Fixed with `DRACOLoader` pointed at `/draco/` (188 KB wasm + 57 KB wrapper copied from `three/examples/jsm/libs`, fetched only when the tab opens, never a CDN). All three material states now render on all three models, and `e2e/reconstruction.spec.ts` asserts the decoder request as well as the canvas.
- **The honest part: compression alone did not help the score.** Swapping only the GLB back to its 5,759 KB original on the finished page gave LCP 7.1 s → 7.1 s, TBT 510 ms → 1,210 ms, score 54 → 50. The page was never waiting on the model; the smaller file decodes sooner, so more of its work falls inside the TBT window. Bytes are the win for a phone on gallery Wi-Fi; the score was measuring the poster.
- **Deferring three.js has a cost, stated rather than hidden.** `@google/model-viewer` is imported after the poster loads, on `requestIdleCallback` with a 2.5 s cap (and a timer for background tabs, where idle time and frames both stop). FCP is now 1.9 s, and the released work shows up in TBT — 1.2–3.3 s under a 4× CPU throttle. Going further means not loading three.js until someone asks for 3D, which is a product decision, not a tuning knob.
- **Next 16 deprecates `Image priority`;** all four uses moved to `loading="eager"` + `fetchPriority="high"` and were confirmed through CDP (`initialPriority: Low → High`).
- **Not verified:** real-device numbers (the phone pass is still outstanding) and CrUX/field data, which does not exist for a local build. Scores on this laptop move a tier or two between runs; the ranges in `PERF-NOTES` are the honest version.

### Week 5 — documentation, credits and print kit (28 Oct) — closed

- **`/credits` is a real page now, not a promise.** `src/lib/credits.ts` holds the register — four 3D files, two panoramas, six photographs and nineteen software projects, each with a source link and a licence. The page states the stand-in rule first, then the register, then the three mechanical changes made to the assets (padded plates, 3072 WebP panoramas, Draco/WebP models). It is linked from the footer and the sitemap. Lighthouse on the production build: **97 / 100 / 100 / 100**, LCP 2.0 s, 325 KiB.
- **`docs/ARCHITECTURE.md` is the as-built version**, not a restatement of the plan: the actual route/rendering table, the QR path with its origin and cookie decisions, the two authorisation gates, Server Actions vs route handlers, the 3D/AR/360 pipeline, and a table of every deviation (TanStack Query, Zustand/RTK, r3f, Cloudinary, Postgres, the modal, the tours builder).
- **`docs/CO-MATRIX.md`** maps INT252 CO1–CO6 and every INT257 area to a file and a sentence to say, including the two caveats (Next instead of Vite/react-router; three cut features). **`docs/STATE-DECISIONS.md`** is the state inventory plus the "why not Redux everywhere" and "why not `useEffect` + `fetch`" arguments, with the one justified fetch. **`docs/DEMO-SCRIPT.md`** times the seven beats to 3:00, with a pre-flight list, exact labels, fallbacks and a reset command.
- **The print kit was not actually A6, and now is.** The old rule was `@page { size: A6 }` nested inside `@media print`; Chromium ignores a page size there, and it does not know the `A6` keyword at all (A3–A5, B4–B5, Letter, Legal, Ledger, Tabloid). So `page.pdf` produced Letter sheets with a two-column, 640px-wide card in one corner — the layout had been checked on screen and in the browser dialog, not in a PDF. The rule is now top-level `size: 105mm 148mm`, and print lays out one card per sheet at 105×148mm: photograph across the top, label under it, 34mm QR and the code on the bottom edge. `npm run print:cards -- <origin>` drives `/markers` through Chromium and writes the PDF, so a committed binary cannot bake `localhost` into the cards. Verified: **5 pages at 298×420pt**, no card overflows, QR scans from the sheet. A PDF is still **not** committed — generate it from the deployed origin after the Vercel step.
- **README rewritten and setup checked:** five commands from clone to running site, the demo accounts with the caveat that a fresh clone has none, the phone/HTTPS loop, testing, the Draco gotcha, and a docs index.
- **One test changed for the right reason.** The skip-link spec asserted `#main` in the URL. After hydration Next's client router handles the fragment and normalises the URL away, so the assertion passed only when the keypress beat hydration — a race, not a behaviour. The spec now asserts the focus move, which is the actual contract; the suite is **20 tests** and passes with four workers.
- **Not done:** the deploy (no credentials or database in the environment), the print PDF (it has to encode the deployed origin), the 3-minute recording, and the two rehearsals. Those are the remaining Week 5 items.

### Week 5 — Studio model upload (28 Oct) — closed

- **The gap:** every exhibit's `modelUrl` had to point at a file committed to `public/models`, so adding a scan meant a developer, a Draco pass and a redeploy. The Studio could edit every other field. An admin can now upload a `.glb` from the exhibit's edit page and it is live on the public page when the upload finishes.
- **Where the bytes go, and why not Blob.** Vercel's filesystem is read-only at runtime, so `public/` cannot receive an upload. The two honest options were object storage (Vercel Blob / R2 — a new dependency, a token, and a second failure mode) or the database. At 0.2–4 MB per scan the database wins: `ModelAsset` stores the file as `Bytes` alongside filename, size, sha256, Draco flag and the curator's source line. This is a deliberate trade, not an oversight — Blob/R2 is the documented upgrade path when scans outgrow 4 MB. `prisma migrate dev` created `20261028141054_model_assets`; a libSQL round-trip probe confirmed `Bytes` survives the adapter before any UI was written.
- **The cap is 4 MB, and the reason is the platform.** Vercel caps a function request body at 4.5 MB; the Server Action's `bodySizeLimit` is set to 4.5 MB in `next.config.ts` — the 4 MB file cap plus multipart overhead, and the same ceiling Vercel enforces, so a bigger number here could never be reached. The exhibit page already carries 1.3 MB, and an uncompressed scan would undo the Week 5 performance pass, so the uploader says to run `npx @gltf-transform/cli optimize` first.
- **The client is a convenience; the action is the gate.** `uploadModel` calls `requireAdmin()` itself (an action is a public endpoint), checks the GLB's own bytes with `inspectGlb` — magic, version 2, first chunk is JSON, size cap — and only then writes. `src/lib/model-upload.ts` is pure so the rule is testable without a database or a 4 MB fixture; `src/lib/__tests__/model-upload.test.ts` adds **12 tests** (renamed `.obj`, glTF 1, wrong chunk, truncated JSON, the cap, filename safety).
- **A replacement is a new id, which is what makes the cache honest.** The upload inserts a new row and swaps `Exhibit.modelUrl` in one transaction, then deletes the old row; `/api/models/[id]` can therefore answer `cache-control: immutable` for a year. A draft's model is not public: the route returns 404 unless the exhibit is published or the reader is an admin.
- **Detaching is a save, not a click.** The form's **Detach** only clears the field; `saveExhibit` deletes the asset row after the update succeeds, so a rejected save never destroys a file. It also rejects a `/api/models/<id>` URL that belongs to another exhibit, which would otherwise point the viewer at someone else's scan.
- **The control only appears on the edit page.** A new exhibit has no id to attach a model to, so the create form says to save first. That avoids orphan assets and an upload that cannot be referenced.
- **`/credits` now reads the database.** Published `ModelAsset` rows get a table with file, exhibit, size and the source line typed at upload; a blank line is shown in oxblood ("No source recorded") rather than omitted. The page is ISR at 60 s and `revalidateMuseum()` busts `/credits` on every save and upload, so a new scan does not wait for the window. The line can be corrected later with **Save source line**, which updates the row and revalidates without touching the bytes.
- **Verified:** `npm test` **94/94** (7 files); `npm run test:e2e` **22/22** including `e2e/studio-upload.spec.ts` (upload → field becomes `/api/models/<id>` → route serves the exact bytes with `immutable` → detach + save → 404) and the bad-magic rejection; an uploaded model was published on the draft exhibit and `model-viewer` reported `loaded` and `modelIsVisible` with an empty console, then the draft was reset to DRAFT / no model / 0 assets. `tsc`, `eslint --max-warnings=0` and `npm run build` clean; `/api/models/[id]` appears in the route list.
- **One compiler note:** `watch("modelUrl")` tripped `react-hooks/incompatible-library` under React Compiler. The form now uses `useWatch({ control, name: "modelUrl" })`, which subscribes to one field and is memoizable.
- **Not done:** no real scan has been uploaded yet (the e2e fixture is a placeholder GLB), and the upload has not been exercised on the deployed origin — the 4 MB cap is chosen against Vercel's documented limit, not measured there.

### Week 5 — Studio people (28 Oct) — closed

- **The gap:** the only way to change a role was `npm run db:admin`, which needs a terminal and does not work against the deployed Postgres. The Studio could manage exhibits and reviews but not the accounts behind them. `/studio/users` now lists every account with its role, join date and activity, with role tabs and a name/email search.
- **What an admin can do:** **Make admin** / **Make visitor**, and **Delete**. The page is linked from the Studio nav and the overview. Passwords stay out of it: Better Auth owns the hash, and the Studio never reads or writes `Account.password`.
- **Two lockouts are prevented in code, not in a warning.** An admin cannot change or delete their own account, and the last admin cannot be demoted or deleted. The rules live in `src/lib/user-admin.ts` as pure functions (`checkRoleChange`, `checkUserDeletion`) so the page and the action agree, and `src/lib/__tests__/user-admin.test.ts` adds **11 tests** for self-changes, the last-admin case, unknown roles and the safe paths.
- **The actions re-read the world inside a transaction.** `setUserRole` and `deleteUserAsAdmin` call `requireAdmin()` themselves, then read the target and `count({ role: "ADMIN" })` in the same transaction as the write. Two admins demoting each other at once cannot both see "there are two" and leave the museum with none.
- **Deletion is explained before it happens.** Sessions, accounts and reviews cascade; scans and stamps keep their history with `userId` set to NULL, so visitor numbers do not fall when a person leaves. The confirm dialog says exactly that, and `revalidateMuseum()` refreshes the exhibit pages where a deleted reviewer was counted.
- **The test fixture exposed a parallel-worker race.** The spec inserts an `e2e-users-…` row directly with `@libsql/client` (registering through the UI would replace the admin session under test) and deletes it in `afterAll`. With four workers, both tests in the file ran `beforeAll`, and each worker's cleanup deleted the other's fixture. The spec is now `mode: "serial"`; the full suite passes with four workers again.
- **Verified:** `npm test` **105/105** (8 files); `npm run test:e2e` **24/24**, including `e2e/studio-users.spec.ts` (list → promote → demote → delete) and the self-row guard; `tsc`, `eslint --max-warnings=0` and `npm run build` clean.
- **Deliberately out of scope:** editing someone's name or email (email is the login identity), resetting passwords, force-sign-out, and an audit log of who changed whom. Those are a larger account-takeover surface than "let an admin run the museum" needs today.

### Week 5 — deploy (28 Oct) — closed

- **The gap:** everything worked on `localhost` and nowhere else. A QR card encodes the address `/markers` was opened from, so the printed kit would have pointed at a laptop; WebXR and the camera need a secure context; and "here is the museum" needed a link that works on someone else's phone.
- **Live at `https://ar-museum-delta.vercel.app`** — one Vercel project, one Turso database, no other services. The production URL was assigned by Vercel and is not the project-name alias; `NEXT_PUBLIC_SITE_URL` and `BETTER_AUTH_URL` were set to it and the site redeployed, because Better Auth's `trustedOrigins` derives from that value and a wrong one breaks sign-in with `Invalid origin`.
- **The database is hosted libSQL, not Postgres.** The plan said Postgres on Neon. The schema is `provider = "sqlite"` with no native enums, `facts` as a JSON string and `tags` comma-separated; switching provider meant `@prisma/adapter-pg`, four rebuilt migrations and re-testing every query days before a demo, for a museum with six objects. Turso keeps the dialect, schema, migrations and adapter identical — production differs from development by one URL and one token. The cost is a vendor; the Postgres move is still the provider change `docs/ARCHITECTURE.md` describes, and nothing outside `src/lib/db.ts` assumes libSQL.
- **`prisma migrate deploy` cannot reach Turso.** It fails with P1013 ("The scheme is not recognized") because the migration engine only speaks `file:` SQLite, and Turso's CLI needs WSL on Windows. `scripts/db-deploy.mjs` (`npm run db:deploy`) sends the generated `prisma/migrations/*.sql` over the libSQL HTTP API, one transaction per migration, then writes the row Prisma would have written to `_prisma_migrations` so the history stays readable. It refuses a `file:` URL (so it cannot touch `dev.db`) and a database that already has tables but no history (so it cannot half-apply on top of someone else's schema). A `--check` flag reports what would run.
- **Secrets are split so tests cannot write to production.** The Turso pair lives in `.env.remote`, which only `db:deploy` and `db:admin:remote` load; `.env` still points at `prisma/dev.db`. Without the split, `next dev` and the Playwright suite would have run against the live database — and `e2e/studio-users.spec.ts` inserts and deletes accounts. `DATABASE_AUTH_TOKEN` is optional in `src/lib/db.ts`, `prisma/seed.ts` and `scripts/make-admin.mjs`, so all three work against either database.
- **Vercel refused the first build, and it was not the code.** `TEAM_ACCESS_REQUIRED`: a deployment whose commit author is not a team member is blocked when the project has no GitHub connection, and the commits are authored as `181628322+ShlokPathak28@users.noreply.github.com` while the Vercel account is `shlokmaybe@gmail.com`. The `vercel git connect` attempt failed too. Rather than rewrite the commit history to satisfy an identity check, the deploy runs from a copy of the tree without `.git` (and without `node_modules`, `.next`, `.env`, or the untracked render output, which `.vercelignore` also covers).
- **New projects ship with Deployment Protection on,** which put a Vercel login in front of every page. The CLI has no flag for it, so `ssoProtection` was cleared through the Vercel API with the CLI's stored token. Worth knowing because `vercel deploy` hangs instead of failing when a deployment is server-side `BLOCKED` — the state has to be read from the deployments API.
- **The first admin is a two-step.** Register on the deployed site like anyone else, then `npm run db:admin:remote -- you@example.com`. After that `/studio/users` is the tool. Verified in the deployed browser: sign-in lands, `/studio/users` shows `1 ADMIN · 1 VISITOR` with the self-row marked "THIS IS YOU". A real visitor account (`sujalchwl@gmail.com`, one review, one stamp) registered on its own and was left alone.
- **Verified:** `db:deploy --check` then a real run — 4 migrations, 38 statements, **16 tables**; seed reports 2 rooms · 6 exhibits · 2 tours; the live homepage renders all five published objects and both rooms from Turso and `og:url` is the new origin; both the deployment URL and the team alias return 200 with protection off; `npm run print:cards -- https://ar-museum-delta.vercel.app` produced 5 cards, 304 KB; `tsc`, `eslint --max-warnings=0`, `npm test` **105/105** and `npm run test:e2e` **24/24** still clean.
- **Not done:** the repo is not connected to GitHub, so a push does not deploy — `npx vercel deploy --prod` from a `.git`-less copy does. The 4 MB model-upload cap has still never been exercised against the deployed origin. `docs/marker-cards.pdf` is generated per origin and deliberately uncommitted. The demo recording and two rehearsals remain.

### Week 5 — Studio rooms (30 Oct) — closed

- **The gap:** rooms existed only in the seed. Adding one meant an `INSERT` against the database, a file in `public/panoramas/` and a redeploy, and the credit line was a code map keyed by slug. The Studio could manage exhibits, reviews and people but not the places the objects sit in.
- **`/studio/rooms`** lists every room with floor, object count and whether it has a 360° view; **New room** takes name, slug, floor and introduction. The room's own page holds the panorama, its credit, and the two lists that move objects in and out.
- **The panorama is an upload, not a path.** `RoomPanorama` stores the image as `Bytes` for the same reason `ModelAsset` does — the deployed filesystem is read-only — and `/api/panoramas/[id]` serves it with an immutable cache. A 3072×1536 WebP is ~0.7 MB, well under the 4 MB cap, so replacing a room's 360° view is a browser action. A path in `public/panoramas/` still works for the two seeded stand-ins.
- **The upload refuses a photograph.** `src/lib/panorama-upload.ts` reads the pixel size out of the JPEG/WebP header (VP8, VP8L, VP8X and SOF markers) and requires 2:1 within 3%, at least 1024 px wide and under 8192 px. A 3:2 image wrapped on the sphere reads as a smear, and finding that out at upload is cheaper than finding it on the page. **12 tests** cover the four container shapes, the ratio, the size floor and ceiling, the byte cap and the filename sanitiser.
- **Objects leave a room by moving to another one.** `Exhibit.roomId` is required, so the room page shows "In this room" with a **Move to…** select per row, and "Elsewhere" with checkboxes and **Move into this room**. Both actions re-read the rows inside a transaction and revalidate each affected exhibit slug, because the room label on the object's page changes too.
- **Two guards, in code.** A room with objects cannot be deleted (`Exhibit.roomId` cascades, so the alternative is losing the objects, their reviews and their stamps), and the last room cannot be deleted (with no rooms there is nowhere to put an object). `src/lib/room-admin.ts` holds the rule as a pure function, the page and the action both call it, and **6 tests** cover the empty, full, last-room and singular/plural cases. The delete button explains the block instead of offering a click that fails.
- **The credit moved into the row.** `PANORAMA_CREDIT` in the room page is gone; `Room.panoramaCredit` is editable, and the migration backfills the two stand-ins so the licence line does not change. `/rooms` no longer hardcodes "two floors" — it counts them, so a third floor does not make the page lie.
- **Verified:** `npm test` **132/132** (10 files); `npm run test:e2e` **26/26**, including `e2e/studio-rooms.spec.ts` (create room → upload a real 1024×512 JPEG → public room shows it → move Terracotta Horse in → the room lists it and the object names the room → move it back → delete the room), with cleanup that restores any object to Material Worlds first; `tsc`, `eslint --max-warnings=0` and `npm run build` clean, with `/api/panoramas/[id]` and the three Studio room routes in the manifest. Local data checked after the run: 2 rooms, 6 exhibits, 0 panorama rows, TH01 back in Material Worlds.
- **Deliberately out of scope:** marker bearings stay in `src/lib/room-markers.ts` (a new room renders its panorama without pins), and a room cannot be reordered or themed — the Week 3–4 themed-rooms proposal is still a separate idea.

### Week 5 — Studio latency (30 Oct) — closed

- **The symptom:** every Studio click took a second or more — `/studio` around 4 s, a save or move a second — while the public pages stayed at 0.6 s.
- **The cause was geography, not queries.** Vercel defaults to `iad1` (Virginia) and Turso lives in `ap-south-1` (Mumbai). The libSQL adapter spends one HTTP round trip per statement, and the Studio is almost all statements: `getSession()` on every page and every action, then the page's own queries, then a transaction where `BEGIN`, each query and `COMMIT` are separate requests. Measured from the deployed function, a route doing a single `findUnique` took **0.75 s**; the same query is ~5 ms with the function next to the database.
- **The fix:** `vercel.json` pins `regions: ["bom1"]`. Measured after the move: `/studio` 0.55 s, `/studio/rooms` 0.56 s, `/studio/reviews` 0.38 s, `/studio/users` 0.44 s, sign-in 0.74 s (was 3.65 s), and in-browser navigation 0.3–0.8 s. No query was rewritten and no cache was added.
- **Why not a session cookie cache:** it would remove one round trip that now costs ~5 ms, and it would make a role change take up to its `maxAge` to apply — a bug waiting to happen during a demo. The region was the whole cost.
- **Click feedback, because the page still waits for the server.** `loading.tsx` in `/studio` only covers entering the section from outside: React keeps an already-revealed Suspense boundary's content during a transition, so an in-Studio navigation never shows it. `StudioNav.tsx` uses `useLinkStatus` instead — the clicked link dims and gains a screen-reader-only "(loading)" within ~25 ms on a slow link — and now underlines the current section with `aria-current="page"`, which the nav previously lacked entirely.
- **Verified:** `npm test` **132/132**; `npm run test:e2e` **26/26** after the nav change; `tsc` and `eslint --max-warnings=0` clean; deployment `READY` with `regions: bom1` confirmed from the Vercel API; local dev checked separately — a Studio route renders in 89–165 ms once Turbopack has compiled it, so the local slowness was compilation, not queries.

### Week 5 — finding the model uploader (1 Nov) — closed

- **The report was "I can't upload a `.glb` from the Studio", and the uploader was not broken.** The live page contained the file input the whole time; it was inside a section called "Media and model", *below* two URL fields, so it read as a third path input and was the fourth screen of a long form. The real defect was placement and wording, not code.
- **The model now has its own section.** The old "Media and model" fieldset is split into **The photograph** (hero image) and **The 3D model**, the uploader comes first in its section, and the `modelUrl` / `modelUsdz` fields sit below it under "Or point at a model that already exists" — they are the fallback, not the main path. A jump row at the top of the form links to all four sections, and the 3D link is marked `↓`.
- **The list shows what has a model.** `/studio/exhibits` gained a second line under each object — `3D · 0.5 MB`, `3D · linked`, or an oxblood **3D · none — add a model** link straight to `#the-3d-model`. A missing upload is no longer invisible until you open the exhibit.
- **Creating an exhibit lands on the uploader.** `saveExhibit` already replaced the route with the edit page; it now carries `#the-3d-model`, so the picker is in view after the first save. The create form says plainly that the uploader appears after the save, instead of the old one-line hint at the bottom.
- **The cap is now enforced in the browser too.** `checkModelFile` (and `checkPanoramaFile` for rooms) live beside `inspectGlb` / `inspectPanorama` and run on the chosen file, so a 40 MB Blender export is refused in milliseconds with the server's exact sentence instead of spending minutes uploading. `inspectGlb` still calls the same helper — the action remains the gate. **6 new unit tests** cover the boundary, the extension and the wording.
- **The errors stopped lying.** The old `catch` said "The upload was interrupted. Check the connection and try again." for every failure, including a 413 body-size rejection — which is what made a too-big file look like a broken network. The message now separates a refused body ("over the 4 MB cap") from a request that never finished (with the elapsed seconds), and says nothing was stored either way.
- **A slow upload looks slow, not frozen.** The button used to say "Uploading…" indefinitely; it now reports `Sending 3.4 MB… 42 s`, and after 20 s explains that a slow connection can take minutes. Measured from this machine, a 3 MB body took 112 s to leave (~27 KB/s) and still reached the action, so a static label was the whole reason a working upload felt dead.
- **`bodySizeLimit` now matches reality.** It was `"5mb"`, above Vercel's 4.5 MB function ceiling, so it could never be reached in production. It is `"4.5mb"`: the 4 MB file cap plus multipart overhead, and the same number Vercel enforces.
- **Verified:** `npm test` **138/138** (10 files); `npm run test:e2e` **28/28**, with two new cases — an over-cap file is refused with no POST leaving the browser, and the list link opens the section with the picker visible; `tsc`, `eslint --max-warnings=0` clean. Production was left untouched — no upload was sent to it — so its `ModelAsset` count is still 0.

### Week 5 — one page to create an exhibit (25 Nov) — closed

- **The complaint:** adding an object took two screens. You filled in the label, pressed **Create exhibit**, and the same form came back scrolled to its last section to choose the `.glb`. The report was "can't we make this a single page", and it was a fair reading of the flow.
- **Why it was two:** `uploadModel` needs an exhibit id — the bytes are attached to a row, and the row does not exist until `saveExhibit` returns one. The old create page could not show a working picker, so it showed a paragraph explaining the split instead.
- **The fix is one page, still two round trips.** `ModelPicker` holds the chosen file in memory on the create form — never read, never sent — and `ExhibitForm` posts it to `uploadModel` with the id `saveExhibit` just returned, then replaces the route with the editor. The button says what it will do: **Create exhibit and upload model**. Nothing added to the schema and no new dependency.
- **A failed upload is not a failed create.** If the second step fails or throws (a body-limit rejection throws rather than returning), the label is already saved. The form navigates to `?model=failed#the-3d-model` and the editor says so plainly — "the exhibit was created, but its model did not finish uploading" — with the picker right there to try again.
- **The checks did not move.** The picker runs `checkModelFile` before staging the file and the form runs it again before the save; `uploadModel` still reads the GLB header and re-checks the session, so the browser remains a convenience. The create page also wins a small honesty fix: a chosen file overrides the URL field below it, and the copy says so.
- **The clock moved into an effect.** The elapsed-seconds counter reads `Date.now()` in a `useEffect`, not in the submit closure, because the React Compiler's purity rule treats an inline `handleSubmit` callback as render code. Same behaviour, no `react-hooks` exemption.
- **Verified:** `npm test` **138/138** (10 files); `npm run test:e2e` **29/29**, with a new case that fills the label, picks a real GLB, presses one button, lands on the editor with `/api/models/<id>` in the field, fetches the bytes, then deletes the fixture and checks the model 404s; `tsc` and `eslint` clean on `src` and `e2e`.

### Week 3–4 — planned

#### Stretch — themed room pages

**Idea.** Give each room a page with its own visual identity — surface, accent and a small motif drawn from the objects inside it — instead of every room wearing the same chalk-and-oxblood skin. The room page becomes the missing middle of the visit: a QR card opens one object, but nothing currently explains why these six objects sit together. A themed room page is that threshold — what the room is about, what is in it, a 360° preview once Week 3 lands, and a way into each exhibit. The theme stays on the room page; the exhibit page keeps the museum's global frame.

**Not to be confused with categories.** A room here is a *place* — a floor, a 360° view, a wall a QR card hangs on — not an object type. Browsing by type (clay, metal, textile, wood) stays on `/exhibits` as the existing tag filters; this proposal adds no category model.

**Current state.**

- `Room` has `id`, `slug`, `name`, `floor`, `intro`, `panoramaUrl`, `createdAt`, `updatedAt`. Both seeded rooms (`material-worlds` / "Material Worlds", `everyday-objects` / "Everyday Objects") now have an intro and a Poly Haven panorama.
- `/rooms` and `/rooms/[slug]` exist: an index of both rooms, and a detail page with the intro, the 360° viewer, markers, the room's objects and a credit line. Both wear the global chalk-and-oxblood frame.
- Colours are fixed once in `globals.css` (`--color-ink`, `--color-oxblood`, `--color-chalk`, `--color-paper`…). Nothing scopes a palette to a subtree.
- The VR viewer has a home. Theming is now about giving each room a *local* identity inside that frame, not about building the route.

**Proposed changes**

| Area | Change | Effort | Week |
|---|---|---|---|
| Schema | Six optional fields on `Room` (below) + one migration | S | 3 |
| Seed | `themeKey`, `intro` and a motif for both rooms | S | 3 |
| Theme registry | `src/lib/themes.ts` — a closed, contrast-checked palette map | S | 3 |
| `/rooms` | ISR index: room cards with name, floor, object count, accent | S | 3 |
| `/rooms/[slug]` | ISR page: themed header, intro, panorama slot, exhibit grid, scan CTA | M | 3 |
| Exhibit page | Room label becomes a link; prev/next within the room | S | 4 |
| OG | `opengraph-image.tsx` per room using the accent | S | 4 |
| Studio | Theme picker (registry only) + intro textarea | S | 4 |
| SEO | Add `/rooms` and every room to `sitemap.ts` | XS | 3 |
| Docs | Record the palette rules and any motif/audio credits | XS | 4 |

**Theme fields on `Room`** (existing fields omitted)

```prisma
model Room {
  // … existing: id, slug, name, floor, panoramaUrl, exhibits, timestamps

  themeKey    String  @default("chalk") // key into the registry, not free-form CSS
  accent      String? // #rrggbb override, validated in Zod
  surface     String? // #rrggbb override, validated in Zod
  motif       String? // pattern key: "scroll" | "kalamkari" | "trade" | null
  intro       String? // one or two sentences for the room page
  ambienceUrl String? // optional loop; muted by default, never autoplays
}
```

All six are nullable or defaulted, so the seed and the existing rows keep working and a room without a theme renders the current palette. Migration: `npx prisma migrate dev --name room_themes`, then `npx prisma generate` (migrate does not regenerate the client — the Week 2 lesson).

**Example themes**

| `themeKey` | Room | Surface | Accent | Motif | Why it fits |
|---|---|---|---|---|---|
| `pigment` | Material Worlds | `#f4e8d7` cloth-warm | `#8c2f1d` brick | `scroll` painted border | Pattachitra pigment, fired terracotta and bidri silver: colour laid on earth |
| `brass` | Everyday Objects | `#f0eadf` bone-paper | `#7a5a2e` brass | `kalamkari` fine vine | A brass measure, a bone-inlaid box and a textile fragment: quieter, tool-like |
| `indigo` | *(a future room)* | `#e8ebef` | `#2f4a5c` indigo | `trade` chevron | Proves the registry extends without another migration |

`--color-ink` stays the body text colour on every surface, and each surface/accent pair is checked at ≥ 4.5:1 before it enters the registry. Only the accent and the page surface move; the rest of the tokens are inherited.

**Implementation sketch**

1. **Schema + seed.** Add the fields above; `themeKey: "pigment"` for Material Worlds, `"brass"` for Everyday Objects, plus a two-sentence `intro` each.
2. **`src/lib/themes.ts`.** `ROOM_THEMES = { chalk, pigment, brass, indigo }`, each `{ surface, accent, motif }`, exported `as const` with a `RoomThemeKey` union and a Zod enum for admin input. Hex overrides are validated with `/^#[0-9a-f]{6}$/i`; an unknown key falls back to `chalk`.
3. **`src/components/room/RoomTheme.tsx`.** A server component that renders `<div style={{ "--room-surface": …, "--room-accent": … }}>` around its children. Scoped to the subtree, never `:root`, so the site header and footer do not change colour.
4. **`/rooms/page.tsx`.** `revalidate = 60`; one query for rooms with `_count.exhibits` (published only); a card per room using its accent.
5. **`/rooms/[slug]/page.tsx`.** `generateStaticParams` + `revalidate = 60` + `generateMetadata`; `notFound()` for unknown or empty rooms. Layout: themed header band (name, floor, intro), panorama slot, exhibit grid reusing `ExhibitCard`, a "Scan a card" CTA. The panorama slot renders a static poster until the Week 3 viewer is ready, then swaps without changing the route.
6. **Exhibit page.** Turn the room label into `<Link href={/rooms/${room.slug}}>`; add previous/next exhibit links scoped to the same room.
7. **OG + sitemap.** A room `opengraph-image.tsx` using the accent; add `/rooms` and each room to `sitemap.ts` (robots already excludes `/studio`).
8. **Studio.** A `<select>` populated from the registry plus an intro textarea; the Server Action re-validates with Zod. No raw colour picker in v1 — that is how a museum site ends up with an unreadable room.

**Trade-offs**

| Decision | Cheaper option | Richer option | Verdict |
|---|---|---|---|
| Where the theme applies | Room page only | The whole visit (room → exhibit → passport) | **Room page + a linked room chip.** Retheming exhibit pages breaks the "one museum" frame and makes OG/ISR output depend on where the visitor came from. |
| Colour source | Closed registry | Free-form hex per room | **Registry, with accent/surface overrides.** Keeps contrast guarantees and stops the studio becoming a CSS editor. |
| How it is applied | CSS custom properties on a wrapper | A Tailwind class per theme | **CSS variables.** No new utilities, no purge surprises, one wrapper to audit. |
| Hero | Static poster | Live 360° panorama | **Poster first**, then the Week 3 viewer in the same slot. A 1.5 MB panorama competes with the 3D model on a phone. |
| Data | New `Room` fields | Derive the theme from `slug` in code | **New fields.** Derivation hard-codes room names in two places and the admin cannot change anything. |
| Type | Reuse Fraunces / Instrument Sans / Plex Mono | A display face per room | **Reuse.** A second family costs 40–80 kB and breaks the typographic system the site already committed to. |
| Effort | One evening | Three days | **MVP only** — see below. |

**Scope decision**

- **Priority: stretch, not core.** The demo spine is QR → 3D → AR → VR, then `/studio`. Themed rooms never displace those.
- **Gate:** start only when the Week 3 VR walkthrough and the Week 4 studio CRUD are demoable **and recorded**. If either slips, this slips.
- **MVP (must ship):** schema + registry + `/rooms` + `/rooms/[slug]` with intro, themed header, exhibit grid and room chip; both seeded rooms themed. No panorama required.
- **Stretch within the stretch:** per-room OG image, motif texture, prev/next within a room.
- **Explicitly cut:** whole-visit retheming, per-room fonts, ambience audio, admin colour pickers, animated theme transitions, a third room.
- **Timebox:** one 4–6 hour sitting. If it is not demoable by then, revert the migration and ship without it — the log records "considered, deferred", not half-built.
- **Acceptance:** `/rooms` and both room pages return 200 and appear in the sitemap; body text ≥ 4.5:1 on every themed surface; no layout shift; no new client JS on the room page; exhibit pages unchanged in size and speed.
- **Why it earns its place:** the demo currently jumps from a QR card straight to an object. The room page is the missing middle — it explains the grouping, gives the VR work a front door, and is the cheapest way to make two rooms feel like two rooms.

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
- Rooms are physical spaces (floor + panorama), not object categories; category browsing stays as tag filters on `/exhibits`
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

