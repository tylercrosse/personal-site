# Reference standardization and migration plan

Status: draft  
Last updated: 2026-07-18  
Related conventions: [`docs/references.md`](./references.md)

## Goal

Make it clear, for both readers and authors, why each reference-like item is on an article:

- `sources` credits the small set of works an article is substantially notes on.
- Citations support specific scholarly or factual claims.
- Footnotes hold asides that would interrupt the main text.
- Ordinary links point to tools, demos, repositories, product documentation, and other destinations the sentence directly discusses.
- `Further reading` offers optional material after the argument is complete.
- `credits` records third-party media and licence obligations.

The migration should improve those distinctions without turning every external link into a citation or making older articles conform in one large rewrite.

## Current status (2026-07-18)

The mechanism changed after this plan was first written. Rather than making
`sources`/`credits` self-contained frontmatter objects, everything now resolves
against the article's sibling `references.bib` — the same store the inline
`[@key]` citations use. Citation metadata (title, authors, year, venue, URL)
lives once, in the bib; frontmatter carries only role pointers by key. See
[`references.md`](./references.md) for the authoring contract.

Done under that model:

- **Phase 1 §1 (normalize the nine source-driven articles):** complete. Each has
  a `references.bib`; `sources: [key]` marks primary works, which now render
  inside the generated `References` section (starred, with a "cite the original"
  line) instead of a separate footer list. Duplicate hand-written `References`
  sections on `debunking-the-cuda-myth`, `hierarchical-reasoning-models`, and
  `language-diffusion-survey` are gone.
- **Phase 1 §3 (guardrails):** `scripts/audit-metadata.mjs` ships and runs in
  `pnpm build`; `audit-references.mjs` now counts frontmatter keys as usage.
- **Phase 1b mechanical half:** the seven credit entries carry `sourceKey` +
  `assets` and render as a "Figures:" note under `References`, citing works by
  entry number.
- **Phase 1 §2 — the synthesis trio** (`agent-skills`, `coding-agent-stack`,
  `coding-agent-failure-modes`): reclassified by the nature of each source.
  `coding-agent-stack` and `coding-agent-failure-modes` referenced product docs
  and web resources, so their `sources` became inline links plus a consolidated
  `Further reading` / `Reading notes` list (no `.bib`). `agent-skills` cited
  actual papers at specific findings, so those became `[@key]` citations with a
  `references.bib`; its three official-doc links stayed inline.
- **Schema cleanup (sequence step 7):** with no article on the object form, the
  `sources` union is gone (`z.array(z.string())`). The credit `author`/`url`
  path was *kept and re-framed* — not legacy, but the way to attribute media
  whose source is not a bib work (a stock photo, a CC image); it renders in the
  footer. The audit no longer nags it as "migrate to sourceKey".

**Phase 1 is complete.** Remaining:

- **Phase 1b licensing** (steps 2–4 below): every figure credit still lacks
  `license`/`licenseUrl`; the CC "except where otherwise noted" line covers the
  gap for now. Rights research, off the critical path.
- Phases 2–5, unchanged.

## Baseline

The initial July 2026 inventory recorded 68 article files, about 400 ordinary external Markdown links across 63 articles, 28 articles with links to common scholarly domains, and 11 articles with some kind of references or related material section. Three citation-bearing articles have already moved to local BibTeX files.

The current `sources` inventory is smaller and more tractable:

- 12 articles use `sources`, containing 38 entries.
- Every entry has a URL and year.
- Five entries are missing an author or organizational author.
- Nine articles are source-driven notes or surveys. Their 17 source entries fit the intended meaning of the field.
- Three broader synthesis articles contain the other 21 entries. Their source footers currently behave more like bibliographies without claim-level anchors.
- Three source-driven articles also have hand-written `References` sections, creating partial duplication and two competing end-matter systems.

These counts are a planning snapshot, not a permanent allowlist. The eventual audit should calculate them from the repository.

## Decision rule for `sources`

Use `sources` only when this sentence is a fair description of the article:

> This article is substantially notes on, a response to, or a guided reading of these works.

