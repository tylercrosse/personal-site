import { TOKENS, TYPO } from "./vizTheme";

/*
 * Frontier scores — the best result from any model released by each date —
 * for five benchmarks spanning the stages of the sigmoid. Hand-extracted from
 * Epoch AI's Benchmarking Hub data download (epoch.ai/benchmarks, CC BY 4.0),
 * retrieved 2026-07-18. Static by design: re-pull the data to update.
 *
 * fit: least-squares Gompertz on the date axis,
 *   S(t) = floor + (1 - floor) · exp(-exp(-r · (t - tstar)))
 * tstar = date of the 1/e crossing, r = climb rate per year. Grid-searched
 * over the frontier points; floor is the chance floor (GPQA is 4-choice MC).
 */
const SERIES = [
  {
    id: "math",
    label: "MATH Level 5",
    stage: "saturated",
    ink: "#3aa8a0",
    fit: { tstar: 2023.95, r: 1.5, floor: 0 },
    pts: [
      [2023.447, 0.23], [2023.847, 0.4], [2024.271, 0.467], [2024.364, 0.51],
      [2024.468, 0.517], [2024.545, 0.526], [2024.597, 0.533], [2024.699, 0.892],
      [2024.962, 0.947], [2025.082, 0.965], [2025.288, 0.978], [2025.597, 0.981],
    ],
  },
  {
    id: "gpqa",
    label: "GPQA Diamond",
    stage: "saturated",
    ink: "#2aa1f1",
    fit: { tstar: 2024.31, r: 1.28, floor: 0.25 },
    pts: [
      [2023.197, 0.357], [2023.847, 0.424], [2024.162, 0.472], [2024.364, 0.489],
      [2024.468, 0.54], [2024.699, 0.624], [2024.962, 0.768], [2025.082, 0.77],
      [2025.148, 0.785], [2025.227, 0.838], [2025.425, 0.848], [2025.458, 0.853],
      [2025.518, 0.87], [2025.866, 0.876], [2025.879, 0.926], [2026.134, 0.941],
      [2026.173, 0.946],
    ],
  },
  {
    id: "fm",
    label: "FrontierMath",
    stage: "increasing",
    ink: "#9b6bd3",
    fit: { tstar: 2025.81, r: 1.0, floor: 0 },
    pts: [
      [2024.468, 0.01], [2024.699, 0.017], [2024.808, 0.021], [2024.962, 0.093],
      [2025.082, 0.124], [2025.288, 0.248], [2025.581, 0.29], [2025.597, 0.324],
      [2025.879, 0.376], [2025.942, 0.407], [2026.173, 0.5], [2026.307, 0.524],
    ],
  },
  {
    id: "hle",
    label: "Humanity's Last Exam",
    stage: "increasing",
    ink: "#c65b9b",
    fit: { tstar: 2025.88, r: 1.0, floor: 0 },
    pts: [
      [2024.732, 0.046], [2024.962, 0.08], [2025.211, 0.081], [2025.227, 0.182],
      [2025.288, 0.203], [2025.425, 0.216], [2025.597, 0.253], [2025.764, 0.316],
      [2025.879, 0.375], [2026.134, 0.464],
    ],
  },
  {
    id: "rli",
    label: "Remote Labor Index",
    stage: "early",
    ink: "#d99032",
    fit: { tstar: 2027.18, r: 0.98, floor: 0 },
    pts: [
      [2025.425, 0.008], [2025.597, 0.017], [2025.742, 0.021], [2025.896, 0.037],
      [2026.096, 0.042], [2026.403, 0.083], [2026.436, 0.161],
    ],
  },
];

const STAGES = ["saturated", "increasing", "early"];

const PLOT = { width: 640, height: 360, padL: 48, padR: 18, padT: 16, padB: 36 };
const INNER_W = PLOT.width - PLOT.padL - PLOT.padR;
const INNER_H = PLOT.height - PLOT.padT - PLOT.padB;
const T0 = 2023.0;
const T1 = 2026.6;

function px(value) {
  return Math.round(value * 100) / 100;
}
const xScale = (t) => px(PLOT.padL + ((t - T0) / (T1 - T0)) * INNER_W);
const yScale = (s) => px(PLOT.padT + (1 - s) * INNER_H);

// Frontier lines are step functions: the record holds until a better model lands.
function stepPath(pts) {
  let d = `M ${xScale(pts[0][0])} ${yScale(pts[0][1])}`;
  for (let i = 1; i < pts.length; i += 1) {
    d += ` H ${xScale(pts[i][0])} V ${yScale(pts[i][1])}`;
  }
  return d;
}

function fitPath({ tstar, r, floor }) {
  const parts = [];
  for (let i = 0; i <= 72; i += 1) {
    const t = T0 + (i / 72) * (T1 - T0);
    const s = floor + (1 - floor) * Math.exp(-Math.exp(-r * (t - tstar)));
    parts.push(`${i === 0 ? "M" : "L"} ${xScale(t)} ${yScale(s)}`);
  }
  return parts.join(" ");
}

