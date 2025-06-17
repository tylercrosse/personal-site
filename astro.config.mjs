// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import pagefind from "astro-pagefind";
import remarkGfm from "remark-gfm";
import rehypeCitation from "rehype-citation";
import rehypeMermaid from "rehype-mermaid";
import rehypeCallouts from "rehype-callouts";

// https://astro.build/config
export default defineConfig({
  site: "https://tylercrosse.com",
  redirects: {
    // Redirect pages from old site to new ones
    "/ideas/git-stash": "/ideas/2020/git-stash",
    "/ideas/nand2tetris-part1": "/ideas/2021/nand2tetris-part1",
    "/ideas/exponential-backoff": "/ideas/2022/exponential-backoff",
    "/ideas/nand2tetris-vm-translator": "/ideas/2022/nand2tetris-vm-translator",
    "/ideas/planting-seeds": "/ideas/22022/planting-seeds",
    "/ideas/python-bitwise-set-and-dicts":
      "/ideas/2022/python-bitwise-set-and-dicts",
    "/ideas/search-engine-fundamentals":
      "/ideas/2022/search-engine-fundamentals",
    "/ideas/language-models": "/ideas/2023/language-models",
    "/ideas/semantic-search": "/ideas/2023/semantic-search",
    "/ideas/tech-debt": "/ideas/2023/tech-debt",
  },
  integrations: [mdx(), sitemap(), pagefind()],
  markdown: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [
      [
        rehypeCitation,
        {
          bibliography: "src/references.bib",
          linkCitations: true,
          showTooltips: true,
          tooltipAttribute: "data-tooltip",
        },
      ],
      rehypeMermaid,
      rehypeCallouts,
    ],
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
