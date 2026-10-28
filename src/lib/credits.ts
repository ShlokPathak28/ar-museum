/**
 * The asset register behind `/credits`.
 *
 * Dharohar's collection is fictional. Every file here is a real, openly
 * licensed asset standing in for an object the museum has not photographed or
 * scanned yet — so the page says that first, and then names the source and the
 * licence for each one. `docs/CREDITS.md` is the same register in prose; keep
 * the two in step when an asset is replaced.
 */

export type AssetCredit = {
  /** Path in `public/`, or a short name for a software package. */
  file: string;
  /** The work's title as its source gives it. */
  work: string;
  /** Institution, photographer or project. */
  source: string;
  href: string;
  licence: string;
};

export type SoftwareCredit = {
  name: string;
  version: string;
  licence: string;
  href: string;
  /** What it does here, in the register's voice. */
  role: string;
};

export const MODEL_CREDITS: AssetCredit[] = [
  {
    file: "public/models/baluster-vase.glb",
    work: "Baluster vase, from a five-piece garniture (F1980.191)",
    source: "Smithsonian Open Access 3D",
    href: "https://3d-api.si.edu/content/document/3d_package:d8c6393a-4ebc-11ea-b77f-2e728ce88125",
    licence: "CC0",
  },
  {
    file: "public/models/stoneware-jug.glb",
    work: "Stoneware jug, Thomas Commeraw (2011.61)",
    source: "Smithsonian Open Access 3D",
    href: "https://3d-api.si.edu/content/document/3d_package:82adf5d6-5ec4-46cc-9e68-6a4d7c5ea824",
    licence: "CC0",
  },
  {
    file: "public/models/patent-model-box.glb",
    work: "Refrigerator patent model, Thomas Elkins (2012.113.2)",
    source: "Smithsonian Open Access 3D",
    href: "https://3d-api.si.edu/content/document/3d_package:b91a2ad6-f8dd-4903-a084-90f5c5c8b9e8",
    licence: "CC0",
  },
  {
    file: "public/models/spike-vase.glb",
    work: "GlassVaseFlowers — Eric Chadwick (vase), Rico Cilliers (flowers)",
    source: "Khronos glTF Sample Assets",
    href: "https://github.com/KhronosGroup/glTF-Sample-Assets",
    licence: "CC0",
  },
];

export const PANORAMA_CREDITS: AssetCredit[] = [
  {
    file: "public/panoramas/material-worlds.webp",
    work: "Museum of Ethnography",
    source: "Oliksiy Yakovlyev · Poly Haven",
    href: "https://polyhaven.com/a/museum_of_ethnography",
    licence: "CC0",
  },
  {
    file: "public/panoramas/everyday-objects.webp",
    work: "Church Museum",
    source: "Dario Barresi · Poly Haven",
    href: "https://polyhaven.com/a/church_museum",
    licence: "CC0",
  },
];

export const PHOTO_CREDITS: AssetCredit[] = [
  {
    file: "public/images/exhibits/terracotta-horse.jpg",
    work: "Terracotta statuette of a horse",
    source: "The Metropolitan Museum of Art · Wikimedia Commons",
    href: "https://commons.wikimedia.org/wiki/File:Terracotta_statuette_of_a_horse_MET_DP-12501-007.jpg",
    licence: "CC0",
  },
  {
    file: "public/images/exhibits/bidri-hookah-base.jpg",
    work: "Hookah base (India), 19th century (CH 18389005)",
    source: "Cooper Hewitt · Wikimedia Commons",
    href: "https://commons.wikimedia.org/wiki/File:Hookah_Base_(India),_19th_century_(CH_18389005).jpg",
    licence: "Public domain",
  },
  {
    file: "public/images/exhibits/pattachitra-scroll.jpg",
    work: "Pattachitra painting",
    source: "Mike Prince · Wikimedia Commons",
    href: "https://commons.wikimedia.org/wiki/File:Pattachitra_Painting_(17042344385).jpg",
    licence: "CC BY 2.0",
  },
  {
    file: "public/images/exhibits/brass-measuring-vessel.jpg",
    work: "Ewer in the shape of a mythic goose and makara, India",
    source: "Wmpearl · Newark Museum · Wikimedia Commons",
    href: "https://commons.wikimedia.org/wiki/File:Ewer_in_shape_of_a_mythic_goose_and_makara,_India,_Newark_Museum.JPG",
    licence: "CC0",
  },
  {
    file: "public/images/exhibits/kalamkari-fragment.jpg",
    work: "Kalamkari rumal (TP310)",
    source: "The Metropolitan Museum of Art · Wikimedia Commons",
    href: "https://commons.wikimedia.org/wiki/File:Kalamkari_Rumal_MET_TP310.jpg",
    licence: "CC0",
  },
  {
    file: "public/images/exhibits/inlaid-writing-box.jpg",
    work: "Writing box (India), ca. 1740 (CH 18312137)",
    source: "Cooper Hewitt · Wikimedia Commons",
    href: "https://commons.wikimedia.org/wiki/File:Writing_Box_(India),_ca._1740_(CH_18312137).jpg",
    licence: "Public domain",
  },
];

