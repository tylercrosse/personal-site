// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import pagefind from "astro-pagefind";
import remarkGfm from "remark-gfm";
import rehypeCitation from "rehype-citation";

// https://astro.build/config
export default defineConfig({
  site: "https://tylercrosse.com",
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
    ],
    shikiConfig: {
      themes: {
        light: "solarized-light",
        dark: "solarized-dark",
      },
      wrap: true,
    },
  },
});
