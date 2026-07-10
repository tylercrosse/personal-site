import { useEffect, useId, useMemo, useState } from "react";
import { TOKENS, TYPO, buttonStyles, formatNumber } from "./vizTheme";
import { CONTROL_CSS, Slider, Stat } from "./vizControls";

const OPTIMIZERS = [
  { id: "sgd", label: "SGD", color: TOKENS.blue },
  { id: "momentum", label: "Momentum", color: TOKENS.orange },
  { id: "adam", label: "Adam", color: TOKENS.purple },
];

const ADAM = { beta1: 0.9, beta2: 0.999, eps: 1e-8 };
const DIVERGE_LOSS = 5e4;

const PLOT = { width: 640, height: 520, pad: 42 };
const INNER_W = PLOT.width - PLOT.pad * 2;
const INNER_H = PLOT.height - PLOT.pad * 2;
const RANGE_X = 3.25;
// Equal data-units-per-pixel on both axes so round bowls render as circles.
const RANGE_Y = (RANGE_X * INNER_H) / INNER_W;

const SPARK = { width: 640, height: 120, padL: 44, padR: 12, padT: 14, padB: 16 };

// Deterministic gradient noise: a fixed seeded sequence, shared by all three
// optimizers so they "see the same mini-batches", and identical on server and
// client (Math.random would break hydration).
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const NOISE = (() => {
  const rand = mulberry32(42);
  const out = [];
  for (let i = 0; i < 121; i += 1) {
    const u1 = Math.max(rand(), 1e-12);
    const u2 = rand();
    const r = Math.sqrt(-2 * Math.log(u1));
    out.push({ nx: r * Math.cos(2 * Math.PI * u2), ny: r * Math.sin(2 * Math.PI * u2) });
  }
  return out;
})();

// Tilted double well: minima near x = -1.84 (f ~ 1.67, local) and x = 2.13
// (f ~ 0.27, global), barrier near x = 0 (f ~ 2.2). Tuned so SGD with small
// steps settles into the first well while momentum coasts over the barrier.
const WELLS = { s: 0.3, t: -0.35, cy: 1.5, c0: 2.2 };

const SURFACES = [
  {
    id: "bowl",
    label: "Bowl",
    blurb: "One minimum, uneven curvature — the conditioning story from this section.",
    formula: (kappa) => `L(w) = ½(w₁² + ${formatNumber(kappa, 1)}·w₂²)`,
    usesKappa: true,
    steps: 32,
    defaultStep: 12,
    lrMin: 0.02,
    lrMax: 0.75,
    lrStep: 0.01,
    lrDefault: 0.2,
    start: { x: -2.7, y: 2.25 },
    levels: [0.05, 0.13, 0.3, 0.65, 1.3, 2.4, 4.2, 6.8, 12, 20, 34, 55],
    minima: [{ x: 0, y: 0, global: true }],
    lossAt: (p, k) => 0.5 * (p.x * p.x + k * p.y * p.y),
    gradAt: (p, k) => ({ x: p.x, y: k * p.y }),
  },
  {
    id: "valley",
    label: "Valley",
    blurb: "A curved narrow valley (Rosenbrock): the gradient points across the valley, not along it.",
    formula: () => "L(w) = (1−w₁)² + 20(w₂−w₁²)²",
    usesKappa: false,
    steps: 80,
    defaultStep: 80,
    lrMin: 0.001,
    lrMax: 0.03,
    lrStep: 0.001,
    lrDefault: 0.005,
    start: { x: -1.5, y: 1.8 },
    levels: [0.2, 0.6, 1.5, 3.5, 8, 18, 40, 90, 200, 450, 1000, 2200],
    minima: [{ x: 1, y: 1, global: true }],
    lossAt: (p) => (1 - p.x) ** 2 + 20 * (p.y - p.x * p.x) ** 2,
    gradAt: (p) => ({
      x: -2 * (1 - p.x) - 80 * p.x * (p.y - p.x * p.x),
      y: 40 * (p.y - p.x * p.x),
    }),
  },
  {
    id: "wells",
    label: "Two wells",
    blurb: "A shallow minimum on the way to a deeper one. Try momentum, then gradient noise.",
    formula: () => "L(w) = 0.3(w₁⁴/4 − 2w₁²) − 0.35w₁ + 0.75w₂² + 2.2",
    usesKappa: false,
    steps: 60,
    defaultStep: 60,
    lrMin: 0.01,
    lrMax: 0.35,
    lrStep: 0.01,
    lrDefault: 0.05,
    start: { x: -3.1, y: 2.0 },
    levels: [0.35, 0.6, 0.9, 1.4, 2.0, 2.8, 4, 5.5, 7.5, 10],
    minima: [
      { x: -1.84, y: 0, global: false },
      { x: 2.13, y: 0, global: true },
    ],
    lossAt: (p) =>
      WELLS.s * (p.x ** 4 / 4 - 2 * p.x * p.x) + WELLS.t * p.x + (WELLS.cy / 2) * p.y * p.y + WELLS.c0,
    gradAt: (p) => ({
      x: WELLS.s * (p.x ** 3 - 4 * p.x) + WELLS.t,
      y: WELLS.cy * p.y,
    }),
  },
];

