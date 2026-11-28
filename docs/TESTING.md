# Testing

Two suites, split by what they can see:

| Suite | Tool | Runs | Answers |
|---|---|---|---|
| Unit | Vitest | `npm test` | Do the pure rules still mean what they said? |
| End-to-end | Playwright | `npm run test:e2e` | Does the built page still let a person through the door? |

MSW is deliberately not used. The only API the app calls is its own
(`/api/v1/reviews/mine`, `/api/auth/*`), and mocking it would test the mocks
rather than the session, the proxy and the database together.

## Unit — Vitest

`npm test` runs every `src/**/*.test.ts`. The config is `vitest.config.mts`;
`@/…` resolves to `src/…` the way `tsconfig.json` does, so a test imports a
module by the same path the app uses.

| File | Covers | Failure it catches |
|---|---|---|
| `src/lib/__tests__/schemas.test.ts` | `reviewSchema`, `exhibitAdminSchema`, `roomAdminSchema`, `forgotPasswordSchema`, `resetPasswordSchema` | A form that accepts what the Server Action rejects (or the reverse): rating bounds, byte-length vs character-length, slug grammar, the 8-fact cap, status values, a password below the auth minimum, or two passwords that do not match |
| `src/lib/__tests__/next-path.test.ts` | `safeNextPath`, `withNext` | `?next=` becoming an open redirect (`//evil.example`, `https://…`, backslash tricks) or an auth-page loop |
| `src/lib/__tests__/format-date.test.ts` | `formatDate` | A server/browser hydration mismatch; the Kolkata day being read as the server's day |
| `src/lib/__tests__/accent.test.ts` | `accentForTags` | Tag precedence (terracotta before the generic clay), case sensitivity, duplicate colours |
| `src/lib/__tests__/room-markers.test.ts` | `ROOM_MARKERS` | A marker bearing outside the panorama, a repeated short code, a code that no printed card could carry |
| `src/lib/__tests__/origin.test.ts` | `resolveOrigin` | `localhost` leaking into a QR code from a phone, a proxy's `x-forwarded-*` being ignored |
| `src/lib/__tests__/model-upload.test.ts` | `inspectGlb`, `formatBytes`, `safeFilename` | A renamed `.obj` or a truncated GLB reaching the viewer; a 4 MB cap that is off by one; a filename that breaks `Content-Disposition` |
| `src/lib/__tests__/user-admin.test.ts` | `checkRoleChange`, `checkUserDeletion`, `isUserRole` | An admin removing their own access, or the museum ending up with no admin; a role string the schema does not allow |
| `src/lib/__tests__/mail-from.test.ts` | `parseMailFrom` | A bare address or `Name <email>` sender becoming a malformed SendGrid request; a quoted name or trailing whitespace being sent as part of the address |

Not unit-tested: `passport.ts` and `session.ts`. Both start with `import
"server-only"` and talk to Prisma/Next request state, so a unit test would mock
the thing under test. Their behaviour is covered in the browser instead.

## End-to-end — Playwright

```bash
npm run test:e2e            # starts `npm run dev` on http://localhost:3000
npm run test:e2e:ui         # same, with the trace viewer
```

Against the HTTPS dev server used for phone testing:

```bash
# PowerShell
$env:PLAYWRIGHT_BASE_URL='https://localhost:3000'
$env:PLAYWRIGHT_CHANNEL='chrome'   # use installed Chrome instead of the download
npm run test:e2e
```

