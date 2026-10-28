import { readFileSync } from "node:fs";

import { expect, test } from "@playwright/test";

import { ADMIN, signIn } from "./accounts";

/**
 * The upload path, end to end: a real GLB through the Studio form, stored as a
 * row, served by a route handler, then detached and deleted.
 *
 * The draft exhibit is the fixture. The suite is documented to run against
 * seeded data, where `kalamkari-fragment` has no model; the test leaves it that
 * way, and clears a leftover from an interrupted run before it starts.
 */
const GLB = readFileSync("public/models/baluster-vase.glb");
const SAVED = "Saved. The public pages have been refreshed.";

// Both tests drive the same draft exhibit, so they take turns rather than race.
test.describe.configure({ mode: "serial" });

async function openDraft(page: import("@playwright/test").Page) {
  await page.goto("/studio/exhibits?status=DRAFT");
  await page.getByRole("link", { name: "Kalamkari Textile Fragment" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

test("an admin uploads a model, the exhibit serves it, and detaching deletes it", async ({
  page,
}) => {
  await signIn(page, ADMIN);
  await openDraft(page);

  const field = page.getByLabel("GLB model");

  // A previous run that failed mid-test leaves an upload attached.
  if ((await field.inputValue()) !== "") {
    const detach = page.getByRole("button", { name: /Detach/ });
    if (await detach.isVisible()) await detach.click();
    await field.fill("");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText(SAVED)).toBeVisible();
  }

  await page.getByLabel("Source and licence").fill("E2E fixture, CC0");
  await page.getByLabel("GLB file").setInputFiles({
    name: "e2e-upload.glb",
    mimeType: "model/gltf-binary",
    buffer: GLB,
  });
  await page.getByRole("button", { name: /^(Upload|Replace) model$/ }).click();

  await expect(field).toHaveValue(/^\/api\/models\/[a-z0-9]+$/);

  const status = page.getByRole("status").filter({ hasText: "e2e-upload.glb" });
  await expect(status).toContainText("e2e-upload.glb");
  await expect(status).toContainText("Draco-compressed");

  // The source line can be corrected without replacing the file.
  await page.getByLabel("Source and licence").fill("E2E fixture, CC0 — corrected");
  await page.getByRole("button", { name: "Save source line" }).click();
  await expect(page.getByText("Source line saved")).toBeVisible();

  const url = await field.inputValue();
  const response = await page.request.get(url);

  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toBe("model/gltf-binary");
  expect(response.headers()["cache-control"]).toContain("immutable");
  expect((await response.body()).byteLength).toBe(GLB.byteLength);

  // Detaching clears the field; saving deletes the row behind it.
  await page.getByRole("button", { name: /Detach/ }).click();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText(SAVED)).toBeVisible();
  await expect(field).toHaveValue("");

  expect((await page.request.get(url)).status()).toBe(404);
});

test("a file that is not a glTF binary is refused before it is stored", async ({ page }) => {
  await signIn(page, ADMIN);
  await openDraft(page);

  await page.getByLabel("GLB file").setInputFiles({
    name: "not-a-model.glb",
    mimeType: "model/gltf-binary",
    buffer: Buffer.from("this is a text file pretending to be a model"),
  });
  await page.getByRole("button", { name: /^(Upload|Replace) model$/ }).click();

  await expect(page.getByRole("alert").filter({ hasText: "magic bytes" })).toBeVisible();
});