function simulate({ surface, optimizer, learningRate, kappa, momentumBeta, noise }) {
  const points = [];
  let point = { ...surface.start };
  let velocity = { x: 0, y: 0 };
  let m = { x: 0, y: 0 };
  let v = { x: 0, y: 0 };
  // Running products instead of Math.pow: pow is not correctly rounded and
  // differs between server and browser engines, which breaks hydration.
  let beta1Pow = 1;
  let beta2Pow = 1;
  let divergedAt = null;

  for (let t = 0; t <= surface.steps; t += 1) {
    const loss = surface.lossAt(point, kappa);
    if (!Number.isFinite(loss) || loss > DIVERGE_LOSS) {
      divergedAt = t;
      break;
    }
    const clean = surface.gradAt(point, kappa);
    const grad = {
      x: clean.x + noise * NOISE[t].nx,
      y: clean.y + noise * NOISE[t].ny,
    };
    let update = { x: 0, y: 0 };

    if (optimizer === "sgd") {
      update = { x: -learningRate * grad.x, y: -learningRate * grad.y };
    } else if (optimizer === "momentum") {
      velocity = {
        x: momentumBeta * velocity.x - learningRate * grad.x,
        y: momentumBeta * velocity.y - learningRate * grad.y,
      };
      update = velocity;
    } else {
      m = {
        x: ADAM.beta1 * m.x + (1 - ADAM.beta1) * grad.x,
        y: ADAM.beta1 * m.y + (1 - ADAM.beta1) * grad.y,
      };
      v = {
        x: ADAM.beta2 * v.x + (1 - ADAM.beta2) * grad.x * grad.x,
        y: ADAM.beta2 * v.y + (1 - ADAM.beta2) * grad.y * grad.y,
      };
      beta1Pow *= ADAM.beta1;
      beta2Pow *= ADAM.beta2;
      const mHat = { x: m.x / (1 - beta1Pow), y: m.y / (1 - beta1Pow) };
      const vHat = { x: v.x / (1 - beta2Pow), y: v.y / (1 - beta2Pow) };
      update = {
        x: (-learningRate * mHat.x) / (Math.sqrt(vHat.x) + ADAM.eps),
        y: (-learningRate * mHat.y) / (Math.sqrt(vHat.y) + ADAM.eps),
      };
    }

    points.push({ point, grad: clean, update, loss });
    point = { x: point.x + update.x, y: point.y + update.y };
  }

  return { points, divergedAt };
}

// Pixel coordinates are rounded so SSR and client render identical markup.
function px(value) {
  return Math.round(value * 100) / 100;
}

function xScale(x) {
  return px(PLOT.pad + ((x + RANGE_X) / (2 * RANGE_X)) * INNER_W);
}

function yScale(y) {
  return px(PLOT.height - PLOT.pad - ((y + RANGE_Y) / (2 * RANGE_Y)) * INNER_H);
}

