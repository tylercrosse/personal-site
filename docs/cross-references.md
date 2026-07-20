# Cross-references (figures, tables, equations)

Label something once and refer to it by a stable name; the number is resolved at
build time from document order, so inserting or reordering never leaves a stale
"Figure 3" in the prose. This is the LaTeX `\label`/`\ref` pattern for MDX posts,
and it works for **figures**, **tables**, and **equations**.

One build plugin — [`remarkCrossRefs`](../src/plugins/remarkCrossRefs.mjs) —
numbers all three and rewrites the references. Figures and tables are components
that render their own number and anchor; equations stay native `$$` math.

| Thing | Label it | Reference it | Renders |
| --- | --- | --- | --- |
| Figure | `<Figure id="x" …/>` | `[fig:x]` | Figure N |
| Table | `<Table id="x" caption="…">` | `[tbl:x]` | Table N |
| Equation | `\label{x}` inside `$$…$$` | `[eq:x]` | Equation N |

Each sigil (`fig:` / `tbl:` / `eq:`) is distinct from the `[@…]` citation syntax,
so nothing collides. All three support a `|short` variant — `[fig:x|short]` →
"Fig. N", `[tbl:x|short]` → "Tbl. N", `[eq:x|short]` → "Eq. N" — handy for a
parenthetical after a positional phrase ("the diagram below ([fig:x|short])").
Forward references work: the whole document is numbered before any reference
resolves. Clicking or tapping a reference smooth-scrolls to the target and
briefly highlights it (both respect `prefers-reduced-motion`).

## Figures

Give the figure an `id`; it anchors as `#fig-<id>`:

```mdx
<Figure
  id="clt-architecture"
  src={crossLayerTranscoder}
  alt="…"
  caption="Each CLT feature reads at one layer and writes forward."
/>
```

Use a short, descriptive kebab-case id — the `src` variable is a good basis
(`crossLayerTranscoder` → `cross-layer-transcoder`). Only figures you reference
need an id.

## Tables

Wrap a normal Markdown table in `<Table>` (it anchors as `#tbl-<id>`). **Keep the
blank lines** around the table so it still parses as Markdown:

```mdx
<Table id="grading" caption="Grade distribution by component.">

| Component | Weight |
| --------- | ------ |
| Project 1 | 15%    |
| Final     | 30%    |

</Table>
```

The caption renders above the table as "Table N: …". A bare Markdown table (no
`<Table>` wrapper) stays exactly as it is — unnumbered and unreferenceable.

## Equations

Keep native display math and add a `\label{name}` inside it; it anchors as
`#eq-<name>` and renders a right-aligned "(N)":

```mdx
$$
\hat{y} = \sigma(Wx + b) \label{forward}
$$

The forward pass in [eq:forward] saturates for large pre-activations.
```

Only **labeled** equations are numbered — incidental display math stays clean, so
your derivations don't sprout "(N)" on every line. The `\label` is stripped
before KaTeX renders (KaTeX has no `\label`).

## Numbering

Each type numbers independently, in document order (Figure 1, 2, 3…; Table 1,
2…; Equation 1, 2…). Figures and tables are numbered unless they opt out with
`numbered={false}` — useful for schematic or decorative items that should not
consume a number:

```mdx
<Figure src={conceptDiagram} alt="…" numbered={false} />
```

An unnumbered figure/table cannot be referenced (there is no number to resolve
to); the build reports it if you try. Equations are the inverse — only labeled
ones are numbered.

## References in captions

`[fig:]`, `[tbl:]`, and `[eq:]` all resolve inside a `<Figure>`/`<Table>`
`caption` prop, so a caption can point at another item by its synced number:

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

## Validation

Undefined and duplicate labels are caught, not rendered wrong:

- The build plugin **fails the production build** on a reference with no matching
  target, or a duplicate id/label.
- In `pnpm dev` it renders a visible `⚠ fig:missing?` marker instead of crashing,
  so you spot it while writing.
- `pnpm check:refs` (also part of `pnpm build`) validates the source of every
  post — **including drafts**, which the production build never compiles and so
  would otherwise skip. It confirms each `[fig:]`/`[tbl:]` resolves to a unique
  `id="…"` and each `[eq:]` to a unique `\label{…}`.

## Not yet supported

- **Bibliography citations in captions.** `[@key]` citations only work in body
  prose. Captions are component props evaluated after the citation pipeline runs,
  so the bibliography context is not available to them. Cite a figure's source in
  the sentence that introduces it (see [`references.md`](./references.md)).
