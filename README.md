# Dharohar — AR Museum Guide

Scan a QR code next to an exhibit and its page opens: narrated history,
photographs, a 3D model you can turn, a **reconstruction** view in three material
states, an **AR** mode that places the object in your room, and a **360°** walk
through the gallery. Admins run the museum from `/studio`; visitors collect
stamps and leave reviews.

**Status:** Week 5. Accessibility, tests, the performance pass, model upload,
rooms with 360° panoramas, people management and the deploy are done — the site
runs at **https://ar-museum-delta.vercel.app**. The demo recording and two
rehearsals are what remain. Admins can add a 3D model, create a room and upload
its panorama, and manage visitor accounts from the Studio, without a redeploy.
**Full plan and progress log:** [docs/PLAN.md](docs/PLAN.md)

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) · React 19 · TypeScript |
| Styling | Tailwind CSS 4 (`@theme` tokens in `src/app/globals.css`) |
| Database | SQLite via Prisma 7 (libSQL driver); hosted libSQL (Turso) in production |
| Validation | Zod 4, shared by forms and Server Actions |
| 3D / AR | `@google/model-viewer`; `three` for the reconstruction and 360° room |
| Auth | Better Auth 1.7 (email + password, roles) |
| QR | `qrcode` (SVG cards, PNG endpoint), `qr-scanner` (camera) |
| Tests | Vitest (unit) · Playwright (end-to-end) |

## Demo accounts

These exist in the local `prisma/dev.db`, **not** in the seed — a fresh clone
starts with no users. The deployed site has its own `admin@dharohar.test` with
the same password, created once by hand.

| Role | Email | Password |
|---|---|---|
| Admin | `admin@dharohar.test` | `museum-pass-2026` |
| Visitor | `visitor@dharohar.test` | `museum-pass-2026` |

Register a new account at `/register`; promote it with
`npm run db:admin -- someone@example.com` (add `:remote` for the deployed
database), or from `/studio/users` once you are signed in as an admin. The
script only changes `role` — passwords are hashed by Better Auth and never
touched by our code.

## Getting started

```bash
npm install
cp .env.example .env        # Windows: copy .env.example .env
npm run db:migrate          # creates prisma/dev.db + applies migrations
npm run db:seed             # 2 rooms, 6 exhibits, 2 tours, 6 codes
npm run dev                 # http://localhost:3000
```

That is the whole setup. `npm install` runs `prisma generate` via `postinstall`.

### For the phone (AR, camera, gyro)

```bash
npm run dev:https           # mkcert cert for every local IPv4 + localhost
```

Then put the LAN address in `.env`:

```dotenv
NEXT_PUBLIC_SITE_URL="https://192.168.x.x:3000"
DEV_ALLOWED_ORIGINS="192.168.x.x"
```

Restart the server. The phone needs the dev CA installed — `docs/HTTPS.md` has
the steps. Camera APIs, WebXR and device orientation only exist in a secure
context, which is why this is not optional.

### Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Next dev server (HTTP, localhost) |
| `npm run dev:https` | Dev server on HTTPS for the phone |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit suite |
| `npm run test:e2e` | Playwright suite (starts its own dev server) |
| `npm run db:migrate` | Create + apply a migration |
| `npm run db:seed` | Reset and re-seed development data |
| `npm run db:admin` | List users; promote an email to ADMIN |
| `npm run db:studio` | Prisma Studio |
| `npm run print:cards` | A6 marker-card PDF from `NEXT_PUBLIC_SITE_URL` (or `-- <origin>`) |
| `npm run db:generate` | Regenerate the Prisma client |

### Adding a model from the Studio

Open an exhibit in `/studio/exhibits/<id>` and find the **The 3D model** section —
it has its own fieldset, and the jump row at the top of the form links straight
to it. The exhibits list also shows `3D · none — add a model` under any object
without one. The `.glb` is stored as a row in the database (Vercel's filesystem
is read-only at runtime) and served from `/api/models/<id>`; the exhibit's
`modelUrl` is swapped in the same transaction, so the change is live on the
public page as soon as the upload finishes. There is no redeploy.

