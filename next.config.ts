import type { NextConfig } from "next";

/**
 * Next 16 refuses to serve `/_next/*` dev assets to origins it doesn't know,
 * which silently breaks hydration on a phone loading the app over the LAN.
 * The list lives in .env because the LAN address changes with every network.
 */
const allowedDevOrigins = (process.env.DEV_ALLOWED_ORIGINS ?? "172.19.227.217")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  allowedDevOrigins,
  experimental: {
    // A model upload is a Server Action carrying up to 4 MB of bytes (the cap
    // in src/lib/model-upload.ts) plus multipart overhead. This matches Vercel's
    // own 4.5 MB function-body ceiling, so the two limits agree; a larger value
    // here could never be reached in production, and a smaller one would reject
    // a legitimate 4 MB file. Anything bigger is refused in the browser before
    // it is sent, and by inspectGlb if it arrives anyway.
    serverActions: { bodySizeLimit: "4.5mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
