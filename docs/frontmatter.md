# Article frontmatter

The `ideas` collection schema lives in [`src/content.config.ts`](../src/content.config.ts).
Fields marked *legacy* were carried over from the Gatsby site: the schema still
accepts them, but no template reads them.

## Identity and dates

| Field | Use |
| --- | --- |
| `title` | Required. |
| `description` | Required. Listings, link previews, and SEO tags. |
| `date` | Publication date (Gatsby name; transformed to `pubDate` at load). |
| `pubDate` | Astro-native alternative to `date`; set one of the two. |
| `updated` | Last substantive revision, shown alongside the publication date. |
| `draft: true` | Excluded from production builds; still rendered in dev. |

## Classification

| Field | Use |
| --- | --- |
| `type` | Post kind: `article`, `retro`, `project`, `idea`, `note`, `talk`, or `paper`. Drives the listing icon and accent color ([`src/utils/postIcons.ts`](../src/utils/postIcons.ts)). `paper` posts are kept out of the regular homepage feed and never carry `cite`. |
| `status` | Garden stage: `complete`, `in-progress`, or `draft`. Shown on listings and used by the ideas-page status filter. |
| `tags` | Topic tags; drive the topic hub pages and related-post links. |
| `venue` | Publication venue for `paper` posts, e.g. `'ICML 2026'`. |
| `featured: true` | Eligible for the homepage showcase (first three featured posts). |
| `category` | *Legacy.* |
| `audience` | *Legacy.* |
| `media_subpath` | *Legacy.* |

## Images

| Field | Use |
| --- | --- |
| `image` | Hero image: `path` (article-local file), `alt`, optional `maxWidth`. |
| `hideCaption: true` | Suppress the hero caption. |
| `socialImage` | Social-card override for when the hero crops badly in a wide preview: `path`, `alt`, optional `position`. |
| `hero`, `heroImage` | *Legacy* hero forms; use `image`. |

## Series

| Field | Use |
| --- | --- |
| `parent` | Post id of the hub this post belongs to, e.g. `'2026/transformer-circuits'`. Groups the post under its parent and builds the prev/next thread navigation. |
| `order` | Explicit position within the parent's thread; falls back to date, then title (`src/utils/series.ts`). |

## Attribution

| Field | Use |
| --- | --- |
| `cite: true` | "Cite this write-up" footer block. Original, sole-authored pieces only — never `paper` posts. |
| `license` | CC BY 4.0 footer line. Defaults to `cite`; set `false` to suppress. |
| `sources` | Bib keys for the works the post is notes on; rendered inside the References section. |
| `credits` | Third-party media obligations. A figure from a cited work points at its bib entry via `sourceKey`; media with no bib work (a stock photo, a CC image) is attributed inline via `author`/`url`. |

`sources` is a list of bib keys; a `sourceKey` credit likewise points into the
article's sibling `references.bib` — the bibliography is the only place that
holds a work's title, authors, year, and URL. See [`references.md`](./references.md)
for the conventions and examples.