- **Cap: 4 MB.** Vercel caps a function request at 4.5 MB. Compress first:
  `npx @gltf-transform/cli optimize in.glb out.glb --texture-compress webp`.
- The file is checked in the browser before it is sent — wrong extension or
  over the cap is refused immediately, with the same wording the server uses.
  The server checks again; the form is not a gate.
- The uploader checks the GLB header and JSON chunk server-side, and reports
  whether the geometry is Draco-compressed.
- **Source and licence** is shown on `/credits`; type it when you upload, and
  use **Save source line** to correct it later without replacing the file.
- Saving the exhibit with the field cleared deletes the stored bytes.
- A new exhibit must be saved once before it can take an upload — the model
  needs an exhibit id to belong to. Creating it lands on the uploader.
- Object storage (Vercel Blob, R2) is the documented upgrade path when files
  outgrow 4 MB; see `docs/ARCHITECTURE.md`.

### Adding a room from the Studio

`/studio/rooms` lists every room with its floor, object count and whether it has
a 360° view. **New room** takes a name, slug, floor and introduction, then the
room's own page holds the rest:

- **Panorama.** Upload an equirectangular image — twice as wide as it is tall,
  3072×1536 WebP is the house size — or point at a file in `public/panoramas/`.
  An upload is stored as a row, served from `/api/panoramas/<id>` and live as
  soon as it finishes, like a model. The server checks the header and the 2:1
  shape, so a normal photograph is refused instead of smeared around the sphere.
- **Credit.** The line under the viewer, editable per room.
- **Objects.** The room page lists what is in the room and what is elsewhere in
  the museum. Tick objects and **Move into this room**, or use the **Move to…**
  select on a row to send one away. `Exhibit.roomId` is required, so an object
  leaves a room by moving to another one.
- **Deleting.** A room can only be deleted once it is empty, and never if it is
  the last one — `Exhibit.roomId` cascades, so deleting a full room would take
  its objects, reviews and stamps with it. Both rules are enforced in the action,
  not just hidden in the UI.

New rooms appear on `/rooms`, in the sitemap and in every exhibit's Room
dropdown immediately; no redeploy. Panorama markers are still picked in
`src/lib/room-markers.ts`, so a brand-new room shows its 360° view without pins
until that map is updated.

### Managing people

`/studio/users` lists every account with its role, join date and activity, and
can filter by role or search by name/email. From there an admin can:

- **promote or demote** with `Make admin` / `Make visitor`;
- **delete an account** — its sessions, sign-in and reviews go; its stamps and
  scans stay in the visitor numbers with `userId` cleared.

Two guards are enforced server-side, not just disabled in the UI: an admin
cannot change or delete their own account, and the last admin cannot be demoted
or deleted. Passwords are hashed by Better Auth and are never shown or edited
here. The CLI (`npm run db:admin`) still works for the first admin, before
anyone can reach `/studio/users`.

## Project structure

```
prisma/
  schema.prisma      16 models: rooms, exhibits, hotspots, media, tours,
                     users, sessions, reviews, scans, stamps, feedback,
                     uploaded model assets, room panoramas
  migrations/        six migrations
  seed.ts            development data
  dev.db             local SQLite database (git-ignored)
public/
  models/            Draco-compressed GLBs (16.5 MB → 1.7 MB)
  panoramas/         3072×1536 WebP equirects
  images/exhibits/   padded 1200×900 plates
  draco/             decoder for the hand-built three.js viewer
src/
  app/               routes, Server Actions, route handlers
  components/        site · exhibit · three · room · ui
  lib/               db, auth, session, schemas, credits, pure helpers
  generated/prisma/  generated client (git-ignored)
docs/                plan, architecture, testing, perf, credits, demo script
e2e/                 Playwright specs
```

## Testing

```bash
npm test                    # 105 unit tests
npm run test:e2e            # 24 end-to-end tests
```

The e2e suite starts its own dev server and expects the demo accounts above.
`docs/TESTING.md` explains the split, the spec table, and why MSW is not used.

