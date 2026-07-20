// @ts-check
import { rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import react from "@astrojs/react";
import pagefind from "astro-pagefind";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeCallouts from "rehype-callouts";
import rehypeKatex from "rehype-katex";
import { unified } from "@astrojs/markdown-remark";
import rehypeArticleCitations from "./src/plugins/rehypeArticleCitations.mjs";
import rehypeExternalLinks from "./src/plugins/rehypeExternalLinks.mjs";
import remarkFigureRefs from "./src/plugins/remarkFigureRefs.mjs";

const isBuild = process.argv.includes("build");
const previewSite =
  process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : undefined;
const site = process.env.SITE_URL || previewSite || "https://tylercrosse.com";

const remarkPlugins = [
  remarkMath,
  remarkGfm,
  [remarkFigureRefs, { dev: !isBuild }],
];
const rehypePlugins = [
  [rehypeKatex, { strict: false }],
  rehypeArticleCitations,
  rehypeCallouts,
  [rehypeExternalLinks, { site }],
];
const viteCacheDir = isBuild
  ? "node_modules/.vite-build"
  : "node_modules/.vite";

const devOnlySocialPreview = {
  name: "dev-only-social-preview",
  hooks: {
    "astro:build:done": async ({ dir }) => {
      await rm(fileURLToPath(new URL("./social-preview/", dir)), {
        recursive: true,
        force: true,
      });
    },
  },
};

// https://astro.build/config
export default defineConfig({
  site,
  compressHTML: true,
  redirects: {
    // Redirect pages from old site to new ones
    "/ideas/git-stash": "/ideas/2020/git-stash",
    "/ideas/nand2tetris-part1": "/ideas/2021/nand2tetris-part1",
    "/ideas/exponential-backoff": "/ideas/2022/exponential-backoff",
    "/ideas/nand2tetris-vm-translator": "/ideas/2022/nand2tetris-vm-translator",
    "/ideas/planting-seeds": "/ideas/2022/planting-seeds",
    "/ideas/python-bitwise-set-and-dicts":
      "/ideas/2022/python-bitwise-set-and-dicts",
    "/ideas/search-engine-fundamentals":
      "/ideas/2022/search-engine-fundamentals",
    "/ideas/language-models": "/ideas/2023/language-models",
    "/ideas/semantic-search": "/ideas/2023/semantic-search",
    "/ideas/tech-debt": "/ideas/2023/tech-debt",
    "/booking-page": "/booking",
  },
  integrations: [
    devOnlySocialPreview,
    mdx(),
    sitemap({
      filter: (page) => {
        const { pathname } = new URL(page);
        return (
          pathname !== "/booking/" &&
          pathname !== "/booking-page/" &&
          pathname !== "/social-preview/"
        );
      },
    }),
    react(),
    pagefind(),
  ],
  vite: {
    cacheDir: viteCacheDir,
  },
  markdown: {
    processor: unified({ remarkPlugins, rehypePlugins }),
    shikiConfig: {
      themes: {
        light: "solarized-light",
        dark: "solarized-dark",
      },
      wrap: true,
    },
    syntaxHighlight: {
      type: "shiki",
      excludeLangs: ["mermaid"],
    },
  },
});
