import { useEffect, useRef, useState } from "react";
import { TOKENS, TYPO } from "./vizTheme";
import { CONTROL_CSS } from "./vizControls";

/**
 * Width of the element `ref` is attached to, in CSS px. Charts draw their
 * viewBox at this width so type stays ~11px at any size instead of scaling
 * with the SVG. SSR and the first client render use `fallback`, so hydration
 * matches; the real width arrives in an effect.
 */
export function useMeasuredWidth(fallback) {
  const ref = useRef(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      if (w > 0) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

/** Chart height that tracks width within sensible bounds. */
export const chartHeight = (width, ratio = 0.5, min = 240, max = 340) =>
  Math.round(Math.min(max, Math.max(min, width * ratio)));

/**
 * Size for a chart in an `.as-split` panel. Width is the chart's measured
 * width. When the side column sits beside the chart, the chart matches the
 * side column's height so the two end together; when they stack (narrow
 * screens), height falls back to a ratio of width. Height depends only on the
 * side column, so resizing the chart can't feed back into itself.
 */
export function useSplitChartSize(fallbackWidth = 640, fallbackHeight = 300) {
  const sideRef = useRef(null);
  const chartRef = useRef(null);
  const [size, setSize] = useState({ width: fallbackWidth, height: fallbackHeight });
  useEffect(() => {
    const side = sideRef.current;
    const chart = chartRef.current;
    if (!side || !chart || typeof ResizeObserver === "undefined") return undefined;
    const update = () => {
      const s = side.getBoundingClientRect();
      const c = chart.getBoundingClientRect();
      const width = Math.round(c.width);
      if (width <= 0) return;
      const besideEachOther = s.right <= c.left + 1 && Math.abs(s.top - c.top) < 8;
      const height = besideEachOther
        ? Math.round(Math.min(560, Math.max(260, s.height)))
        : chartHeight(width, 0.46);
      setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
    };
    const ro = new ResizeObserver(update);
    ro.observe(side);
    ro.observe(chart);
    update();
    return () => ro.disconnect();
  }, []);
  return [sideRef, chartRef, size];
}

/** Keep every other tick when the plot is narrow. */
export const thin = (ticks, innerW, minGap = 52) =>
  innerW / Math.max(1, ticks.length - 1) >= minGap ? ticks : ticks.filter((_, i) => i % 2 === 0 || i === ticks.length - 1);

// Shared plotting pieces for the attack-selection widgets. Colors follow the
// post's static figures: honest = solid gray, all attacks = dashed gray,
// attacks the selector keeps = blue, τ / current setting = dashed line.
// --gray-dark is an "r, g, b" triplet, so TOKENS.text ("var(--gray-dark)")
// only works where CSS can fall back to inheritance; SVG fill/stroke need the
// rgb() wrapper or they render black in dark mode.
const TEXT = "rgb(var(--gray-dark))";

export const INK = {
  text: TEXT,
  honest: TOKENS.textMuted,
  all: TOKENS.textDim,
  kept: TOKENS.blue,
  marker: TEXT,
  floor: TOKENS.orange,
};

// Rounded so server and client render identical markup.
export const px = (v) => Math.round(v * 100) / 100;

export function makeFrame({ width = 460, height = 290, padL = 46, padR = 14, padT = 16, padB = 46 } = {}) {
  return { width, height, padL, padR, padT, padB, innerW: width - padL - padR, innerH: height - padT - padB };
}

/** Linear scale from [d0, d1] onto the frame's x or y range. */
export const linear = (d0, d1, r0, r1) => (v) => px(r0 + ((v - d0) / (d1 - d0)) * (r1 - r0));

/** Log10 scale; domain given as exponents [e0, e1]. */
export const log10Scale = (e0, e1, r0, r1) => (v) =>
  px(r0 + ((Math.log10(v) - e0) / (e1 - e0)) * (r1 - r0));

export const xRange = (f) => [f.padL, f.padL + f.innerW];
export const yRange = (f) => [f.padT + f.innerH, f.padT];

export function linePath(xs, ys) {
  return xs.map((x, i) => `${i === 0 ? "M" : "L"}${px(x)} ${px(ys[i])}`).join(" ");
}

/** Closed band between an upper and a lower curve sharing xs. */
export function bandPath(xs, upper, lower) {
  const top = xs.map((x, i) => `${i === 0 ? "M" : "L"}${px(x)} ${px(upper[i])}`).join(" ");
  const bottom = xs
    .map((_, i) => xs.length - 1 - i)
    .map((j) => `L${px(xs[j])} ${px(lower[j])}`)
    .join(" ");
  return `${top} ${bottom} Z`;
}

const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const superscript = (n) =>
  String(n)
    .split("")
    .map((c) => (c === "-" ? "⁻" : SUP[Number(c)]))
    .join("");

/** 10^e tick label for integer e (e.g. 10⁻³). */
export const powerLabel = (e) => (e === 0 ? "1" : `10${superscript(e)}`);

/** Audit budget / FPR as a percentage with sensible precision. */
export function fmtBudget(a) {
  if (a < 0.001) return `${trim((a * 100).toFixed(3))}%`;
  if (a < 0.01) return `${trim((a * 100).toFixed(2))}%`;
  if (a < 0.1) return `${trim((a * 100).toFixed(1))}%`;
  return `${Math.round(a * 100)}%`;
}

/** Small probabilities: percent above 1%, else m×10⁻ⁿ. */
export function fmtRate(r) {
  if (r >= 0.01) return fmtBudget(r);
  const e = Math.floor(Math.log10(r));
  const m = r / 10 ** e;
  const mant = trim(m.toFixed(1));
  return mant === "1" ? powerLabel(e) : `${mant}×${powerLabel(e)}`;
}

export function fmtCount(v) {
  if (v >= 1e6) return `${trim((v / 1e6).toFixed(v >= 1e7 ? 0 : 1))}M`;
  if (v >= 1e3) return `${trim((v / 1e3).toFixed(v >= 1e4 ? 0 : 1))}k`;
  return String(Math.round(v));
}

export const pct = (v) => `${Math.round(v * 100)}%`;

function trim(s) {
  return s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s;
}

/** Plot background, gridlines, tick labels and axis titles. */
export function Axes({ frame, xTicks, yTicks, xLabel, yLabel }) {
  const { padL, padT, innerW, innerH, height } = frame;
  const bottom = padT + innerH;
  return (
    <g>
      <rect
        x={padL}
        y={padT}
        width={innerW}
        height={innerH}
        fill={TOKENS.surface}
        stroke={TOKENS.border}
        rx="6"
      />
      {yTicks.map((t) => (
        <g key={`y${t.label}`}>
          {t.grid !== false ? (
            <line x1={padL} x2={padL + innerW} y1={t.y} y2={t.y} stroke={TOKENS.border} strokeDasharray="3 5" />
          ) : null}
          <text x={padL - 6} y={t.y + 3.5} textAnchor="end" fill={TOKENS.textMuted} fontFamily={TYPO.mono} fontSize="11.5">
            {t.label}
          </text>
        </g>
      ))}
      {xTicks.map((t, i) => (
        <g key={`x${t.label}`}>
          {t.grid ? (
            <line x1={t.x} x2={t.x} y1={padT} y2={bottom} stroke={TOKENS.border} strokeDasharray="3 5" />
          ) : null}
          <text
            x={t.x}
            y={bottom + 15}
            textAnchor={i === 0 && t.edge ? "start" : i === xTicks.length - 1 && t.edge ? "end" : "middle"}
            fill={TOKENS.textMuted}
            fontFamily={TYPO.mono}
            fontSize="11.5"
          >
            {t.label}
          </text>
        </g>
      ))}
      {xLabel ? (
        <text x={padL + innerW / 2} y={height - 8} textAnchor="middle" fill={TOKENS.textMuted} fontFamily={TYPO.mono} fontSize="12">
          {xLabel}
        </text>
      ) : null}
      {yLabel ? (
        <text
          transform={`translate(12 ${padT + innerH / 2}) rotate(-90)`}
          textAnchor="middle"
          fill={TOKENS.textMuted}
          fontFamily={TYPO.mono}
          fontSize="12"
        >
          {yLabel}
        </text>
      ) : null}
    </g>
  );
}

/** Text label with a halo so it stays legible over curves. */
export function Label({ x, y, children, color = TOKENS.textMuted, anchor = "start", weight = 400, size = 12 }) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fill={color}
      fontFamily={TYPO.mono}
      fontSize={size}
      fontWeight={weight}
      stroke={TOKENS.surface}
      strokeWidth="3"
      paintOrder="stroke"
    >
      {children}
    </text>
  );
}

