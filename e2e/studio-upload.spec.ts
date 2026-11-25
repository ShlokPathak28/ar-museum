import { readFileSync } from "node:fs";

import { expect, test } from "@playwright/test";

import { MAX_MODEL_BYTES } from "@/lib/model-upload";

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

test("a file over the cap is refused in the browser, before it is sent", async ({ page }) => {
  await signIn(page, ADMIN);
  await openDraft(page);

  let uploads = 0;
  page.on("request", (request) => {
    if (request.method() === "POST") uploads += 1;
  });

  const started = Date.now();
  await page.getByLabel("GLB file").setInputFiles({
    name: "a-raw-export.glb",
    mimeType: "model/gltf-binary",
    buffer: Buffer.alloc(MAX_MODEL_BYTES + 1024),
  });

  // The answer comes from the name and size alone, so it is immediate.
  await expect(page.getByRole("alert").filter({ hasText: "The cap is 4.0 MB" })).toBeVisible();
  expect(Date.now() - started).toBeLessThan(5_000);

  // The rejected file is cleared, not queued: pressing Upload cannot send it.
  await page.getByRole("button", { name: /^(Upload|Replace) model$/ }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Choose a .glb file first." })).toBeVisible();
  expect(uploads).toBe(0);
});

test("the uploader has its own section, and the list links straight to it", async ({ page }) => {
  await signIn(page, ADMIN);

  // A missing model is visible from the list, with a link to the uploader.
  await page.goto("/studio/exhibits?status=DRAFT");
  const addModel = page.getByRole("link", { name: /3D · none — add a model/ }).first();
  await expect(addModel).toBeVisible();
  await addModel.click();

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("group", { name: "The 3D model" })).toBeVisible();
  await expect(page.getByLabel("GLB file")).toBeVisible();
  await expect(page).toHaveURL(/#the-3d-model$/);

  // The same section is reachable from the top of the form, without scrolling.
  const jump = page.getByRole("navigation", { name: "Sections of this form" });
  await expect(jump.getByRole("link", { name: /The 3D model/ })).toBeVisible();

  // Creating an exhibit now carries the picker: the file is staged on the page
  // and uploaded once the row exists, so a new object is one save, not two.
  await page.goto("/studio/exhibits/new");
  await expect(page.getByLabel("GLB file")).toBeVisible();
  await expect(page.getByText("The uploader appears after the first save.")).toHaveCount(0);
});

/**
 * The single-page create path: label and model written together, then removed
 * again so the suite leaves the collection exactly as it found it.
 */
test("a new exhibit and its model are created in one save", async ({ page }) => {
  const TITLE = "E2E Single Page Object";

  async function deleteFixture() {
    await page.goto("/studio/exhibits");
    const link = page.getByRole("link", { name: TITLE });

    // A previous run that failed mid-test leaves the fixture behind.
    if ((await link.count()) === 0) return;

    await link.first().click();
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Delete exhibit" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Exhibits" })).toBeVisible();
  }

  await signIn(page, ADMIN);
  await deleteFixture();

  await page.goto("/studio/exhibits/new");
  await page.getByLabel("Title", { exact: true }).fill(TITLE);
  await page.getByLabel("URL slug").fill("e2e-single-page");
  await page.getByLabel("Short code").fill("ZZ01");
  await page.getByLabel("Era").fill("Modern test");
  await page
    .getByLabel("Summary")
    .fill("A fixture written by the browser suite to prove one save is enough.");
  await page
    .getByLabel("Exhibit text")
    .fill("This object exists so the single-page create flow can be measured end to end.");
  await page.getByLabel("Hero image").fill("/images/exhibits/terracotta-horse.jpg");

  // Both halves of the flow are filled before anything is sent.
  await page.getByLabel("Source and licence").fill("E2E fixture, CC0");
  await page.getByLabel("GLB file").setInputFiles({
    name: "e2e-single-page.glb",
    mimeType: "model/gltf-binary",
    buffer: GLB,
  });

  await page.getByRole("button", { name: "Create exhibit and upload model" }).click();

  await expect(page).toHaveURL(/\/studio\/exhibits\/[a-z0-9]+$/);
  await expect(page.getByRole("heading", { level: 1, name: TITLE })).toBeVisible();

  const field = page.getByLabel("GLB model");
  await expect(field).toHaveValue(/^\/api\/models\/[a-z0-9]+$/);

  const url = await field.inputValue();
  expect((await page.request.get(url)).status()).toBe(200);

  await deleteFixture();

  // Deleting the exhibit takes its stored model with it.
  expect((await page.request.get(url)).status()).toBe(404);
});
