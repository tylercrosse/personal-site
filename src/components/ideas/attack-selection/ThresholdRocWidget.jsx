import { useMemo, useRef, useState } from "react";
import { TOKENS, buttonStyles } from "./vizTheme";
import { Slider, Stat } from "./vizControls";
import { ALL_ATTACKS, GRID, Phi, honestMass, logSpace, thresholdFor, tprAt } from "./model";
import {
  Axes,
  INK,
  Label,
  Swatch,
  WIDGET_CSS,
  chartHeight,
  fmtBudget,
  linePath,
  linear,
  log10Scale,
  makeFrame,
  pct,
  px,
  useMeasuredWidth,
  xRange,
  yRange,
} from "./chartKit";

// Part 1's threshold → ROC link, before any selection. Left: honest and
// attack score distributions with a draggable τ; the false positives (honest
// work above τ) and true positives (attacks above τ) are shaded. Right: the
// ROC curve with the current τ as a point whose x is the FP share and whose y
// is the TP share. Local state only: this widget doesn't drive the explorer.

const SIGMA = 1;
const X_MIN = -4;
const X_MAX = 7;
const DIST_X = GRID.filter((x) => x <= X_MAX);
const HONEST = honestMass(SIGMA);
const PRESETS = [0.001, 0.01, 0.05, 0.1, 0.5]; // the τ table's rows
const MIN_EXP = -4;
const FP = TOKENS.orange; // false positives: honest work audited
const TP = TOKENS.green; // true positives: attacks caught

// 100% − budget at the budget's own precision (99%, 99.9%, 99.99%), so the
// true-negative rate never rounds up to 100%.
const tnrText = (budget) => {
  const s = (100 - budget * 100).toFixed(budget < 0.001 ? 2 : budget < 0.01 ? 1 : 0);
  return `${s}%`;
};

const tprOf = (f) => (f <= 0 ? 0 : tprAt(ALL_ATTACKS, thresholdFor(f, SIGMA)));
const LOG_FPRS = logSpace(MIN_EXP, 0, 160);
const LIN_FPRS = [0, ...logSpace(-6, 0, 240)];
const LOG_ROC = LOG_FPRS.map(tprOf);
const LIN_ROC = LIN_FPRS.map(tprOf);
const PRESET_POINTS = PRESETS.map((f) => ({ f, t: tprOf(f) }));

function useFrame() {
  const [ref, width] = useMeasuredWidth(460);
  const frame = useMemo(() => makeFrame({ width, height: chartHeight(width, 0.66, 250, 330), padL: 46, padR: 16 }), [width]);
  return { ref, frame, x: xRange(frame), y: yRange(frame) };
}

