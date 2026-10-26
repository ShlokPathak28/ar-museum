"use client";

import { createAuthClient } from "better-auth/react";

/**
 * Browser-side auth client. It defaults to the current origin, so the same
 * build works on localhost, on the LAN HTTPS address, and in production.
 */
export const authClient = createAuthClient();

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
};
