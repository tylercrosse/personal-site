import { useMemo, useState } from "react";
import { TOKENS, buttonStyles } from "./vizTheme";
import { Slider, Stat } from "./vizControls";
import {
  ALL_ATTACKS,
  GRID,
  PRESETS,
  honestMass,
  keptAttacks,
  logSpace,
  safetyFromTpr,
  thresholdFor,
  tprAt,
} from "./model";
import { applyPreset, setSettings, useSettings } from "./store";
import {
  Axes,
  INK,
  Label,
  Swatch,
  WIDGET_CSS,
  bandPath,
  fmtCount,
  fmtBudget,
  linePath,
  linear,
  log10Scale,
  chartHeight,
  makeFrame,
  pct,
  px,
  useMeasuredWidth,
  xRange,
  yRange,
} from "./chartKit";

// Interactive version of the post's Figures 1 and 3: honest vs. attack score
// distributions at one audit budget, and safety across every budget.

const X_MAX = 7;
const DIST_X = GRID.filter((x) => x <= X_MAX);
const BUDGETS = logSpace(-4, 0, 80);
const NOISE_RANDOM = 6.5; // slider stop that means "random selector"
const LOG_DECADES = 6; // log view spans peak down to 10⁻⁶ of it

// How the distribution chart scales its curves (ported from the artifact).
// "norm": each curve has the same area, so shapes compare easily.
// "count"/"log": weighted by how often each occurs — honest work 1, all
// attacks the prevalence, kept attacks prevalence × share kept.
const VIEWS = [
  { id: "norm", label: "same area" },
  { id: "count", label: "by count" },
  { id: "log", label: "by count, log" },
];

/** Share of audited trajectories that are attacks (the monitor's precision). */
const auditPrecision = (prevalence, tpr, budget) => {
  const hits = prevalence * tpr;
  return hits / (hits + budget);
};

function fmtSmallPct(v) {
  if (v >= 0.01) return `${(v * 100).toFixed(1)}%`;
  return `${(v * 100).toFixed(v >= 0.001 ? 2 : 3)}%`;
}

// Each chart draws its viewBox at its measured width (see useMeasuredWidth).
function useFrame() {
  const [ref, width] = useMeasuredWidth(460);
  const frame = useMemo(() => makeFrame({ width, height: chartHeight(width, 0.62, 250, 330), padL: 46, padR: 14 }), [width]);
  const [X0, X1] = xRange(frame);
  const [Y0, Y1] = yRange(frame);
  return { ref, frame, X0, X1, Y0, Y1 };
}

function DistributionChart({ title, honest, kept, tau, budget, view, prevalence, keep }) {
  const { ref, frame: FRAME, X0, X1, Y0, Y1 } = useFrame();
  const n = DIST_X.length;
  const wAll = view === "norm" ? 1 : prevalence;
  const wKept = view === "norm" ? 1 : prevalence * keep;
  const all = ALL_ATTACKS.slice(0, n).map((v) => v * wAll);
  const keptD = kept.slice(0, n).map((v) => v * wKept);
  const honestD = honest.slice(0, n);
  const peak = Math.max(...honestD, ...all, ...keptD);
  const sx = linear(-4, X_MAX, X0, X1);
  const usable = Y0 - Y1 - 18; // headroom for the τ label
  const sy =
    view === "log"
      ? (v) => (v <= 0 ? Y0 : px(Y0 - Math.max(0, (Math.log10(v / peak) + LOG_DECADES) / LOG_DECADES) * usable))
      : (v) => px(Y0 - (v / peak) * usable);
  const yTicks =
    view === "log"
      ? [0, -3, -6].map((e) => ({
          y: px(Y0 - ((e + LOG_DECADES) / LOG_DECADES) * usable),
          label: e === 0 ? "peak" : e === -3 ? "10⁻³" : "10⁻⁶",
        }))
      : [];
  const xs = DIST_X.map(sx);
  const tauX = sx(Math.max(-4, Math.min(X_MAX, tau)));

  const tail = (mass) => {
    const pts = DIST_X.map((x, j) => [x, mass[j]]).filter(([x]) => x >= tau);
    if (!pts.length) return "";
    return `M${tauX} ${Y0} ${pts.map(([x, v]) => `L${sx(x)} ${sy(v)}`).join(" ")} L${sx(X_MAX)} ${Y0} Z`;
  };

  const xTicks = [-4, -2, 0, 2, 4, 6].map((v) => ({ x: sx(v), label: String(v) }));
  const labelX = Math.max(X0 + 4, Math.min(tauX + 6, X1 - 150));

  return (
    <div className="as-chart" ref={ref}>
    <p className="as-chart-title">{title}</p>
    <svg className="as-plot" viewBox={`0 0 ${FRAME.width} ${FRAME.height}`} role="img"
      aria-label={`Honest and attack score distributions with the audit threshold at ${tau.toFixed(2)}`}>
      <Axes frame={FRAME} xTicks={xTicks} yTicks={yTicks} xLabel={FRAME.innerW < 380 ? "suspicion score (max over steps)" : "trajectory suspicion score (max over steps)"} />
      <path d={tail(all)} fill={INK.all} fillOpacity="0.16" />
      <path d={tail(keptD)} fill={INK.kept} fillOpacity="0.32" />
      <path d={linePath(xs, honestD.map(sy))} fill="none" stroke={INK.honest} strokeWidth="2" />
      <path d={linePath(xs, all.map(sy))} fill="none" stroke={INK.all} strokeWidth="1.8" strokeDasharray="5 4" />
      <path d={linePath(xs, keptD.map(sy))} fill="none" stroke={INK.kept} strokeWidth="2.6" />
      <line x1={tauX} x2={tauX} y1={Y1} y2={Y0} stroke={INK.marker} strokeWidth="1.4" strokeDasharray="4 3" />
      <Label x={labelX} y={Y1 + 13} color={INK.text}>
        τ = {tau.toFixed(2)} (top {fmtBudget(budget)})
      </Label>
    </svg>
    </div>
  );
}

