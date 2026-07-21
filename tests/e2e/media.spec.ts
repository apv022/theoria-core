import { expect, test } from "@playwright/test";

test("canonical course covers and reader media load", async ({ page }, testInfo) => {
  await page.goto("/discover");
  const thumbnails = page.locator(".course-cover img");
  await expect(thumbnails).toHaveCount(6);
  await expect
    .poll(() =>
      thumbnails.evaluateAll((images) =>
        images.every((image) => {
          const element = image as HTMLImageElement;
          return element.complete && element.naturalWidth > 0;
        }),
      ),
    )
    .toBe(true);
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-discover-media.png`,
    fullPage: true,
  });

  await page.goto("/courses/ancient-egypt/learn");
  const lessonImage = page.locator(".rich img").first();
  await expect(lessonImage).toBeVisible();
  await expect
    .poll(() =>
      lessonImage.evaluate((image) => {
        const element = image as HTMLImageElement;
        return element.complete && element.naturalWidth > 0;
      }),
    )
    .toBe(true);
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-reader-media.png`,
    fullPage: true,
  });
});
