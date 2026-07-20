import type { CollectionEntry } from "astro:content";

// A media credit whose source is not a scholarly work — a stock photo, a
// CC-licensed image — so it carries its own author/url/licence rather than a
// bib `sourceKey`. These render in the PostCredits footer. Credits that do have
// a `sourceKey` render inside the References section instead (as the "Figures:"
// note; see rehypeArticleCitations.mjs) and never reach the footer.
export type MediaCredit = {
  title?: string;
  author?: string;
  url?: string;
  license?: string;
  licenseUrl?: string;
  changes?: string;
};

/**
 * Select the credits that belong in the footer: those without a `sourceKey`,
 * i.e. media attributed to a non-bib source. Sources and bib-backed credits are
 * handled by rehypeArticleCitations inside the References section.
 */
export function footerMediaCredits(post: CollectionEntry<"ideas">): {
  credits?: MediaCredit[];
} {
  const credits = post.data.credits?.filter((credit) => !credit.sourceKey);
  return { credits };
}