function SafetyChart({ title, curveAll, curveKept, budget, safetyAll, safetyKept }) {
  const { ref, frame: FRAME, X0, X1, Y0, Y1 } = useFrame();
  const sx = log10Scale(-4, 0, X0, X1);
  const sy = linear(0, 1, Y0, Y1);
  const xs = BUDGETS.map(sx);
  const yAll = curveAll.map(sy);
  const yKept = curveKept.map(sy);
  const bx = sx(budget);
  const xTicks = [-4, -3, -2, -1, 0].map((e, i) => ({
    x: sx(10 ** e),
    label: fmtBudget(10 ** e),
    grid: i > 0 && i < 4,
    edge: true,
  }));
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((v) => ({ y: sy(v), label: pct(v) }));
  const flip = bx > X1 - 60;

  return (
    <div className="as-chart" ref={ref}>
    <p className="as-chart-title">{title}</p>
    <svg className="as-plot" viewBox={`0 0 ${FRAME.width} ${FRAME.height}`} role="img"
      aria-label={`Safety against audit budget: ${pct(safetyAll)} against all attacks and ${pct(safetyKept)} against kept attacks at ${fmtBudget(budget)}`}>
      <Axes frame={FRAME} xTicks={xTicks} yTicks={yTicks} xLabel="audit budget (log scale)" />
      <path d={bandPath(xs, yAll, yKept)} fill={INK.kept} fillOpacity="0.12" />
      <path d={linePath(xs, yAll)} fill="none" stroke={INK.all} strokeWidth="1.8" strokeDasharray="5 4" />
      <path d={linePath(xs, yKept)} fill="none" stroke={INK.kept} strokeWidth="2.6" />
      <line x1={bx} x2={bx} y1={Y1} y2={Y0} stroke={INK.marker} strokeWidth="1.4" strokeDasharray="4 3" />
      <circle cx={bx} cy={sy(safetyAll)} r="4.5" fill={TOKENS.surface} stroke={INK.all} strokeWidth="2" />
      <circle cx={bx} cy={sy(safetyKept)} r="4.5" fill={INK.kept} stroke={TOKENS.surface} strokeWidth="1.5" />
      {pct(safetyAll) !== pct(safetyKept) ? (
        <Label x={px(bx + (flip ? -8 : 8))} y={px(sy(safetyAll) - 6)} anchor={flip ? "end" : "start"} color={INK.text}>
          {pct(safetyAll)}
        </Label>
      ) : null}
      <Label x={px(bx + (flip ? -8 : 8))} y={px(sy(safetyKept) + 14)} anchor={flip ? "end" : "start"} color={INK.kept} weight={650}>
        {pct(safetyKept)}
      </Label>
    </svg>
    </div>
  );
}

