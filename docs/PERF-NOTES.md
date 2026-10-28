# Performance notes

Week 5. What the museum weighed, what changed, and what the numbers actually
mean. Every measurement here is a Lighthouse 12 run against a **production
build** (`npm run build` → `npx next start -p 3100`), headless Chrome, and
`--throttling-method=devtools` (4× CPU, 1.6 Mbps down / 750 kbps up / 150 ms
RTT). The default Lantern simulation was tried first and thrown away: the same
build scored LCP 5.5 s, 8.0 s and 8.3 s on three consecutive runs.

Runs on this machine still move a tier or two between attempts — the machine is
a laptop, not a CI box — so numbers below are a representative run with the
observed range, never a single lucky trace.

## Where it landed

| Page | Score | LCP | TBT | CLS | Transferred |
|---|---|---|---|---|---|
| `/` | 84–96 | 2.0–2.6 s | 90–310 ms | ~0 | 499 KiB |
| `/exhibits` | 87–98 | 1.8–2.2 s | 90–540 ms | 0 | 501 KiB |
| `/rooms` | 89–90 | 2.3 s | 290 ms | 0 | 416 KiB |
| `/rooms/material-worlds` | 64–86 | 2.0–2.7 s | 470–1,600 ms | 0 | 1,680 KiB |
| `/exhibits/bidri-hookah-base` | 58–70 | 2.5–2.8 s | 1,150–3,300 ms | 0 | 1,351 KiB |

Accessibility, best practices and SEO are **100** on all five, in every run.

Start of the week → now (each line has its own lever; the like-for-like tests
are in the sections below):

| Page | Before | After |
|---|---|---|
| Room | **59** · LCP 10.3 s | **68** · LCP 2.4 s |
| Room index | **67** · LCP 11.1 s · 1,760 KiB | **89** · LCP 2.3 s · 416 KiB |
| Exhibit | **54** · LCP 7.1 s · 5,130 KiB | **60** · LCP 2.8 s · 1,351 KiB |
| Collection | 953 KiB | 501 KiB |
| Home | 763 KiB | 499 KiB |

## What the page was actually waiting for

### The exhibit page: the poster was painted twice

The 3D viewer shows a photograph while three.js boots. That photograph is the
biggest thing above the fold, so it is the LCP element — and it was arriving
at **7 s** while the image bytes finished at 2 s.

The cause was markup, not bytes. The poster was a child of `<model-viewer>`
with `slot="poster"`. Until the custom element is defined, that div is ordinary
DOM and paints normally. The moment `@google/model-viewer` runs, it upgrades the
element and re-parents the slotted children into its shadow root, and the
photograph is painted **again** — which is the paint LCP records. Deferring the
module made this worse, because the second paint inherited the delay.

Evidence: with `requestIdleCallback` stubbed out so the module never loads, the
poster is on screen at 4 s (screenshotted) but LCP stops at the page's other
still, 2.5 s. With the module loaded, LCP jumps to the moment it finished
parsing. That is the signature of an upgrade repaint, not a slow image.

The poster now sits **beside** `<model-viewer>`, in an overlay that unmounts
once the element reports `load`. Same pixels, one paint:

```
LCP breakdown, exhibit page
                       before        after
time to first byte        6 ms         9 ms
resource load delay     604 ms       629 ms
resource load duration 1,981 ms     1,973 ms
element render delay  4,459 ms       123 ms
```

That single number is the whole difference between 7.1 s and 2.6 s. Nothing
about the network changed.

### The room page: 1.8 MB before the first pixel

The room showed its 4096×2048 equirectangular panorama as the first paint, with
`unoptimized`, so the visitor downloaded the stitched source image before
anything else. The still now goes through Next's image optimizer at the width
the layout asks for — **1,793 KB → 111 KB** at `w=1200` — while the 360° viewer
still fetches the full-resolution file when it takes over. The stage is a
placeholder, not the texture.

