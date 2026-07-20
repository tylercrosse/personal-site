import { useMemo, useState } from "react";
import { TOKENS, TYPO, buttonStyles, formatNumber } from "./vizTheme";
import { CONTROL_CSS, Slider, Stat } from "./vizControls";

/*
 * The whole model:
 *   per-step error     ε(C) = ε₀ · C^(−α)      (power law in compute)
 *   per-step accuracy  a(C) = 1 − ε(C)
 *   task of p steps    S(C) = a(C)^p
 *
 * With x = log10(C/C₀), the inflection of S sits where ε = 1/p, i.e.
 * x* = log10(ε₀·p)/α, and the score there is (1 − 1/p)^p → 1/e as p grows.
 */

const FAMILY = [1, 3, 10, 30, 100, 300, 1000];
// Ordered short → long task. Red stays reserved for the 1/e reference.
const INKS = ["#46b37b", "#3aa8a0", "#2aa1f1", "#6f7fd8", "#9b6bd3", "#c65b9b", "#d99032"];

const XMAX = 8; // decades of compute above C₀
const XS = Array.from({ length: 161 }, (_, i) => (i * XMAX) / 160);
const X_TICKS = [
  [0, "1"],
  [2, "10²"],
  [4, "10⁴"],
  [6, "10⁶"],
  [8, "10⁸"],
];

const PLOT = { width: 640, height: 400, padL: 48, padR: 42, padT: 18, padB: 44 };
const INNER_W = PLOT.width - PLOT.padL - PLOT.padR;
const INNER_H = PLOT.height - PLOT.padT - PLOT.padB;

const stepAcc = (x, alpha, eps0) => Math.max(0, 1 - eps0 * Math.pow(10, -alpha * x));
const taskScore = (x, alpha, eps0, p) => Math.pow(stepAcc(x, alpha, eps0), p);
const inflectionX = (alpha, eps0, p) => Math.log10(eps0 * p) / alpha;

// Quadrature nodes for the log-normal mixture over task lengths.
function mixNodes(sigma, K = 41) {
  if (sigma <= 0.001) return [{ z: 0, w: 1 }];
  const nodes = [];
  let total = 0;
  for (let i = 0; i < K; i += 1) {
    const z = -3 + (6 * i) / (K - 1);
    const w = Math.exp(-0.5 * z * z);
    nodes.push({ z, w });
    total += w;
  }
  return nodes.map((n) => ({ z: n.z, w: n.w / total }));
}

// Pixel coordinates are rounded so SSR and client render identical markup.
function px(value) {
  return Math.round(value * 100) / 100;
}
const xScale = (x) => px(PLOT.padL + (x / XMAX) * INNER_W);
const yScale = (s) => px(PLOT.padT + (1 - s) * INNER_H);

function linePath(points, y) {
  return points.map((pt, i) => `${i === 0 ? "M" : "L"} ${xScale(pt.x)} ${y(pt)}`).join(" ");
}

const VIEWS = [
  { id: "length", label: "Task length" },
  { id: "mix", label: "Benchmark mix" },
  { id: "nines", label: "The nines" },
];

const BLURBS = {
  length:
    "One task, p steps, each step right with probability 1 − ε. The task score is (1 − ε)^p — pick a task length below the chart.",
  mix: "A benchmark is a bag of tasks of different lengths: the score averages (1 − ε)^p over a log-normal spread of p.",
  nines:
    "The same model read sideways: per-step reliability climbs linearly in log-compute, and the score is that straight line pushed through x^p.",
};

function Frame({ scoreSide = "left" }) {
  return (
    <>
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
          x={scoreSide === "left" ? PLOT.padL - 6 : PLOT.padL + INNER_W + 6}
          y={yScale(s) + 3.5}
          textAnchor={scoreSide === "left" ? "end" : "start"}
          fill={TOKENS.textMuted}
          fontFamily={TYPO.mono}
          fontSize="10.5"
        >
          {s * 100}%
        </text>
      ))}
      {X_TICKS.map(([x, label]) => (
        <g key={x}>
          {x > 0 && x < XMAX ? (
            <line
              x1={xScale(x)}
              x2={xScale(x)}
              y1={PLOT.padT}
              y2={PLOT.padT + INNER_H}
              stroke={TOKENS.border}
              strokeDasharray="3 5"
            />
          ) : null}
          <text
            x={xScale(x)}
            y={PLOT.padT + INNER_H + 16}
            textAnchor="middle"
            fill={TOKENS.textMuted}
            fontFamily={TYPO.mono}
            fontSize="10.5"
          >
            {label}
          </text>
        </g>
      ))}
      <text
        x={PLOT.padL + INNER_W / 2}
        y={PLOT.height - 8}
        textAnchor="middle"
        fill={TOKENS.textMuted}
        fontFamily={TYPO.mono}
        fontSize="11"
      >
        compute (multiples of C₀)
      </text>
    </>
  );
}

