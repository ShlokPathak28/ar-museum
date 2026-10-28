import { expect, test } from "@playwright/test";

/**
 * The scans ship Draco-compressed (16.5 MB of GLB became 1.7 MB). model-viewer
 * bundles its own decoder, but the reconstruction tab builds a three.js scene by
 * hand, so it needs one too — without it the tab sat on "the model file could
 * not be loaded" while every other check on the page passed.
 */
test("the reconstruction tab decodes a compressed scan and switches material", async ({ page }) => {
  const decoderRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/draco/")) decoderRequests.push(request.url());
  });
  const failures: string[] = [];
  page.on("response", (response) => {
    if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);
  });

  await page.goto("/exhibits/bidri-hookah-base");
  await page.getByRole("button", { name: "Reconstruction" }).click();

  await expect(page.locator("canvas")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/Preparing the reconstruction/)).toHaveCount(0, { timeout: 30_000 });
  await expect(page.getByText(/could not be shown|WebGL is unavailable/)).toHaveCount(0);

  for (const material of ["Clay", "Wireframe", "Textured"]) {
    await page.getByRole("button", { name: material, exact: true }).click();
    await expect(page.getByRole("button", { name: material, exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  }

  const origin = new URL(page.url()).origin;
  expect(decoderRequests.length, "the Draco decoder should be fetched").toBeGreaterThan(0);
  expect(
    decoderRequests.every((url) => url.startsWith(origin)),
    "the decoder must come from our own origin, not a CDN",
  ).toBe(true);
  expect(failures.filter((entry) => /\.glb|\.wasm|\.js$/.test(entry))).toEqual([]);
});
