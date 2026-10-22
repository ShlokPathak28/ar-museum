import "dotenv/config";

import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaLibSql({ url: process.env.DATABASE_URL ?? "file:./prisma/dev.db" }),
});

const ROOMS = [
  {
    slug: "material-worlds",
    name: "Material Worlds",
    floor: "Ground floor",
    panoramaUrl: null,
  },
  {
    slug: "everyday-objects",
    name: "Everyday Objects",
    floor: "First floor",
    panoramaUrl: null,
  },
];

const EXHIBITS = [
  {
    slug: "terracotta-horse",
    code: "TH01",
    title: "Terracotta Horse",
    subtitle: "A toy, a votive, or both?",
    era: "Shunga period",
    yearStart: -200,
    yearEnd: -100,
    room: "material-worlds",
    summary:
      "Moulded from river clay and fired without a kiln, this small horse was probably a child's toy that doubled as a votive offering.",
    body: `Terracotta figurines like this one were made in enormous numbers across the Gangetic plain. The clay was pressed into a two-part mould, joined by hand, and fired in an open pit — which is why the surface is uneven and the colour shifts from buff to grey.

Look closely at the legs: they are too thin to support the body, a sign the object was never meant to stand for long. Many were deposited in tanks and buried near shrines.

The museum's example was acquired in the 1920s and has been in the collection since. Its left ear is a modern restoration, deliberately left visible.`,
    facts: JSON.stringify([
      "Hand-moulded in two parts, then joined",
      "Fired in an open pit, not a kiln",
      "The legs were never strong enough to stand",
    ]),
    heroImage: "/images/exhibits/terracotta-horse.svg",
    tags: "terracotta,sculpture,votives",
    status: "PUBLISHED",
    hotspots: [
      {
        label: "Joined seam",
        body: "The ridge along the neck is where the two mould halves were pressed together.",
        posX: 0.1,
        posY: 0.18,
        posZ: 0,
        order: 1,
      },
      {
        label: "Restored ear",
        body: "Reconstructed in the 1920s and intentionally left a different tone.",
        posX: -0.12,
        posY: 0.29,
        posZ: 0.02,
        order: 2,
      },
    ],
  },
  {
    slug: "bidri-hookah-base",
    code: "BH02",
    title: "Bidri Hookah Base",
    subtitle: "Black metal, silver memory",
    era: "Deccan Sultanates",
    yearStart: 1650,
    yearEnd: 1700,
    room: "material-worlds",
    summary:
      "Bidriware gets its black surface from a soil treatment unique to Bidar. The silver inlay was hammered in before the final dip.",
    body: `The body is an alloy of zinc and copper, cast and turned on a lathe. The engraver cut shallow channels, tapped in silver wire, then rubbed the surface flat.

The blackening is the clever part: the object is buried in a paste of soil from the Bidar fort, which is high in ammonium salts. The paste darkens the alloy but leaves the silver bright.

This base once held a hookah; the pipe and bowl are lost.`,
    facts: JSON.stringify([
      "Zinc-copper alloy, not iron",
      "Blackened with fort soil rich in ammonium salts",
      "Silver inlay added before the final dip",
    ]),
    heroImage: "/images/exhibits/bidri-hookah-base.svg",
    tags: "metalwork,bidri,deccan",
    status: "PUBLISHED",
    hotspots: [
      {
        label: "Silver inlay",
        body: "Thin silver wire hammered into cut channels, then polished flush.",
        posX: 0.05,
        posY: 0.1,
        posZ: 0.12,
        order: 1,
      },
    ],
  },
  {
    slug: "pattachitra-scroll",
    code: "PS03",
    title: "Pattachitra Scroll",
    subtitle: "A story meant to be unrolled",
    era: "Odisha, 19th century",
    yearStart: 1850,
    yearEnd: 1900,
    room: "material-worlds",
    summary:
      "Cloth stiffened with tamarind-seed paste, painted with mineral colours, and read aloud panel by panel.",
    body: `Pattachitra means "picture on cloth". The cloth is coated with a paste of tamarind seeds and chalk, dried, then burnished with a stone until the surface takes paint without bleeding.

The scrolls were performed, not displayed: a singer would unroll one panel at a time and narrate the story. This example is only a fragment — the first and last panels are missing, so the narrative is incomplete.

Red comes from vermilion, yellow from orpiment, black from lamp soot.`,
    facts: JSON.stringify([
      "Cloth primed with tamarind seed and chalk",
      "Made to be narrated, panel by panel",
      "Mineral pigments: vermilion, orpiment, soot",
    ]),
    heroImage: "/images/exhibits/pattachitra-scroll.svg",
    tags: "textile,painting,odisha",
    status: "PUBLISHED",
  },
  {
    slug: "brass-measuring-vessel",
    code: "MV04",
    title: "Brass Measuring Vessel",
    subtitle: "A standard, kept in metal",
    era: "Maratha period",
    yearStart: 1750,
    yearEnd: 1800,
    room: "everyday-objects",
    summary:
      "A graduated vessel used by grain merchants. Its rim carries a stamp that told a buyer which standard it was made to.",
    body: `Before uniform national standards, a market's reputation rested on objects like this. The vessel is graduated by hammering the interior wall outward in steps, each step a fixed volume.

The stamp on the rim is worn but legible: a Devanagari numeral and a maker's mark. Stamps were a form of accountability — a false measure could be seized and broken.

The dent on one side is post-acquisition damage, recorded in the 1974 condition report.`,
    facts: JSON.stringify([
      "Graduated by hammering the wall outward",
      "Rim stamp names the standard and the maker",
      "False measures could be seized and destroyed",
    ]),
    heroImage: "/images/exhibits/brass-measuring-vessel.svg",
    tags: "brass,measurement,trade",
    status: "PUBLISHED",
  },
  {
    slug: "kalamkari-fragment",
    code: "KT05",
    title: "Kalamkari Textile Fragment",
    subtitle: "Drawn with a pen, dyed in stages",
    era: "Coromandel Coast",
    yearStart: 1700,
    yearEnd: 1750,
    room: "everyday-objects",
    summary:
      "A trade cloth made for export, its borders simplified for a market that wanted pattern more than story.",
    body: `Kalamkari is drawn, not printed: the outlines are applied with a bamboo pen (kalam) using a resist of wax and iron salts.

This fragment is a late example made for the European trade. The central figures are traditional, but the border has been reduced to repeating florals — a concession to buyers who read the pattern as decoration rather than narrative.

The indigo has survived better than the madder red, which has faded to a warm brown.`,
    facts: JSON.stringify([
      "Drawn with a bamboo pen, not block printed",
      "Made for export, borders simplified",
      "Indigo outlasted the madder red",
    ]),
    heroImage: "/images/exhibits/kalamkari-fragment.svg",
    tags: "textile,trade,dye",
    status: "PUBLISHED",
  },
  {
    slug: "inlaid-writing-box",
    code: "WB06",
    title: "Bone-Inlaid Writing Box",
    subtitle: "A portable office",
    era: "Rajasthan, 19th century",
    yearStart: 1850,
    yearEnd: 1900,
    room: "everyday-objects",
    summary:
      "Sheesham wood with bone inlay, holding a pen case, inkwell and a folding writing surface.",
    body: `The box opens in two stages: the lid lifts to reveal a shallow tray, which itself hinges forward to become a sloped writing surface.

Inside, a compartmented tray held reed pens, a small inkwell and a sand shaker for blotting. The bone inlay is set into a bed of lac and sanded flush — a technique shared across Rajasthan and Sindh.

Boxes like this travelled with clerks and scribes, which is why so many survive with repaired hinges.`,
    facts: JSON.stringify([
      "Lid converts into a sloped writing surface",
      "Compartmented tray for pens, ink and blotting sand",
      "Bone inlay set in lac, sanded flush",
    ]),
    heroImage: "/images/exhibits/inlaid-writing-box.svg",
    tags: "woodwork,inlay,writing",
    status: "DRAFT",
  },
];

