import { expect, test } from "@playwright/test";

const articlePath = "/ideas/2025/gios-pr4/";

test.beforeEach(async ({ page }) => {
  await page.goto(articlePath);
});

test("content images open a modal viewer and every dismiss path closes it", async ({
  page,
}) => {
  const dialog = page.locator("[data-image-lightbox]");
  const zoomable = page.locator(".prose img.is-zoomable").first();

  // JS marks eligible images.
  await expect(zoomable).toBeVisible();
  await expect(dialog).toBeHidden();

  // Open on click, loads a source into the viewer.
  await zoomable.click();
  await expect(dialog).toBeVisible();
  const viewerImg = dialog.locator("[data-lightbox-img]");
  await expect
    .poll(async () => (await viewerImg.getAttribute("src"))?.length ?? 0)
    .toBeGreaterThan(0);
  await expect
    .poll(() => viewerImg.evaluate((el: HTMLImageElement) => el.naturalWidth))
    .toBeGreaterThan(0);

  // Escape closes.
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  // Close button closes.
  await zoomable.click();
  await expect(dialog).toBeVisible();
  await dialog.locator("[data-lightbox-close]").click();
  await expect(dialog).toBeHidden();

  // Tapping the dark area around the image closes.
  await zoomable.click();
  await expect(dialog).toBeVisible();
  await page.mouse.click(8, 8);
  await expect(dialog).toBeHidden();
});

test("linked and opted-out images are not made zoomable", async ({ page }) => {
  // Sanity: images inside links must never get the affordance.
  const linkedImages = page.locator(".prose a img.is-zoomable");
  await expect(linkedImages).toHaveCount(0);
});