function RefLine() {
  const y = yScale(1 / Math.E);
  return (
    <>
      <line
        x1={PLOT.padL}
        x2={PLOT.padL + INNER_W}
        y1={y}
        y2={y}
        stroke={TOKENS.red}
        strokeWidth="1.5"
        strokeDasharray="6 4"
      />
      <text
        x={PLOT.padL + INNER_W - 6}
        y={y - 6}
        textAnchor="end"
        fill={TOKENS.red}
        fontFamily={TYPO.mono}
        fontSize="10.5"
      >
        1/e ≈ 36.8% — every inflection lands here
      </text>
    </>
  );
}

export default function EvalSigmoidViz() {
  const [view, setView] = useState("length");
  const [alpha, setAlpha] = useState(0.6);
  const [eps0, setEps0] = useState(0.5);
  const [focus, setFocus] = useState(100);
  const [pMedLog, setPMedLog] = useState(2);
  const [sigma, setSigma] = useState(1.0);

  const pMed = Math.round(Math.pow(10, pMedLog));

  const familyCurves = useMemo(
    () =>
      FAMILY.map((p, i) => ({
        p,
        ink: INKS[i],
        pts: XS.map((x) => ({ x, s: taskScore(x, alpha, eps0, p) })),
      })),
    [alpha, eps0],
  );

  const marks = useMemo(
    () =>
      FAMILY.map((p, i) => ({
        p,
        ink: INKS[i],
        x: inflectionX(alpha, eps0, p),
        s: Math.pow(1 - 1 / p, p),
      })).filter((m) => m.p > 1 && m.x > 0.05 && m.x < XMAX - 0.05),
    [alpha, eps0],
  );

  const mixCurves = useMemo(() => {
    const nodes = mixNodes(sigma);
    return XS.map((x) => {
      const a = stepAcc(x, alpha, eps0);
      let mixed = 0;
      for (const n of nodes) mixed += n.w * Math.pow(a, pMed * Math.exp(sigma * n.z));
      return { x, mixed, uniform: Math.pow(a, pMed) };
    });
  }, [alpha, eps0, pMed, sigma]);

  const ninesCurves = useMemo(
    () =>
      XS.map((x) => ({
        x,
        nines: Math.max(0, alpha * x - Math.log10(eps0)),
        s: taskScore(x, alpha, eps0, focus),
      })),
    [alpha, eps0, focus],
  );

  const ninesRows = useMemo(
    () =>
      [1, 2, 3, 4, 5].map((k) => {
        const acc = 1 - Math.pow(10, -k);
        return { k, acc, s: Math.pow(acc, focus), x: (k + Math.log10(eps0)) / alpha };
      }),
    [alpha, eps0, focus],
  );

  // Left axis range for the nines view: covers the max reachable nines.
  const ninesMax = Math.max(4, Math.ceil(alpha * XMAX - Math.log10(eps0)));
  const yScaleNines = (n) => px(PLOT.padT + (1 - n / ninesMax) * INNER_H);
  const ninesTicks = [];
  for (let n = 0; n <= ninesMax; n += Math.ceil(ninesMax / 4)) ninesTicks.push(n);

  const effP = view === "mix" ? pMed : focus;
  const infX = inflectionX(alpha, eps0, effP);
  const doubleCost = Math.pow(2, 1 / alpha);
  const nineCost = Math.pow(10, 1 / alpha);

  let hint;
  if (view === "length") {
    hint = `Longer tasks don't change the curve's shape — they slide it sideways. Doubling p costs the same ${formatNumber(doubleCost, 1)}× compute every time, so a model's task horizon grows exponentially with steady scaling.`;
  } else if (view === "mix") {
    hint =
      "Spread makes the curve lazier at both ends: short tasks are already solved and prop up the early score, long tasks stay broken and hold the tail open. Raise σ and the crisp S smears into the slow saturation grind real benchmarks show.";
  } else {
    hint = `Each nine of per-step accuracy costs the same ${formatNumber(nineCost, 1)}× compute. On a ${focus}-step task, 99% per step scores ${formatNumber(100 * Math.pow(0.99, focus), 1)}%; one more nine scores ${formatNumber(100 * Math.pow(0.999, focus), 1)}%.`;
  }

  const chips = view === "length" || view === "nines";

  return (
    <section className="es-widget" aria-label="Why eval curves are S-shaped: interactive model">
      <style>{`
        ${CONTROL_CSS}
        .es-widget {
          color: ${TOKENS.text};
          font-family: ${TYPO.body};
          background: ${TOKENS.panelBg};
          border: 1px solid ${TOKENS.border};
          border-radius: 8px;
          padding: 18px;
        }
        .es-grid {
          display: grid;
          grid-template-columns: minmax(240px, 300px) minmax(0, 1fr);
          gap: 18px;
          align-items: start;
        }
        .es-panel {
          background: ${TOKENS.surfaceSoft};
          border: 1px solid ${TOKENS.border};
          border-radius: 8px;
          padding: 16px;
        }
        .es-button-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 6px;
        }
        .es-blurb {
          color: ${TOKENS.textMuted};
          font-size: 13px;
          line-height: 1.5;
          margin: 0 0 14px;
        }
        .es-controls {
          display: grid;
          gap: 16px;
        }
        .es-note {
          color: ${TOKENS.textMuted};
          font-size: 13px;
          line-height: 1.45;
          margin: 14px 0 0;
        }
        .es-stat-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          margin-top: 12px;
        }
        .es-plot {
          max-width: 680px;
          margin: 0 auto;
        }
        .es-plot svg {
          display: block;
          width: 100%;
        }
        .es-legend {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: baseline;
          gap: 8px 16px;
          font-family: ${TYPO.mono};
          font-size: 12px;
          margin-bottom: 8px;
        }
        .es-formula {
          color: ${TOKENS.textMuted};
        }
        .es-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 4px 6px;
        }
        .es-chip {
          font-family: ${TYPO.mono};
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 5px;
          border: 1px solid;
          background: transparent;
          cursor: pointer;
        }
        .es-key {
          display: flex;
          flex-wrap: wrap;
          gap: 4px 14px;
        }
        .es-table {
          width: 100%;
          border-collapse: collapse;
          font-family: ${TYPO.mono};
          font-size: 12px;
          margin-top: 10px;
        }
        .es-table th {
          text-align: left;
          font-weight: 400;
          color: ${TOKENS.textMuted};
          padding: 5px 6px;
        }
        .es-table td {
          padding: 5px 6px;
          border-top: 1px solid ${TOKENS.border};
        }
        @media (max-width: 860px) {
          .es-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="es-grid">
        <div className="es-panel">
          <div className="es-button-row" role="group" aria-label="View">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setView(v.id)}
                aria-pressed={view === v.id}
                style={buttonStyles({ active: view === v.id, color: TOKENS.green })}
              >
                {v.label}
              </button>
            ))}
          </div>
          <p className="es-blurb">{BLURBS[view]}</p>

          <div className="es-controls">
            <Slider
              label="scaling exponent α"
              value={alpha}
              min={0.15}
              max={1.5}
              step={0.05}
              onChange={setAlpha}
              digits={2}
            />
            <Slider
              label="starting error ε₀"
              value={eps0}
              min={0.05}
              max={0.9}
              step={0.05}
              onChange={setEps0}
              display={`${Math.round(eps0 * 100)}%`}
            />
            {view === "mix" ? (
              <>
                <Slider
                  label="median steps p"
                  value={pMedLog}
                  min={0}
                  max={3}
                  step={0.05}
                  onChange={setPMedLog}
                  display={String(pMed)}
                />
                <Slider
                  label="spread of lengths σ"
                  value={sigma}
                  min={0}
                  max={2.5}
                  step={0.05}
                  onChange={setSigma}
                  digits={2}
                />
              </>
            ) : null}
          </div>

          <p className="es-note">{hint}</p>

          <div className="es-stat-grid">
            <Stat label="inflection score" value="1/e ≈ 36.8%" color={TOKENS.red} />
            <Stat
              label={`inflection, p = ${effP}`}
              value={infX <= 0 ? "already passed" : `10^${formatNumber(infX, 1)} × C₀`}
            />
            <Stat label="doubling p costs" value={`${formatNumber(doubleCost, 1)}× compute`} />
            <Stat label="S-shape needs" value={`p > ${formatNumber(1 / eps0, 1)}`} />
          </div>
        </div>

        <div className="es-panel">
          <div className="es-plot">
            <div className="es-legend">
              <span className="es-formula">
                {view === "mix" ? (
                  <>
                    S(C) = E<sub>p</sub>[(1 − ε₀C<sup>−α</sup>)<sup>p</sup>]
                  </>
                ) : (
                  <>
                    S(C) = (1 − ε₀C<sup>−α</sup>)<sup>p</sup>
                  </>
                )}
              </span>
              {chips ? (
                <span className="es-chips" role="group" aria-label="Steps per task">
                  {FAMILY.map((p, i) => (
                    <button
                      key={p}
                      type="button"
                      className="es-chip"
                      onClick={() => setFocus(p)}
                      aria-pressed={focus === p}
                      style={{
                        borderColor: INKS[i],
                        background: focus === p ? INKS[i] : "transparent",
                        color: focus === p ? TOKENS.surface : INKS[i],
                      }}
                    >
                      p={p}
                    </button>
                  ))}
                </span>
              ) : (
                <span className="es-key">
                  <span style={{ color: TOKENS.textMuted }}>┄ all tasks p = {pMed}</span>
                  <span style={{ color: TOKENS.purple }}>— mixed lengths</span>
                </span>
              )}
            </div>

            {view === "length" ? (
              <svg
                viewBox={`0 0 ${PLOT.width} ${PLOT.height}`}
                role="img"
                aria-label="Benchmark score versus compute for tasks of different lengths"
              >
                <Frame />
                <RefLine />
                {familyCurves.map((c) => (
                  <path
                    key={c.p}
                    d={linePath(c.pts, (pt) => yScale(pt.s))}
                    fill="none"
                    stroke={c.ink}
                    strokeWidth={focus === c.p ? 3 : 1.6}
                    opacity={focus === c.p ? 1 : 0.7}
                  />
                ))}
                {marks.map((m) => (
                  <circle
                    key={m.p}
                    cx={xScale(m.x)}
                    cy={yScale(m.s)}
                    r="3.5"
                    fill={m.ink}
                    stroke={TOKENS.surface}
                    strokeWidth="1.5"
                  />
                ))}
              </svg>
            ) : null}

            {view === "mix" ? (
              <svg
                viewBox={`0 0 ${PLOT.width} ${PLOT.height}`}
                role="img"
                aria-label="Benchmark score versus compute for a mixture of task lengths"
              >
                <Frame />
                <RefLine />
                <path
                  d={linePath(mixCurves, (pt) => yScale(pt.uniform))}
                  fill="none"
                  stroke={TOKENS.textMuted}
                  strokeWidth="1.6"
                  strokeDasharray="5 4"
                />
                <path
                  d={linePath(mixCurves, (pt) => yScale(pt.mixed))}
                  fill="none"
                  stroke={TOKENS.purple}
                  strokeWidth="3"
                />
              </svg>
            ) : null}

            {view === "nines" ? (
              <>
                <div className="es-legend">
                  <span className="es-key">
                    <span style={{ color: TOKENS.blue }}>— nines of per-step accuracy (left)</span>
                    <span style={{ color: TOKENS.purple }}>— score at p = {focus} (right)</span>
                  </span>
                </div>
                <svg
                  viewBox={`0 0 ${PLOT.width} ${PLOT.height}`}
                  role="img"
                  aria-label="Per-step reliability in nines and benchmark score versus compute"
                >
                  <Frame scoreSide="right" />
                  {ninesTicks.map((n) => (
                    <text
                      key={n}
                      x={PLOT.padL - 6}
                      y={yScaleNines(n) + 3.5}
                      textAnchor="end"
                      fill={TOKENS.blue}
                      fontFamily={TYPO.mono}
                      fontSize="10.5"
                    >
                      {n}
                    </text>
                  ))}
                  <path
                    d={linePath(ninesCurves, (pt) => yScaleNines(pt.nines))}
                    fill="none"
                    stroke={TOKENS.blue}
                    strokeWidth="2"
                  />
                  <path
                    d={linePath(ninesCurves, (pt) => yScale(pt.s))}
                    fill="none"
                    stroke={TOKENS.purple}
                    strokeWidth="3"
                  />
                </svg>
                <table className="es-table">
                  <thead>
                    <tr>
                      <th>per-step accuracy</th>
                      <th>score at p = {focus}</th>
                      <th>compute needed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ninesRows.map((r) => (
                      <tr key={r.k}>
                        <td>{formatNumber(100 * r.acc, 4)}%</td>
                        <td style={{ color: TOKENS.purple, fontWeight: 600 }}>
                          {formatNumber(100 * r.s, 1)}%
                        </td>
                        <td style={{ color: TOKENS.textMuted }}>
                          {r.x <= 0 ? "already there" : `10^${formatNumber(r.x, 1)} × C₀`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
