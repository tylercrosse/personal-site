// Shared pieces for the post's static SVG figures (rendered at build time by
// the *Figure.astro components; no client JS). Colors are theme variables so
// every figure follows light/dark mode, matching the widgets' encoding:
// honest = solid gray, all attacks = dashed gray, kept attacks = blue.

export const C = {
  // --gray-dark is an "r, g, b" triplet; SVG fills need the rgb() wrapper.
  text: "rgb(var(--gray-dark))",
  muted: "var(--sol-8)",
  dim: "var(--sol-7)",
  rule: "color-mix(in srgb, rgb(var(--gray-dark)) 24%, rgb(var(--gray-light)))",
  grid: "color-mix(in srgb, rgb(var(--gray-dark)) 12%, rgb(var(--gray-light)))",
  blue: "#2aa1f1",
};

/** Round to 2 decimals so SVG markup stays small and stable. */
export const r = (v) => Math.round(v * 100) / 100;

export const pct = (v) => `${Math.round(v * 100)}%`;

/** Audit budget as a percentage: 0.01%, 0.1%, 1%, 10%, 100%. */
export function fmtBudget(a) {
  const trim = (s) => (s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s);
  if (a < 0.001) return `${trim((a * 100).toFixed(3))}%`;
  if (a < 0.01) return `${trim((a * 100).toFixed(2))}%`;
  if (a < 0.1) return `${trim((a * 100).toFixed(1))}%`;
  return `${Math.round(a * 100)}%`;
}

export const linePath = (pts) => pts.map(([x, y], i) => `${i ? "L" : "M"}${r(x)} ${r(y)}`).join(" ");

/** Closed band between an upper and lower series sharing x positions. */
export function bandPath(xs, top, bottom) {
  const up = xs.map((x, i) => `${i ? "L" : "M"}${r(x)} ${r(top[i])}`).join(" ");
  const down = xs.map((_, i) => xs.length - 1 - i).map((j) => `L${r(xs[j])} ${r(bottom[j])}`).join(" ");
  return `${up} ${down} Z`;
}
