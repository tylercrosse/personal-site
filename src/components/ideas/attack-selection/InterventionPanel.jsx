import { useEffect, useMemo, useRef, useState } from "react";
import { TOKENS, buttonStyles } from "./vizTheme";
import { Stat } from "./vizControls";
import {
  ALL_ATTACKS,
  GRID,
  keptAttacks,
  normalMass,
  resampledMass,
  safetyFromTpr,
  thresholdForMass,
  tprAt,
} from "./model";
import { Axes, INK, Label, Swatch, WIDGET_CSS, chartHeight, fmtBudget, linePath, linear, makeFrame, pct, px, useMeasuredWidth, xRange, yRange } from "./chartKit";

// The interventions table as a picture: each button moves the honest and/or
// attack distribution (and with them τ), drawn over a ghost of the baseline.
// Self-contained toy settings: 1% budget, p = 70%, the explorer's default
// selector (keep 30%, noise 0.8).
//
// Resampling model: a score is signal (what the action does) plus per-sample
// noise. Honest suspicion is mostly noise (signal sd 0.4, noise sd 0.92);
// attack suspicion is mostly signal (signal sd 1.0, noise sd 0.46). Both
// totals match the baseline distributions. Executing the least suspicious of
// k = 3 samples takes the minimum of the noise, so honest scores move further.

const P = 0.7;
const BUDGET = 0.01;
const SELECTOR = { keep: 0.3, noise: 0.8 };
const X_MAX = 7;
const N_PTS = GRID.filter((x) => x <= X_MAX).length;

const BASE_HONEST = normalMass(0, 1);

const INTERVENTIONS = [
  { id: "none", label: "Baseline", side: null,
    honest: "—", attacks: "—", tau: "—", safety: "—" },
  { id: "selection", label: "Attack selection", side: "red",
    honest: "Unchanged", attacks: "Kept attacks shift left", tau: "Unchanged", safety: "Falls" },
  { id: "random", label: "Random selection", side: "red",
    honest: "Unchanged", attacks: "Same shape, fewer attacks", tau: "Unchanged", safety: "Unchanged" },
  { id: "resample", label: "Resampling (CTRL-Z)", side: "blue",
    honest: "Shift left a lot", attacks: "Shift left a little", tau: "Falls", safety: "Rises" },
  { id: "monitor", label: "Fewer honest false alarms", side: "blue",
    honest: "Tighter", attacks: "Similar", tau: "Falls", safety: "Rises" },
  { id: "budget", label: "5% audit budget", side: "blue",
    honest: "Unchanged", attacks: "Unchanged", tau: "Falls", safety: "Rises, and selection has less room" },
];

function scenario(id) {
  switch (id) {
    case "selection":
      return { honest: BASE_HONEST, attacks: keptAttacks(SELECTOR.keep, SELECTOR.noise), budget: BUDGET };
    case "resample":
      return {
        honest: resampledMass(0, 0.4, Math.sqrt(1 - 0.16), 3),
        attacks: resampledMass(2.3, 1.0, Math.sqrt(1.21 - 1), 3),
        budget: BUDGET,
      };
    case "monitor":
      return { honest: normalMass(0, 0.6), attacks: ALL_ATTACKS, budget: BUDGET };
    case "budget":
      return { honest: BASE_HONEST, attacks: ALL_ATTACKS, budget: 0.05 };
    default: // baseline and random selection: same shapes
      return { honest: BASE_HONEST, attacks: ALL_ATTACKS, budget: BUDGET };
  }
}

function evaluate(id, withSelection) {
  const s = scenario(id);
  const tau = thresholdForMass(s.honest, s.budget);
  const sel = withSelection && id !== "selection" && id !== "random";
  const attacks = sel ? keptAttacks(SELECTOR.keep, SELECTOR.noise, s.attacks) : s.attacks;
  // Share of opportunities attacked: both kinds of selection attack only 30%
  // of them. The chart scales the attack curve by it so area = how many
  // attacks happen; rates stay within-class, so TPR ignores it.
  const share = sel || id === "selection" || id === "random" ? SELECTOR.keep : 1;
  const tpr = tprAt(attacks, tau);
  // Selection's cost at this setting: unselected vs selected attacks, both
  // measured against this scenario's τ.
  const unselected = id === "selection" ? ALL_ATTACKS : s.attacks;
  const tprNoSel = tprAt(unselected, tau);
  const tprSel = id === "random" ? tprNoSel : tprAt(keptAttacks(SELECTOR.keep, SELECTOR.noise, unselected), tau);
  return {
    ...s,
    attacks,
    drawnAttacks: attacks.map((v) => v * share),
    share,
    tau,
    tpr,
    safety: safetyFromTpr(tpr, P),
    selectionCost: safetyFromTpr(tprNoSel, P) - safetyFromTpr(tprSel, P),
  };
}

