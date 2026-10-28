import type { MetadataRoute } from "next";

import { prisma } from "@/lib/db";
import { absoluteUrl } from "@/lib/site";

// The collection changes from the studio, rarely, so an hourly sitemap is fine.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [exhibits, rooms] = await Promise.all([
    prisma.exhibit.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
      orderBy: { code: "asc" },
    }),
    prisma.room.findMany({
      select: { slug: true, updatedAt: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return [
    {
      url: absoluteUrl("/"),
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: absoluteUrl("/exhibits"),
      lastModified: exhibits[0]?.updatedAt ?? new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/rooms"),
      lastModified: rooms[0]?.updatedAt ?? new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: absoluteUrl("/scan"),
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: absoluteUrl("/credits"),
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    ...exhibits.map((exhibit) => ({
      url: absoluteUrl(`/exhibits/${exhibit.slug}`),
      lastModified: exhibit.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...rooms.map((room) => ({
      url: absoluteUrl(`/rooms/${room.slug}`),
      lastModified: room.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