function DistributionChart({ tau, budget, setBudgetExp }) {
  const { ref, frame, x: [X0, X1], y: [Y0, Y1] } = useFrame();
  const svgRef = useRef(null);
  const dragging = useRef(false);
  const n = DIST_X.length;
  const honest = HONEST.slice(0, n);
  const attacks = ALL_ATTACKS.slice(0, n);
  const peak = Math.max(...honest, ...attacks);
  const sx = linear(X_MIN, X_MAX, X0, X1);
  const sy = (v) => px(Y0 - (v / peak) * (Y0 - Y1 - 20));
  const xs = DIST_X.map(sx);
  const tauX = sx(Math.max(X_MIN, Math.min(X_MAX, tau)));

  const tail = (mass) => {
    const pts = DIST_X.map((x, j) => [x, mass[j]]).filter(([x]) => x >= tau);
    if (!pts.length) return "";
    return `M${tauX} ${Y0} ${pts.map(([x, v]) => `L${sx(x)} ${sy(v)}`).join(" ")} L${sx(X_MAX)} ${Y0} Z`;
  };

  // Drag τ: map the pointer back to a score, then to the budget it implies.
  const moveTo = (clientX) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const vx = ((clientX - rect.left) / rect.width) * frame.width;
    const score = X_MIN + ((vx - X0) / (X1 - X0)) * (X_MAX - X_MIN);
    const f = Math.min(1, Math.max(10 ** MIN_EXP, 1 - Phi(score / SIGMA)));
    setBudgetExp(Math.log10(f));
  };

  const xTicks = [-4, -2, 0, 2, 4, 6].map((v) => ({ x: sx(v), label: String(v) }));
  const fpLabelX = Math.min(Math.max(tauX + 6, sx(1.2)), X1 - 40);
  // τ label sits right of the line, or flips left when it would hit the edge.
  const tauLabelRight = tauX + 6 + 86 <= X1;

  return (
    <div className="as-chart" ref={ref}>
      <p className="as-chart-title">one threshold: drag τ</p>
      <svg
        ref={svgRef}
        className="as-plot tr-drag"
        viewBox={`0 0 ${frame.width} ${frame.height}`}
        role="img"
        aria-label={`Honest and attack score distributions with τ at ${tau.toFixed(2)}: ${fmtBudget(budget)} of honest work and ${pct(tprOf(budget))} of attacks sit above it`}
        onPointerDown={(e) => {
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          moveTo(e.clientX);
        }}
        onPointerMove={(e) => dragging.current && moveTo(e.clientX)}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
      >
        <Axes frame={frame} xTicks={xTicks} yTicks={[]} xLabel={frame.innerW < 380 ? "suspicion score" : "trajectory suspicion score (max over steps)"} />
        <path d={tail(attacks)} fill={TP} fillOpacity="0.3" />
        <path d={tail(honest)} fill={FP} fillOpacity="0.55" />
        <path d={linePath(xs, honest.map(sy))} fill="none" stroke={INK.honest} strokeWidth="2" />
        <path d={linePath(xs, attacks.map(sy))} fill="none" stroke={INK.all} strokeWidth="1.8" strokeDasharray="5 4" />
        <line x1={tauX} x2={tauX} y1={Y1} y2={Y0} stroke={INK.marker} strokeWidth="2" strokeDasharray="5 3" />
        <circle cx={tauX} cy={Y1 + 6} r="6" fill={INK.marker} />
        <Label x={tauLabelRight ? tauX + 6 : tauX - 6} y={Y1 + 26} anchor={tauLabelRight ? "start" : "end"} color={INK.text}>τ = {tau.toFixed(2)}</Label>
        <Label x={sx(-1.1)} y={sy(honest[DIST_X.findIndex((x) => x >= -1.1)]) - 8} anchor="end" color={INK.text}>honest</Label>
        <Label x={sx(4.3)} y={sy(attacks[DIST_X.findIndex((x) => x >= 3.6)]) - 8} color={INK.text}>attacks</Label>
        <Label x={fpLabelX} y={Y0 - 8} color={FP} weight={650}>FP</Label>
        {tau < 5 ? <Label x={Math.min(sx(Math.max(tau, 2.2) + 0.8), X1 - 30)} y={sy(attacks[DIST_X.findIndex((x) => x >= Math.max(tau, 2.2) + 0.8)] ?? 0) + 22} color={TP} weight={650}>TP</Label> : null}
      </svg>
    </div>
  );
}

function RocChart({ budget, axis }) {
  const { ref, frame, x: [X0, X1], y: [Y0, Y1] } = useFrame();
  const isLog = axis === "log";
  const sx = isLog ? log10Scale(MIN_EXP, 0, X0, X1) : linear(0, 1, X0, X1);
  const sy = linear(0, 1, Y0, Y1);
  const fprs = isLog ? LOG_FPRS : LIN_FPRS;
  const roc = isLog ? LOG_ROC : LIN_ROC;
  const t = tprOf(budget);
  const px0 = sx(budget);
  const py0 = sy(t);

  const xTicks = isLog
    ? [-4, -3, -2, -1, 0].map((e, i) => ({ x: sx(10 ** e), label: fmtBudget(10 ** e), grid: i > 0 && i < 4, edge: true }))
    : [0, 0.25, 0.5, 0.75, 1].map((v, i) => ({ x: sx(v), label: pct(v), grid: i > 0 && i < 4, edge: true }));
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((v) => ({ y: sy(v), label: pct(v) }));
  const chance = fprs.map((f) => sy(f));

  return (
    <div className="as-chart" ref={ref}>
      <p className="as-chart-title">every threshold: the ROC curve</p>
      <svg className="as-plot" viewBox={`0 0 ${frame.width} ${frame.height}`} role="img"
        aria-label={`ROC curve on a ${axis} false-positive axis; the current threshold is the point at FPR ${fmtBudget(budget)}, TPR ${pct(t)}`}>
        <Axes frame={frame} xTicks={xTicks} yTicks={yTicks}
          xLabel={isLog ? "false-positive rate (log scale)" : "false-positive rate"} yLabel="true-positive rate" />
        <path d={linePath(fprs.map(sx), chance)} fill="none" stroke={INK.honest} strokeWidth="1.2" strokeDasharray="2 3" />
        <path d={linePath(fprs.map(sx), roc.map(sy))} fill="none" stroke={INK.text} strokeWidth="2.6" />
        {PRESET_POINTS.map((p) => (
          <circle key={p.f} cx={sx(p.f)} cy={sy(p.t)} r="3.5" fill={INK.honest} opacity="0.55" />
        ))}
        {/* The point's coordinates are the two shaded areas on the left. */}
        <line x1={px0} x2={px0} y1={py0} y2={Y0} stroke={FP} strokeWidth="2" strokeDasharray="4 3" />
        <line x1={X0} x2={px0} y1={py0} y2={py0} stroke={TP} strokeWidth="2" strokeDasharray="4 3" />
        <circle cx={px0} cy={py0} r="7" fill={INK.text} stroke="var(--bg-2)" strokeWidth="2" />
        <Label x={Math.min(px0 + 6, X1 - 40)} y={Y0 - 8} color={FP} weight={650}>{fmtBudget(budget)}</Label>
        <Label x={X0 + 6} y={py0 - 8} color={TP} weight={650}>{pct(t)}</Label>
      </svg>
    </div>
  );
}

