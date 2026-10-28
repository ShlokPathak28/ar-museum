import "server-only";

import { revalidatePath } from "next/cache";

/**
 * The public pages that read exhibit data. They are ISR, so a studio save has
 * to bust each one explicitly; forgetting a path means the museum shows the old
 * label for up to a minute.
 */
export function revalidateMuseum(options: { slug?: string; roomSlug?: string } = {}) {
  for (const path of ["/", "/exhibits", "/rooms", "/scan", "/markers", "/credits", "/sitemap.xml"]) {
    revalidatePath(path);
  }

  if (options.slug) {
    revalidatePath(`/exhibits/${options.slug}`);
  }

  if (options.roomSlug) {
    revalidatePath(`/rooms/${options.roomSlug}`);
  }
}
