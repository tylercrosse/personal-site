import { expect, test } from "@playwright/test";
import sharp from "sharp";

const coreRoutes = [
  { path: "/", image: "/social/home.jpg", type: "website" },
  { path: "/about/", image: "/social/about.jpg", type: "website" },
  { path: "/ideas/", image: "/social/ideas.jpg", type: "website" },
  {
    path: "/ideas/topics/machine-learning/",
    image: "/social/topics/machine-learning.jpg",
    type: "website",
  },
  {
    path: "/ideas/topics/deep-learning/",
    image: "/social/topics/deep-learning.jpg",
    type: "website",
  },
  {
    path: "/ideas/topics/gpu-computer-architecture/",
    image: "/social/topics/gpu-computer-architecture.jpg",
    type: "website",
  },
  {
    path: "/ideas/topics/operating-systems-distributed-systems/",
    image: "/social/topics/operating-systems-distributed-systems.jpg",
    type: "website",
  },
  {
    path: "/ideas/topics/ai-safety-mechanistic-interpretability/",
    image: "/social/topics/ai-safety-mechanistic-interpretability.jpg",
    type: "website",
  },
];

for (const route of coreRoutes) {
  test(`${route.path} exposes a complete social card`, async ({ page, request }) => {
    await page.goto(route.path);

    const image = page.locator('meta[property="og:image"]');
    const imageUrl = await image.getAttribute("content");

    expect(imageUrl).toBeTruthy();
    expect(new URL(imageUrl!).pathname).toBe(route.image);
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute(
      "content",
      route.type,
    );
    await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute(
      "content",
      "1200",
    );
    await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute(
      "content",
      "630",
    );
    await expect(page.locator('meta[property="og:image:type"]')).toHaveAttribute(
      "content",
      "image/jpeg",
    );
    await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute(
      "content",
      /\S+/,
    );
    await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute(
      "content",
      imageUrl!,
    );

    const response = await request.get(route.image);
    expect(response.ok()).toBeTruthy();
    expect(response.headers()["content-type"]).toContain("image/jpeg");
    const metadata = await sharp(await response.body()).metadata();
    expect(metadata.width).toBe(1200);
    expect(metadata.height).toBe(630);
  });
}

test("posts expose a JPEG article card and article metadata", async ({ page, request }) => {
  await page.goto("/ideas/2026/paper-attack-selection/");

  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute(
    "content",
    "article",
  );
  await expect(
    page.locator('meta[property="article:published_time"]'),
  ).toHaveAttribute("content", /\d{4}-\d{2}-\d{2}T/);

  const imageUrl = await page
    .locator('meta[property="og:image"]')
    .getAttribute("content");
  expect(imageUrl).toBeTruthy();
  const parsedImageUrl = new URL(imageUrl!);
  const imagePath = `${parsedImageUrl.pathname}${parsedImageUrl.search}`;
  expect(
    parsedImageUrl.pathname.endsWith(".jpg") ||
      parsedImageUrl.searchParams.get("f") === "jpg",
  ).toBeTruthy();

  const response = await request.get(imagePath);
  expect(response.ok()).toBeTruthy();
  expect(response.headers()["content-type"]).toContain("image/jpeg");
  const metadata = await sharp(await response.body()).metadata();
  expect(metadata.width).toBe(1200);
  expect(metadata.height).toBe(630);
});

test("the local preview gallery shows core and post cards", async ({ page }) => {
  await page.goto("/social-preview/");

  await expect(
    page.getByRole("heading", { level: 1, name: "Social card preview" }),
  ).toBeVisible();
  await expect(
    page.getByTestId("core-social-cards").locator("figure"),
  ).toHaveCount(8);
  expect(await page.getByTestId("post-social-cards").locator("figure").count()).toBeGreaterThan(20);
});
