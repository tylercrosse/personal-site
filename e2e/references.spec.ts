import { expect, test } from "@playwright/test";

const articlePath = "/ideas/2026/eval-saturation/";

test.beforeEach(async ({ page }) => {
  await page.goto(articlePath);
});

test("grouped citations preview every source and can be pinned", async ({
  page,
}) => {
  const groupedCitation = page.locator(
    '.citation-reference[id*="ord2025halflife"][id*="kwa2025measuring"]',
  );
  const popover = page.locator("#reference-popover");

  await groupedCitation.hover();

  await expect(popover).toBeVisible();
  await expect(popover.locator(".reference-card")).toHaveCount(2);
  await expect(popover).toContainText(
    "Is There a Half-Life for the Success Rates of AI Agents?",
  );
  await expect(popover).toContainText("Measuring AI Ability to Complete Long Tasks");
  await expect(popover.getByRole("link", { name: "Open source" })).toHaveCount(2);
  await expect(
    popover.getByRole("link", { name: "Jump to reference" }),
  ).toHaveCount(2);

  await popover.hover();
  await page.waitForTimeout(250);
  await expect(popover).toBeVisible();

  await groupedCitation.click();
  await page.mouse.move(5, 5);
  await page.waitForTimeout(250);
  await expect(popover).toBeVisible();

  await page.locator("article > header h1").click();
  await expect(popover).toBeHidden();
});

test("citation previews work from the keyboard and restore focus", async ({
  page,
}) => {
  const citation = page.locator(".citation-reference a").first();
  const popover = page.locator("#reference-popover");

  await citation.focus();
  await expect(popover).toBeVisible();
  await expect(citation).toHaveAttribute("aria-expanded", "true");

  await citation.press("Enter");
  await page.keyboard.press("Escape");

  await expect(popover).toBeHidden();
  await expect(citation).toBeFocused();
  await expect(citation).toHaveAttribute("aria-expanded", "false");
});

test("footnotes use the same preview and retain an end-note fallback", async ({
  page,
}) => {
  const footnote = page
    .locator("p", { hasText: "Recovery cuts the other way" })
    .locator("[data-footnote-ref]");
  const popover = page.locator("#reference-popover");

  await footnote.click();

  await expect(popover).toBeVisible();
  await expect(popover.locator("[data-reference-popover-label]")).toHaveText(
    "Footnote",
  );
  await expect(popover).toContainText(/Ord summarizes Hamilton.s reanalysis here/);
  await expect(popover.getByRole("link", { name: "Jump to footnote" })).toBeVisible();
  await expect(page.locator("[data-footnotes]")).toContainText(
    /Ord summarizes Hamilton.s reanalysis here/,
  );
});

test("small screens keep previews anchored to their citation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const footnote = page.locator("[data-footnote-ref]").first();
  await footnote.click();

  const popover = page.locator("#reference-popover");
  await expect(popover).toBeVisible();
  await page.waitForTimeout(200);
  const [box, triggerBox] = await Promise.all([
    popover.boundingBox(),
    footnote.boundingBox(),
  ]);

  expect(box).not.toBeNull();
  expect(triggerBox).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(844);
  expect(box!.width).toBeLessThan(390);

  const popoverBottom = box!.y + box!.height;
  const triggerBottom = triggerBox!.y + triggerBox!.height;
  const isAbove = popoverBottom <= triggerBox!.y;
  const isBelow = box!.y >= triggerBottom;
  expect(isAbove || isBelow).toBe(true);
  const gap = isAbove ? triggerBox!.y - popoverBottom : box!.y - triggerBottom;
  expect(gap).toBeLessThanOrEqual(12);
});

test("reference cards use compact opaque surfaces in both themes", async ({
  page,
}) => {
  const citation = page
    .locator('.citation-reference[id^="citation--ord2025halflife--"]')
    .last();
  const popover = page.locator("#reference-popover");

  await citation.hover();
  await expect(popover).toBeVisible();

  for (const theme of ["light", "dark"] as const) {
    await page.evaluate((nextTheme) => {
      document.documentElement.setAttribute("data-effective-theme", nextTheme);
    }, theme);

    await expect.poll(async () =>
      popover.evaluate((element) => getComputedStyle(element).backgroundColor),
    ).toBe(theme === "light" ? "rgb(255, 255, 255)" : "rgb(7, 54, 66)");

    await expect.poll(async () =>
      page.evaluate(() => {
        const popoverElement = document.querySelector("#reference-popover");
        if (!popoverElement) return false;
        return (
          getComputedStyle(popoverElement).color ===
          getComputedStyle(document.body).color
        );
      }),
    ).toBe(true);

    const styles = await popover.evaluate((element) => {
      const header = element.querySelector(".reference-popover-header");
      const title = element.querySelector(".reference-card-title");
      return {
        width: element.getBoundingClientRect().width,
        headerHeight: header?.getBoundingClientRect().height ?? Infinity,
        titleFont: title ? getComputedStyle(title).fontFamily : "",
        fontSize: Number.parseFloat(getComputedStyle(element).fontSize),
        titleFontSize: title
          ? Number.parseFloat(getComputedStyle(title).fontSize)
          : 0,
        opacity: getComputedStyle(element).opacity,
      };
    });

    expect(styles.width).toBeLessThanOrEqual(610);
    expect(styles.headerHeight).toBeLessThan(42);
    expect(styles.titleFont).toContain("IBM Plex Sans");
    expect(styles.fontSize).toBeGreaterThanOrEqual(14.4);
    expect(styles.titleFontSize).toBeGreaterThanOrEqual(16);
    expect(styles.opacity).toBe("1");
  }
});

test("the article keeps a linked references section without JavaScript-only data", async ({
  page,
}) => {
  await expect(
    page.getByRole("heading", { level: 2, name: "References" }),
  ).toBeVisible();
  await expect(page.locator("#refs .csl-entry")).toHaveCount(8);
  await expect(page.locator('script[data-reference-data]')).toHaveCount(1);
});

test("references and footnotes use visible numbered lists", async ({ page }) => {
  const references = page.locator("#refs");
  const referenceEntries = references.locator(":scope > .csl-entry");
  const footnoteList = page.locator("[data-footnotes] > ol");
  const footnoteEntries = footnoteList.locator(":scope > li");

  await expect(references).toHaveJSProperty("tagName", "OL");
  await expect(references).toHaveCSS("list-style-type", "decimal");
  await expect(referenceEntries).toHaveCount(8);
  await expect(referenceEntries.first()).toHaveCSS("display", "list-item");

  await expect(footnoteList).toHaveCSS("list-style-type", "decimal");
  await expect(footnoteEntries).toHaveCount(2);
  await expect(footnoteEntries.first()).toHaveCSS("display", "list-item");
});

test("reference URLs are external links with an external-link marker", async ({
  page,
}) => {
  const links = page.locator('#refs a[target="_blank"]');

  await expect(links).toHaveCount(8);
  await expect(links.first()).toHaveAttribute("href", /^https:\/\//);
  await expect(links.first()).toHaveAttribute("rel", /noopener/);
  await expect
    .poll(() =>
      links.first().evaluate((link) => getComputedStyle(link, "::after").content),
    )
    .toContain("↗");
});
