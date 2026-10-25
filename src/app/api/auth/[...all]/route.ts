import { toNextJsHandler } from "@/lib/better-auth-next-js.mjs";
import { auth } from "@/lib/auth";

export const { GET, POST, PATCH, PUT, DELETE } = toNextJsHandler(auth);
