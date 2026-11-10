import { useMemo, useState } from "react";
import { Slider, Stat } from "./vizControls";
import { ALL_ATTACKS, deployment, keptAttacks, logSpace, thresholdFor, tprAt } from "./model";
import { useSettings } from "./store";
import {
  Axes,
  INK,
  Swatch,
  WIDGET_CSS,
  fmtCount,
  fmtRate,
  linePath,
  linear,
  log10Scale,
  makeFrame,
  pct,
  useSplitChartSize,
  xRange,
  yRange,
} from "./chartKit";

// Deployment safety over N tasks (paper Appendix A, Eq. 4) for an attacker
// that attacks every opportunity vs. one that attacks only the share its
// selector keeps. Caught rates and side-task success come from the explorer.

const NS = logSpace(1, 6, 100);

const fmtAttempts = (v) => (v < 10 ? v.toFixed(1) : fmtCount(v));

export default function DeploymentPanel() {
  const [sideRef, chartRef, { width: chartW, height: chartH }] = useSplitChartSize(640, 300);
  const FRAME = makeFrame({ width: chartW, height: chartH, padL: 50, padR: 18 });
  const [X0, X1] = xRange(FRAME);
  const [Y0, Y1] = yRange(FRAME);
  const sx = log10Scale(1, 6, X0, X1);
  const sy = linear(0, 1, Y0, Y1);
  const { budget, keep, noise, sigma, sideTaskSuccess: p } = useSettings();
  const [rateExp, setRateExp] = useState(-3);
  const [nExp, setNExp] = useState(4.3);
  const rate = 10 ** rateExp;
  const n = 10 ** nExp;

  const kept = useMemo(() => keptAttacks(keep, noise), [keep, noise]);
  const tau = thresholdFor(budget, sigma);
  const all = deployment(rate, tprAt(ALL_ATTACKS, tau), p);
  const sel = deployment(rate * keep, tprAt(kept, tau), p);

  const xs = NS.map(sx);
  const nx = sx(n);
  const xTicks = [1, 2, 3, 4, 5, 6].map((e, i) => ({
    x: sx(10 ** e),
    label: fmtCount(10 ** e),
    grid: i > 0 && i < 5,
    edge: true,
  }));
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((v) => ({ y: sy(v), label: pct(v) }));

  return (
    <section className="as-widget" aria-label="Deployment safety over many tasks">
      <style>{WIDGET_CSS}</style>

      <div className="as-split">
      <div className="as-side" ref={sideRef}>
      <div className="as-controls">
        <Slider label="opportunities per task" valueChars={8} value={rateExp} min={-5} max={-1} step={0.05}
          onChange={setRateExp} display={fmtRate(rate)} />
        <Slider label="deployment length N" value={nExp} min={1} max={6} step={0.05}
          onChange={setNExp} display={fmtCount(n)} />
      </div>

      <div className="as-stats" aria-live="polite">
        <Stat label="decisive attempts, all → selective" value={`${fmtAttempts(all.expectedAttempts(n))} → ${fmtAttempts(sel.expectedAttempts(n))}`} />
        <Stat label="deployment safety S_N" value={`${pct(all.safety(n))} → ${pct(sel.safety(n))}`} color={INK.kept} />
        <Stat label="long-run limit (the ratio)" value={`${pct(all.ratio)} → ${pct(sel.ratio)}`} />
      </div>

      <div className="as-legend">
        <span><Swatch color={INK.all} dashed />attacks every opportunity</span>
        <span><Swatch color={INK.kept} width={3} />selective attacker</span>
        <span><Swatch color={INK.honest} dashed width={1.2} />long-run limits</span>
      </div>

      </div>
      <div className="as-main">
      <div className="as-chart" ref={chartRef}>
        <svg className="as-plot" viewBox={`0 0 ${FRAME.width} ${FRAME.height}`} role="img"
          aria-label={`Deployment safety against deployment length. At ${fmtCount(n)} tasks, ${pct(all.safety(n))} against an always-attacker and ${pct(sel.safety(n))} against a selective one.`}>
          <Axes frame={FRAME} xTicks={xTicks} yTicks={yTicks}
            xLabel={FRAME.innerW < 380 ? "deployment length N (log)" : "deployment length N (tasks, log scale)"} yLabel="deployment safety" />
          <line x1={X0} x2={X1} y1={sy(all.ratio)} y2={sy(all.ratio)} stroke={INK.honest} strokeWidth="1.2" strokeDasharray="2 3" />
          <line x1={X0} x2={X1} y1={sy(sel.ratio)} y2={sy(sel.ratio)} stroke={INK.honest} strokeWidth="1.2" strokeDasharray="2 3" />
          <path d={linePath(xs, NS.map((v) => sy(all.safety(v))))} fill="none" stroke={INK.all} strokeWidth="1.8" strokeDasharray="5 4" />
          <path d={linePath(xs, NS.map((v) => sy(sel.safety(v))))} fill="none" stroke={INK.kept} strokeWidth="2.6" />
          <line x1={nx} x2={nx} y1={Y1} y2={Y0} stroke={INK.marker} strokeWidth="1.4" strokeDasharray="4 3" />
          <circle cx={nx} cy={sy(all.safety(n))} r="4.5" fill="var(--bg-2)" stroke={INK.all} strokeWidth="2" />
          <circle cx={nx} cy={sy(sel.safety(n))} r="4.5" fill={INK.kept} stroke="var(--bg-2)" strokeWidth="1.5" />
        </svg>
      </div>

      </div>
      </div>

      <p className="as-note">
        Uses the caught rates and side-task success from the explorer above; the selective attacker attempts
        only the share of opportunities its selector keeps. Drop the opportunity rate until expected attempts
        fall near one: at small N the selective attacker looks safer, because the deployment often ends with
        nothing decisive. Raise N and both curves settle onto their ratios.
      </p>
    </section>
  );
}
