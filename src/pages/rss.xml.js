import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { SITE_TITLE, SITE_DESCRIPTION } from "../consts";

export async function GET(context) {
  // Drafts must never reach the public feed — feed readers cache entries, so a
  // leaked draft link outlives the mistake.
  const posts = (await getCollection("ideas")).filter(
    (post) => import.meta.env.DEV || !post.data.draft
  );
  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: context.site,
    items: posts.map((post) => ({
      ...post.data,
      link: `/ideas/${post.id}/`,
    })),
  });
}
