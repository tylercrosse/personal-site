import { expect, test } from "@playwright/test";

test("homepage renders and navigates to ideas", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/");

  await expect(page).toHaveTitle("Home | Tyler Crosse");
  await expect(
    page.getByRole("heading", { level: 1, name: "Tyler Crosse" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recent Work", exact: true })).toBeVisible();
  await expect(page.locator("vite-error-overlay")).toHaveCount(0);

  await page.getByRole("link", { name: /all writing/i }).click();

  await expect(page).toHaveURL(/\/ideas\/?$/);
  await expect(page).toHaveTitle("Ideas | Tyler Crosse");
  await expect(
    page.getByRole("heading", { level: 1, name: "Digital Garden" }),
  ).toBeVisible();
  expect(pageErrors).toEqual([]);
});
