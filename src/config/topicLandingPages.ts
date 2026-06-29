import { getCollection } from "astro:content";

export type TopicLandingPage = {
  slug: string;
  title: string;
  description: string;
  /** Short, scannable blurb for the nav dropdown — a sentence or less. */
  menuBlurb: string;
  tags: string[];
  /** Optional framing paragraphs shown under the lede. Write-once, evergreen. */
  intro?: string[];
};

export const TOPIC_LANDING_PAGES: TopicLandingPage[] = [
  {
    slug: "machine-learning",
    title: "Machine Learning",
    description:
      "Machine learning notes, course projects, and research writeups on supervised learning, data analysis, evaluation, and model behavior.",
    menuBlurb: "Supervised learning, evaluation, and model behavior.",
    tags: ["machine-learning"],
    intro: [
      "Two things, mostly. I took a graduate ML course and wrote up a retrospective that covers the whole thing: supervised learning, reinforcement learning, and the theory behind them. The other posts are notes from papers I've read and topics I keep coming back to.",
      "This is the general-purpose end of what I work on. Deep learning, GPUs, and AI safety have their own pages.",
    ],
  },
  {
    slug: "deep-learning",
    title: "Deep Learning",
    description:
      "Deep learning notes and projects covering neural networks, sequence models, language models, generative modeling, and interpretability.",
    menuBlurb: "Architectures, training, and the messy practice of it.",
    tags: [
      "deep-learning",
      "NLP",
      "large-language-models",
      "generative-models",
    ],
    intro: [
      "Neural networks, mostly the language side of them. There's writing on search and semantic search, how language models work, a survey of text diffusion, and some interpretability work that looks at what a model has actually learned.",
      "It overlaps a lot with the machine learning page. This is the part that's specifically about deep learning and language models.",
    ],
  },
  {
    slug: "gpu-computer-architecture",
    title: "GPU & Computer Architecture",
    description:
      "Notes and projects on GPU programming and computer architecture: CUDA kernels, memory hierarchy, warp scheduling and simulation, and building a CPU from logic gates up.",
    menuBlurb: "CUDA kernels, memory hierarchies, and what the hardware really does.",
    tags: ["GPU", "CUDA", "computer-architecture"],
    intro: [
      "Low-level work, starting from logic gates. The nand2tetris projects build a working computer up from NAND gates and a VM translator. The GPU course goes the other direction into CUDA: tiled kernels, a warp scheduler simulated cycle by cycle, and reading compiled SASS to find branch divergence.",
      "Most of it comes down to the same question: what is the hardware actually doing? The answer usually involves memory hierarchy, scheduling, and divergence.",
    ],
  },
  {
    slug: "operating-systems-distributed-systems",
    title: "Operating Systems & Distributed Systems",
    description:
      "Systems writeups on operating systems, concurrency, IPC, sockets, distributed file systems, and reliable server design.",
    menuBlurb: "Processes, IPC, and systems that span machines.",
    tags: [
      "operating-systems",
      "distributed-systems",
      "multithreading",
      "IPC",
      "socket-programming",
    ],
  },
  {
    slug: "ai-safety-mechanistic-interpretability",
    title: "AI Safety & Mechanistic Interpretability",
    description:
      "Research notes and projects on AI safety, evaluations, goal drift, and mechanistic interpretability of model behavior.",
    menuBlurb: "Reading model internals and the shape of the alignment problem.",
    tags: ["AI-safety", "mechanistic-interpretability"],
  },
];

const topicsByTag = new Map<string, TopicLandingPage>();

for (const topic of TOPIC_LANDING_PAGES) {
  for (const tag of topic.tags) {
    topicsByTag.set(tag, topic);
  }
}

export function getTopicPath(slug: string) {
  return `/ideas/topics/${slug}/`;
}

export function getTopicForTag(tag: string) {
  return topicsByTag.get(tag);
}

/**
 * Minimum number of visible posts a topic needs before its hub page is built.
 * Below this it's a thin page (bad for SEO and a poor landing experience), so
 * we skip generating it — and skip linking to it from posts and the index.
 */
export const MIN_TOPIC_POSTS = 3;

/**
 * Each topic with its visible-post count. Drafts count in dev and are excluded
 * in production, matching how individual post pages are built — so the hub set,
 * the "Part of" links on posts, the nav menu, and the index all stay consistent
 * within a single build.
 */
async function getTopicCounts(): Promise<
  Array<{ topic: TopicLandingPage; count: number }>
> {
  const ideas = await getCollection("ideas");
  const visible = ideas.filter(
    (post) => import.meta.env.DEV || !post.data.draft
  );
  return TOPIC_LANDING_PAGES.map((topic) => {
    const tagSet = new Set(topic.tags);
    const count = visible.filter((post) =>
      post.data.tags?.some((tag) => tagSet.has(tag))
    ).length;
    return { topic, count };
  });
}

/**
 * Topics with enough visible posts to be worth a hub page in the current build.
 */
export async function getLiveTopics(
  minPosts = MIN_TOPIC_POSTS
): Promise<TopicLandingPage[]> {
  const counts = await getTopicCounts();
  return counts
    .filter(({ count }) => count >= minPosts)
    .map(({ topic }) => topic);
}

/**
 * Live topics paired with their post counts, for surfaces that show the count
 * (e.g. the nav "Ideas" dropdown).
 */
export async function getLiveTopicsWithCounts(
  minPosts = MIN_TOPIC_POSTS
): Promise<Array<{ topic: TopicLandingPage; count: number }>> {
  const counts = await getTopicCounts();
  return counts.filter(({ count }) => count >= minPosts);
}
