import { useState } from "react";
import { Slider, Stat } from "./vizControls";
import { logSpace, optimalRate, upfrontRedWin } from "./model";
import {
  Axes,
  INK,
  Label,
  Swatch,
  WIDGET_CSS,
  fmtBudget,
  fmtCount,
  fmtRate,
  linePath,
  linear,
  log10Scale,
  makeFrame,
  pct,
  thin,
  useSplitChartSize,
  powerLabel,
  px,
  xRange,
  yRange,
} from "./chartKit";

// Upfront auditing (paper Appendix Eqs. 2–3): humans audit the first aN
// tasks; the attacker attacks each task with fixed probability r. Shows the
// attacker's best rate r* and what happens when the model can't act that
// rarely (an output-probability floor). Self-contained: no explorer state.

const R_EXP = [-7, 0];
const RATES = logSpace(R_EXP[0], R_EXP[1], 200).map((r) => Math.min(r, 0.999999));
const FLOOR_NONE = -8;

export default function UpfrontAuditPanel() {
  const [sideRef, chartRef, { width: chartW, height: chartH }] = useSplitChartSize(640, 300);
  const FRAME = makeFrame({ width: chartW, height: chartH, padL: 50, padR: 18 });
  const [X0, X1] = xRange(FRAME);
  const [Y0, Y1] = yRange(FRAME);
  const sx = log10Scale(R_EXP[0], R_EXP[1], X0, X1);
  const sy = linear(0, 1, Y0, Y1);
  const [aExp, setAExp] = useState(-2);
  const [nExp, setNExp] = useState(4);
  const [floorExp, setFloorExp] = useState(FLOOR_NONE);
  const a = 10 ** aExp;
  const n = 10 ** nExp;
  const floor = floorExp <= FLOOR_NONE ? 0 : 10 ** floorExp;

  const safety = (r) => 1 - upfrontRedWin(r, a, n);
  const curve = RATES.map((r) => sy(1 - upfrontRedWin(r, a, n)));
  const rStar = optimalRate(a, n);
  const forced = floor > rStar;
  const rUsed = forced ? floor : rStar;

  const xTicks = thin([-7, -6, -5, -4, -3, -2, -1, 0], FRAME.innerW).map((e, i, arr) => ({
    x: sx(10 ** e),
    label: powerLabel(e),
    grid: i > 0 && i < arr.length - 1,
    edge: true,
  }));
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((v) => ({ y: sy(v), label: pct(v) }));
  const xs = RATES.map(sx);
  const xStar = sx(rStar);
  const xFloor = floor ? sx(Math.min(floor, 1)) : X0;

  return (
    <section className="as-widget" aria-label="Upfront auditing and low-rate attacks">
      <style>{WIDGET_CSS}</style>

      <div className="as-split">
      <div className="as-side" ref={sideRef}>
      <div className="as-controls">
        <Slider label="audit window a" value={aExp} min={-3} max={-0.7} step={0.05}
          onChange={setAExp} display={fmtBudget(a)} />
        <Slider label="deployment length N" value={nExp} min={2} max={6} step={0.05}
          onChange={setNExp} display={fmtCount(n)} />
        <Slider label="model's rate floor" valueChars={8} value={floorExp} min={FLOOR_NONE} max={-1} step={0.1}
          onChange={setFloorExp} display={floor ? fmtRate(floor) : "none"} />
      </div>

      <div className="as-stats" aria-live="polite">
        <Stat label="best rate r* (attacks expected)" value={`${fmtRate(rStar)} (${(rStar * n).toFixed(1)})`} />
        <Stat label="safety if it can hit r*" value={pct(safety(rStar))} color={INK.kept} />
        <Stat label="safety at the model's floor"
          value={!floor ? "no floor" : forced ? pct(safety(floor)) : `${pct(safety(rStar))} (< r*)`}
          color={forced ? INK.floor : undefined} />
      </div>

      <div className="as-legend">
        <span><Swatch color={INK.kept} width={3} />safety at each fixed attack rate</span>
        {/* Always rendered so setting a floor doesn't change the panel's height. */}
        <span style={{ opacity: floor ? 1 : 0.45 }}><Swatch color={INK.floor} width={8} />rates below the model's floor</span>
      </div>

      </div>
      <div className="as-main">
      <div className="as-chart" ref={chartRef}>
        <svg className="as-plot" viewBox={`0 0 ${FRAME.width} ${FRAME.height}`} role="img"
          aria-label={`Safety against fixed attack rate under upfront auditing. The attacker's best rate is ${fmtRate(rStar)}, giving safety ${pct(safety(rStar))}.`}>
          <Axes frame={FRAME} xTicks={xTicks} yTicks={yTicks}
            xLabel={FRAME.innerW < 380 ? "attack rate r per task (log)" : "fixed attack rate r per task (log scale)"} yLabel="safety" />
          {floor ? (
            <g>
              <rect x={X0} y={Y1} width={px(Math.max(0, xFloor - X0))} height={px(Y0 - Y1)} fill={INK.floor} fillOpacity="0.12" />
              {xFloor - X0 > 150 ? <Label x={X0 + 8} y={Y1 + 16} color={INK.floor}>below the model's floor</Label> : null}
            </g>
          ) : null}
          <path d={linePath(xs, curve)} fill="none" stroke={INK.kept} strokeWidth="2.6" />
          <line x1={xStar} x2={xStar} y1={Y1} y2={Y0} stroke={INK.marker} strokeWidth="1.4" strokeDasharray="4 3" />
          <Label x={px(Math.min(xStar + 6, X1 - 20))} y={Y1 + 32} color={INK.text}>r*</Label>
          <circle cx={xStar} cy={sy(safety(rStar))} r="4.5" fill={INK.kept} stroke="var(--bg-2)" strokeWidth="1.5" />
          {forced ? (
            <g>
              <circle cx={sx(rUsed)} cy={sy(safety(rUsed))} r="5" fill="var(--bg-2)" stroke={INK.floor} strokeWidth="2.2" />
              <Label x={px(Math.min(sx(rUsed) + 9, X1 - 80))} y={px(sy(safety(rUsed)) - 8)} color={INK.floor}>forced rate</Label>
            </g>
          ) : null}
        </svg>
      </div>

      </div>
      </div>

      <p className="as-note">
        No score threshold here: humans audit the first aN tasks and nothing after. The idealized attacker
        expects only about −ln a attacks over the whole deployment, whatever N is. Set a floor near 10⁻² with
        N = 10k and safety jumps, because the model can't attack rarely enough to slip past the window.
      </p>
    </section>
  );
}
