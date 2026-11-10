# Attack selection companion post: plan

Branch: `feat/attack-selection-companion`
Post: [`src/content/ideas/2026/attack-selection/index.mdx`](../src/content/ideas/2026/attack-selection/index.mdx) (`draft: true`, visible in `pnpm dev` at `/ideas/2026/attack-selection/`)

## Decision: a companion post, not an extension

[`paper-attack-selection`](../src/content/ideas/2026/paper-attack-selection/index.mdx) is a short `type: 'paper'` research card that the Research, About and home pages point at (`src/utils/research.ts`). A long post with widgets is a different kind of page, so it gets its own folder. The paper card gets a link to it when it publishes.

## Source material

| Source | Link | Status |
| --- | --- | --- |
| Draft post | https://claude.ai/artifact/H6KJMHnNAJCgQ4PfvavNfU (a Claude Doc, unreadable from Claude Code) | Ported 2026-11-09 from a .docx export in the repo root, along with its 3 figures. |
| Widgets artifact (interview-prep framing) | https://claude.ai/artifact/FYANjk2JwaWUotd2F11v77 | Read 2026-11-09 (public link). Math ported to `src/components/ideas/attack-selection/model.js`. |
| LessWrong write-up | https://www.lesswrong.com/posts/WuKDzJxtiqcA9ZZRH | Used for the scaffold's section arc and the numbers in the callouts. |

## Sub-tasks

Each is roughly one session or PR-sized commit. Check each in `pnpm dev`, in both light and dark themes.

1. **Scaffold** (done): frontmatter, section skeleton following the LessWrong arc, `Draft` and `Widget slot` callouts.
2. **Port the draft prose** (done). The draft's own structure replaced the scaffold. Figures use `<Figure id>` with `[fig:…]` references. Every toy-model number in the prose was checked against `model.js`: the τ/TPR table, 49% → 8%, AUROC 0.94 → 0.84, the 9% budget to recover (exact 9.3%), and r* at N = 10³ and 10⁶. `WIDGET:` MDX comments mark where each widget goes.
   - **Structure** (done): three H2 parts with H3 subsections ("How control evaluations score safety", "What attack selection does", "Deployments, low-rate attacks, and other interventions"), then "Open questions" and "Takeaways". Each part opens with a short lead-in marked `NEW PROSE (review)`. The intro's "The post builds in order…" paragraph now partly overlaps the lead-ins; consider trimming it.
   - **Citations** (done): `references.bib` holds the paper (`gewang2026attack`), AI Control (`greenblatt2023control`), Ctrl-Z (`bhatt2025ctrlz`) and Serrano et al. (`serrano2026lowprob`). Metadata comes from each arXiv page. The prose uses `[@key]`; the closing "full paper is on arXiv" link stays a plain link.
3. **Widget inventory** (done, below). The `Widget slot` callouts in the post now name these components.
4. **Widget infrastructure** (done): `src/components/ideas/attack-selection/` has `vizTheme.js` and `vizControls.jsx` (copied from `eval-saturation`, the newest copy, which has the `display` prop on `Slider`), plus `model.js`. `model.js` is the artifact's math as pure functions. Checked against the artifact's own claims at its defaults (1% budget, prompted selector, p = 70%): TPR 48.9% → 8.4%, AUROC 0.939 → 0.840, safety(TPR 50%, p 70%) = 58.8%, r*(a = 1%, N = 1000) = 0.465% (LW appendix: 0.464%).
5. **Port widgets** (done): `SelectionExplorer`, `RocPanel`, `DeploymentPanel` and `UpfrontAuditPanel`, each embedded as `<div class="viz-shell"><X client:visible /></div>`. Shared pieces: `store.js` (explorer settings shared across islands), `chartKit.jsx` (scales, axes, formatting, `WIDGET_CSS`, `useMeasuredWidth`). Checked in Chrome at 375px and 1440px, light and dark.
   - **Layout.** A `<style>` block at the end of the post makes `.viz-shell` break out to the full article width (max 1600px), the same pattern as `eval-saturation`. Widgets cap themselves at 1180px. Single-chart panels go two-column (controls and stats | chart) above an 820px container width, using a container query.
   - **Charts draw at their measured width** (`useMeasuredWidth`), so axis text stays about 11px on phones instead of shrinking with the SVG. SSR renders at a fallback width, and the real width arrives after hydration.
   - **Gotcha:** `TOKENS.text` is `var(--gray-dark)`, an `r, g, b` triplet. It works as CSS `color` but makes SVG `fill`/`stroke` black, so the widgets use `INK.text` = `rgb(var(--gray-dark))`.
   - **Hydration warning seen in dev,** only on the first widget load right after a code edit; it didn't reproduce in 16 later loads. Recheck once with `pnpm build && pnpm preview` (temporarily set `draft: false`, since production builds skip drafts) before publishing.
   - **New prose to review:** the one-paragraph lead-in above `SelectionExplorer` (marked `NEW PROSE` in an MDX comment). The widget notes (`.as-note`) are adapted from the artifact.
   - **Global CSS change:** `.katex-display` now scrolls horizontally (`src/styles/global.css`). The post's wide equations were overflowing the page on phones.
