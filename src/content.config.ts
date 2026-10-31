import { glob } from "astro/loaders";
import { defineCollection } from "astro:content";
import { z } from "astro/zod";

const ideas = defineCollection({
  // Load Markdown and MDX files in nested directories (Gatsby-style structure)
  loader: glob({
    base: "./src/content/ideas",
    pattern: "**/*.{md,mdx}",
    // This allows loading from subdirectories
  }),
  // Type-check frontmatter using a schema that handles both Astro and Gatsby formats
  schema: ({ image }) =>
    z
      .object({
        title: z.string(),
        description: z.string(),
        // Handle both 'pubDate' (Astro) and 'date' (Gatsby) fields
        pubDate: z.coerce.date().optional(),
        date: z.coerce.date().optional(),
        updated: z.coerce.date().optional(),
        status: z.string().optional(),
        type: z.string().optional(),
        // Publication venue for paper posts (e.g. 'ICML 2026')
        venue: z.string().optional(),
        research: z.object({
          role: z.string(),
          venue: z.string(),
          contribution: z.string(),
          links: z.array(z.object({ label: z.string(), href: z.string().url() })),
        }).optional(),
        heroImage: z.string().optional(),
        // Additional Gatsby fields that might be present
        tags: z.array(z.string()).optional(),
        category: z.array(z.string()).optional(),
        draft: z.boolean().optional(),
        featured: z.boolean().optional(),
        audience: z.string().optional(),
        hero: z
          .object({
            alt: z.string(),
            src: image().optional(),
          })
          .optional(),
        image: z
          .object({
            path: image().optional(),
            alt: z.string(),
            maxWidth: z.string().optional(),
          })
          .optional(),
        // Optional social-only override. Most posts reuse `image`; this exists
        // for a deliberate crop or alternate image when a hero does not fit a
        // wide link-preview card cleanly.
        socialImage: z
          .object({
            path: image().optional(),
            alt: z.string(),
            position: z.string().optional(),
          })
          .optional(),
        hideCaption: z.boolean().optional(),
        media_subpath: z.string().optional(),
        // Parent post relationship (for grouping project posts under retro posts)
        parent: z.string().optional(),
        // Explicit position within a parent's thread, ascending. Falls back to
        // date then title when omitted (see compareSeriesOrder in utils/series.ts).
        order: z.number().optional(),
        // Attribution footer (rendered by PostCredits.astro). See that component
        // for how these compose.
        // Show a "Cite this write-up" block. Only for original, sole-authored
        // pieces — never for the multi-author `paper` posts, whose citation
        // belongs to the venue and full author list.
        cite: z.boolean().optional(),
        // Show the CC BY 4.0 license line. Defaults to `cite` when omitted, so
        // opting into a citation opts into the licence too; set false to suppress.
        license: z.boolean().optional(),
        // Primary source(s) this post is notes on: bib keys that resolve
        // against the article's sibling references.bib. They render inside the
        // auto References section (starred, with a "cite the original" line —
        // see rehypeArticleCitations.mjs) so readers cite the source, not these
        // notes. Citation metadata lives only in the .bib.
        sources: z.array(z.string()).optional(),
        // Third-party media used under licence (TASL attribution). One entry per
        // asset that carries an obligation; public-domain and AI-generated
        // images need none. `title` describes the media. Two ways to name the
        // source, by what the media came from:
        //   - `sourceKey` — a bib key, when the media is a figure from a work
        //     the article cites. Renders as the "Figures:" note under the
        //     References list, citing that work by number.
        //   - `author` + `url` (+ `license`/`licenseUrl`) — when the source is
        //     not a scholarly work (a stock photo, a CC-licensed image). Renders
        //     in the PostCredits footer, where a bibliography entry would not fit.
        credits: z
          .array(
            z.object({
              title: z.string().optional(),
              sourceKey: z.string().optional(),
              author: z.string().optional(),
              url: z.string().optional(),
              license: z.string().optional(),
              licenseUrl: z.string().optional(),
              changes: z.string().optional(),
              // Article-local file(s) this entry covers, relative to the post
              // directory. Provenance only — audited by audit-metadata.mjs, not
              // rendered in the footer.
              assets: z.array(z.string()).optional(),
            })
          )
          .optional(),
      })
      .transform((data) => {
        // Transform Gatsby 'date' field to Astro 'pubDate' if needed
        if (data.date && !data.pubDate) {
          data.pubDate = data.date;
        }
        return data;
      }),
});

export const collections = { ideas };
