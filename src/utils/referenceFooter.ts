import type { CollectionEntry } from "astro:content";

// Legacy self-contained attribution shapes, rendered by PostCredits. Key-form
// `sources` and `sourceKey` credits render inside the article's References
// section instead (see rehypeArticleCitations.mjs), so they are filtered out
// here and the footer never re-renders a work the bibliography already lists.
// Both types (and this whole module) disappear once every article is on bib
// keys.
export type LegacySource = {
  title: string;
  url?: string;
  authors?: string;
  year?: string;
  venue?: string;
};

export type LegacyCredit = {
  title?: string;
  author?: string;
  url?: string;
  license?: string;
  licenseUrl?: string;
  changes?: string;
};

/**
 * Filter a post's `sources`/`credits` frontmatter down to the legacy entries
 * that still render in the PostCredits footer.
 */
export function legacyFooterAttribution(post: CollectionEntry<"ideas">): {
  sources?: LegacySource[];
  credits?: LegacyCredit[];
} {
  const sources = post.data.sources?.filter(
    (source): source is LegacySource => typeof source !== "string",
  );
  const credits = post.data.credits?.filter((credit) => !credit.sourceKey);
  return { sources, credits };
}