// Marching squares over a sampled grid: one SVG path string per contour level.
// Needed because the valley and wells surfaces have no analytic contours.
function contourPaths(surface, kappa) {
  const NX = 104;
  const NY = 82;
  const vals = [];
  for (let j = 0; j <= NY; j += 1) {
    const y = -RANGE_Y + (2 * RANGE_Y * j) / NY;
    for (let i = 0; i <= NX; i += 1) {
      const x = -RANGE_X + (2 * RANGE_X * i) / NX;
      vals.push(surface.lossAt({ x, y }, kappa));
    }
  }
  const dataX = (i) => -RANGE_X + (2 * RANGE_X * i) / NX;
  const dataY = (j) => -RANGE_Y + (2 * RANGE_Y * j) / NY;
  const at = (i, j) => vals[j * (NX + 1) + i];

  return surface.levels.map((level) => {
    let d = "";
    for (let j = 0; j < NY; j += 1) {
      for (let i = 0; i < NX; i += 1) {
        const tl = at(i, j + 1);
        const tr = at(i + 1, j + 1);
        const br = at(i + 1, j);
        const bl = at(i, j);
        const idx =
          (tl > level ? 8 : 0) | (tr > level ? 4 : 0) | (br > level ? 2 : 0) | (bl > level ? 1 : 0);
        if (idx === 0 || idx === 15) continue;
        const x0 = dataX(i);
        const x1 = dataX(i + 1);
        const y0 = dataY(j);
        const y1 = dataY(j + 1);
        const lerp = (a, b, va, vb) => a + ((level - va) / (vb - va)) * (b - a);
        const top = () => ({ x: lerp(x0, x1, tl, tr), y: y1 });
        const bottom = () => ({ x: lerp(x0, x1, bl, br), y: y0 });
        const left = () => ({ x: x0, y: lerp(y0, y1, bl, tl) });
        const right = () => ({ x: x1, y: lerp(y0, y1, br, tr) });
        const SEGS = {
          1: [[left, bottom]],
          2: [[bottom, right]],
          3: [[left, right]],
          4: [[top, right]],
          5: [
            [top, left],
            [bottom, right],
          ],
          6: [[top, bottom]],
          7: [[top, left]],
          8: [[top, left]],
          9: [[top, bottom]],
          10: [
            [top, right],
            [left, bottom],
          ],
          11: [[top, right]],
          12: [[left, right]],
          13: [[bottom, right]],
          14: [[left, bottom]],
        };
        for (const [a, b] of SEGS[idx]) {
          const pa = a();
          const pb = b();
          d += `M ${xScale(pa.x)} ${yScale(pa.y)} L ${xScale(pb.x)} ${yScale(pb.y)} `;
        }
      }
    }
    return d;
  });
}

function polyline(points, upTo) {
  return points
    .slice(0, upTo + 1)
    .map(({ point }, index) => `${index === 0 ? "M" : "L"} ${xScale(point.x)} ${yScale(point.y)}`)
    .join(" ");
}

