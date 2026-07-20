import { expect, test } from "@playwright/test";

test("browse, learn, author, and open compiler", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Read deeply. Build openly." })).toBeVisible();
  await page.getByRole("link", { name: "Discover courses" }).click();
  await page.getByRole("link", { name: /Basic Arithmetic/ }).click();
  await page.getByRole("link", { name: "Start learning" }).click();
  await expect(page.getByText("Lesson 1 of 6")).toBeVisible();
  await page.getByRole("button", { name: "Mark notes complete" }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Notes completed ✓" })).toBeDisabled();
  await page.getByRole("link", { name: "Create" }).click();
  await page.getByLabel("Title").first().fill("Browser Journey");
  await expect(page.getByText(/Saved locally/)).toBeVisible();
  const sourceDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export MCF ZIP" }).click();
  const sourcePath = await (await sourceDownload).path();
  expect(sourcePath).toBeTruthy();
  await page.getByRole("link", { name: "My Courses" }).click();
  await expect(page.getByRole("heading", { name: "Browser Journey" })).toBeVisible();
  await page.goto("/compile");
  await expect(page.getByRole("heading", { name: "Bring an MCF course." })).toBeVisible();
  await page.getByLabel("Choose ZIP or files").setInputFiles(sourcePath!);
  await page.getByRole("button", { name: "Validate and compile" }).click();
  await expect(page.getByText("Compiled successfully")).toBeVisible();
  const compiledDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download Theoria ZIP" }).click();
  expect(await (await compiledDownload).path()).toBeTruthy();
});

test("direct navigation and mobile layout work", async ({ page }) => {
  await page.goto("/discover");
  await expect(page.getByRole("heading", { name: "Follow your curiosity." })).toBeVisible();
});
