import type { MetadataRoute } from "next";

import { absoluteUrl, siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Admin, API surface, throwaway spikes, print sheets and QR redirects
        // have no search value — and `/x/*` would log a scan per crawl.
        disallow: ["/studio", "/api/", "/spike", "/markers", "/x/"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: siteUrl,
  };
}