export const SOFTWARE_CREDITS: SoftwareCredit[] = [
  {
    name: "Next.js",
    version: "16.4",
    licence: "MIT",
    href: "https://nextjs.org",
    role: "App Router, RSC, Server Actions, ISR, image optimizer",
  },
  {
    name: "React",
    version: "19.3",
    licence: "MIT",
    href: "https://react.dev",
    role: "the component model, useOptimistic and useTransition",
  },
  {
    name: "Prisma",
    version: "7.10",
    licence: "Apache-2.0",
    href: "https://www.prisma.io",
    role: "schema, migrations, typed client",
  },
  {
    name: "Better Auth",
    version: "1.7",
    licence: "MIT",
    href: "https://www.better-auth.com",
    role: "email + password sessions, roles",
  },
  {
    name: "Tailwind CSS",
    version: "4.3",
    licence: "MIT",
    href: "https://tailwindcss.com",
    role: "design tokens and layout",
  },
  {
    name: "three.js",
    version: "r183",
    licence: "MIT",
    href: "https://threejs.org",
    role: "the reconstruction scene and the 360° room",
  },
  {
    name: "@google/model-viewer",
    version: "4.4",
    licence: "Apache-2.0",
    href: "https://modelviewer.dev",
    role: "glTF rendering, hotspots, AR hand-off",
  },
  {
    name: "Zod",
    version: "4.6",
    licence: "MIT",
    href: "https://zod.dev",
    role: "one schema for form, action and route",
  },
  {
    name: "React Hook Form",
    version: "7.91",
    licence: "MIT",
    href: "https://react-hook-form.com",
    role: "studio and review forms",
  },
  {
    name: "qrcode",
    version: "1.5",
    licence: "MIT",
    href: "https://github.com/soldair/node-qrcode",
    role: "SVG cards and PNG codes",
  },
  {
    name: "qr-scanner",
    version: "1.4",
    licence: "MIT",
    href: "https://github.com/nimiq/qr-scanner",
    role: "the in-browser camera scanner",
  },
  {
    name: "@libsql/client",
    version: "0.18",
    licence: "MIT",
    href: "https://github.com/tursodatabase/libsql-client-ts",
    role: "the SQLite driver behind Prisma",
  },
  {
    name: "Draco",
    version: "3D compression",
    licence: "Apache-2.0",
    href: "https://github.com/google/draco",
    role: "decodes the compressed scans; served from /draco/",
  },
  {
    name: "Fraunces",
    version: "variable",
    licence: "OFL-1.1",
    href: "https://fonts.google.com/specimen/Fraunces",
    role: "display type",
  },
  {
    name: "Instrument Sans",
    version: "variable",
    licence: "OFL-1.1",
    href: "https://fonts.google.com/specimen/Instrument+Sans",
    role: "body type",
  },
  {
    name: "IBM Plex Mono",
    version: "400 / 500",
    licence: "OFL-1.1",
    href: "https://fonts.google.com/specimen/IBM+Plex+Mono",
    role: "codes, labels, accession numbers",
  },
  {
    name: "Vitest",
    version: "4.1",
    licence: "MIT",
    href: "https://vitest.dev",
    role: "the unit suite (dev only)",
  },
  {
    name: "Playwright",
    version: "1.64",
    licence: "Apache-2.0",
    href: "https://playwright.dev",
    role: "the end-to-end suite (dev only)",
  },
  {
    name: "@gltf-transform/cli",
    version: "run via npx",
    licence: "MIT",
    href: "https://gltf-transform.dev",
    role: "one-off asset compression (not a dependency)",
  },
];
