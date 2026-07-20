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
  await page.getByRole("button", { name: "Export MCF ZIP" }).click();
  await page.getByRole("link", { name: "My Courses" }).click();
  await expect(page.getByRole("heading", { name: "Browser Journey" })).toBeVisible();
  await page.goto("/compile");
  await expect(page.getByRole("heading", { name: "Bring an MCF course." })).toBeVisible();
});

test("direct navigation and mobile layout work", async ({ page }) => {
  await page.goto("/discover");
  await expect(page.getByRole("heading", { name: "Follow your curiosity." })).toBeVisible();
});
