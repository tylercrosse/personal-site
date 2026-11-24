import { TOKENS, TYPO, formatNumber } from "./vizTheme";

// Shared styles for Slider/Stat. Injected into each widget's <style> tag —
// class-based instead of inline styles because inline styles on hydrated
// inputs trigger false-positive hydration warnings in React 19.
export const CONTROL_CSS = `
  .viz-slider {
    display: block;
    min-width: 0;
  }
  .viz-slider-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    color: ${TOKENS.textMuted};
    font-family: ${TYPO.mono};
    font-size: 13px;
    margin-bottom: 6px;
  }
  /* The label takes whatever space is left; the value keeps a fixed minimum
     width so a changing number can't re-wrap the label and shift the widget. */
  .viz-slider-row > span {
    flex: 1 1 auto;
    min-width: 0;
  }
  .viz-slider-row strong {
    flex: 0 0 auto;
    min-width: 6ch; /* override per slider with valueChars */
    text-align: right;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
    color: ${TOKENS.text};
    font-size: 17px;
  }
  .viz-slider input {
    width: 100%;
    display: block;
    accent-color: ${TOKENS.accent};
  }
  .viz-stat {
    border: 1px solid ${TOKENS.border};
    border-radius: 6px;
    padding: 9px 12px;
    background: ${TOKENS.surface};
    min-width: 0;
  }
  .viz-stat span {
    display: block;
    color: ${TOKENS.textMuted};
    font-family: ${TYPO.mono};
    font-size: 12px;
    margin-bottom: 4px;
  }
  .viz-stat strong {
    display: block;
    font-family: ${TYPO.mono};
    font-size: 19px;
    font-variant-numeric: tabular-nums;
  }
`;

// valueChars: width reserved for the value, in characters. Size it to the
// longest value the slider can show so the label never re-wraps.
export function Slider({ label, value, min, max, step, onChange, suffix = "", digits = 2, display, valueChars }) {
  return (
    <label className="viz-slider">
      <span className="viz-slider-row">
        <span>{label}</span>
        <strong style={valueChars ? { minWidth: `${valueChars}ch` } : undefined}>
          {display ?? `${formatNumber(value, digits)}${suffix}`}
        </strong>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

export function Stat({ label, value, color = TOKENS.text }) {
  return (
    <div className="viz-stat">
      <span>{label}</span>
      <strong style={{ color }}>{value}</strong>
    </div>
  );
}