export default function OptimizerSurface() {
  const svgId = useId().replace(/:/g, "");
  const [surfaceId, setSurfaceId] = useState("bowl");
  const [active, setActive] = useState({ sgd: true, momentum: true, adam: true });
  const [learningRate, setLearningRate] = useState(0.2);
  const [curvature, setCurvature] = useState(8);
  const [momentumBeta, setMomentumBeta] = useState(0.9);
  const [noise, setNoise] = useState(0);
  const [stepIndex, setStepIndex] = useState(12);
  const [playing, setPlaying] = useState(false);

  const surface = SURFACES.find((s) => s.id === surfaceId);

  const sims = useMemo(
    () =>
      Object.fromEntries(
        OPTIMIZERS.map((o) => [
          o.id,
          simulate({ surface, optimizer: o.id, learningRate, kappa: curvature, momentumBeta, noise }),
        ]),
      ),
    [surface, learningRate, curvature, momentumBeta, noise],
  );

  const contours = useMemo(() => contourPaths(surface, curvature), [surface, curvature]);

  useEffect(() => {
    if (!playing) return undefined;
    const id = setInterval(() => setStepIndex((prev) => Math.min(prev + 1, surface.steps)), 160);
    return () => clearInterval(id);
  }, [playing, surface]);

  useEffect(() => {
    if (playing && stepIndex >= surface.steps) setPlaying(false);
  }, [playing, stepIndex, surface]);

  const pickSurface = (id) => {
    if (id === surfaceId) return;
    const next = SURFACES.find((s) => s.id === id);
    setSurfaceId(id);
    setLearningRate(next.lrDefault);
    setStepIndex(next.defaultStep);
    setPlaying(false);
  };

  const visible = OPTIMIZERS.filter((o) => active[o.id]);
  const single = visible.length === 1 ? visible[0] : null;

  const toggle = (id) =>
    setActive((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      return Object.values(next).some(Boolean) ? next : prev;
    });

  const togglePlay = () => {
    if (!playing && stepIndex >= surface.steps) setStepIndex(0);
    setPlaying((prev) => !prev);
  };

  const currentFor = (sim) => {
    const idx = Math.min(stepIndex, sim.points.length - 1);
    return { ...sim.points[idx], idx, past: sim.divergedAt != null && stepIndex >= sim.divergedAt };
  };

  const diverged = visible.filter((o) => sims[o.id].divergedAt != null);
  const sgdRatio = learningRate * curvature;
  let hint;
  if (diverged.length) {
    hint = `Diverged: ${diverged.map((o) => `${o.label} (step ${sims[o.id].divergedAt})`).join(", ")}.`;
    if (surface.id === "bowl") {
      hint += ` SGD's steep-axis stability limit on this surface is η·κ = 2; currently η·κ = ${formatNumber(sgdRatio, 1)}.`;
    }
  } else if (surface.id === "bowl" && active.sgd && sgdRatio > 1.6) {
    hint = `SGD is close to its stability limit η·κ = 2 (currently ${formatNumber(sgdRatio, 1)}). Nudge the learning rate up to watch it diverge.`;
  } else if (surface.id === "wells") {
    hint =
      "Small steps settle into the first well (f ≈ 1.7); the deeper well (f ≈ 0.3) is across the barrier. Momentum coasts over it — or raise η and gradient noise until SGD gets kicked out.";
  } else if (surface.id === "valley") {
    hint =
      "The gradient points at the valley wall, so SGD zig-zags across the floor. Momentum accumulates the along-valley component. Adam's step size is capped near η, so at small η it crawls — steadily.";
  } else {
    hint = "Every path reads the same gradient at each point; only the update rule differs.";
  }

  // Per-surface dynamic log range so shallow-loss surfaces still show structure.
  const sparkRange = useMemo(() => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const o of OPTIMIZERS) {
      for (const { loss } of sims[o.id].points) {
        const clamped = Math.max(loss, 1e-4);
        lo = Math.min(lo, clamped);
        hi = Math.max(hi, clamped);
      }
    }
    const logLo = Math.floor(Math.log10(lo) * 2) / 2 - 0.25;
    const logHi = Math.ceil(Math.log10(hi) * 2) / 2 + 0.25;
    return { logLo, logHi: Math.max(logHi, logLo + 1) };
  }, [sims]);

  const sparkX = (step) =>
    px(SPARK.padL + (step / surface.steps) * (SPARK.width - SPARK.padL - SPARK.padR));
  const sparkY = (loss) => {
    const logLoss = Math.log10(Math.max(loss, 1e-4));
    const t = Math.min(Math.max((logLoss - sparkRange.logLo) / (sparkRange.logHi - sparkRange.logLo), 0), 1);
    return px(SPARK.padT + (1 - t) * (SPARK.height - SPARK.padT - SPARK.padB));
  };
  const sparkGrid = [];
  for (let e = Math.ceil(sparkRange.logLo); e <= Math.floor(sparkRange.logHi); e += 1) sparkGrid.push(e);
  while (sparkGrid.length > 5) sparkGrid.splice(1, 1);

  return (
    <section className="dl-widget" aria-label="Optimizer surface visualizer">
      <style>{`
        ${CONTROL_CSS}
        .dl-widget {
          color: ${TOKENS.text};
          font-family: ${TYPO.body};
          background: ${TOKENS.panelBg};
          border: 1px solid ${TOKENS.border};
          border-radius: 8px;
          padding: 18px;
        }
        .dl-viz-grid {
          display: grid;
          grid-template-columns: minmax(240px, 300px) minmax(0, 1fr);
          gap: 18px;
          align-items: start;
        }
        .dl-panel {
          background: ${TOKENS.surfaceSoft};
          border: 1px solid ${TOKENS.border};
          border-radius: 8px;
          padding: 16px;
        }
        .dl-button-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 6px;
        }
        .dl-betas {
          color: ${TOKENS.textMuted};
          font-family: ${TYPO.mono};
          font-size: 11px;
          line-height: 1.5;
          margin: 0 0 14px;
        }
        .dl-controls {
          display: grid;
          gap: 16px;
        }
        .dl-step-row {
          display: flex;
          gap: 10px;
          align-items: flex-end;
        }
        .dl-step-row > :first-child {
          flex: 1;
          min-width: 0;
        }
        .dl-note {
          color: ${TOKENS.textMuted};
          font-size: 13px;
          line-height: 1.45;
          margin: 14px 0 0;
        }
        .dl-stat-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          margin-top: 12px;
        }
        .dl-plot {
          max-width: 680px;
          margin: 0 auto;
        }
        .dl-plot svg {
          display: block;
          width: 100%;
        }
        .dl-legend {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: baseline;
          gap: 8px 16px;
          font-family: ${TYPO.mono};
          font-size: 12px;
          margin-bottom: 8px;
        }
        .dl-legend .dl-formula {
          color: ${TOKENS.textMuted};
        }
        .dl-legend .dl-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 4px 14px;
        }
        .dl-spark-caption {
          color: ${TOKENS.textMuted};
          font-family: ${TYPO.mono};
          font-size: 11px;
          margin: 10px 0 2px;
        }
        @media (max-width: 860px) {
          .dl-viz-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="dl-viz-grid">
        <div className="dl-panel">
          <div className="dl-button-row" role="group" aria-label="Loss surface">
            {SURFACES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => pickSurface(s.id)}
                aria-pressed={surfaceId === s.id}
                style={buttonStyles({ active: surfaceId === s.id, color: TOKENS.green })}
              >
                {s.label}
              </button>
            ))}
          </div>
          <p className="dl-betas">{surface.blurb}</p>

          <div className="dl-button-row" role="group" aria-label="Optimizers shown">
            {OPTIMIZERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => toggle(item.id)}
                aria-pressed={active[item.id]}
                style={buttonStyles({ active: active[item.id], color: item.color })}
              >
                {item.label}
              </button>
            ))}
          </div>
          <p className="dl-betas">
            momentum uses β below · Adam uses β₁ = {ADAM.beta1}, β₂ = {ADAM.beta2}
          </p>

          <div className="dl-controls">
            <Slider
              label="learning rate η"
              value={learningRate}
              min={surface.lrMin}
              max={surface.lrMax}
              step={surface.lrStep}
              onChange={setLearningRate}
              digits={3}
            />
            {surface.usesKappa ? (
              <Slider
                label="curvature ratio κ"
                value={curvature}
                min={1}
                max={24}
                step={0.5}
                onChange={setCurvature}
                suffix="×"
                digits={1}
              />
            ) : null}
            <Slider label="momentum β" value={momentumBeta} min={0} max={0.95} step={0.01} onChange={setMomentumBeta} />
            <Slider label="gradient noise σ" value={noise} min={0} max={2.5} step={0.1} onChange={setNoise} digits={1} />
            <div className="dl-step-row">
              <Slider
                label="step"
                value={Math.min(stepIndex, surface.steps)}
                min={0}
                max={surface.steps}
                step={1}
                onChange={setStepIndex}
                digits={0}
              />
              <button type="button" onClick={togglePlay} style={buttonStyles({ active: playing })}>
                {playing ? "Pause" : "Play"}
              </button>
            </div>
          </div>

          <p className="dl-note">{hint}</p>

          <div className="dl-stat-grid">
            {single ? (
              <>
                <Stat
                  label="loss"
                  value={currentFor(sims[single.id]).past ? "diverged" : formatNumber(currentFor(sims[single.id]).loss, 3)}
                  color={single.color}
                />
                <Stat
                  label="‖grad‖"
                  value={formatNumber(Math.hypot(currentFor(sims[single.id]).grad.x, currentFor(sims[single.id]).grad.y), 3)}
                  color={TOKENS.green}
                />
                <Stat
                  label="‖update‖"
                  value={formatNumber(Math.hypot(currentFor(sims[single.id]).update.x, currentFor(sims[single.id]).update.y), 3)}
                />
                {surface.usesKappa ? <Stat label="H diag" value={`[1, ${formatNumber(curvature, 1)}]`} /> : null}
              </>
            ) : (
              <>
                {visible.map((o) => {
                  const current = currentFor(sims[o.id]);
                  return (
                    <Stat
                      key={o.id}
                      label={`${o.label} loss`}
                      value={current.past ? "diverged" : formatNumber(current.loss, 3)}
                      color={o.color}
                    />
                  );
                })}
                {surface.usesKappa ? <Stat label="H diag" value={`[1, ${formatNumber(curvature, 1)}]`} /> : null}
              </>
            )}
          </div>
        </div>

        <div className="dl-panel">
          <div className="dl-plot">
            <div className="dl-legend">
              <span className="dl-formula">{surface.formula(curvature)}</span>
              <span className="dl-chips">
                {visible.map((o) => (
                  <span key={o.id} style={{ color: o.color }}>
                    ● {o.label}
                  </span>
                ))}
                {single ? <span style={{ color: TOKENS.green }}>→ −gradient (direction)</span> : null}
              </span>
            </div>

            <svg
              viewBox={`0 0 ${PLOT.width} ${PLOT.height}`}
              role="img"
              aria-label="Loss surface contours with optimizer trajectories"
            >
              <defs>
                <clipPath id={`dl-clip-${svgId}`}>
                  <rect x={PLOT.pad} y={PLOT.pad} width={INNER_W} height={INNER_H} rx="8" />
                </clipPath>
                {OPTIMIZERS.map((o) => (
                  <marker
                    key={o.id}
                    id={`dl-arrow-${o.id}-${svgId}`}
                    markerWidth="10"
                    markerHeight="10"
                    refX="8"
                    refY="3"
                    orient="auto"
                  >
                    <path d="M0,0 L8,3 L0,6 Z" fill={o.color} />
                  </marker>
                ))}
                <marker id={`dl-arrow-grad-${svgId}`} markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
                  <path d="M0,0 L8,3 L0,6 Z" fill={TOKENS.green} />
                </marker>
              </defs>

              <rect x={PLOT.pad} y={PLOT.pad} width={INNER_W} height={INNER_H} fill={TOKENS.surface} stroke={TOKENS.border} rx="8" />
              <line x1={xScale(-RANGE_X)} x2={xScale(RANGE_X)} y1={yScale(0)} y2={yScale(0)} stroke={TOKENS.border} strokeDasharray="4 5" />
              <line x1={xScale(0)} x2={xScale(0)} y1={yScale(-RANGE_Y)} y2={yScale(RANGE_Y)} stroke={TOKENS.border} strokeDasharray="4 5" />

              <g clipPath={`url(#dl-clip-${svgId})`}>
                {contours.map((d, index) =>
                  d ? (
                    <path
                      key={index}
                      d={d}
                      fill="none"
                      stroke={index % 2 === 0 ? TOKENS.borderStrong : TOKENS.border}
                      strokeWidth="1"
                      opacity={0.75}
                    />
                  ) : null,
                )}

                {visible.map((o) => {
                  const sim = sims[o.id];
                  const idx = Math.min(stepIndex, sim.points.length - 1);
                  const current = sim.points[idx];
                  const next = sim.points[idx + 1];
                  return (
                    <g key={o.id}>
                      <path d={polyline(sim.points, idx)} fill="none" stroke={o.color} strokeWidth="2.5" opacity="0.9" />
                      {sim.points.slice(0, idx + 1).map(({ point }, index) => (
                        <circle key={index} cx={xScale(point.x)} cy={yScale(point.y)} r="2" fill={o.color} opacity="0.55" />
                      ))}
                      {next ? (
                        <line
                          x1={xScale(current.point.x)}
                          y1={yScale(current.point.y)}
                          x2={xScale(next.point.x)}
                          y2={yScale(next.point.y)}
                          stroke={o.color}
                          strokeWidth="3"
                          markerEnd={`url(#dl-arrow-${o.id}-${svgId})`}
                        />
                      ) : null}
                      <circle cx={xScale(current.point.x)} cy={yScale(current.point.y)} r="5.5" fill={o.color} stroke={TOKENS.surface} strokeWidth="1.5" />
                    </g>
                  );
                })}

                {single
                  ? (() => {
                      const sim = sims[single.id];
                      const current = sim.points[Math.min(stepIndex, sim.points.length - 1)];
                      const norm = Math.hypot(current.grad.x, current.grad.y);
                      if (norm < 1e-9) return null;
                      const cx = xScale(current.point.x);
                      const cy = yScale(current.point.y);
                      return (
                        <line
                          x1={cx}
                          y1={cy}
                          x2={px(cx - (current.grad.x / norm) * 46)}
                          y2={px(cy + (current.grad.y / norm) * 46)}
                          stroke={TOKENS.green}
                          strokeWidth="2.5"
                          strokeDasharray="5 4"
                          markerEnd={`url(#dl-arrow-grad-${svgId})`}
                        />
                      );
                    })()
                  : null}
              </g>

              <circle cx={xScale(surface.start.x)} cy={yScale(surface.start.y)} r="4" fill="none" stroke={TOKENS.textMuted} strokeWidth="1.5" />
              <text x={xScale(surface.start.x) + 9} y={yScale(surface.start.y) - 8} fill={TOKENS.textMuted} fontFamily={TYPO.mono} fontSize="11">
                start
              </text>
              {surface.minima.map((min, index) => (
                <g key={index}>
                  <circle
                    cx={xScale(min.x)}
                    cy={yScale(min.y)}
                    r="4.5"
                    fill={min.global ? TOKENS.text : "none"}
                    stroke={TOKENS.text}
                    strokeWidth="1.5"
                  />
                  {surface.minima.length > 1 ? (
                    <text
                      x={xScale(min.x) + 9}
                      y={yScale(min.y) + 16}
                      fill={TOKENS.textMuted}
                      fontFamily={TYPO.mono}
                      fontSize="11"
                    >
                      {min.global ? "global min" : "local min"}
                    </text>
                  ) : null}
                </g>
              ))}
            </svg>

            <p className="dl-spark-caption">loss vs step (log scale)</p>
            <svg viewBox={`0 0 ${SPARK.width} ${SPARK.height}`} role="img" aria-label="Loss versus training step on a log scale">
              <rect
                x={SPARK.padL}
                y={SPARK.padT}
                width={SPARK.width - SPARK.padL - SPARK.padR}
                height={SPARK.height - SPARK.padT - SPARK.padB}
                fill={TOKENS.surface}
                stroke={TOKENS.border}
                rx="6"
              />
              {sparkGrid.map((exp) => (
                <g key={exp}>
                  <line
                    x1={SPARK.padL}
                    x2={SPARK.width - SPARK.padR}
                    y1={sparkY(Math.pow(10, exp))}
                    y2={sparkY(Math.pow(10, exp))}
                    stroke={TOKENS.border}
                    strokeDasharray="3 5"
                  />
                  <text
                    x={SPARK.padL - 5}
                    y={sparkY(Math.pow(10, exp)) + 3}
                    textAnchor="end"
                    fill={TOKENS.textMuted}
                    fontFamily={TYPO.mono}
                    fontSize="9.5"
                  >
                    1e{exp}
                  </text>
                </g>
              ))}
              <line
                x1={sparkX(Math.min(stepIndex, surface.steps))}
                x2={sparkX(Math.min(stepIndex, surface.steps))}
                y1={SPARK.padT}
                y2={SPARK.height - SPARK.padB}
                stroke={TOKENS.borderStrong}
              />
              {visible.map((o) => {
                const sim = sims[o.id];
                const idx = Math.min(stepIndex, sim.points.length - 1);
                const line = (upTo) =>
                  sim.points
                    .slice(0, upTo + 1)
                    .map(({ loss }, index) => `${index === 0 ? "M" : "L"} ${sparkX(index)} ${sparkY(loss)}`)
                    .join(" ");
                return (
                  <g key={o.id}>
                    <path d={line(sim.points.length - 1)} fill="none" stroke={o.color} strokeWidth="1.5" opacity="0.3" />
                    <path d={line(idx)} fill="none" stroke={o.color} strokeWidth="2" />
                    <circle cx={sparkX(idx)} cy={sparkY(sim.points[idx].loss)} r="3.5" fill={o.color} />
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
