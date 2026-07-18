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
entries, and citation-bearing articles without a local bibliography. The same
audit runs at the start of `pnpm build`.

## Authoring conventions

Use the smallest reference mechanism that matches what the reader needs:

| Intent | Authoring form |
| --- | --- |
| Support a scholarly or factual claim | `[@referenceKey]` |
| Cite several works for one claim | `[@firstKey; @secondKey]` |
| Add an aside that would interrupt the paragraph | `[^short-name]` plus a footnote definition |
| Send readers to a tool, demo, repository, or other resource | An ordinary Markdown link |
| Credit the work an entire article is notes on | `sources` in article frontmatter |
| Suggest optional external reading | A `## Further reading` section |
| Point to another article on this site | A normal internal link or the existing related-post components |
| Attribute reproduced or adapted third-party media | `credits` in article frontmatter |
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

## Interaction behavior

- Hovering or focusing a citation or footnote opens its preview.
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

The initial migration moves the three citation-bearing articles to local
bibliographies:

- `2025/gios-retro`
- `2025/ml-retro`
- `2026/eval-saturation`

`eval-saturation` is also the pilot for grouped citations and footnotes. The old
`src/references.bib` is no longer loaded by the build, but is intentionally
retained as a legacy library until its uncited entries have been reviewed. New
work should use article-local files.

The 28 scholarly-link articles should be reviewed gradually, not converted by
domain alone. A paper linked as supporting evidence should become a citation;
the same paper linked as optional reading can remain an ordinary link.

The staged migration plan, beginning with the current `sources` inventory, is
in [`reference-migration-plan.md`](./reference-migration-plan.md).
