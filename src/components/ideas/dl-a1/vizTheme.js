export const TOKENS = {
  panelBg: "var(--bg-0)",
  surfaceSoft: "var(--bg-1)",
  surface: "var(--bg-2)",
  surfaceStrong:
    "color-mix(in srgb, rgb(var(--gray-light)) 78%, rgb(var(--gray-dark)))",
  border:
    "color-mix(in srgb, rgb(var(--gray-dark)) 24%, rgb(var(--gray-light)))",
  borderStrong:
    "color-mix(in srgb, rgb(var(--gray-dark)) 38%, rgb(var(--gray-light)))",
  text: "var(--gray-dark)",
  textMuted: "var(--sol-8)",
  textDim: "var(--sol-7)",
  textFaint: "color-mix(in srgb, var(--sol-7) 80%, transparent)",
  accent: "var(--accent)",
  blue: "#2aa1f1",
  green: "#46b37b",
  orange: "#d99032",
  red: "#d95c5c",
  purple: "#9b6bd3",
  focus: "0 0 0 2px color-mix(in srgb, var(--accent) 38%, transparent)",
};

export const TYPO = {
  body: "var(--font-body)",
  mono: "var(--font-mono)",
  heading: "var(--font-heading)",
};

export const SIZES = {
  radiusSm: 6,
  radiusMd: 8,
  buttonHeight: 34,
  panelPadding: 18,
};

export function buttonStyles({ active = false, color = TOKENS.accent } = {}) {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: SIZES.buttonHeight,
    padding: "6px 12px",
    borderRadius: SIZES.radiusSm,
    border: `1px solid ${active ? color : TOKENS.border}`,
    background: active
      ? `color-mix(in srgb, ${color} 16%, ${TOKENS.surfaceStrong})`
      : TOKENS.surfaceSoft,
    color: active ? TOKENS.text : TOKENS.textMuted,
    fontFamily: TYPO.body,
    fontSize: 13,
    fontWeight: 650,
    cursor: "pointer",
    transition: "background 0.2s ease, border-color 0.2s ease, color 0.2s ease",
    boxShadow: active ? TOKENS.focus : "none",
  };
}

export function formatNumber(value, digits = 3) {
  if (!Number.isFinite(value)) return "0";
  const abs = Math.abs(value);
  if (abs !== 0 && abs < 0.001) return value.toExponential(1);
  if (abs >= 1000) return value.toExponential(1);
  let out = value.toFixed(digits);
  // Trim trailing zeros only after a decimal point ("0.20" -> "0.2"), never
  // from integers ("80" must not become "8").
  if (out.includes(".")) out = out.replace(/0+$/, "").replace(/\.$/, "");
  return out;
}
