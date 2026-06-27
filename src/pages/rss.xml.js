import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { SITE_TITLE, SITE_DESCRIPTION } from "../consts";

export async function GET(context) {
  const posts = (await getCollection("ideas"))
    .filter((post) => import.meta.env.DEV || !post.data.draft)
    .sort((a, b) => {
      const aDate = a.data.pubDate || a.data.date;
      const bDate = b.data.pubDate || b.data.date;
      return new Date(bDate || 0).valueOf() - new Date(aDate || 0).valueOf();
    });

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
