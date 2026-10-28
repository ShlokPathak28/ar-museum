# Asset credits

The same register is published at `/credits`, with source links and the software
stack. This file keeps the reasoning and the report-ready notes.

Dharohar's exhibits are fictional, but the 3D files are real museum scans used as
**visual stand-ins** until each object is scanned. Every 3D file below is CC0
(public domain), so it can be redistributed with the project. The photography is
a mix of CC0 / public domain and CC BY 2.0 — each row says which.

## 3D models

| File | Source | Licence |
| --- | --- | --- |
| `public/models/baluster-vase.glb` | *Baluster vase, from a five-piece garniture* (F1980.191), National Museum of Asian Art — [Smithsonian Open Access 3D](https://3d-api.si.edu/content/document/3d_package:d8c6393a-4ebc-11ea-b77f-2e728ce88125) | CC0 |
| `public/models/stoneware-jug.glb` | *Stoneware jug* by Thomas Commeraw (2011.61), National Museum of African American History and Culture — [Smithsonian Open Access 3D](https://3d-api.si.edu/content/document/3d_package:82adf5d6-5ec4-46cc-9e68-6a4d7c5ea824) | CC0 |
| `public/models/patent-model-box.glb` | *Refrigerator patent model* by Thomas Elkins (2012.113.2), National Museum of African American History and Culture — [Smithsonian Open Access 3D](https://3d-api.si.edu/content/document/3d_package:b91a2ad6-f8dd-4903-a084-90f5c5c8b9e8) | CC0 |
| `public/models/spike-vase.glb` | *GlassVaseFlowers*, Khronos glTF Sample Assets — Eric Chadwick (vase), Rico Cilliers (flowers) | CC0 |

## Room panoramas

Both panoramas are CC0 and are **stand-ins**: they are not the rooms described on
the site. The room pages say so under the viewer.

| File | Source | Licence |
| --- | --- | --- |
| `public/panoramas/material-worlds.webp` | *Museum of Ethnography* by Oliksiy Yakovlyev — [Poly Haven](https://polyhaven.com/a/museum_of_ethnography) | CC0 |
| `public/panoramas/everyday-objects.webp` | *Church Museum* by Dario Barresi — [Poly Haven](https://polyhaven.com/a/church_museum) | CC0 |

Both started as 8192×4096 tonemapped JPGs, were resized to 4096×2048 for the
first build, then re-encoded to **3072×1536 WebP** (743 KB and 690 KB) in the
week-5 performance pass. 3072 is where the seams and the carved detail still
hold on a projector; a phone decodes it without a long wait. The object markers
are placed by hand on the image, not measured with a laser.

## Exhibit photography

The hero images are **stand-ins**: each one is a public-domain or openly licensed
photograph of a comparable object, not the object described on the page. The
exhibit pages describe fictional pieces; these photographs give the gallery real
material to look at until the collection is shot properly.

| File | Source | Photographer / credit | Licence |
| --- | --- | --- | --- |
| `public/images/exhibits/terracotta-horse.jpg` | *Terracotta statuette of a horse*, The Metropolitan Museum of Art — [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Terracotta_statuette_of_a_horse_MET_DP-12501-007.jpg) | The Met, Open Access | CC0 |
| `public/images/exhibits/bidri-hookah-base.jpg` | *Hookah Base (India), 19th century*, Cooper Hewitt — [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Hookah_Base_(India),_19th_century_(CH_18389005).jpg) | Cooper Hewitt, Catalog Photo | Public domain |
| `public/images/exhibits/pattachitra-scroll.jpg` | *Pattachitra Painting* — [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Pattachitra_Painting_(17042344385).jpg) | Mike Prince | CC BY 2.0 |
| `public/images/exhibits/brass-measuring-vessel.jpg` | *Ewer in shape of a mythic goose and makara, India*, Newark Museum — [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Ewer_in_shape_of_a_mythic_goose_and_makara,_India,_Newark_Museum.JPG) | Wmpearl | CC0 |
| `public/images/exhibits/kalamkari-fragment.jpg` | *Kalamkari Rumal*, The Metropolitan Museum of Art — [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Kalamkari_Rumal_MET_TP310.jpg) | The Met, Open Access | CC0 |
| `public/images/exhibits/inlaid-writing-box.jpg` | *Writing Box (India), ca. 1740*, Cooper Hewitt — [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Writing_Box_(India),_ca._1740_(CH_18312137).jpg) | Cooper Hewitt, Catalog Photo | Public domain |

Each file was padded onto a 1200×900 chalk-grey plate (contain, not crop) and
saved as JPEG at quality 84, so the objects are never cut off and the six cards
read as one catalogue.

## Notes for the report

- These are **not** scans of the objects described on the exhibit pages. Each
  exhibit that ships a model records this in its `Media` credit field, which the
  UI surfaces next to the viewer.
- The playback stack is `<model-viewer>`: it renders glTF in WebGL and hands the
  same file to ARCore / Quick Look for AR, so one asset serves 3D and AR.
- The GLBs are Draco-compressed with WebP textures (16.5 MB → 1.7 MB). Both
  renderers decode them: `model-viewer` bundles its own decoder, and the
  hand-built `ReconstructionViewer` attaches `DRACOLoader` pointed at
  `/draco/`. The two decoder files are copied from `three/examples/jsm/libs`
  rather than fetched from a CDN, so the demo works on a venue network.
