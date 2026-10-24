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
