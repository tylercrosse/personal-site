# Figure cross-references

Label a figure once and refer to it by a stable name; the number is resolved at
build time from the figure's position, so inserting or reordering figures never
leaves a stale "Figure 3" in the prose. This is the LaTeX `\label`/`\ref`
pattern for MDX posts.

Figures render through the [`Figure`](../src/components/Figure.astro) component,
which numbers them in document order. Cross-references are rewritten by the
[`remarkFigureRefs`](../src/plugins/remarkFigureRefs.mjs) build plugin.

## Labeling a figure

Give the figure an `id`:

```mdx
<Figure
  id="clt-architecture"
  src={crossLayerTranscoder}
  alt="…"
  caption="Each CLT feature reads at one layer and writes forward."
/>
```

The `id` anchors the figure as `#fig-clt-architecture`. Use a short,
descriptive kebab-case id — the figure's `src` variable is usually a good basis
(`crossLayerTranscoder` → `clt-architecture` or `cross-layer-transcoder`). Only
figures you reference need an id.

## Referencing a figure

Write `[fig:label]` in prose. It renders as a link to the figure:

| Authoring form | Renders | Use for |
| --- | --- | --- |
| `[fig:clt-architecture]` | Figure 3 (linked) | An inline mention: "as shown in [fig:clt-architecture]" |
| `[fig:clt-architecture\|short]` | Fig. 3 (linked) | A parenthetical after a positional phrase: "the diagram below ([fig:clt-architecture\|short])" |

Forward references work — the whole document is numbered before any reference is
resolved, so you can write `[fig:x]` before the `<Figure id="x">` appears.

The `[fig:…]` sigil is deliberately distinct from the `[@…]` citation syntax, so
the two never collide. Clicking or tapping a reference smooth-scrolls to the
figure and briefly highlights it (both respect `prefers-reduced-motion`).

## Numbering

Figures are numbered in document order. A figure is numbered unless it opts out
with `numbered={false}` — useful for schematic or decorative figures that should
not consume a number:

```mdx
<Figure src={conceptDiagram} alt="…" numbered={false} />
```

An unnumbered figure cannot be referenced (there is no number to resolve to);
the build reports it if you try.

## References in captions

`[fig:label]` also resolves inside a `<Figure>` `caption` prop, so a caption can
point at another figure by its synced number:

```mdx
<Figure
  id="dla-deontological"
  src={…}
  caption="Top-20 DLA components. Compare to [fig:dla-strategic]: the same layers dominate."
/>
```

Because captions render as plain text, an in-caption reference resolves to plain
text ("Figure 5"), not a link — but the number still stays in sync. Both
`caption="…"` and `caption={"…"}` forms are supported.

Note the scope: this is for **figure** cross-references only. Bibliography
citations (`[@key]`) do **not** work inside captions — see
[Not yet supported](#not-yet-supported).

## Validation

Undefined and duplicate labels are caught, not rendered wrong:

- The build plugin **fails the production build** on a `[fig:missing]` with no
  matching figure, or a duplicate id.
- In `pnpm dev` it renders a visible `⚠ fig:missing?` marker instead of
  crashing, so you spot it while writing.
- `pnpm check:figures` (also part of `pnpm build`) validates the source of
  every post — **including drafts**, which the production build never compiles
  and so would otherwise skip. It confirms each `[fig:label]` resolves to a
  unique `<Figure id="label">`.

## Not yet supported

- **Bibliography citations in captions.** `[@key]` citations only work in body
  prose. Captions are component props evaluated after the citation pipeline
  runs, so the bibliography context is not available to them. Cite a figure's
  source in the sentence that introduces it (see
  [`references.md`](./references.md)).
- **Table and equation cross-references.** There is no `[tbl:]` or `[eq:]` yet.
  Equations render (KaTeX) but are not cross-referenceable. The `[fig:…]` design
  is intended to extend to these, but that work is not done.
