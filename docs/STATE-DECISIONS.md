# State decisions

The plan's state matrix named six kinds of state and six tools. This is what the
build actually uses, why, and what was cut. The rule underneath all of it: state
lives as close as possible to the thing that reads it, and anything the server
owns stays on the server.

## What is actually used

| Kind | Example | Where it lives | File |
|---|---|---|---|
| Local UI | viewer tab, material mode, selected hotspot, scanner status, form errors | `useState` | `ExhibitViewer.tsx`, `ScanPanel.tsx`, `ModelViewer.tsx` |
| Render-loop values | camera longitude/latitude, drag deltas, aim animation | `useRef`, read inside `requestAnimationFrame` | `RoomViewer.tsx`, `PanoramaProbe.tsx` |
| Derived | filtered collection, room/tag lists, passport %, review ownership | `useMemo` or a plain calculation during render | `ExhibitBrowser.tsx`, `passport.ts` |
| URL | `?q=&room=&tag=&model=1` | `history.replaceState` + `popstate` | `ExhibitBrowser.tsx` |
| Server state | exhibits, rooms, reviews, stamps, scans | RSC reads through Prisma | every `page.tsx` |
| Session | who is signed in, role | Better Auth cookie + `getViewer()` on the server; `authClient.useSession()` in the header | `session.ts`, `AuthMenu.tsx` |
| Cross-route, anonymous | "this device has seen TH01" | httpOnly `dharohar_device` cookie + `Stamp` row | `x/[code]/route.ts`, `passport.ts` |
| Mutation feedback | a review appearing before the round trip | `useOptimistic` inside `startTransition` | `ReviewSection.tsx` |
| Form values | studio exhibit form | React Hook Form + `zodResolver` | `ExhibitForm.tsx` |
| Form values | login / register | `useState` per field | `LoginForm.tsx`, `RegisterForm.tsx` |

That is the whole inventory. There is no global store, no client cache and no
context provider in the app.

## Why not Redux everywhere

Redux (or RTK) earns its keep when many distant components read and write the
same evolving structure, and when you need a time-travel log of how it got that
way. This app has one such structure — the Studio's draft of an exhibit — and it
is a single form on a single page. A `useState` per field inside React Hook Form
is smaller, faster, and keeps validation next to the input that failed.

Everything else that looked global turned out to be server state wearing a
costume:

- **Passport progress** is a query over `Stamp` rows, not a client counter. A
  store would need to be hydrated, kept in sync after every scan, and reconciled
  when the visitor signs in on another device. The database already is the
  source of truth, and `/passport` is `force-dynamic` for exactly that reason.
- **The collection** is six rows rendered at build time. Filtering it is a
  `useMemo`, not a store subscription.
- **Signed-in state** is a cookie. `authClient.useSession()` reads it in the one
  component that needs it (the header); pages that must not be cached read it on
  the server with `getViewer()`.

Adding a store would add a second copy of data the server already owns, and the
bug surface that comes with two copies. The plan's RTK slice was cut with the
tours builder; if the Studio grows a multi-step, undoable tour editor, that is
the point where a reducer — local to the editor, not global — starts to pay.

## Why not `useEffect` + `fetch`

The default for data in this app is a Server Component reading Prisma. That
gives the first paint the data, keeps the query on the server, and lets ISR cache
the result. A client `useEffect` + `fetch` would add a loading state, a waterfall
(after hydration, after the chunk), an error state, and a cache that nobody
invalidates.

There is exactly **one** exception, and it is deliberate:
`ReviewSection` fetches `/api/v1/reviews/mine` in an effect. The exhibit page is
ISR, so its server render cannot know who is reading it — reading the session
there would make every exhibit dynamic. The form needs to know whether this
visitor already has a review so that submitting edits instead of duplicating.
The fetch is guarded with a `cancelled` flag, failure is non-fatal (the form
still works, it just cannot prefill), and the write itself goes through a Server
Action, not a client mutation.

The rule, then: **server data on the server; the client fetches only what the
server cannot know at render time.**

## Why the URL is state

The collection filter is the one piece of UI state that a visitor might want to
send to someone. Keeping it in `useState` alone would make
`/exhibits?room=everyday-objects&tag=textile` impossible. The component mirrors
its filters into the address bar with `history.replaceState` (not `pushState`,
so the back button still leaves the page rather than undoing every keystroke),
and listens for `popstate` to re-apply a URL the browser restored. The page
stays static; no route becomes dynamic because of a query string.

## Optimistic updates, with a real rollback

`ReviewSection` uses React 19's `useOptimistic`. The reducer replaces the
visitor's own review in the list immediately, inside `startTransition`, then
calls the `saveReview` Server Action. If the action returns `{ ok: false }`, the
optimistic state is discarded when the transition ends and the error is shown
inline; the list falls back to the server's version. On success the action calls
`revalidatePath` for the exhibit and the passport, so the next render agrees with
the database.

This is the only optimistic path. Studio mutations are not optimistic: an admin
editing a title should see the saved value, not a guess.

## Refs where React would be wrong

`RoomViewer` and the panorama probe keep camera longitude/latitude in refs, not
state. Those values change every frame while dragging; putting them in `useState`
would re-render the component sixty times a second to move a camera that three.js
already knows how to move. React state is reserved for things the DOM must
reflect — loading, error, gyro permission, fullscreen.

The same split appears in `ModelViewer`: `loaded`/`failed` are state (they change
the overlay), while the module promise and idle handles are refs/closure
variables (they are bookkeeping, not UI).

## Forms: two sizes of the same rule

- The **Studio** form is large enough to justify React Hook Form: many fields,
  cross-field rules, inline errors, and a Server Action that re-validates the
  same Zod schema. The client copy is a convenience; the action is the boundary.
- **Login and register** are three fields each. `useState` is less machinery
  than a form library, and the error is a single server message.

In both cases, the schema in `src/lib/schemas.ts` is shared by the form and the
server. One definition, two enforcement points.

## What was cut, and what would bring it back

| Plan | Cut because | It comes back when |
|---|---|---|
| Zustand + `persist` for guest stamps | the device cookie and the `Stamp` table already persist it, and the claim-on-sign-in rule lives on the server | a visitor needs offline stamping that syncs later |
| RTK slice for the tour draft | the tours builder was cut from Week 4 | the Studio gets a reorderable, undoable tour editor |
| TanStack Query for search/infinite scroll | six exhibits; the filter is a `useMemo` over a prerendered grid | the collection is large enough to paginate, or search moves server-side |
| Context for camera/AR | the camera lives inside one component (`ScanPanel`); the AR state is reported by `model-viewer` to its own parent | two sibling trees need the same camera stream |

The honest summary for the report: the matrix was a design exercise, and the
build kept the parts that solved a real problem. Fewer tools, each doing the job
it is good at, is the decision — not an accident.
