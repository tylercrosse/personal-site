import { expect, test } from "@playwright/test";

const articlePath = "/ideas/2026/circuits-attribution-graphs/";

test.beforeEach(async ({ page }) => {
  await page.goto(articlePath);
});

test("a [fig:] reference renders as a linked 'Figure N' anchored to its figure", async ({
  page,
}) => {
  const ref = page.locator(
    'a.figure-reference[data-fig-ref="cross-layer-transcoder"]',
  );

  await expect(ref).toHaveText("Figure 1");
  await expect(ref).toHaveAttribute("href", "#fig-cross-layer-transcoder");
  await expect(page.locator("figure#fig-cross-layer-transcoder")).toHaveCount(1);
});

test("reference numbers match the figure caption numbers (incl. forward refs)", async ({
  page,
}) => {
  // Every reference in this article precedes its figure in the DOM, so these
  // exercise forward-reference resolution and the caption/ref number agreement.
  const cases = [
    ["cross-layer-transcoder", 1],
    ["attribution-graph-pruning", 3],
    ["known-answer", 7],
  ] as const;

  for (const [id, n] of cases) {
    await expect(
      page.locator(`a.figure-reference[data-fig-ref="${id}"]`),
    ).toHaveText(`Figure ${n}`);
    await expect(page.locator(`#fig-${id} figcaption`)).toContainText(
      `Figure ${n}:`,
    );
  }
});

test("the |short modifier renders an abbreviated 'Fig. N'", async ({ page }) => {
  await page.goto("/ideas/2025/ml-retro/");
  const ref = page.locator('a.figure-reference[data-fig-ref="svm-margin"]');

  await expect(ref).toHaveText("Fig. 12");
  await expect(ref).toHaveAttribute("href", "#fig-svm-margin");
});

test("clicking a reference jumps to its figure", async ({ page }) => {
  await page
    .locator('a.figure-reference[data-fig-ref="attribution-graph-ui"]')
    .click();

  await expect(page).toHaveURL(/#fig-attribution-graph-ui$/);
  await expect(page.locator("#fig-attribution-graph-ui")).toBeInViewport();
});