6. **Figure split** (done): Part 1's Figure 1 is now `ThresholdFigure.astro`, a selection-free picture (honest work, all attacks, τ at 1%, 49% caught) drawn as theme-aware inline SVG from `model.js` at build time. The original PNG with the selection curve moved to Part 2 (Figure 3), next to the paragraph that describes its blue curve. Captions with a plain-text "Figure N" don't renumber automatically; the safety-curve caption names Figure 3 by hand.
6. **Figures and hero.** The three draft figures are toy-model PNGs on a white background, so in dark mode they show as white cards. They stay for now: the prose walks through Figures 1–3 before the explorer appears, and they're the no-JS fallback. Options: keep them, drop Figures 1 and 3 in favor of the explorer (then fix the prose's references), or re-render them as theme-aware SVG from `model.js`. They could also go `fullWidth`, but at body width they read fine. Pick a hero `image`; the snake painting is already used by the paper card.
   - Optional: `StopPolicyTrajectory` (see inventory). Its slot is still marked with a `WIDGET` comment.
7. **Cross-links** (done): `parent: '2026/paper-attack-selection'` on the companion. It drives the series pill on both posts, the "Posts in this series" list on the paper, and nesting on the ideas index and topic pages. It also feeds a new "Companion post" block on the paper's research card (`companions` in `src/utils/research.ts` → `ResearchCard.astro`). The companion's closing line links to the paper page. All of it uses the post routes' visibility rule (drafts in dev only), so production omits the links until the companion publishes; verified with `pnpm build` (internal-link check passes, no draft links in `dist/`). Nothing to remember at publish time.
8. **Edit and publish.** Prose pass, final title and description, decide `cite`, run `pnpm build` (runs reference, metadata, ref and internal-link audits), flip `draft: false`, set `status`, and add a link from the paper card.

## Widget inventory

The artifact's four interactive pieces all run on one toy model. Honest scores ~ N(0, σ) and attack scores ~ N(2.3, 1.1). The selector sees each attack's score plus noise and keeps the lowest share.

| Artifact piece | Component | Verdict | Notes |
| --- | --- | --- | --- |
| Explorer (score distributions + safety curve, presets, 6 sliders, 3 y-scale views) | `SelectionExplorer` | Keep: the core widget | Drop the "attack opportunities" slider unless the by-count view stays; it only feeds that view and the "audits that land on an attack" readout. |
| ROC panel | `RocPanel` | Keep | Reads explorer state. Carries "TPR at low FPR, not AUROC." |
| Deployment safety panel (S_N vs N) | `DeploymentPanel` | Keep | Reads explorer state (TPRs, p, keep share). |
| Upfront auditing panel (safety vs fixed rate, r*, floor) | `UpfrontAuditPanel` | Keep, maybe trim | Self-contained. Cites "Erik's paper" on output-probability floors, so it needs a real citation. |
| "Who moves which distribution" table | — | Keep as an MDX table | Static. |
| "Reading the paper's Figure 2" | — | Keep as prose + the paper figure | |
| "Likely follow-ups" | — | Reframe as prose | Blue-team responses and resampling-as-defense fit the implications section. |
| "Lines to have ready", the quote boxes | — | Cut | Interview framing. Some lines may work as pull quotes. |
| (none) Stop-policy trajectory | `StopPolicyTrajectory`? | Optional new | Not in the artifact. A static figure may do. |

**Shared state.** In the artifact, the ROC and deployment panels redraw from the explorer's sliders. In Astro each `client:*` component is its own island, but islands on one page share ES-module instances. So a tiny store module (`useSyncExternalStore` over a plain object) lets separate MDX-embedded components share settings without adding a dependency. The alternative is one component that renders all three with prose-free gaps, which ties layout to the component.

**Random-control bug, fixed in the port.** The artifact's "Random selector (control)" preset used noise 6, which still selects: kept-attack TPR at 1% was 40.6% vs 48.9% for all attacks. The port implements the control as true random keeping (`noise = Infinity` → kept mass = all-attack mass), so the explorer shows 49% → 49% and 0 points lost. The artifact's three distribution views (same area / by count / by count, log), its attack-prevalence slider and its "audits that hit an attack" (precision) readout are ported too, in a toolbar above the explorer's charts.

## Open questions

- **Root files.** `Selection and the Audit Threshold.html` and the draft `.docx` are in the repo root, untracked. Don't commit them; delete them or move them out once the port is final.
- **Widget data:** should the widgets use real result data from `mars-attacks`, or illustrative toy distributions? Toy data is simpler. Real data has to be labeled as real.
- **`cite: true`?** The companion is sole-authored, but it explains a co-authored paper.