/** Small legend swatch: a short line, dashed or solid. */
export function Swatch({ color, dashed = false, width = 2.5 }) {
  return (
    <svg width="22" height="10" aria-hidden="true" style={{ verticalAlign: "middle", marginRight: 6 }}>
      <line x1="1" x2="21" y1="5" y2="5" stroke={color} strokeWidth={width} strokeDasharray={dashed ? "4 3" : undefined} />
    </svg>
  );
}

/** Base CSS for every attack-selection widget (prefix: as-). */
export const WIDGET_CSS = `
  ${CONTROL_CSS}
  .as-widget {
    color: ${TOKENS.text};
    font-family: ${TYPO.body};
    background: ${TOKENS.panelBg};
    border: 1px solid ${TOKENS.border};
    border-radius: 8px;
    padding: 18px;
    /* The post's .viz-shell breaks out to the full article width; cap the
       widget so charts and type stay at a readable scale on wide screens. */
    max-width: 1180px;
    margin: 0 auto;
    container-type: inline-size;
  }
  /* Single-chart panels: controls + stats beside the chart when there's room. */
  .as-split {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 18px;
    align-items: start;
  }
  .as-side .as-controls,
  .as-side .as-stats {
    grid-template-columns: minmax(0, 1fr);
  }
  .as-side .as-legend {
    flex-direction: column;
  }
  @container (min-width: 820px) {
    .as-split {
      grid-template-columns: minmax(240px, 290px) minmax(0, 1fr);
    }
  }
  @container (max-width: 819px) {
    .as-side .as-controls,
    .as-side .as-stats {
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
    }
    .as-side .as-legend {
      flex-direction: row;
    }
  }
  .as-presets {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 14px;
  }
  .as-controls {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    gap: 14px 20px;
    margin-bottom: 14px;
  }
  .as-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 8px;
    margin-bottom: 14px;
  }
  .as-charts {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 16px;
  }
  .as-chart svg.as-plot {
    display: block;
    width: 100%;
    height: auto;
  }
  .as-chart-title {
    font-family: ${TYPO.mono};
    font-size: 14px;
    color: ${TOKENS.textMuted};
    margin: 0 0 6px;
  }
  .as-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 16px;
    font-family: ${TYPO.mono};
    font-size: 13px;
    color: ${TOKENS.textMuted};
    margin: 0 0 12px;
  }
  .as-note {
    color: ${TOKENS.textMuted};
    font-size: 16px;
    line-height: 1.55;
    margin: 12px 0 0;
  }
  .as-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    justify-content: space-between;
    gap: 12px 28px;
    margin: 0 0 14px;
  }
  .as-seg {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }
  .as-seg-label {
    font-family: ${TYPO.mono};
    font-size: 13px;
    color: ${TOKENS.textMuted};
    margin-right: 4px;
  }
  .as-toolbar-slider {
    width: min(320px, 100%);
  }
`;
