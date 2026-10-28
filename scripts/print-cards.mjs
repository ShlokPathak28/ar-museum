/**
 * Print the A6 marker cards to a PDF, from whichever origin you name.
 *
 * The cards encode the host the page was opened on (see `src/lib/origin.ts`),
 * so the origin is an argument, not a constant:
 *
 *   npm run print:cards                                  # http://localhost:3000
 *   npm run print:cards -- https://dharohar.vercel.app   # the deployed site
 *   npm run print:cards -- https://10.0.0.5:3000 out.pdf # the LAN address, on the day
 *
 * A committed PDF would bake one origin into every card, which is exactly the
 * failure mode `/markers` was built to avoid. Generate it from the address the
 * phone will actually use, then print it at 100% on A6 card.
 *
 * `preferCSSPageSize` defers to the `@page { size: A6 }` rule in `globals.css`,
 * so the layout here and the browser's Cmd/Ctrl+P stay the same thing.
 */
import { chromium } from "@playwright/test";
import { statSync } from "node:fs";
import { resolve } from "node:path";

const origin = (process.argv[2] ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const out = resolve(process.argv[3] ?? "docs/marker-cards.pdf");
const channel = process.env.PLAYWRIGHT_CHANNEL;

const browser = await chromium.launch({ channel });
const context = await browser.newContext({ ignoreHTTPSErrors: true });
const page = await context.newPage();

try {
  const response = await page.goto(`${origin}/markers`, { waitUntil: "networkidle" });
  if (!response || !response.ok()) {
    throw new Error(`${origin}/markers returned ${response?.status() ?? "no response"}`);
  }

  // The QR codes are inline SVG, but each card also carries a photograph. A PDF
  // taken before those decode prints grey boxes.
  await page.waitForFunction(() =>
    Array.from(document.images).every((image) => image.complete && image.naturalWidth > 0),
  );

  const cards = await page.locator(".markers-page article").count();
  if (cards === 0) throw new Error("No cards rendered — is the collection published?");

  await page.pdf({
    path: out,
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: false,
  });

  const { size } = statSync(out);
  console.log(`${cards} cards → ${out} (${Math.round(size / 1024)} KB), encoded from ${origin}`);
} finally {
  await browser.close();
}
