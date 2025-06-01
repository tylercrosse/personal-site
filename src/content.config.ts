import { glob } from "astro/loaders";
import { defineCollection, z } from "astro:content";

const blog = defineCollection({
  // Load Markdown and MDX files in nested directories (Gatsby-style structure)
  loader: glob({ 
    base: "./src/content/blog", 
    pattern: "**/*.{md,mdx}",
    // This allows loading from subdirectories
  }),
  // Type-check frontmatter using a schema that handles both Astro and Gatsby formats
  schema: ({ image }) => z.object({
    title: z.string(),
    description: z.string(),
    // Handle both 'pubDate' (Astro) and 'date' (Gatsby) fields
    pubDate: z.coerce.date().optional(),
    date: z.coerce.date().optional(),
    updatedDate: z.coerce.date().optional(),
    heroImage: z.string().optional(),
    // Additional Gatsby fields that might be present
    tags: z.array(z.string()).optional(),
    category: z.array(z.string()).optional(),
    draft: z.boolean().optional(),
    audience: z.string().optional(),
    hero: z.object({
      alt: z.string(),
      src: image().optional(),
    }).optional(),
    image: z.object({
      path: image().optional(),
      alt: z.string(),
    }).optional(),
    media_subpath: z.string().optional(),
  }).transform((data) => {
    // Transform Gatsby 'date' field to Astro 'pubDate' if needed
    if (data.date && !data.pubDate) {
      data.pubDate = data.date;
    }
    return data;
  }),
});

export const collections = { blog };
