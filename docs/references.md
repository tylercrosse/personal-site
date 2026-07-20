# References, citations, and footnotes

Articles keep their own bibliography beside the article:

```text
src/content/ideas/2026/example/
├── index.mdx
└── references.bib
```

The citation processor only runs when that sibling `references.bib` exists. It
formats inline citations, adds the References section, and embeds metadata for
the citation preview. The bibliography and footnotes remain at the end of the
article when JavaScript is unavailable.

Run `pnpm check:references` to catch missing keys, duplicate entries, unused
entries, and citation-bearing articles without a local bibliography, and
`pnpm check:metadata` to validate the `sources`/`credits` frontmatter against
the same bibliography. Both audits run at the start of `pnpm build`. An entry
counts as used when it is cited inline or referenced from frontmatter.

## Authoring conventions

Use the smallest reference mechanism that matches what the reader needs:

| Intent | Authoring form |
| --- | --- |
| Support a scholarly or factual claim | `[@referenceKey]` |
| Cite several works for one claim | `[@firstKey; @secondKey]` |
| Add an aside that would interrupt the paragraph | `[^short-name]` plus a footnote definition |
| Send readers to a tool, demo, repository, or other resource | An ordinary Markdown link |
| Credit the work an entire article is notes on | `sources: [bibKey, …]` in frontmatter; renders inside the References section |
| Suggest optional external reading | A `## Further reading` section |
| Point to another article on this site | A normal internal link or the existing related-post components |
| Refer to one of your own figures, tables, or equations by number | `[fig:label]` / `[tbl:label]` / `[eq:label]` — see [cross-references.md](./cross-references.md) |
| Attribute reproduced or adapted third-party media | A `credits` entry with a `sourceKey`; renders as a Figures note under References |
| Tell readers how to cite Tyler's article | `cite: true` in article frontmatter |

Keep citation keys readable and stable. The current convention is
`leadAuthorYearKeyword`, for example `sinha2025illusion`. Copy the BibTeX entry
into the article's `references.bib`; do not add new entries to the old site-wide
file.

Footnotes use standard Markdown:

```md
The aside belongs here.[^implementation-detail]

[^implementation-detail]: The longer explanation, with links if useful.
```

## Attribution frontmatter

`sources` and `credits` are role pointers into the article's `references.bib`.
The bibliography is the only place that holds a work's title, authors, year,
venue, and URL; frontmatter never restates them. When either field references
the bibliography, the References section renders every entry in it, cited
inline or not.

- `sources: [bibKey, …]` marks the works the article is substantially notes
  on. The matching References entries get a ★ marker, and the section opens
  with a "cite the original rather than this page" line.
- `credits` records third-party media obligations. Name the source one of two
  ways, by what the media came from:
  - `sourceKey` — a bib key, when the media is a figure from a work the article
    cites. It renders as a "Figures:" line under the References list, citing
    that work by entry number.
  - `author` + `url` (+ `license`/`licenseUrl`) — when the source is *not* a
    scholarly work (a stock photo, a CC-licensed image). It renders in the
    footer, where a bibliography entry would not fit.

```yaml
sources:
  - wang2025hrm
credits:
  # figure from a cited work → points at the bib entry
  - title: 'HRM architecture diagram and pseudocode (Figure 4)'
    sourceKey: wang2025hrm
    changes: 'reproduced in my slides'
    assets:
      - 'slide-hrm-architecture.png'
  # media with no bib work → attributed inline
  - title: 'Hero photograph'
    author: 'Jane Roe'
    url: 'https://unsplash.com/photos/…'
    license: 'Unsplash License'
    licenseUrl: 'https://unsplash.com/license'
```

In a credit, `title` describes the media, `changes` states adaptations, and
`license`/`licenseUrl` name the licence when one applies. `assets` lists the
article-local files the entry covers; it is provenance for the audit, not
rendered. `pnpm check:metadata` verifies that `sourceKey`s resolve and that an
inline credit names both an author and a url.

Two conventions keep the roles from blurring:

- Works belong in the bibliography; destinations belong in prose or Further
  reading. A paper is a bib entry; a repository, slide deck, leaderboard, or
  product page is an ordinary link.
- When an article reproduces a figure, cite its source in the sentence that
  introduces the figure, unless another citation of the same work is already
  in view. Keep the bibliography citation in that body text, not in the
  caption. (Figure cross-references, `[fig:…]`, do resolve in captions — see
  [cross-references.md](./cross-references.md).)

`cite: true` and `license` control the rest of the attribution footer; see
[`frontmatter.md`](./frontmatter.md).

## Interaction behavior

- On desktop, hovering or focusing a citation or footnote opens its preview; on
  touch, a tap opens it (there is no hover).
- A grouped citation shows all of its references in one card.
- Clicking or tapping pins the preview so its links can be used.
- Escape, the close button, or a click outside dismisses a pinned preview.
- On small screens, the preview stays anchored to its citation.
- The card links to the original source when the BibTeX has a URL or DOI and
  back to the full entry at the end of the article.
- References and footnotes use numbered end lists.
- URLs in generated reference entries are external links.

## Inventory and migration status

The July 2026 baseline found 68 article files. Three used BibTeX citations,
while ordinary links were much more common: 63 articles contained roughly 400
external Markdown links. Twenty-eight articles linked to common scholarly
domains without citation syntax, 11 had some kind of references or related
material heading, and none used Markdown footnotes.

Local bibliographies now cover the three citation-bearing articles from the
baseline (`2025/gios-retro`, `2025/ml-retro`, and `2026/eval-saturation`, the
pilot for grouped citations and footnotes) plus the nine `sources`/`credits`
articles migrated to bib keys in July 2026: `2025/hierarchical-reasoning-models`
(the pilot for the attribution frontmatter above), `2025/debunking-the-cuda-myth`,
`2025/language-diffusion-survey`, and the six `2026/circuits-*` notes. Legacy
object-form frontmatter remains only on `2026/agent-skills`,
`2026/coding-agent-stack`, and `2026/coding-agent-failure-modes`, whose
reclassification is still an open question in the migration plan. The old
`src/references.bib` is no longer loaded by the build, but is intentionally
retained as a legacy library until its uncited entries have been reviewed. New
work should use article-local files.

The 28 scholarly-link articles should be reviewed gradually, not converted by
domain alone. A paper linked as supporting evidence should become a citation;
the same paper linked as optional reading can remain an ordinary link.

The staged migration plan, beginning with the current `sources` inventory, is
in [`reference-migration-plan.md`](./reference-migration-plan.md).
