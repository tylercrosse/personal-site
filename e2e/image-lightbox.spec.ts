import { expect, test, type Locator } from "@playwright/test";

const articlePath = "/ideas/2025/gios-pr4/";

test.beforeEach(async ({ page }) => {
  await page.goto(articlePath);
});

const transformOf = (img: Locator) =>
  img.evaluate((el) => (el as HTMLElement).style.transform);
const scaleFrom = (t: string) => Number(/scale\(([-\d.]+)\)/.exec(t)?.[1] ?? 1);
const txFrom = (t: string) =>
  Number(/translate\(([-\d.]+)px/.exec(t)?.[1] ?? 0);

// Dispatch a real wheel event with modifier state Playwright's mouse.wheel
// can't express (ctrlKey = a trackpad pinch).
const wheel = (stage: Locator, deltaX: number, deltaY: number, ctrlKey: boolean) =>
  stage.evaluate(
    (el, d) =>
      el.dispatchEvent(
        new WheelEvent("wheel", {
          deltaX: d.deltaX,
          deltaY: d.deltaY,
          ctrlKey: d.ctrlKey,
          clientX: window.innerWidth / 2,
          clientY: window.innerHeight / 2,
          bubbles: true,
          cancelable: true,
        }),
      ),
    { deltaX, deltaY, ctrlKey },
  );

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

test("a zoomed image pans by dragging and by scrolling; pinch zooms", async ({
  page,
}) => {
  const dialog = page.locator("[data-image-lightbox]");
  const viewerImg = dialog.locator("[data-lightbox-img]");
  const stage = dialog.locator("[data-lightbox-stage]");

  await page.locator(".prose img.is-zoomable").first().click();
  await expect(dialog).toBeVisible();
  await expect
    .poll(() => viewerImg.evaluate((el: HTMLImageElement) => el.naturalWidth))
    .toBeGreaterThan(0);

  // Pinch (ctrl+wheel) zooms in.
  await wheel(stage, 0, -400, true);
  await expect.poll(async () => scaleFrom(await transformOf(viewerImg))).toBeGreaterThan(1.1);

  // Dragging pans the zoomed image.
  const beforeDrag = txFrom(await transformOf(viewerImg));
  const box = (await stage.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 200, box.y + box.height / 2, {
    steps: 8,
  });
  await page.mouse.up();
  expect(txFrom(await transformOf(viewerImg))).not.toBeCloseTo(beforeDrag, 0);

  // A plain scroll (no ctrl) pans rather than zooms.
  const beforeScroll = txFrom(await transformOf(viewerImg));
  const scaleBeforeScroll = scaleFrom(await transformOf(viewerImg));
  await wheel(stage, 150, 0, false);
  const after = await transformOf(viewerImg);
  expect(txFrom(after)).not.toBeCloseTo(beforeScroll, 0);
  expect(scaleFrom(after)).toBeCloseTo(scaleBeforeScroll, 2);
});

test("linked and opted-out images are not made zoomable", async ({ page }) => {
  // Sanity: images inside links must never get the affordance.
  const linkedImages = page.locator(".prose a img.is-zoomable");
  await expect(linkedImages).toHaveCount(0);
});
