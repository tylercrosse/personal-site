import { expect, test } from "@playwright/test";

const articlePath = "/ideas/2026/eval-saturation/";
const externalHref = "https://x.com/tobyordoxford/status/2018986170324054064";

test.beforeEach(async ({ page }) => {
  await page.goto(articlePath);
});

test("external body links open in a new tab, accessibly", async ({ page }) => {
  const link = page.locator(`article a[href="${externalHref}"]`).first();

  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", /noopener/);
  // Referrer is preserved on purpose, so noreferrer must NOT be present.
  await expect(link).not.toHaveAttribute("rel", /noreferrer/);
  await expect(link).toHaveAttribute("data-external", "");
  await expect(link.locator(".sr-only")).toHaveText(/opens in a new tab/);

  await expect
    .poll(() =>
      link.evaluate((element) => getComputedStyle(element, "::after").content),
    )
    .toContain("↗");
});

test("internal and in-page links keep single-click navigation", async ({
  page,
}) => {
  // The References list is handled by the citation pipeline, not re-marked.
  await expect(page.locator("#refs a[data-external]")).toHaveCount(0);
  // In-page citation anchors (# links) are never treated as external.
  await expect(page.locator(".citation-reference a[data-external]")).toHaveCount(
    0,
  );
});
