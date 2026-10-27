import "server-only";

import { notFound, redirect } from "next/navigation";

import { getViewer } from "@/lib/session";

/**
 * The studio's only gate. Called by the layout (so no admin chrome ever
 * renders) and again by every Server Action, because an action is a public
 * endpoint and the layout's check does not protect it.
 *
 * A signed-out visitor is sent to sign in with a way back; a signed-in visitor
 * who is not an admin gets a 404 rather than a 403, so the route's existence
 * is not confirmed to them.
 */
export async function requireAdmin(next = "/studio") {
  const viewer = await getViewer();

  if (!viewer) {
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  if (viewer.user.role !== "ADMIN") {
    notFound();
  }

  return viewer;
}