On a machine where Playwright's browser download is blocked, set
`PLAYWRIGHT_CHANNEL=chrome` to use an installed Chrome.

## Deployment

Live at **https://ar-museum-delta.vercel.app** — one Vercel project and one
hosted libSQL database (Turso). The database is the only external service.

**Why libSQL and not Postgres.** The schema is `provider = "sqlite"`, and libSQL
is SQLite over the wire, so production runs the dialect the app was written
against. Postgres would have meant a provider switch, a second driver adapter
and rebuilding four migrations, for no user-visible gain on a six-object museum.
`docs/ARCHITECTURE.md` records the trade and what it costs.

Environment variables on Vercel (Production):

| Name | Value |
|---|---|
| `DATABASE_URL` | `libsql://<db>-<org>.turso.io` |
| `DATABASE_AUTH_TOKEN` | a Turso database token (read & write) |
| `BETTER_AUTH_SECRET` | 32 random bytes, base64 |
| `NEXT_PUBLIC_SITE_URL` | `https://ar-museum-delta.vercel.app` |
| `BETTER_AUTH_URL` | the same origin |

The database pair is what differs by environment: on Vercel it points at Turso,
and locally it lives in `.env.remote` (git-ignored), **not** `.env`. `next dev`
and the Playwright suite read `.env` and must keep writing to `prisma/dev.db`.

**Schema and seed.** Prisma's migration engine only speaks `file:` SQLite, so a
`libsql://` URL fails with P1013. `npm run db:deploy` applies the same
`prisma/migrations/*.sql` over the libSQL HTTP API and records them in
`_prisma_migrations`; it refuses a `file:` URL and a database that already has
tables but no history. Seed against the same database with
`npx tsx prisma/seed.ts`.

**The first admin.** Register on the deployed site, then
`npm run db:admin:remote -- you@example.com`. After that, `/studio/users` does it.

**Deploying.** `npx vercel deploy --prod`, from the repo if Vercel recognises the
git author, otherwise from a copy without `.git`. Two things bit us and are worth
knowing:

- Vercel blocks a deployment whose git author is not a member of the team
  (`TEAM_ACCESS_REQUIRED`) when the project has no GitHub connection. Either
  connect the repo (`vercel git connect`) or deploy from a copy without `.git`.
- New projects ship with Deployment Protection on, which puts a Vercel login in
  front of every page. Turn off `ssoProtection` in the project settings or the
  demo is invisible to visitors.

**Printable cards.** The cards encode whichever origin generated them, so
generate them from the live URL (set `PLAYWRIGHT_CHANNEL=chrome` first if
Playwright's own browser isn't installed):

```bash
npm run print:cards -- https://ar-museum-delta.vercel.app
```

`docs/ARCHITECTURE.md` has the full deployment shape and the SQLite → Postgres
column differences, should the museum ever outgrow this.

## Troubleshooting

**`npm run db:studio` fails with "not supported for the `file:./prisma/dev.db` protocol".**
Prisma Studio 7.10.1 rejects *relative* SQLite URLs. `scripts/db-studio.mjs`
passes an absolute `file:///` URL (and avoids `%20`, which Studio doesn't
decode). It prints the URL it starts on; the port may differ from 5555. Force
one with `npm run db:studio -- --port 5555`.

**The phone loads the page but nothing is interactive.** `/_next/*` is blocked
for unknown origins. Add the current LAN IP to `DEV_ALLOWED_ORIGINS` and restart.
Better Auth trusts the same list, so a stale IP also breaks sign-in with
`Invalid origin`.

**QR codes point at `localhost`.** The card encodes the address `/markers` was
opened from, and `npm run print:cards` defaults to `NEXT_PUBLIC_SITE_URL`. Name
the address the phone will use:

```bash
npm run print:cards -- https://192.168.1.42:3000
```

A PDF generated from `localhost` is not a printing bug — it is a card that can
only be scanned on the laptop. Reprint from the origin in the phone's address
bar, or use the code printed under the QR.

