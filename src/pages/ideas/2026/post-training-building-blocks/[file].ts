/**
 * Serves the post-training explorer next to its article, at
 * /ideas/2026/post-training-building-blocks/map.html.
 *
 * The explorer is one self-contained HTML file that lives with the study
 * notes; this route publishes that same file rather than a copy, so there is
 * one source of truth. It's served same-origin so the article can embed it
 * (ScrollyMap.astro) and the explorer can follow the site's theme. It's
 * published only when the article is: in dev always, in a build only once the
 * article's draft flag is off.
 */
import type { APIRoute, GetStaticPaths } from "astro";
import { getEntry } from "astro:content";
import explorer from "../../../../../notes/post-training-study-project/explorer/index.html?raw";

export const getStaticPaths = (async () => {
  const post = await getEntry("ideas", "2026/post-training-building-blocks");
  const visible = import.meta.env.DEV || (post !== undefined && !post.data.draft);
  return visible ? [{ params: { file: "map.html" } }] : [];
}) satisfies GetStaticPaths;

export const GET: APIRoute = () =>
  new Response(explorer, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
