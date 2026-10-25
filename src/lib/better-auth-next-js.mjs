// NOTE: This project used to vendor-copy the Next.js integration helper from the
// installed better-auth package and then re-export only the two symbols it used.
//
// That worked only by using a Node require shim tied to this file's own URL, so it
// could reach better-auth internals that are not part of its public package exports
// map. That is fragile: it depends on better-auth internal file paths and breaks as
// soon as better-auth stops exposing those paths under `node_modules/better-auth`.
//
// The wrapper below replaces that with the public better-auth/next-js export:
//   "./next-js" -> ./dist/integrations/next-js.mjs
//
// It still keeps the same tiny surface for the route file; the route file itself can
// be simplified later if it does not need the vendored wrapper anymore.

import { nextCookies, toNextJsHandler } from "better-auth/next-js";

export { nextCookies, toNextJsHandler };
