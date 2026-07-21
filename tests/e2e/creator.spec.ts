import { expect, test } from "@playwright/test";

test("creator keeps cover and reusable assets separate and can delete structure", async ({
  page,
}) => {
  await page.goto("/create");
  await expect(page.getByRole("heading", { name: "Assets" })).toBeVisible();

  const assetInput = page.locator("label.asset-upload input");
  await assetInput.setInputFiles({
    name: "river.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"/>'),
  });
  await expect(page.getByText("assets/river.svg")).toBeVisible();
  await page.getByRole("button", { name: "Remove" }).click();
  await expect(page.getByText("assets/river.svg")).not.toBeVisible();

  await page.getByRole("button", { name: "+ Chapter" }).click();
  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByRole("button", { name: "Delete chapter" }).click();
  await page.getByRole("button", { name: "+ Lesson" }).click();
  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByRole("button", { name: "Delete New lesson" }).click();
});