export default function BenchmarkStages() {
  return (
    <figure className="bs-figure">
      <style>{`
        .bs-figure {
          margin: 1.5rem 0 2rem;
          background: ${TOKENS.panelBg};
          border: 1px solid ${TOKENS.border};
          border-radius: 8px;
          padding: 16px 16px 12px;
        }
        .bs-figure svg {
          display: block;
          width: 100%;
        }
        .bs-legend {
          display: flex;
          flex-wrap: wrap;
          gap: 6px 22px;
          font-family: ${TYPO.mono};
          font-size: 12px;
          margin-bottom: 10px;
        }
        .bs-stage {
          display: flex;
          flex-wrap: wrap;
          align-items: baseline;
          gap: 4px 10px;
        }
        .bs-stage-name {
          color: ${TOKENS.textMuted};
          text-transform: uppercase;
          font-size: 10px;
          letter-spacing: 0.08em;
        }
        .bs-caption {
          margin: 8px 0 0;
          color: ${TOKENS.textMuted};
          font-family: ${TYPO.mono};
          font-size: 11px;
          line-height: 1.5;
        }
      `}</style>

      <div className="bs-legend">
        {STAGES.map((stage) => (
          <span key={stage} className="bs-stage">
            <span className="bs-stage-name">{stage}</span>
            {SERIES.filter((s) => s.stage === stage).map((s) => (
              <span key={s.id} style={{ color: s.ink }}>
                — {s.label}
              </span>
            ))}
          </span>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${PLOT.width} ${PLOT.height}`}
        role="img"
        aria-label="Frontier scores over time for five benchmarks at different stages of saturation"
      >
        <rect
          x={PLOT.padL}
          y={PLOT.padT}
          width={INNER_W}
          height={INNER_H}
          fill={TOKENS.surface}
          stroke={TOKENS.border}
          rx="8"
        />
        {[0.25, 0.5, 0.75].map((s) => (
          <line
            key={s}
            x1={PLOT.padL}
            x2={PLOT.padL + INNER_W}
            y1={yScale(s)}
            y2={yScale(s)}
            stroke={TOKENS.border}
            strokeDasharray="3 5"
          />
        ))}
        {[0, 0.25, 0.5, 0.75, 1].map((s) => (
          <text
            key={s}
            x={PLOT.padL - 6}
            y={yScale(s) + 3.5}
            textAnchor="end"
            fill={TOKENS.textMuted}
            fontFamily={TYPO.mono}
            fontSize="10.5"
          >
            {s * 100}%
          </text>
        ))}
        {[2023, 2024, 2025, 2026].map((yr) => (
          <g key={yr}>
            {yr > 2023 ? (
              <line
                x1={xScale(yr)}
                x2={xScale(yr)}
                y1={PLOT.padT}
                y2={PLOT.padT + INNER_H}
                stroke={TOKENS.border}
                strokeDasharray="3 5"
              />
            ) : null}
            <text
              x={xScale(yr)}
              y={PLOT.padT + INNER_H + 16}
              textAnchor="middle"
              fill={TOKENS.textMuted}
              fontFamily={TYPO.mono}
              fontSize="10.5"
            >
              {yr}
            </text>
          </g>
        ))}
        <text
          x={PLOT.padL + INNER_W / 2}
          y={PLOT.height - 4}
          textAnchor="middle"
          fill={TOKENS.textMuted}
          fontFamily={TYPO.mono}
          fontSize="11"
        >
          model release date
        </text>

        <line
          x1={PLOT.padL}
          x2={PLOT.padL + INNER_W}
          y1={yScale(1 / Math.E)}
          y2={yScale(1 / Math.E)}
          stroke={TOKENS.red}
          strokeWidth="1.5"
          strokeDasharray="6 4"
        />
        <text
          x={PLOT.padL + INNER_W - 6}
          y={yScale(1 / Math.E) + 14}
          textAnchor="end"
          fill={TOKENS.red}
          fontFamily={TYPO.mono}
          fontSize="10.5"
        >
          1/e ≈ 36.8%
        </text>

        {SERIES.map((s) => (
          <path
            key={`fit-${s.id}`}
            d={fitPath(s.fit)}
            fill="none"
            stroke={s.ink}
            strokeWidth="1.5"
            strokeDasharray="5 4"
            opacity="0.55"
          />
        ))}

        {SERIES.map((s) => {
          const last = s.pts[s.pts.length - 1];
          return (
            <g key={s.id}>
              <path d={stepPath(s.pts)} fill="none" stroke={s.ink} strokeWidth="2" />
              {s.pts.map(([t, v]) => (
                <circle key={t} cx={xScale(t)} cy={yScale(v)} r="2" fill={s.ink} />
              ))}
              <circle
                cx={xScale(last[0])}
                cy={yScale(last[1])}
                r="3.5"
                fill={s.ink}
                stroke={TOKENS.surface}
                strokeWidth="1.5"
              />
            </g>
          );
        })}
      </svg>

      <figcaption className="bs-caption">
        Source: Epoch AI, AI Benchmarking Hub (CC BY 4.0), retrieved Jul 2026.
        Solid steps are frontier scores: the best result from any model
        released by each date. Dashed curves are least-squares fits of the
        two-parameter model S(t) = exp(−e^(−r·(t−t*))); GPQA's fit includes
        its 25% chance floor.
      </figcaption>
    </figure>
  );
}
