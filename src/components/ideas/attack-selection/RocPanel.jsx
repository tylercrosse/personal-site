import { useMemo } from "react";
import { Slider, Stat } from "./vizControls";
import { ALL_ATTACKS, auroc, budgetToRecover, keptAttacks, logSpace, thresholdFor, tprAt } from "./model";
import { setSettings, useSettings } from "./store";
import {
  Axes,
  INK,
  Label,
  Swatch,
  WIDGET_CSS,
  fmtBudget,
  linePath,
  linear,
  log10Scale,
  makeFrame,
  pct,
  useSplitChartSize,
  px,
  xRange,
  yRange,
} from "./chartKit";

// ROC curve on a log-FPR axis for all attacks vs. the attacks a selector
// keeps. Follows the SelectionExplorer's selector settings via the store;
// its budget slider moves the shared budget.

const FPRS = logSpace(-4, 0, 120);

export default function RocPanel() {
  const [sideRef, chartRef, { width: chartW, height: chartH }] = useSplitChartSize(640, 300);
  const FRAME = makeFrame({ width: chartW, height: chartH, padL: 50, padR: 18 });
  const [X0, X1] = xRange(FRAME);
  const [Y0, Y1] = yRange(FRAME);
  const sx = log10Scale(-4, 0, X0, X1);
  const sy = linear(0, 1, Y0, Y1);
  const { budget, keep, noise, sigma } = useSettings();
  const kept = useMemo(() => keptAttacks(keep, noise), [keep, noise]);
  const [rocAll, rocKept] = useMemo(() => {
    const taus = FPRS.map((f) => thresholdFor(f, sigma));
    return [taus.map((t) => tprAt(ALL_ATTACKS, t)), taus.map((t) => tprAt(kept, t))];
  }, [kept, sigma]);

  const tau = thresholdFor(budget, sigma);
  const tprAll = tprAt(ALL_ATTACKS, tau);
  const tprKept = tprAt(kept, tau);
  const need = budgetToRecover(kept, sigma, budget, tprAll);
  const factor = need / budget;
  const factorText = `×${factor < 10 ? factor.toFixed(1) : Math.round(factor)}`;

  const xs = FPRS.map(sx);
  const bx = sx(budget);
  const nx = sx(need);
  const yT = sy(tprAll);
  const showArrow = nx - bx > 14;
  const xTicks = [-4, -3, -2, -1, 0].map((e, i) => ({
    x: sx(10 ** e),
    label: fmtBudget(10 ** e),
    grid: i > 0 && i < 4,
    edge: true,
  }));
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((v) => ({ y: sy(v), label: pct(v) }));

  return (
    <section className="as-widget" aria-label="ROC curves with and without attack selection">
      <style>{WIDGET_CSS}</style>

      <div className="as-split">
      <div className="as-side" ref={sideRef}>
      <div className="as-controls">
        <Slider label="audit budget (FPR)" value={Math.log10(budget)} min={-4} max={0} step={0.05}
          onChange={(v) => setSettings({ budget: 10 ** v })} display={fmtBudget(budget)} />
      </div>

      <div className="as-stats" aria-live="polite">
        <Stat label="TPR at this budget, all → kept" value={`${pct(tprAll)} → ${pct(tprKept)}`} color={INK.kept} />
        <Stat label="AUROC, all → kept" value={`${auroc(ALL_ATTACKS, sigma).toFixed(2)} → ${auroc(kept, sigma).toFixed(2)}`} />
        <Stat label="budget to recover the TPR" value={need <= budget * 1.001 ? "no change" : `${fmtBudget(need)} (${factorText})`} />
      </div>

      <div className="as-legend">
        <span><Swatch color={INK.all} dashed />ROC on all attacks</span>
        <span><Swatch color={INK.kept} width={3} />ROC on attacks the selector keeps</span>
        <span><Swatch color={INK.honest} dashed width={1.2} />chance (TPR = FPR)</span>
      </div>

      </div>
      <div className="as-main">
      <div className="as-chart" ref={chartRef}>
        <svg className="as-plot" viewBox={`0 0 ${FRAME.width} ${FRAME.height}`} role="img"
          aria-label={`ROC curves on a log false-positive axis. At ${fmtBudget(budget)}, the caught rate falls from ${pct(tprAll)} to ${pct(tprKept)} under selection.`}>
          <Axes frame={FRAME} xTicks={xTicks} yTicks={yTicks}
            xLabel={FRAME.innerW < 420 ? "FPR = audit budget (log)" : "false-positive rate = audit budget (log scale)"} yLabel="caught rate (TPR)" />
          <path d={linePath(xs, FPRS.map(sy))} fill="none" stroke={INK.honest} strokeWidth="1.2" strokeDasharray="2 3" />
          <path d={linePath(xs, rocAll.map(sy))} fill="none" stroke={INK.all} strokeWidth="1.8" strokeDasharray="5 4" />
          <path d={linePath(xs, rocKept.map(sy))} fill="none" stroke={INK.kept} strokeWidth="2.6" />
          <line x1={bx} x2={bx} y1={Y1} y2={Y0} stroke={INK.marker} strokeWidth="1.4" strokeDasharray="4 3" />
          {showArrow ? (
            <g>
              <line x1={bx} x2={px(nx - 6)} y1={yT} y2={yT} stroke={INK.text} strokeWidth="1.4" />
              <path d={`M${px(nx)} ${yT} L${px(nx - 8)} ${px(yT - 4)} L${px(nx - 8)} ${px(yT + 4)} Z`} fill={INK.text} />
              <Label x={px((bx + nx) / 2)} y={px(yT - 8)} anchor="middle" color={INK.text}>
                {factorText} audit
              </Label>
            </g>
          ) : null}
          <circle cx={bx} cy={yT} r="4.5" fill="var(--bg-2)" stroke={INK.all} strokeWidth="2" />
          <circle cx={bx} cy={sy(tprKept)} r="4.5" fill={INK.kept} stroke="var(--bg-2)" strokeWidth="1.5" />
        </svg>
      </div>

      </div>
      </div>

      <p className="as-note">
        Follows the explorer's selector settings; this budget slider moves the explorer too. The arrow is how
        far right you have to move, meaning how much more honest work you have to audit, to get the original
        caught rate back against the selective attacker.
      </p>
    </section>
  );
}