const TOURS = [
  {
    slug: "craft-and-trade",
    title: "Craft & Trade",
    description:
      "Three objects that show how technique travelled further than the people who made it.",
    theme: "Materials",
    durationMin: 25,
    stops: [
      ["terracotta-horse", "Start with the cheapest material in the room."],
      ["bidri-hookah-base", "Then a technique that could not travel — the soil stayed in Bidar."],
      ["kalamkari-fragment", "And a cloth designed for strangers."],
    ] as const,
  },
  {
    slug: "everyday-rituals",
    title: "Everyday Rituals",
    description: "Measuring, writing, listening: the objects of an ordinary day.",
    theme: "Daily life",
    durationMin: 20,
    stops: [
      ["brass-measuring-vessel", "How a market agreed on a number."],
      ["inlaid-writing-box", "How a scribe carried their office."],
      ["pattachitra-scroll", "How a story was performed."],
    ] as const,
  },
];

async function main() {
  console.log("Seeding Dharohar…");

  // Delete in dependency order so re-running is safe in development.
  await prisma.stamp.deleteMany();
  await prisma.scan.deleteMany();
  await prisma.review.deleteMany();
  await prisma.tourStop.deleteMany();
  await prisma.tour.deleteMany();
  await prisma.hotspot.deleteMany();
  await prisma.media.deleteMany();
  await prisma.exhibit.deleteMany();
  await prisma.room.deleteMany();

  const rooms = new Map<string, string>();
  for (const room of ROOMS) {
    const created = await prisma.room.create({ data: room });
    rooms.set(room.slug, created.id);
  }

  const exhibits = new Map<string, string>();
  for (const { room, hotspots, ...exhibit } of EXHIBITS) {
    const roomId = rooms.get(room);
    if (!roomId) throw new Error(`Unknown room: ${room}`);

    const created = await prisma.exhibit.create({
      data: {
        ...exhibit,
        roomId,
        hotspots: hotspots ? { create: hotspots } : undefined,
      },
    });
    exhibits.set(created.slug, created.id);
  }

  for (const { stops, ...tour } of TOURS) {
    await prisma.tour.create({
      data: {
        ...tour,
        status: "PUBLISHED",
        stops: {
          create: stops.map(([slug, blurb], position) => {
            const exhibitId = exhibits.get(slug);
            if (!exhibitId) throw new Error(`Unknown exhibit: ${slug}`);
            return { exhibitId, position, blurb };
          }),
        },
      },
    });
  }

  const [roomCount, exhibitCount, tourCount] = await Promise.all([
    prisma.room.count(),
    prisma.exhibit.count(),
    prisma.tour.count(),
  ]);

  console.log(
    `Done. ${roomCount} rooms · ${exhibitCount} exhibits · ${tourCount} tours`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
