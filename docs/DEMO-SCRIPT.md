# Demo script — three minutes

The plan's seven beats, timed. One laptop (signed in as **admin**), one Android
phone (signed in as **visitor**), one printed card on the desk. Everything below
has been rehearsed; the fallbacks are part of the script, not an apology.

## Before the room

Run through this ten minutes before, not two.

- [ ] `npm run dev:https` on the laptop. Note the LAN address it prints
      (`https://10.x.x.x:3000`).
- [ ] `.env` has that address in `DEV_ALLOWED_ORIGINS` **and**
      `NEXT_PUBLIC_SITE_URL="https://<LAN-IP>:3000"`. A stale IP is the most
      common failure: the phone loads the page but never hydrates.
- [ ] The phone is on the same Wi-Fi and has the dev CA installed
      (`docs/HTTPS.md`). Open the site once and confirm the header renders.
- [ ] Laptop signed in as `admin@dharohar.test` — the header shows **Studio**.
- [ ] Phone signed in as `visitor@dharohar.test`, or signed out if you want to
      show the claim-on-sign-in moment.
- [ ] One card printed: `npm run print:cards -- https://<LAN-IP>:3000`, then
      print `docs/marker-cards.pdf` at 100% on A6 card. Scan it once with the
      phone camera and confirm it lands on the exhibit.
- [ ] Reset the visitor's traces if this is a second rehearsal:
      `npm run db:seed` clears stamps, scans and reviews (it also resets Studio
      edits — do not run it after you have prepared content by hand).
- [ ] Battery, notifications off, screen mirroring off, one browser tab per
      device.

**Accounts**

| Role | Email | Password |
|---|---|---|
| Admin (laptop) | `admin@dharohar.test` | `museum-pass-2026` |
| Visitor (phone) | `visitor@dharohar.test` | `museum-pass-2026` |

## The three minutes

### 0:00–0:18 — The entrance and the collection

**Laptop.** Open `/`. The doors part on their own after 1.4 s (or click once).
Click **Enter the collection**.

> "Dharohar is a museum guide that starts at the object. Every page is built
> from the collection in the database, and every card is also a QR code."

Type `bidri` in the search box. The grid filters in place; the URL changes to
`?q=bidri`.

> "Filtering happens in the browser over a page that was already built — no
> round trip per keystroke, and the URL is shareable."

**Fallback:** if the doors are mid-animation, click anywhere; they open on any
click or key.

### 0:18–0:48 — The object, in 3D

Open **Bidri Hookah Base**.

> "The label is the beginning, not the exhibit. This is a real-time model —
> drag to turn it, scroll to zoom."

Drag once, slowly. Click hotspot **1** (the chip row under the viewer works too).

> "Hotspots are real buttons, so a keyboard user gets the same notes without
> having to hit a 3D target."

**Fallback:** if WebGL is unavailable, the page still shows the photograph and
the notes; say so and move on.

### 0:48–1:08 — Reconstruction

Click the **Reconstruction** tab. Wait for the object (one beat). Click
**Wireframe**, then **Clay**, then **Textured**.

> "Three readings of the same scan: the raw triangle mesh, the form without its
> surface, and the scan itself. That is the difference between a model and an
> interpretation."

**Fallback:** the tab loads its own three.js chunk; on a cold cache it takes a
second. Talk over it — "it is loading a second renderer, on demand" — rather
than clicking twice.

### 1:08–1:28 — The phone and the card

**Phone.** Open the camera, scan the card on the desk. The exhibit page opens.

> "Same object, no app, no login. The card encodes a short code — `BH02` — and
> the route logs the scan and stamps the passport before it redirects."

**Fallback:** if the camera refuses, type `BH02` at `/scan`. The code is printed
large on the card for exactly this.

### 1:28–1:58 — AR

On the phone, tap **Place in your room**. Allow camera/motion if asked. Move the
phone until the object sits on the desk; pinch to scale.

> "This is WebXR inside Chrome — the model is placed at real scale, no marker,
> no second app. It needs HTTPS, which is why the dev server runs on it."

**Fallback:** if AR does not start, play the recorded clip on the laptop and say
plainly that the handset did not hand off. Do not debug it live. (`?demo=1`
auto-pans the room viewer; it is not an AR fallback.)

### 1:58–2:22 — The room

**Phone or laptop.** Open **Rooms → Material Worlds**.

> "The room is a 360° photograph. Drag to look, or on the phone tap **Use
> motion** and the room moves with you."

Tap **Use motion** on the phone, turn slightly, then tap a marker (**TH01**) to
jump to that object.

**Fallback:** motion permission denied → drag. The marker still works.

### 2:22–2:42 — Passport and review

**Phone.** Open `/passport`. Signed out, it redirects to sign-in; sign in as the
visitor. The passport shows the stamp collected a minute ago.

> "A guest can scan all afternoon without an account. The first sign-in claims
> the stamps from this device — the passport is the reason to make one."

Back to the exhibit, post a 5★ review.

> "The review appears immediately — optimistically — and the Server Action
> revalidates the page behind it."

**Fallback:** if the session is already signed in, skip the sign-in sentence and
show the stamp; the claim still happened on the first visit.

### 2:42–3:00 — The office

**Laptop.** Click **Studio** → the draft or the Bidri exhibit → change one line
of the summary → **Save**. Open the public exhibit in a second tab.

> "Every mutation is a Server Action that re-checks the admin role on the
> server, then revalidates the public pages. No redeploy."

**Fallback:** if the save is slow, the pending state is visible; keep talking.

## If you have four minutes

Add the review moderation beat: **Studio → Reviews → Hide**, show it disappear
from the exhibit, then **Restore**. It is the clearest demonstration of
`revalidatePath` and of a role check that is not just a hidden button.

## What to do when it breaks

| Symptom | Cause | Say this, do that |
|---|---|---|
| Phone page loads but nothing is interactive | stale `DEV_ALLOWED_ORIGINS` / `NEXT_PUBLIC_SITE_URL` | "The dev server only trusts the address it was told about." Fix the `.env`, restart — or use the laptop for that beat |
| QR opens `localhost` | page printed from `localhost` | reprint from the LAN address; or type the code |
| AR button missing | not a secure context, or no ARCore | "WebXR needs HTTPS and a supported handset." Show the clip |
| 3D is blank | WebGL blocked / cold chunk | wait one beat, then fall back to the photograph and notes |
| Sign-in fails with "Invalid origin" | `BETTER_AUTH_URL`/trusted origins | use the account already signed in on that device; do not debug live |
| Wi-Fi dies | venue | laptop-only path: every beat except AR and gyro works on the laptop |

## After the demo

- Sign the phone out if the device is shared; the visitor account keeps the
  review and stamps otherwise.
- `npm run db:seed` if you want the next rehearsal to start clean.
- If you changed an exhibit's copy for the demo, change it back — or keep it and
  say it was a live edit.

## The one-sentence honesty line

**3D** is a real-time model · **AR** places it in your space through
WebXR/ARCore · **VR** is a 360° walkthrough, not a headset game. The objects and
panoramas are openly licensed stand-ins until the collection is scanned; the
site says so on `/credits` and beside each viewer.
