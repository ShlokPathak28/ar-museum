import "server-only";

import { headers } from "next/headers";

import { auth } from "@/lib/auth";

export type Viewer =
  | {
      user: {
        id: string;
        name: string;
        email: string;
        role: string;
        image?: string | null;
      };
      session: { id: string; expiresAt: Date };
    }
  | null;

/**
 * The signed-in visitor, or null. Reads the request cookies through
 * `headers()`, so it works in Server Components, layouts and Server Actions.
 */
export async function getViewer(): Promise<Viewer> {
  try {
    return (await auth.api.getSession({ headers: await headers() })) as Viewer;
  } catch {
    // A broken or expired cookie must render as "signed out", not a 500.
    return null;
  }
}

export async function isAdmin(): Promise<boolean> {
  const viewer = await getViewer();
  return viewer?.user.role === "ADMIN";
}