/** Tween arrays and τ toward a target over `ms`; jumps under reduced motion. */
function useTween(target, ms = 480) {
  const [shown, setShown] = useState(target);
  const fromRef = useRef(target);
  const shownRef = useRef(target);
  shownRef.current = shown;
  useEffect(() => {
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShown(target);
      return undefined;
    }
    fromRef.current = shownRef.current;
    const from = fromRef.current;
    const t0 = performance.now();
    let raf = 0;
    const step = (now) => {
      const t = Math.min(1, (now - t0) / ms);
      const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      const mix = (u, v) => u + (v - u) * e;
      setShown({
        honest: target.honest.map((v, i) => mix(from.honest[i], v)),
        attacks: target.attacks.map((v, i) => mix(from.attacks[i], v)),
        tau: mix(from.tau, target.tau),
      });
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return shown;
}

const CSS = `
  .iv-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 6px; margin: 0 0 14px; }
  .iv-cell { border: 1px solid ${TOKENS.border}; border-radius: 6px; padding: 7px 10px; background: ${TOKENS.surfaceSoft}; min-width: 0; }
  .iv-cell span { display: block; font-family: var(--font-mono); font-size: 12px; color: ${TOKENS.textMuted}; margin-bottom: 2px; }
  .iv-cell strong { display: block; font-size: 14.5px; font-weight: 650; }
  .iv-check { display: inline-flex; align-items: center; gap: 8px; font-family: var(--font-mono); font-size: 13px; color: ${TOKENS.textMuted}; cursor: pointer; }
  .iv-check input { accent-color: ${TOKENS.accent}; }
`;

export default function InterventionPanel() {
  const [id, setId] = useState("selection");
  const [withSel, setWithSel] = useState(false);
  const [ref, width] = useMeasuredWidth(640);
  const frame = useMemo(() => makeFrame({ width, height: chartHeight(width, 0.5, 250, 340), padL: 14, padR: 14 }), [width]);
  const [X0, X1] = xRange(frame);
  const [Y0, Y1] = yRange(frame);

  const selectable = id !== "selection" && id !== "random";
  const selOn = withSel && selectable;
  // Compare against the same attacker with no intervention, so checking
  // "also apply attack selection" never reads as the intervention hurting.
  const base = useMemo(() => evaluate("none", selOn), [selOn]);
  const cur = useMemo(() => evaluate(id, selOn), [id, selOn]);
  // One fixed y-scale across every scenario, so heights compare honestly.
  const peak = useMemo(
    () => Math.max(...INTERVENTIONS.flatMap((iv) => {
      const s = scenario(iv.id);
      return [...s.honest.slice(0, N_PTS), ...s.attacks.slice(0, N_PTS)];
    })),
    [],
  );
  const target = useMemo(() => ({ honest: cur.honest, attacks: cur.drawnAttacks, tau: cur.tau }), [cur]);
  const shown = useTween(target);

  const iv = INTERVENTIONS.find((x) => x.id === id);
  const sx = linear(-4, X_MAX, X0, X1);
  const usable = Y0 - Y1 - 20;
  const sy = (v) => px(Y0 - (v / peak) * usable);
  const xs = GRID.slice(0, N_PTS).map(sx);
  const curve = (mass) => linePath(xs, mass.slice(0, N_PTS).map(sy));
  const tail = (mass, tau) => {
    const pts = GRID.slice(0, N_PTS).map((x, j) => [x, mass[j]]).filter(([x]) => x >= tau);
    if (!pts.length) return "";
    return `M${sx(tau)} ${Y0} ${pts.map(([x, v]) => `L${sx(x)} ${sy(v)}`).join(" ")} L${sx(X_MAX)} ${Y0} Z`;
  };
  const tauX = sx(shown.tau);
  const baseTauX = sx(base.tau);
  const moved = Math.abs(cur.tau - base.tau) > 0.01;
  const xTicks = [-4, -2, 0, 2, 4, 6].map((v) => ({ x: sx(v), label: String(v) }));
  const attackColor = id === "none" && !selOn ? INK.all : INK.kept;

  return (
    <section className="as-widget" aria-label="How interventions move the distributions">
      <style>{WIDGET_CSS + CSS}</style>

      <div className="as-presets" role="group" aria-label="Intervention">
        {INTERVENTIONS.map((x) => (
          <button key={x.id} type="button" aria-pressed={id === x.id} onClick={() => setId(x.id)}
            style={buttonStyles({ active: id === x.id, color: x.side === "blue" ? TOKENS.green : x.side === "red" ? TOKENS.red : INK.kept })}>
            {x.label}
          </button>
        ))}
      </div>

      <div className="iv-row" aria-live="polite">
        <div className="iv-cell"><span>honest scores</span><strong>{iv.honest}</strong></div>
        <div className="iv-cell"><span>attack scores</span><strong>{iv.attacks}</strong></div>
        <div className="iv-cell"><span>τ at a fixed budget</span><strong>{iv.tau}</strong></div>
        <div className="iv-cell"><span>safety</span><strong>{iv.safety}</strong></div>
      </div>

      <div className="as-legend">
        <span><Swatch color={INK.honest} />honest</span>
        <span><Swatch color={attackColor} width={3} />attacks after the change</span>
        <span><Swatch color={TOKENS.textFaint} dashed width={1.5} />baseline, for comparison</span>
      </div>

      <div className="as-chart" ref={ref}>
        <svg className="as-plot" viewBox={`0 0 ${frame.width} ${frame.height}`} role="img"
          aria-label={`${iv.label}: τ ${base.tau.toFixed(2)} → ${cur.tau.toFixed(2)}, caught rate ${pct(base.tpr)} → ${pct(cur.tpr)}, safety ${pct(base.safety)} → ${pct(cur.safety)}.`}>
          <Axes frame={frame} xTicks={xTicks} yTicks={[]} xLabel="trajectory suspicion score" />
          {/* Baseline ghosts. */}
          <path d={curve(base.honest)} fill="none" stroke={TOKENS.textFaint} strokeWidth="1.4" strokeDasharray="3 4" />
          <path d={curve(base.drawnAttacks)} fill="none" stroke={TOKENS.textFaint} strokeWidth="1.4" strokeDasharray="3 4" />
          {moved ? <line x1={baseTauX} x2={baseTauX} y1={Y1 + 16} y2={Y0} stroke={TOKENS.textFaint} strokeWidth="1.2" strokeDasharray="2 4" /> : null}
          {/* Current. */}
          <path d={tail(shown.attacks, shown.tau)} fill={attackColor} fillOpacity="0.28" />
          <path d={curve(shown.honest)} fill="none" stroke={INK.honest} strokeWidth="2.2" />
          <path d={curve(shown.attacks)} fill="none" stroke={attackColor} strokeWidth="2.6" />
          <line x1={tauX} x2={tauX} y1={Y1} y2={Y0} stroke={INK.marker} strokeWidth="1.5" strokeDasharray="4 3" />
          <Label x={px(Math.min(tauX + 6, X1 - 130))} y={Y1 + 12} color={INK.text}>
            τ = {shown.tau.toFixed(2)} (top {fmtBudget(cur.budget)})
          </Label>
          {moved ? (
            <Label x={px(Math.min(baseTauX + 6, X1 - 70))} y={Y1 + 28} color={TOKENS.textMuted} size={11}>was {base.tau.toFixed(2)}</Label>
          ) : null}
          {id === "random" ? (
            <Label x={px(sx(3.4))} y={px(sy(Math.max(...cur.drawnAttacks)) - 10)} color={attackColor} size={11.5}>
              same shape, 30% as many
            </Label>
          ) : null}
        </svg>
      </div>

      <div className="as-toolbar" style={{ marginTop: 12 }}>
        <label className="iv-check" style={{ opacity: selectable ? 1 : 0.45 }}>
          <input type="checkbox" checked={selOn} disabled={!selectable}
            onChange={(e) => setWithSel(e.target.checked)} />
          also apply attack selection
        </label>
      </div>

      <div className="as-stats">
        <Stat label="threshold τ" value={`${base.tau.toFixed(2)} → ${cur.tau.toFixed(2)}`} />
        <Stat label="caught rate" value={`${pct(base.tpr)} → ${pct(cur.tpr)}`} color={INK.kept} />
        <Stat label="safety" value={`${pct(base.safety)} → ${pct(cur.safety)}`} color={INK.kept} />
        <Stat label="safety selection costs here" value={id === "random" ? "0 pts" : `${Math.round(cur.selectionCost * 100)} pts (baseline ${Math.round(base.selectionCost * 100)})`} />
      </div>

      <p className="as-note">
        The area under the attack curve is how many attacks happen, so both kinds of selection shrink it to 30%.
        The caught rate is the share of that area above τ. τ only moves when honest scores or the budget change, because it's set from honest work alone. Selection and
        random selection leave it where it was. The three blue-team changes all lower it, and the last stat shows the
        cost of selection shrinking with it: a lower τ leaves less room below it to hide in. Resampling helps the
        blue team because the least suspicious of three samples strips out noise, and honest suspicion is mostly
        noise while attack suspicion is mostly signal.
      </p>
      <p className="as-note">
        Toy model, 1% budget unless noted, side-task success 70%, the explorer's default selector. Resampling takes
        the least suspicious of 3 samples, with honest scores modeled as mostly noise and attack scores as mostly signal.
      </p>
    </section>
  );
}
