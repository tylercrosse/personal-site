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

test("references inside captions resolve to the synced number", async ({
  page,
}) => {
  await page.goto("/ideas/2026/llm-morality-mech-interp/");

  // A prose ref renders the reconciled number as a link…
  await expect(
    page.locator('a.figure-reference[data-fig-ref="dla-strategic"]'),
  ).toHaveText("Figure 5");
  // …and an in-caption cross-reference renders the same number as plain,
  // auto-synced text (captions are string props, so no link).
  await expect(page.getByText("Compare to Figure 5", { exact: false })).toBeVisible();
});

test("clicking a reference jumps to its figure", async ({ page }) => {
  await page
    .locator('a.figure-reference[data-fig-ref="attribution-graph-ui"]')
    .click();

  await expect(page).toHaveURL(/#fig-attribution-graph-ui$/);
  await expect(page.locator("#fig-attribution-graph-ui")).toBeInViewport();
});

test("an [eq:] reference links to a numbered equation, and \\label is stripped", async ({
  page,
}) => {
  await page.goto("/ideas/2026/circuits-framework/");

  const ref = page.locator('a.equation-reference[data-eq-ref="attention"]');
  await expect(ref).toHaveText("Equation 1");
  await expect(ref).toHaveAttribute("href", "#eq-attention");

  // The labeled equation shows its number, and the \label was stripped before
  // KaTeX rendered it (regression guard for the caching gotcha).
  await expect(page.locator("#eq-attention .equation-number")).toHaveText("(1)");
  await expect(page.locator("#eq-attention")).not.toContainText("label");
});

test("a [tbl:] reference links to a wrapped, numbered table", async ({
  page,
}) => {
  await page.goto("/ideas/2025/ml-retro/");

  const ref = page.locator('a.table-reference[data-tbl-ref="grading"]');
  await expect(ref).toHaveText("Table 1");
  await expect(ref).toHaveAttribute("href", "#tbl-grading");

  await expect(page.locator("figure#tbl-grading figcaption")).toContainText(
    "Table 1:",
  );
  await expect(page.locator("figure#tbl-grading table")).toHaveCount(1);
});