The panorama itself was also re-encoded: 4096 JPEG → 3072×1536 WebP
(1,793 KB → 743 KB, 1,749 KB → 690 KB). 3072 is where the seams and the carved
detail still hold on a projector; the 4096 originals are kept in
`%TEMP%\opencode\panoramas-orig\`, outside the repo.

### The models: 5.9 MB of uncompressed glTF

| Model | Before | After | Saved |
|---|---|---|---|
| `baluster-vase.glb` (bidri hookah base) | 5,759 KB | 479 KB | −92% |
| `stoneware-jug.glb` (brass measuring vessel) | 6,177 KB | 593 KB | −90% |
| `patent-model-box.glb` (inlaid writing box) | 2,815 KB | 441 KB | −84% |
| `spike-vase.glb` (AR probe) | 1,777 KB | 198 KB | −89% |
| **all four** | **16,528 KB** | **1,711 KB** | **−90%** |

Compressed with `@gltf-transform/cli` — Draco for geometry, WebP for textures,
`weld` + `prune` first. Run through `npx`, not added to `package.json`: it is a
one-off asset step, not a runtime dependency.

**The decoder this made necessary.** `<model-viewer>` ships its own Draco
decoder, so the Object tab kept working and the compression looked finished.
The Reconstruction tab builds its scene by hand with `GLTFLoader`, which has no
decoder unless you give it one — so it silently fell back to "the model file
could not be loaded" while every other check on the page passed. `DRACOLoader`
now points at `/draco/`, two files copied out of `three/examples/jsm/libs`
(188 KB wasm + 57 KB wrapper), fetched only when that tab is opened and never
by the exhibit's first paint. `e2e/reconstruction.spec.ts` guards it, including
that the decoder comes from our own origin rather than a CDN.

**The like-for-like result is the interesting one.** Same page, same code, only
the GLB swapped back to the original:

| | Original GLB | Compressed GLB |
|---|---|---|
| Transferred | 5,130 KiB | 1,334 KiB |
| LCP | 7.1 s | 7.1 s |
| TBT | 510 ms | 1,210 ms |
| Score | 54 | 50 |

Compression cut 3.8 MB and moved the score **down** two points, because the
page's LCP was never waiting on the model — it was waiting on the poster's
second paint. The compressed file also decodes faster, so more of its work
lands inside the TBT window instead of before FCP. Bytes are a real win for a
phone on a museum's Wi-Fi; the score is measuring something else.

### `unoptimized` was doing what it said

Six images were pinned to their source files: the home hero, the home room
strip, every collection card, the exhibit page's aside, the marker thumbnails
and the 3D poster. The card and thumbnail cases were the expensive ones — a
160 px thumbnail downloaded a 100 KB photograph, and the exhibit page shipped
one full-size JPEG twice.

All except the poster now go through the optimizer with `sizes` that match the
layout. The collection drops to **501 KiB** from 953, the home page to **499**
from 763, the room index to **416** from 1,760. The poster keeps its direct
fetch on purpose: it is the LCP image, 100 KB, and the optimizer would add a
round trip in front of the paint we just fought for.

Cards also learned where they are. `ExhibitCard` takes an `eager` flag and the
first three cards of a grid — the row that is above the fold — are fetched
eagerly instead of waiting for the lazy-load intersection. On `/rooms` that
alone moved LCP from **11.1 s to 2.3 s**: the panorama thumbnails were being
discovered after a full second of layout.

## Deferred three.js

`@google/model-viewer` bundles three.js: ~400 KB of script evaluation that has
nothing to do with the first paint. It is now imported after the poster's
`load` event, on a `requestIdleCallback` with a 2.5 s cap, with a `setTimeout`
fallback for browsers without idle callbacks and for background tabs (idle time
and frames both stop there, so a hidden tab would otherwise never load the
model).

The cost is visible in the numbers and worth stating plainly: the parse used to
happen *before* first contentful paint and delay it; now it happens after, so
FCP improved to 1.9 s and **TBT carries the same work**. On the exhibit page
that is 1.2–3.3 s of lab-TBT under a 4× CPU throttle. The object still arrives
~1–3 s after the photograph on real hardware.

If the exhibit page needs to go higher than 60, the next step is not a smaller
bundle — it is not loading three.js until asked: a poster with a "View in 3D"
button that imports the viewer on intent would take TBT to nearly zero and
leave LCP untouched. That is a product decision about whether the object should
appear on its own, so it is not made here.

## Smaller things that were already right

- `next/image` everywhere, with `sizes` that match the layout.
- No third-party scripts. The two "third-party" requests in the trace are the
  Google Fonts *files* served from our own origin by `next/font`.
- `ReconstructionViewer` (the clay/wireframe tab) is already a `dynamic()`
  import, so its three.js only exists after someone opens that tab.
- Zero layout shift: every image has a fixed aspect box and the hero mask is a
  CSS gradient, not a late-loaded asset.

## Next 16 note: `priority` is deprecated

Next 16 replaced `<Image priority>` with `preload` and the docs now recommend
`loading="eager"` + `fetchPriority="high"` in most cases. The four `priority`
uses (home hero, room stage, room viewer backdrop, model poster) were moved to
that pair. Verified through CDP: the poster request goes from `initialPriority:
Low` (a lazy `<img>` behind the bundle it is covering for) to `High`, and no
`<link rel=preload>` is emitted for it — which is what we want, since the
poster is discovered in the first HTML response anyway.

## Reproduce

```powershell
npm run build
npx next start -p 3100

$env:CHROME_PATH = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
npx --yes lighthouse@12 http://localhost:3100/exhibits/bidri-hookah-base `
  --quiet --chrome-flags="--headless=new --no-sandbox" `
  --throttling-method=devtools --only-categories=performance `
  --output=json --output-path="$env:TEMP\lh-exhibit.json"
```

Do not run `next build` while `next dev` is running — it overwrites `.next` and
Turbopack then serves stale CSS and modules (hit three times this week).

## Files that carry the change

- `src/components/three/ModelViewer.tsx` — poster moved out of the slot,
  deferred import with idle cap, eager/high-priority poster.
- `src/components/room/RoomStage.tsx`, `src/components/room/RoomViewer.tsx` —
  still through the optimizer, eager/high priority.
- `src/app/page.tsx` — hero off the deprecated prop, room strip optimised.
- `src/app/rooms/page.tsx` — panorama cards optimised, first row eager.
- `src/components/exhibit/ExhibitCard.tsx`, `src/components/exhibit/ExhibitBrowser.tsx`,
  `src/app/exhibits/page.tsx` — sized, optimised card images; `eager` for the
  first row.
- `src/app/exhibits/[slug]/page.tsx`, `src/app/markers/page.tsx` — same, for
  the aside and the print thumbnails.
- `public/models/*.glb`, `public/panoramas/*.webp` — re-encoded assets.
- `prisma/seed.ts` — panorama paths now `.webp`.
