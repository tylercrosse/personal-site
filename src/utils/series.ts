import type { CollectionEntry } from "astro:content";

export type SeriesLink = {
  href: string;
  title: string;
};

export type SeriesInfo =
  | {
      role: "child";
      parent: SeriesLink | null;
      position: number;
      total: number;
      prev: SeriesLink | null;
      next: SeriesLink | null;
      // All visible posts in the series, in order (includes this post at
      // index `position - 1`).
      siblings: SeriesLink[];
    }
  | {
      role: "parent";
      children: SeriesLink[];
    };

type Orderable = {
  order?: number;
  date?: Date | string;
  title: string;
};

// Explicit order first, then chronologically (oldest to newest), then title.
// Shared by the ideas index, topic hubs, and in-post series navigation so the
// three views never disagree about a series' sequence.
export function compareSeriesOrder(a: Orderable, b: Orderable): number {
  return (
    (a.order ?? Infinity) - (b.order ?? Infinity) ||
    new Date(a.date ?? 0).valueOf() - new Date(b.date ?? 0).valueOf() ||
    a.title.localeCompare(b.title)
  );
}

const toOrderable = (post: CollectionEntry<"ideas">): Orderable => ({
  order: post.data.order,
  date: post.data.date ?? post.data.pubDate,
  title: post.data.title,
});

const toLink = (post: CollectionEntry<"ideas">): SeriesLink => ({
  href: `/ideas/${post.id}/`,
  title: post.data.title,
});

// Series navigation info for every post that belongs to a parent/child group,
// keyed by post id. Pass only the posts visible in the current build — draft
// filtering is the caller's concern — so prev/next never point at a 404. A
// child whose parent is filtered out still gets sibling navigation, just
// without the link up.
export function getSeriesInfo(
  posts: CollectionEntry<"ideas">[]
): Map<string, SeriesInfo> {
  const byId = new Map(posts.map((post) => [post.id, post]));
  const childrenByParent = new Map<string, CollectionEntry<"ideas">[]>();
  for (const post of posts) {
    const parentId = post.data.parent;
    if (!parentId) continue;
    if (!childrenByParent.has(parentId)) childrenByParent.set(parentId, []);
    childrenByParent.get(parentId)!.push(post);
  }
  for (const children of childrenByParent.values()) {
    children.sort((a, b) => compareSeriesOrder(toOrderable(a), toOrderable(b)));
  }

  const info = new Map<string, SeriesInfo>();
  for (const post of posts) {
    const parentId = post.data.parent;
    if (parentId) {
      const siblings = childrenByParent.get(parentId)!;
      const index = siblings.findIndex((sibling) => sibling.id === post.id);
      const parent = byId.get(parentId);
      info.set(post.id, {
        role: "child",
        parent: parent ? toLink(parent) : null,
        position: index + 1,
        total: siblings.length,
        prev: index > 0 ? toLink(siblings[index - 1]) : null,
        next: index < siblings.length - 1 ? toLink(siblings[index + 1]) : null,
        siblings: siblings.map(toLink),
      });
    } else {
      const children = childrenByParent.get(post.id);
      if (children?.length) {
        info.set(post.id, { role: "parent", children: children.map(toLink) });
      }
    }
  }
  return info;
}