| Spec | Covers |
|---|---|
| `e2e/public.spec.ts` | Entrance → collection → object; filtering with the URL kept in sync; a room page and its 360 stage; `/x/TH01` redirecting to the right object with a device cookie; an unknown code falling back to `/exhibits` |
| `e2e/a11y.spec.ts` | The skip link is the first Tab stop, becomes visible, and lands focus on `<main>`; the studio has its own; one `h1` and one `main#main` on every public route |
| `e2e/auth.spec.ts` | Signed out → `/login?next=…` and back; `/passport` is private; an admin sees the office; a signed-in visitor gets **404** (not 403) and no Studio link |
| `e2e/password-reset.spec.ts` | The login link opens `/forgot-password`; an unknown address gets the same confirmation as a real one; a registered fixture receives a token in the local database, spends it on `/reset-password`, signs in with the new password, and a token that was never issued is refused. The fixture account is deleted afterwards |
| `e2e/reconstruction.spec.ts` | The Reconstruction tab decodes a Draco-compressed scan through `GLTFLoader` (which needs a decoder `model-viewer` gets for free), switches all three material states, and fetches the decoder from our own origin |
| `e2e/studio-upload.spec.ts` | An admin uploads a real GLB to the draft exhibit, the field becomes `/api/models/<id>`, the route serves the exact bytes with `immutable`, the source line can be corrected without re-uploading, detaching and saving deletes the row (404); a file with the wrong magic bytes is refused before it is stored |
| `e2e/studio-users.spec.ts` | `/studio/users` lists a fixture account, promotes it to ADMIN, demotes it to VISITOR, then deletes it after the confirm dialog; the signed-in admin's own row offers no role or delete controls |

The a11y spec exists because the in-app browser used for the Week 5 audit never
takes OS focus, so `:focus` could not be exercised there. Chromium under
Playwright does.

### Prerequisites

The database must be seeded, and the two demo accounts must exist — they are
created through `/register` rather than the seed, because Better Auth owns the
password hash:

```bash
npm run db:seed
# then register both at /register, and promote the first:
npm run db:admin -- admin@dharohar.test
```

| Account | Email | Password | Role |
|---|---|---|---|
| Admin | `admin@dharohar.test` | `museum-pass-2026` | ADMIN |
| Visitor | `visitor@dharohar.test` | `museum-pass-2026` | VISITOR |

Override the defaults with `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`,
`E2E_VISITOR_EMAIL`, `E2E_VISITOR_PASSWORD` if the accounts differ.

### Why one worker

`workers: 1` in `playwright.config.ts`. The suite normally runs against `next
dev`, where the first request to a route compiles it — and a dev compile can
reload an open page, which lands in the middle of the keyboard test. One worker
keeps the run honest and still finishes in about 15 seconds. Set
`PLAYWRIGHT_WORKERS=4` when pointing the suite at `next build && next start`.

### Deliberately out of scope

- **No DB writes beyond the flow under test.** The QR redirect records a scan
  and a stamp (that *is* the behaviour being checked). The upload spec is one
  studio write: it uses the seeded draft (`kalamkari-fragment`), and puts it
  back to DRAFT with no model and no `ModelAsset` rows before it finishes, so a
  re-run starts from the same place. It is serial, because both tests open the
  same exhibit. The people spec is the other: it inserts
  `e2e-users-…@dharohar.test` directly with `@libsql/client` (registering
  through the UI would replace the admin session under test) and deletes it in
  `afterAll`; it is serial for the same reason. The reset spec registers its own
  `e2e-reset-…@dharohar.test` account, removes its sessions, credential, reviews
  and reset tokens afterwards, and never touches a seeded password. The Week 4
  CRUD pass was exercised by hand and recorded in `docs/PLAN.md`, because a test
  that edits published content is a worse trade than a manual check.
- **The upload spec assumes the draft has no model.** If a run is interrupted
  mid-test, the first test detaches the leftover before uploading.
- **The people spec clears stale fixtures first.** An interrupted run can leave
  an `e2e-users-…` row; `beforeAll` deletes those before inserting its own.
- **No component tests / Testing Library.** They would need jsdom plus a
  renderer for every client island; the browser suite covers the same islands
  with less machinery.
- **No AR, WebGL or gyroscope tests.** Those need the Android handset, and are
  the one thing still recorded as a manual pass in the plan. The reconstruction
  tab is the exception: it runs on a plain canvas, so the spec asserts it
  renders rather than trusting that it does.
- **No Lighthouse budget in CI.** Performance is measured by hand and written
  into `docs/PERF-NOTES.md` (Week 5).
