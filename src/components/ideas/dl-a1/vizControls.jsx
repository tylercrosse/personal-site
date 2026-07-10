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
    font-size: 12px;
    margin-bottom: 6px;
  }
  .viz-slider-row strong {
    color: ${TOKENS.text};
    font-size: 15px;
  }
  .viz-slider input {
    width: 100%;
    display: block;
    accent-color: ${TOKENS.accent};
  }
  .viz-stat {
    border: 1px solid ${TOKENS.border};
    border-radius: 6px;
    padding: 8px 10px;
    background: ${TOKENS.surface};
    min-width: 0;
  }
  .viz-stat span {
    display: block;
    color: ${TOKENS.textMuted};
    font-family: ${TYPO.mono};
    font-size: 11px;
    margin-bottom: 4px;
  }
  .viz-stat strong {
    font-family: ${TYPO.mono};
    font-size: 15px;
  }
`;

export function Slider({ label, value, min, max, step, onChange, suffix = "", digits = 2 }) {
  return (
    <label className="viz-slider">
      <span className="viz-slider-row">
        <span>{label}</span>
        <strong>
          {formatNumber(value, digits)}
          {suffix}
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