export default function ThresholdRocWidget() {
  const [budgetExp, setBudgetExp] = useState(-2); // 1%, as in Figure 1
  const [axis, setAxis] = useState("linear");
  const budget = 10 ** budgetExp;
  const tau = thresholdFor(budget, SIGMA);
  const tpr = tprOf(budget);
  const activePreset = PRESETS.find((f) => Math.abs(Math.log10(f) - budgetExp) < 0.01);

  return (
    <section className="as-widget" aria-label="Threshold and ROC curve">
      <style>{`${WIDGET_CSS}
        .tr-drag { cursor: ew-resize; touch-action: pan-y; user-select: none; }
      `}</style>

      <div className="as-toolbar">
        <div className="as-seg" role="group" aria-label="Pick a row from the table">
          <span className="as-seg-label">audit budget</span>
          {PRESETS.map((f) => (
            <button key={f} type="button" onClick={() => setBudgetExp(Math.log10(f))} aria-pressed={activePreset === f}
              style={buttonStyles({ active: activePreset === f, color: INK.text })}>
              {fmtBudget(f)}
            </button>
          ))}
        </div>
        <div className="as-seg" role="group" aria-label="ROC x-axis scale">
          <span className="as-seg-label">ROC axis</span>
          {["linear", "log"].map((a) => (
            <button key={a} type="button" onClick={() => setAxis(a)} aria-pressed={axis === a}
              style={buttonStyles({ active: axis === a, color: INK.text })}>
              {a}
            </button>
          ))}
        </div>
      </div>

      <div className="as-controls">
        <Slider label="audit budget (FPR)" valueChars={7} value={budgetExp} min={MIN_EXP} max={0} step={0.02}
          onChange={setBudgetExp} display={fmtBudget(budget)} />
      </div>

      <div className="as-stats" aria-live="polite">
        <Stat label="threshold τ" value={tau.toFixed(2)} />
        <Stat label="FPR: honest work above τ" value={fmtBudget(budget)} color={FP} />
        <Stat label="TPR: attacks above τ" value={pct(tpr)} color={TP} />
        <Stat label="TNR · FNR" value={`${tnrText(budget)} · ${pct(1 - tpr)}`} />
      </div>

      <div className="as-legend">
        <span><Swatch color={INK.honest} />honest</span>
        <span><Swatch color={INK.all} dashed />attacks</span>
        <span><Swatch color={FP} width={8} />false positives (x)</span>
        <span><Swatch color={TP} width={8} />true positives (y)</span>
      </div>

      <div className="as-charts">
        <DistributionChart tau={tau} budget={budget} setBudgetExp={setBudgetExp} />
        <RocChart budget={budget} axis={axis} />
      </div>

      <p className="as-note">
        The point on the right is the threshold on the left: its x is the orange area (honest work above τ)
        and its y is the green area (attacks above τ). Drag τ left and both areas grow, so the point climbs
        toward the top-right. The faint dots are the table's five rows. On the linear axis, budgets from 0.1%
        to 5% are crammed against the left edge; switch to log to spread them out.
      </p>
    </section>
  );
}