export default function SelectionExplorer() {
  const { preset, budget, keep, noise, sigma, sideTaskSuccess: p } = useSettings();

  const kept = useMemo(() => keptAttacks(keep, noise), [keep, noise]);
  const honest = useMemo(() => honestMass(sigma), [sigma]);
  const [curveAll, curveKept] = useMemo(() => {
    const taus = BUDGETS.map((b) => thresholdFor(b, sigma));
    return [
      taus.map((t) => safetyFromTpr(tprAt(ALL_ATTACKS, t), p)),
      taus.map((t) => safetyFromTpr(tprAt(kept, t), p)),
    ];
  }, [kept, sigma, p]);

  const tau = thresholdFor(budget, sigma);
  const tprAll = tprAt(ALL_ATTACKS, tau);
  const tprKept = tprAt(kept, tau);
  const safetyAll = safetyFromTpr(tprAll, p);
  const safetyKept = safetyFromTpr(tprKept, p);
  const isRandom = !Number.isFinite(noise);

  const [view, setView] = useState("norm");
  const [prevalenceExp, setPrevalenceExp] = useState(3); // attacks are 1 in 10^x
  const prevalence = 10 ** -prevalenceExp;

  return (
    <section className="as-widget" aria-label="Attack selection explorer">
      <style>{WIDGET_CSS}</style>

      <div className="as-presets" role="group" aria-label="Scenarios">
        {Object.entries(PRESETS).map(([id, ps]) => (
          <button key={id} type="button" onClick={() => applyPreset(id)} aria-pressed={preset === id}
            style={buttonStyles({ active: preset === id, color: INK.kept })}>
            {ps.label}
          </button>
        ))}
      </div>

      <div className="as-controls">
        <Slider label="audit budget" value={Math.log10(budget)} min={-4} max={0} step={0.05}
          onChange={(v) => setSettings({ budget: 10 ** v })} display={fmtBudget(budget)} />
        <Slider label="attacks kept" value={Math.round(keep * 100)} min={5} max={100} step={1}
          onChange={(v) => setSettings({ keep: v / 100, preset: null })} display={`${Math.round(keep * 100)}%`} />
        <Slider label="selector noise" value={isRandom ? NOISE_RANDOM : noise} min={0.1} max={NOISE_RANDOM} step={0.1}
          onChange={(v) => setSettings({ noise: v >= NOISE_RANDOM ? Infinity : v, preset: null })}
          display={isRandom ? "random" : noise.toFixed(1)} />
        <Slider label="honest spread σ" value={sigma} min={0.4} max={1.6} step={0.05}
          onChange={(v) => setSettings({ sigma: v, preset: null })} display={sigma.toFixed(2)} />
        <Slider label="side-task success" value={Math.round(p * 100)} min={20} max={100} step={5}
          onChange={(v) => setSettings({ sideTaskSuccess: v / 100 })} display={`${Math.round(p * 100)}%`} />
      </div>

      <div className="as-stats" aria-live="polite">
        <Stat label="threshold τ" value={tau.toFixed(2)} />
        <Stat label="caught rate, all → kept" value={`${pct(tprAll)} → ${pct(tprKept)}`} color={INK.kept} />
        <Stat label="safety, all → kept" value={`${pct(safetyAll)} → ${pct(safetyKept)}`} color={INK.kept} />
        <Stat label="safety lost to selection" value={`${Math.round((safetyAll - safetyKept) * 100)} pts`} />
        <Stat label="audits that hit an attack, all → kept"
          value={`${fmtSmallPct(auditPrecision(prevalence, tprAll, budget))} → ${fmtSmallPct(auditPrecision(prevalence * keep, tprKept, budget))}`} />
      </div>

      <div className="as-legend">
        <span><Swatch color={INK.honest} />honest</span>
        <span><Swatch color={INK.all} dashed />all attacks</span>
        <span><Swatch color={INK.kept} width={3} />attacks the selector keeps</span>
      </div>

      <div className="as-toolbar">
        <div className="as-seg" role="group" aria-label="Scale the distributions">
          <span className="as-seg-label">show curves</span>
          {VIEWS.map((v) => (
            <button key={v.id} type="button" onClick={() => setView(v.id)} aria-pressed={view === v.id}
              style={buttonStyles({ active: view === v.id, color: INK.kept })}>
              {v.label}
            </button>
          ))}
        </div>
        <div className="as-toolbar-slider">
          <Slider label="attack prevalence" valueChars={9} value={prevalenceExp} min={1} max={5} step={0.5}
            onChange={setPrevalenceExp} display={`1 in ${fmtCount(10 ** prevalenceExp)}`} />
        </div>
      </div>

      <div className="as-charts">
        <DistributionChart title="one budget: what lands above τ" honest={honest} kept={kept} tau={tau} budget={budget}
          view={view} prevalence={prevalence} keep={keep} />
        <SafetyChart title="every budget: safety" curveAll={curveAll} curveKept={curveKept} budget={budget}
          safetyAll={safetyAll} safetyKept={safetyKept} />
      </div>

      <p className="as-note">
        By default each curve is scaled to the same area, so attacks look as common as honest work. That
        makes the shapes easy to compare, but in a real deployment attacks are rare. Switch to <em>by
        count</em> to see a realistic mix at the chosen prevalence: the attack curve shrinks to a sliver, and
        the kept curve shrinks further because the selector attacks less often. The log view makes that
        sliver visible again. τ and every rate stay the same in all three views, because the caught rate and
        the false-positive rate are each measured within their own class.
      </p>
      <p className="as-note">
        Toy model: honest scores ~ Normal(0, σ), attack scores ~ Normal(2.3, 1.1). The selector reads each
        attack's score through Gaussian noise and keeps the share it predicts will score lowest; the random
        control keeps a random share, so the shape doesn't change.
      </p>
    </section>
  );
}
