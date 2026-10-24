# Asset credits

Dharohar's exhibits are fictional, but the 3D files are real museum scans used as
**visual stand-ins** until each object is scanned. Every file below is CC0
(public domain), so it can be redistributed with the project.

## 3D models

| File | Source | Licence |
| --- | --- | --- |
| `public/models/baluster-vase.glb` | *Baluster vase, from a five-piece garniture* (F1980.191), National Museum of Asian Art — [Smithsonian Open Access 3D](https://3d-api.si.edu/content/document/3d_package:d8c6393a-4ebc-11ea-b77f-2e728ce88125) | CC0 |
| `public/models/stoneware-jug.glb` | *Stoneware jug* by Thomas Commeraw (2011.61), National Museum of African American History and Culture — [Smithsonian Open Access 3D](https://3d-api.si.edu/content/document/3d_package:82adf5d6-5ec4-46cc-9e68-6a4d7c5ea824) | CC0 |
| `public/models/patent-model-box.glb` | *Refrigerator patent model* by Thomas Elkins (2012.113.2), National Museum of African American History and Culture — [Smithsonian Open Access 3D](https://3d-api.si.edu/content/document/3d_package:b91a2ad6-f8dd-4903-a084-90f5c5c8b9e8) | CC0 |
| `public/models/spike-vase.glb` | *GlassVaseFlowers*, Khronos glTF Sample Assets — Eric Chadwick (vase), Rico Cilliers (flowers) | CC0 |

## Notes for the report

- These are **not** scans of the objects described on the exhibit pages. Each
  exhibit that ships a model records this in its `Media` credit field, which the
  UI surfaces next to the viewer.
- The playback stack is `<model-viewer>`: it renders glTF in WebGL and hands the
  same file to ARCore / Quick Look for AR, so one asset serves 3D and AR.
- Draco-compressed variants exist and are ~6x smaller, but `model-viewer` loads
  its Draco decoder from a CDN. The uncompressed files are used so the demo works
  offline.

## Images

Hero images in `public/images/exhibits/` are original SVG placeholders drawn for
this project — no third-party rights involved.