A useful test is whether the article would still have roughly the same structure and argument without the named work. If not, the work is probably a source. If the work merely supports one claim, it should be cited at that claim instead.

Do not use `sources` as:

- a list of everything consulted while writing;
- a substitute for placing citations next to claims;
- an optional reading list;
- a list of product documentation mentioned throughout an original article; or
- media attribution, which belongs in `credits`.

Keep source order editorial: put the work the article depends on most first. More than five sources should trigger review. It may be valid for a survey, but it is also a sign that inline citations or `Further reading` would communicate the relationships better.

## Phase 1: standardize `sources`

### 1. Normalize the articles that already fit

Keep `sources` on these nine articles:

| Article | Entries | Planned treatment |
| --- | --: | --- |
| `2025/debunking-the-cuda-myth` | 1 | Keep the paper as the primary source; reclassify the extra end links. |
| `2025/hierarchical-reasoning-models` | 2 | Keep the paper and independent analysis as co-primary sources. |
| `2025/language-diffusion-survey` | 5 | Keep the five papers that define the survey's main arc; move the wider reading list out of `References`. |
| `2026/circuits-attribution-graphs` | 2 | Keep; add the missing authors for the companion paper. |
| `2026/circuits-crosscoders` | 1 | Keep; add the missing authors. |
| `2026/circuits-framework` | 1 | Keep as-is. |
| `2026/circuits-induction-heads` | 1 | Keep as-is. |
| `2026/circuits-monosemanticity` | 2 | Keep as-is. |
| `2026/circuits-superposition` | 2 | Keep; add the missing authors for the follow-up. |

For this cohort:

1. Require a title and URL for every entry.
2. Use a person or organization in `authors`; fill the three missing author fields in this cohort.
3. Keep `year` for fixed publications. Do not invent a publication year for a living documentation page merely to satisfy formatting.
4. Use `venue` when it helps identify a paper or series; leave it absent rather than putting a website name there mechanically.
5. Remove duplicates between the source footer and hand-written end sections. The source footer credits the work as a whole. Supporting claims still get inline citations, and optional material moves to `Further reading`.

The three manual `References` sections need editorial treatment rather than deletion by pattern:

- `debunking-the-cuda-myth`: keep the primary paper in `sources`; convert the proceedings version, white paper, and software baselines to ordinary links or a short `Further reading` section.
- `hierarchical-reasoning-models`: keep the paper and ARC Prize analysis in `sources`; treat code, slides, and the leaderboard as ordinary resources.
- `language-diffusion-survey`: keep the five central papers in `sources`; use inline citations for claims and rename the broader background/miscellaneous list to `Further reading` if it remains useful.

### 2. Reclassify the overloaded source blocks

These three articles are original syntheses rather than notes on a small set of works:

| Article | Current entries | Planned treatment |
| --- | --: | --- |
| `2026/agent-skills` | 6 | Cite the research papers near the claims they support; link the specification and authoring guides where discussed; keep only genuinely optional items in `Further reading`. |
| `2026/coding-agent-failure-modes` | 5 | Add local BibTeX citations for empirical or conceptual claims; keep tools and project pages as ordinary links. |
| `2026/coding-agent-stack` | 10 | Link product documentation at the relevant feature descriptions; cite research claims if any; use `Further reading` only for optional synthesis material. |

Remove `sources` from these articles once each current entry has a deliberate destination. Do not delete the footer first and then try to reconstruct where the links belonged.

### 3. Add guardrails

Extend the existing reference audit, or add a small companion audit, to report:

- article and entry counts for `sources`;
- missing title or URL as errors;
- missing authors as a warning for scholarly sources;
- duplicate source URLs within one article;
- more than five source entries as an editorial warning;
- an article containing both `sources` and a `References` heading as a review warning; and
- source URLs that are also present in a local `.bib`, which may be intentional but should be checked for duplicate end matter.

The audit should not infer intent from domain alone. An arXiv link can be a primary source, an inline citation, or optional reading depending on how the article uses it.

### 4. Define completion for the first phase

Phase 1 is complete when:

