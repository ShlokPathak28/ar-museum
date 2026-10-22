# Dharohar — AR Museum Guide

Scan a QR code next to an exhibit and its page opens: narrated history, photographs,
an interactive 3D model, an AR mode that places the object in your room, and a 360°
walkthrough of the gallery.

**Live progress:** week 0 — scaffold, database, seed data.
**Full plan:** [docs/PLAN.md](docs/PLAN.md)

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) · React 19 · TypeScript |
| Styling | Tailwind CSS 4 (`@theme` tokens) |
| Database | SQLite via Prisma 7 (libSQL driver) → Postgres later |
| Validation | Zod |
| 3D / AR | `@google/model-viewer` (week 1) |
| VR | `three` + `@react-three/fiber` (week 3) |
| Auth | Better Auth (week 2) |
| Media | Cloudinary (week 4) |

## Getting started

```bash
npm install
cp .env.example .env        # Windows: copy .env.example .env
npm run db:migrate          # creates prisma/dev.db + applies migrations
npm run db:seed             # 2 rooms, 6 exhibits, 2 tours
npm run dev                 # http://localhost:3000
```

### Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Next dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:migrate` | Create + apply a migration |
| `npm run db:seed` | Reset and re-seed development data |
| `npm run db:studio` | Prisma Studio (browse the database) |
| `npm run db:generate` | Regenerate the Prisma client |

## Project structure

```
prisma/
  schema.prisma      models: Room, Exhibit, Hotspot, Media, Tour, Review, Scan, Stamp
  seed.ts            development data
  dev.db             local SQLite database (git-ignored)
src/
  app/
    layout.tsx       fonts, metadata, global shell
    page.tsx         landing page (reads the DB)
    globals.css      design tokens
  components/        ui · exhibit · three · qr · forms · studio
  hooks/             camera, panorama, tour progress
  lib/
    db.ts            Prisma client (libSQL adapter)
    env.ts           server env validation
  generated/prisma/  generated client (git-ignored)
```

## Troubleshooting

**`npm run db:studio` fails with “not supported for the `file:./prisma/dev.db` protocol”.**
Prisma Studio 7.10.1 rejects *relative* SQLite URLs. `scripts/db-studio.mjs` works
around it by passing an absolute `file:///` URL (and by avoiding `%20`, which
Studio doesn't decode). It prints the URL it starts on — the port may differ from
5555. To force one: `npm run db:studio -- --port 5555`.

**Camera / QR testing on a phone.** `localhost` won't resolve from the phone, and
camera APIs need HTTPS. Set `NEXT_PUBLIC_SITE_URL` to your machine's LAN IP
(`http://192.168.x.x:3000`) for QR codes, and test the in-browser scanner on the
deployed HTTPS URL.

## Notes for the report

**SQLite, but with a driver adapter.** Prisma 7 compiles queries in TypeScript
instead of shipping a Rust engine, so the client needs a driver. `better-sqlite3`
would require Visual Studio build tools on Windows; `@prisma/adapter-libsql`
ships prebuilt binaries and speaks the SQLite dialect over the same `.db` file.
The Prisma provider is still `sqlite`, and `DATABASE_URL` is still
`file:./prisma/dev.db`.

**SQLite limitations.** No native `enum` and no scalar lists (`String[]`). Enum-like
fields (`role`, `status`, `method`) are strings validated by Zod; `facts` is a JSON
string and `tags` is comma-separated. Moving to Postgres later means converting
those back to enums and arrays.

## Roadmap

- **Week 0** — repo, schema, seed, design tokens ✅
- **Week 1** — gallery, exhibit page, 3D viewer, QR generation, SEO/ISR
- **Week 2** — API, auth, `/scan`, passport, reviews
- **Week 3** — AR mode, 360° VR viewer
- **Week 4** — tours, admin studio, moderation, analytics
- **Week 5** — accessibility, tests, deploy, demo

## Credits

Exhibit images are generated placeholders until real photographs are added in
week 1. 3D models will be CC0 assets from Smithsonian Open Access and Scan the
World; attribution lives on `/credits` (week 1).
