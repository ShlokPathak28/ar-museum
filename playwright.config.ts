import { defineConfig, devices } from "@playwright/test";

/**
 * Two ways to run this:
 *
 *   npm run test:e2e                                  # starts `npm run dev` itself
 *   PLAYWRIGHT_BASE_URL=https://localhost:3000 npm run test:e2e
 *
 * The second form is for the HTTPS dev server used to test AR on a phone: a
 * secure origin with a self-signed cert, hence `ignoreHTTPSErrors`.
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const managesServer = !process.env.PLAYWRIGHT_BASE_URL;
// Set PLAYWRIGHT_CHANNEL=chrome to use an installed browser instead of the
// downloaded one (useful on a machine where the download is blocked).
const channel = process.env.PLAYWRIGHT_CHANNEL;

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  // One worker against `next dev`: the first hit on a route triggers a compile,
  // and a dev reload can land in the middle of a keyboard test. Set
  // PLAYWRIGHT_WORKERS when running against a production build.
  workers: Number(process.env.PLAYWRIGHT_WORKERS ?? 1),
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    ignoreHTTPSErrors: true,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: managesServer
    ? {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
      }
    : undefined,
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], channel } }],
});