- all 12 current source blocks have been reviewed;
- only the nine source-driven articles retain `sources`, unless review produces a documented exception;
- the retained source entries have complete, consistent display metadata;
- no retained source footer is duplicated by a hand-written reference entry;
- the three synthesis articles preserve every useful link in its proper context;
- the source audit passes in `pnpm build`; and
- source footers have been checked in light, dark, desktop, and narrow layouts.

## Phase 1b: standardize `credits`

`credits` is closely related to `sources`, but it answers a different question:

> Which third-party media appears in this article, and what attribution or reuse conditions travel with it?

The same paper may correctly appear in both fields. A paper in `sources` explains what the article is notes on. A figure from that paper in `credits` records the separate fact that the article reproduces or adapts its media. This is not duplicate metadata and should not be automatically collapsed.

The top-level `license` field is separate again. It grants reuse rights for the original parts of Tyler's article. It does not grant rights to third-party media; the existing “Except where otherwise noted” language depends on `credits` identifying those exceptions clearly.

### Current credit inventory

Three articles currently contain seven credit entries:

| Article | Entries | What they cover |
| --- | --: | --- |
| `2025/debunking-the-cuda-myth` | 1 | Four paper figures reproduced in the slide-derived images. |
| `2025/hierarchical-reasoning-models` | 2 | The HRM architecture/pseudocode and ARC Prize ablation charts. |
| `2025/language-diffusion-survey` | 4 | Four figures reproduced in the slide-derived images. |

All seven entries have a title, author, source URL, and `changes` note. None currently records a licence or licence URL. That does not necessarily mean the uses are improper, but it means the metadata cannot yet distinguish explicitly licensed reuse, permission, public-domain material, and a more limited quotation or commentary rationale. Attribution by itself does not supply permission.

### Decision rule for `credits`

Use `credits` when a third-party asset is displayed or incorporated into the article, including:

- a reproduced figure, chart, photograph, illustration, or screenshot;
- an adapted or redrawn figure whose structure substantially follows the original; or
- several local assets covered by one shared attribution obligation.

Do not use `credits` for:

- a work that is only discussed or cited;
- a source link with no media reuse;
- Tyler's own diagrams, charts, screenshots, or photographs;
- an AI-generated image with no third-party attribution requirement; or
- a public-domain or CC0 asset when no attribution is required, unless retaining provenance would be useful to readers.

For public-domain, CC0, and AI-generated assets, provenance can still belong in a caption or future provenance field. It should not make the obligation-focused credit ledger ambiguous.

### Target credit metadata

Keep one credit entry per rights holder or attribution statement, not necessarily one entry per file. Standardize these fields:

- `title`: required; describe the actual media used, not only the parent work.
- `author`: required when known; use the creator or rights-holding organization.
- `url`: required; prefer the source or rights page over a copied asset URL.
- `changes`: required for adapted material; say what changed rather than only “modified.” Use an explicit “none” or omit it for a verbatim reproduction, depending on the final schema decision.
- `license` and `licenseUrl`: required when the source offers an explicit reuse licence. Do not put “fair use” in `license`; it is a legal rationale, not a licence granted by the source.
- `assets`: proposed new field listing the article-local file paths covered by the entry. This creates an auditable connection between frontmatter and the files actually rendered.

Before adding a more elaborate rights-status enum, audit the seven current entries. If the actual cases require representing permission, public domain, or another non-licence basis, add a narrowly named field such as `rightsNote` rather than overloading `license`.

### Credit migration work

1. Map each of the seven entries to the local image files it covers.
2. Check the source page, paper, or publisher for the applicable media licence and any required attribution form.
3. Fill `license` and `licenseUrl` where an explicit licence exists.
4. For entries without a clear reuse basis, choose deliberately among replacing the media with an original diagram, linking instead of reproducing, seeking permission, or documenting the limited use after appropriate review. Do not infer a licence from the fact that a paper is publicly accessible.
5. Make `changes` specific enough to distinguish reproduction, crop, annotation, restyling, and substantive redrawing.
6. Check that each displayed credit is understandable without consulting the frontmatter.

