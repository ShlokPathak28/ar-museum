# Dharohar — AR Museum Guide

Scan a QR code next to an exhibit and its page opens: narrated history,
photographs, a 3D model you can turn, a **reconstruction** view in three material
states, an **AR** mode that places the object in your room, and a **360°** walk
through the gallery. Admins run the museum from `/studio`; visitors collect
stamps and leave reviews.

**Status:** Week 5 in progress. Accessibility, tests and the performance pass are
done; deployment and the demo kit are the remaining steps.
**Full plan and progress log:** [docs/PLAN.md](docs/PLAN.md)

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) · React 19 · TypeScript |
| Styling | Tailwind CSS 4 (`@theme` tokens in `src/app/globals.css`) |
| Database | SQLite via Prisma 7 (libSQL driver) → Postgres for deploy |
| Validation | Zod 4, shared by forms and Server Actions |
| 3D / AR | `@google/model-viewer`; `three` for the reconstruction and 360° room |
| Auth | Better Auth 1.7 (email + password, roles) |
| QR | `qrcode` (SVG cards, PNG endpoint), `qr-scanner` (camera) |
| Tests | Vitest (unit) · Playwright (end-to-end) |

## Demo accounts

These exist in the local `prisma/dev.db`, **not** in the seed — a fresh clone
starts with no users.

| Role | Email | Password |
|---|---|---|
| Admin | `admin@dharohar.test` | `museum-pass-2026` |
| Visitor | `visitor@dharohar.test` | `museum-pass-2026` |

Register a new account at `/register`; promote it with
`npm run db:admin -- someone@example.com`. The script only changes `role` —
passwords are hashed by Better Auth and never touched by our code.

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
| `npm run db:generate` | Regenerate the Prisma client |

## Project structure

```
prisma/
  schema.prisma      14 models: rooms, exhibits, hotspots, media, tours,
                     users, sessions, reviews, scans, stamps, feedback
  migrations/        three migrations
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
npm test                    # 82 unit tests
npm run test:e2e            # 19 end-to-end tests
```

The e2e suite starts its own dev server and expects the demo accounts above.
`docs/TESTING.md` explains the split, the spec table, and why MSW is not used.

On a machine where Playwright's browser download is blocked, set
`PLAYWRIGHT_CHANNEL=chrome` to use an installed Chrome.

## Deployment

The target is one Vercel project plus hosted Postgres. The code changes are
configuration, not features:

1. Point `DATABASE_URL` at Postgres and switch the Prisma provider.
2. Set `NEXT_PUBLIC_SITE_URL` and `BETTER_AUTH_URL` to the HTTPS origin.
3. Run migrations and the seed on the new database.
4. HTTPS is required for WebXR, the camera and the gyroscope.

`docs/ARCHITECTURE.md` has the full deployment shape and the SQLite → Postgres
column differences (enums, scalar lists).

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
opened from. Open it on the LAN address before printing, or use the code printed
under the QR.

**Reconstruction tab says the model could not be loaded.** The GLBs are
Draco-compressed and the viewer needs `/draco/draco_decoder.wasm`. It ships in
`public/`; if the folder is missing, copy it from
`node_modules/three/examples/jsm/libs/draco/gltf/`.

**`next build` while `next dev` is running.** Don't. It overwrites `.next` and
Turbopack then serves stale CSS and modules until you delete `.next`.

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
- **Week 5** — accessibility ✅, tests ✅, performance ✅, deploy + demo kit ⏳

## Credits

The museum is fictional; the photographs, panoramas and 3D files are openly
licensed stand-ins. Every file is listed with its source and licence at
[`/credits`](src/app/credits/page.tsx) and in [docs/CREDITS.md](docs/CREDITS.md).
