import { expect, test, type Page } from "@playwright/test";

async function primaryLink(page: Page, name: string) {
  const menu = page.getByRole("button", { name: "Toggle navigation menu" });
  if (await menu.isVisible()) await menu.click();
  return page.getByRole("link", { name, exact: true });
}

test("browse, learn, author, and open compiler", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Explore, study, and create." })).toBeVisible();
  await page.getByRole("link", { name: "Discover courses" }).click();
  const basicArithmetic = page.getByRole("link", { name: /Basic Arithmetic/ });
  await basicArithmetic.scrollIntoViewIfNeeded();
  await expect(basicArithmetic).toBeInViewport();
  await basicArithmetic.press("Enter");
  await page.getByRole("button", { name: "Start course" }).click();
  await expect(page.getByText("Lesson 1 of 6")).toBeVisible();
  await page.getByRole("button", { name: "Mark notes complete" }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Notes completed ✓" })).toBeDisabled();
  await (await primaryLink(page, "Create")).click();
  await page.getByLabel("Title").first().fill("Browser Journey");
  await expect(page.getByText(/Saved locally/)).toBeVisible();
  const sourceDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export MCF ZIP" }).click();
  const sourcePath = await (await sourceDownload).path();
  expect(sourcePath).toBeTruthy();
  await (await primaryLink(page, "My Courses")).click();
  await expect(page.getByRole("heading", { name: "Browser Journey" })).toBeVisible();
  await page.goto("/compile");
  await expect(page.getByRole("heading", { name: "Compile an MCF course" })).toBeVisible();
  await page.getByLabel("Choose ZIP or files").setInputFiles(sourcePath!);
  await page.getByRole("button", { name: "Validate and compile" }).click();
  await expect(page.getByText("Compiled successfully")).toBeVisible();
  const compiledDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download Theoria ZIP" }).click();
  expect(await (await compiledDownload).path()).toBeTruthy();
});

test("direct navigation and mobile layout work", async ({ page }) => {
  await page.goto("/discover");
  await expect(page.getByRole("heading", { name: "Discover courses" })).toBeVisible();
});

test("top-level navigation resets scroll while browser history remains usable", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await (await primaryLink(page, "Discover")).click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Explore, study, and create." })).toBeVisible();
});
