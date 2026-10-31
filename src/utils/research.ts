import { getCollection } from "astro:content";

// Editorial order: relevance to the current research focus, rather than recency.
const researchOrder = [
  "paper-attack-selection",
  "paper-asymmetric-goal-drift",
  "paper-inherited-goal-drift",
  "paper-same-facts-different-updates",
  "paper-offline-selectors",
];

export async function getResearchProjects() {
  const posts = await getCollection("ideas");
  return researchOrder.map((name) => {
    const post = posts.find((p) => p.id.replace(/(\/index)?\.(md|mdx)$/, "") === `2026/${name}` || p.id === `2026/${name}`);
    if (!post || post.data.draft || !post.data.research) {
      throw new Error(`Missing published research project: ${name}`);
    }
    return { ...post, href: `/ideas/2026/${name}/` };
  });
}

// Talks and presentations, shown on the homepage (Recent Work) and the Research page.
const talkSelections = [
  { slug: "2025/debunking-the-cuda-myth", context: "CS 8803 paper presentation · Nov 2025" },
  { slug: "2025/hierarchical-reasoning-models", context: "Latent Space Paper Club · Sep 2025" },
  { slug: "2025/language-diffusion-survey", context: "Latent Space Paper Club · May 2025" },
];

export async function getTalks() {
  const posts = await getCollection("ideas");
  return talkSelections.map(({ slug, context }) => {
    const post = posts.find((p) => p.id.replace(/(\/index)?\.(md|mdx)$/, "") === slug);
    if (!post || post.data.draft) throw new Error(`Missing published talk: ${slug}`);
    return {
      title: post.data.title,
      description: post.data.description,
      image: post.data.image,
      href: `/ideas/${slug}/`,
      context,
    };
  });
}