The first pass should review the three articles alongside their `sources` cleanup because their source and credit entries refer to many of the same works. The review should preserve both entries when both intellectual dependence and media reuse are present.

### Credit guardrails

Extend the companion audit to report:

- credit and covered-asset counts;
- missing title, author, URL, or asset mapping;
- `license` without `licenseUrl`, and the reverse;
- a non-empty `changes` requirement for adapted or redrawn assets once the schema can distinguish those uses;
- credited local files that no longer exist;
- local files claimed by more than one conflicting credit entry; and
- image imports that are not self-created, AI-generated, or public-domain but have no recorded credit, as an editorial review queue rather than an automatic error.

Automation can verify completeness and file mappings, but it cannot determine copyright status or whether a use is legally justified. Those remain manual review decisions.

### Completion criteria for credits

The credit workstream is complete when:

- all seven current credit entries have been reviewed against their source;
- every entry maps to the local assets it covers;
- explicit licences are recorded where available;
- unresolved reuse cases are replaced, linked, permitted, or documented rather than silently treated as licensed;
- `sources`, `credits`, and the article-level `license` render as distinct claims;
- the audit passes without missing or orphaned asset mappings; and
- the combined attribution footer remains readable in both themes and at narrow widths.

## Later phases

### Phase 2: standardize end sections

Inventory headings such as `References`, `Additional Resources`, `Resources`, `Further material`, `Related`, and `Further reading`. Classify each item rather than applying a bulk rename:

- evidence for a claim becomes an inline citation;
- an optional external recommendation goes under `Further reading`;
- a tool or repository stays linked where it is discussed;
- another article on this site uses the existing internal-link or related-post treatment; and
- obsolete or duplicate lists are removed.

Use `Further reading` as the standard heading for optional external material. Do not use `References` for an unstructured Markdown link list once an article uses the generated bibliography.

### Phase 3: review scholarly links

Work through the 28 scholarly-link articles in small topical batches. For each link, inspect the surrounding sentence:

- convert it to a local-BibTeX citation when it supports a claim;
- leave it as an ordinary link when the destination itself is the subject;
- move it to `Further reading` only when it is genuinely optional; and
- use `sources` only when the whole article is downstream of the work.

Good batches are the Transformer Circuits series, course retrospectives, ML/DL notes, and standalone research explainers. Each batch should be reviewable on its own and should not mix citation mechanics with unrelated prose rewrites.

### Phase 4: retire legacy reference storage

Review the uncited entries in `src/references.bib`. Copy still-used entries into article-local bibliographies, fix or discard stale entries, then remove the site-wide file when no article or migration task depends on it.

### Phase 5: keep the inventory current

Add machine-readable counts to the audit output and document the authoring decision rule in the article template or contributor guidance. New articles should start with the target taxonomy rather than entering a later cleanup queue.

## Suggested implementation sequence

Keep the work in small changes that are easy to review:

1. ~~Add a shared `sources`/`credits` audit and document both metadata contracts.~~ Done.
2. ~~Normalize the nine source-driven articles, resolve their duplicate end sections.~~ Done (via `.bib` keys).
3. ~~Map the seven credit entries to their local assets.~~ Done; licence research (Phase 1b steps 2–4) still outstanding.
4. Migrate `agent-skills` as the first synthesis example because it contains a clean mix of official documentation and research papers.
5. Apply the same pattern to `coding-agent-failure-modes`.
6. Migrate `coding-agent-stack`, where the larger documentation list will test whether contextual ordinary links are enough.
7. ~~Once no article uses the legacy object form, drop the union from the schema in `content.config.ts` and the dead sources-footer branch in `PostCredits.astro` / `referenceFooter.ts`.~~ Done. (The credit `author`/`url` path was kept as the non-bib-media form, not removed.)
8. Re-run the broader inventory and choose the first topical batch for Phase 2 and Phase 3.

Each migration should preserve content first. Standardizing the mechanism is not permission to strengthen claims, remove useful reading material, or rewrite the article around the new citation format.
