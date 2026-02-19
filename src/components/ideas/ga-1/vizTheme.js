export const TOKENS = {
  surface: "color-mix(in srgb, rgb(var(--gray-light)) 38%, transparent)",
  surfaceSoft: "color-mix(in srgb, rgb(var(--gray-light)) 24%, transparent)",
  surfaceStrong: "color-mix(in srgb, rgb(var(--gray-light)) 56%, transparent)",
  panelBg: "color-mix(in srgb, rgb(var(--gray-light)) 46%, transparent)",
  border: "color-mix(in srgb, rgb(var(--gray)) 26%, transparent)",
  borderStrong: "color-mix(in srgb, rgb(var(--gray)) 42%, transparent)",
  text: "var(--sol-9)",
  textMuted: "var(--sol-8)",
  textDim: "var(--sol-7)",
  textFaint: "color-mix(in srgb, var(--sol-7) 88%, transparent)",
  accent: "var(--accent)",
  focus: "0 0 0 2px color-mix(in srgb, var(--accent) 38%, transparent)",
  shadow: "0 10px 24px rgba(var(--black), 0.12)",
};

export const TYPO = {
  body: "var(--font-body)",
  mono: "var(--font-mono)",
  heading: "var(--font-heading)",
};

export const SIZES = {
  radiusSm: 6,
  radiusMd: 8,
  radiusLg: 12,
  buttonHeight: 34,
  panelPadding: 20,
  maxWidth: 1080,
};

export function buttonStyles({ active = false, tone = "neutral", color } = {}) {
  const tint = color || TOKENS.accent;
  const isSemantic = tone === "semantic";

  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: SIZES.buttonHeight,
    padding: "6px 14px",
    borderRadius: SIZES.radiusSm,
    border: `1px solid ${active ? (isSemantic ? tint : TOKENS.borderStrong) : (isSemantic ? `color-mix(in srgb, ${tint} 60%, ${TOKENS.border})` : TOKENS.border)}`,
    background: active
      ? isSemantic
        ? `color-mix(in srgb, ${tint} 18%, ${TOKENS.surfaceStrong})`
        : TOKENS.surfaceStrong
      : TOKENS.surfaceSoft,
    color: active ? TOKENS.text : isSemantic ? tint : TOKENS.textMuted,
    fontFamily: TYPO.body,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s ease",
    boxShadow: active ? TOKENS.focus : "none",
  };
}