**Reconstruction tab says the model could not be loaded.** The GLBs are
Draco-compressed and the viewer needs `/draco/draco_decoder.wasm`. It ships in
`public/`; if the folder is missing, copy it from
`node_modules/three/examples/jsm/libs/draco/gltf/`.

**`next build` while `next dev` is running.** Don't. It overwrites `.next` and
Turbopack then serves stale CSS and modules until you delete `.next`.

**The Studio takes a second per click, while the public pages are quick.** The
public pages are prerendered; the Studio queries the database on every request,
and libSQL spends one HTTP round trip per statement. Check that the functions
run in the same region as the database — `vercel.json` pins `regions: ["bom1"]`
because Turso is in `ap-south-1`. Served from `iad1` (the default) each
round trip costs ~200 ms and the Studio feels broken. Locally, a first visit to
a Studio route is Turbopack compiling it; after that it renders in well under a
second.

**The model upload sits on "Uploading…" for minutes.** That is usually the
upload, not a hang: the whole file goes out in one request, so a 4 MB model on a
slow upstream can take minutes. The button reports the size and elapsed seconds,
and nothing is stored until the request finishes. A file over the 4 MB cap is
refused before it is sent, so it cannot be a size problem if the check passed.
If the message says the server refused the body, the file is too big for the
platform, not a network fault.

## Notes for the report

**SQLite, but with a driver adapter.** Prisma 7 compiles queries in TypeScript
instead of shipping a Rust engine, so the client needs a driver.
`better-sqlite3` would require Visual Studio build tools on Windows;
`@prisma/adapter-libsql` ships prebuilt binaries and speaks the SQLite dialect
over the same `.db` file.

**SQLite limitations.** No native `enum` and no scalar lists (`String[]`).
Enum-like fields (`role`, `status`, `method`) are strings validated by Zod;
`facts` is a JSON string and `tags` is comma-separated. Moving to Postgres means
converting those back to enums and arrays.

**The poster is not inside `<model-viewer>`.** It sits beside the element
because the custom element re-parents slotted children into its shadow root when
it upgrades, which paints the photograph twice — and that second paint was the
exhibit page's LCP. `docs/PERF-NOTES.md` has the trace.

## Docs

| File | What is in it |
|---|---|
| [docs/PLAN.md](docs/PLAN.md) | the six-week plan and the append-only progress log |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | as-built routes, data flow, auth, 3D, deviations |
| [docs/CO-MATRIX.md](docs/CO-MATRIX.md) | INT252 outcomes and INT257 areas, with file evidence |
| [docs/STATE-DECISIONS.md](docs/STATE-DECISIONS.md) | the state inventory and why Redux/Zustand/TanStack were cut |
| [docs/DEMO-SCRIPT.md](docs/DEMO-SCRIPT.md) | the three-minute demo, with fallbacks |
| [docs/TESTING.md](docs/TESTING.md) | the two suites and what each catches |
| [docs/PERF-NOTES.md](docs/PERF-NOTES.md) | Lighthouse method, traces, asset table, trade-offs |
| [docs/CREDITS.md](docs/CREDITS.md) | every asset's source and licence (also at `/credits`) |
| [docs/HTTPS.md](docs/HTTPS.md) | the phone, the certificate and the dev loop |

## Roadmap

- **Week 0** — repo, schema, seed, design tokens, AR spike ✅
- **Week 1** — gallery, exhibit page, 3D viewer, reconstruction, QR, SEO/ISR ✅
- **Week 2** — auth, `/scan`, passport, reviews ✅
- **Week 3** — AR mode, 360° room viewer, fallbacks ✅
- **Week 4** — Studio CRUD, publish/revalidate, review moderation ✅
- **Week 5** — accessibility ✅, tests ✅, performance ✅, Studio model upload ✅, rooms + panorama upload ✅, people management ✅, deploy ✅ (Turso + Vercel), demo kit ⏳

## Credits

The museum is fictional; the photographs, panoramas and 3D files are openly
licensed stand-ins. Every file is listed with its source and licence at
[`/credits`](src/app/credits/page.tsx) and in [docs/CREDITS.md](docs/CREDITS.md).
