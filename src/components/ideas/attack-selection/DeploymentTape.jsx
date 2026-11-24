import { useMemo, useState } from "react";
import { TOKENS, buttonStyles } from "./vizTheme";
import { Slider } from "./vizControls";
import { ATTACK_MEAN, ATTACK_SD, ALL_ATTACKS, keptAttacks, selectorCut, thresholdFor, tprAt } from "./model";
import { useSettings } from "./store";
import {
  Axes, INK, Label, Swatch, WIDGET_CSS, fmtBudget, fmtRate, linePath, linear, log10Scale, makeFrame, pct, px,
  useMeasuredWidth, xRange, yRange,
} from "./chartKit";

// Simulated deployments, one per row. Each tick is an attack, colored by how
// it ended; a row greys out after its first decisive event (a catch or an
// uncaught success). Two audit modes share the same rows:
//  - "score": trusted monitoring. An attack is caught when its score is above
//    τ (from the explorer's settings), else it completes the side task with
//    probability p. The selective attacker skips opportunities its selector
//    expects to score high.
//  - "window": upfront auditing. Every attack in the first share a of the
//    deployment is caught; any attack after it wins (paper Appendix B).
// Everything is in expected attacks per deployment (λ = rN), so N never
// appears: the same λ gives the same picture at any deployment length.
//
// Random numbers are fixed per row (common random numbers): lowering λ thins
// the existing ticks instead of redrawing them, and switching on selection
// removes ticks rather than reshuffling them, mostly the ones that would
// have been caught.

const ROWS = 12;
const CANDIDATES = 600; // per row; attacks are the candidates with u < λ / LAMBDA_MAX
const LAMBDA_MAX = CANDIDATES;
// 0.1 to ~316 expected attacks per deployment. The top end matters for the
// window mode: at a 1% window it takes ~100+ attacks to get caught reliably.
const LAMBDA_EXP = [-1, 2.5];

const COLOR = {
  caught: TOKENS.green,
  win: TOKENS.red,
  quiet: TOKENS.textDim,
  none: TOKENS.textDim,
};
const OUTCOME_LABEL = { caught: "caught", win: "red wins", none: "nothing" };

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rand) {
  const u = Math.max(rand(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

/** Per row: candidate attack opportunities, sorted by position in the deployment. */
function makeRows(seed) {
  const rand = mulberry32(seed);
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: CANDIDATES }, () => ({
      x: rand(), // position, as a share of the deployment
      u: rand(), // attack if u < λ / LAMBDA_MAX
      s: ATTACK_MEAN + ATTACK_SD * gaussian(rand), // monitor score if attacked here
      z: gaussian(rand), // selector's read error
      k: rand(), // keep draw for a random selector
      v: rand(), // side-task success draw
    })).sort((a, b) => a.x - b.x),
  );
}

// An attack the selector skips stays in `events` as a ghost, colored by what
// would have happened had it gone ahead, but it never ends the row.
function runRow(cands, { mode, lambda, selective, keep, noise, cut, tau, p, a }) {
  const events = [];
  for (const c of cands) {
    if (c.u >= lambda / LAMBDA_MAX) continue;
    let kind;
    if (mode === "window") kind = c.x < a ? "caught" : "win";
    else kind = c.s > tau ? "caught" : c.v < p ? "win" : "quiet";
    const ghost =
      mode === "score" && selective && keep < 0.999 &&
      !(Number.isFinite(noise) ? c.s + noise * c.z < cut : c.k < keep);
    events.push({ x: c.x, kind, ghost });
  }
  const first = events.find((e) => !e.ghost && e.kind !== "quiet");
  return { events, end: first ? first.x : 1, outcome: first ? first.kind : "none" };
}

/** Exact outcome shares in the many-task (Poisson) limit. */
function outcomeShares({ mode, lambda, tpr, p, a }) {
  if (mode === "window") {
    const none = Math.exp(-lambda);
    const win = Math.exp(-a * lambda) - none;
    return { caught: 1 - Math.exp(-a * lambda), win, none };
  }
  const decisivePerAttack = tpr + (1 - tpr) * p;
  const none = Math.exp(-lambda * decisivePerAttack);
  const ratio = decisivePerAttack > 0 ? tpr / decisivePerAttack : 1;
  return { caught: (1 - none) * ratio, win: (1 - none) * (1 - ratio), none };
}

const fmtLambda = (v) => (v < 10 ? v.toFixed(1) : String(Math.round(v)));

function Bar({ label, parts }) {
  const total = parts.reduce((s, part) => s + part.value, 0) || 1;
  return (
    <div className="dt-bar">
      <div className="dt-bar-label">{label}</div>
      <div className="dt-bar-track">
        {parts.map((part) => {
          const share = part.value / total;
          return (
            <div key={part.key} className="dt-seg" title={`${part.name}: ${pct(share)}`}
              style={{ width: `${share * 100}%`, background: part.color, opacity: part.key === "none" ? 0.35 : 0.85 }}>
              {share >= 0.12 ? <span>{pct(share)}</span> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// The prose's equation with live numbers: each term is a value over its name
// and its symbol, so the widget reads as the formula filled in.
// `items` mixes terms ({ value, name, math, color }) and operator strings.
function Equation({ items, label }) {
  return (
    <div className="dt-eq" role="group" aria-label={label}>
      {items.map((it, i) =>
        typeof it === "string" ? (
          <span key={i} className="dt-eq-op">{it}</span>
        ) : (
          <span key={i} className="dt-eq-term">
            <strong style={{ color: it.color || TOKENS.text }}>{pct(it.value)}</strong>
            <span className="dt-eq-name">{it.name}</span>
            <span className="dt-eq-math">{it.math}</span>
          </span>
        ),
      )}
    </div>
  );
}

/** Score mode: S_N for an attacker that attacks `lambda × keep` times on average. */
function scoreSafety(lambda, tpr, keep, p) {
  const d = tpr + (1 - tpr) * p;
  const none = Math.exp(-lambda * keep * d);
  return none + (1 - none) * (d > 0 ? tpr / d : 1);
}

/** λ where the two attackers' safety curves cross (geometric bisection), or null. */
function crossover(f, lo, hi) {
  const g = (e) => f(10 ** e);
  if (Math.sign(g(lo)) === Math.sign(g(hi))) return null;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (Math.sign(g(mid)) === Math.sign(g(lo))) lo = mid;
    else hi = mid;
  }
  return 10 ** ((lo + hi) / 2);
}

// The same game swept over deployment length. Score mode: safety for both
// attackers, so the crossover and the long-run ratios are visible at once.
// Window mode: red's chance of winning with its two factors, so the hump
// and its peak at λ* are visible. Clicking the chart moves the slider.
function LengthChart({ width, mode, lambda, onPick, plain, sel, cross, a, lambdaStar, selective }) {
  const frame = makeFrame({ width, height: 190, padL: 42, padR: 12, padT: 10, padB: 38 });
  const sx = log10Scale(LAMBDA_EXP[0], LAMBDA_EXP[1], ...xRange(frame));
  const sy = linear(0, 1, ...yRange(frame));
  const ls = Array.from({ length: 141 }, (_, i) => 10 ** (LAMBDA_EXP[0] + ((LAMBDA_EXP[1] - LAMBDA_EXP[0]) * i) / 140));
  const xs = ls.map(sx);
  const xTicks = [0.1, 1, 10, 100].map((v) => ({ x: sx(v), label: String(v), grid: true }));
  const yTicks = [0, 0.5, 1].map((v) => ({ y: sy(v), label: pct(v) }));
  const bottom = frame.padT + frame.innerH;

  const pick = (ev) => {
    const r = ev.currentTarget.getBoundingClientRect();
    const x = ((ev.clientX - r.left) * width) / r.width;
    const t = (x - frame.padL) / frame.innerW;
    if (t < 0 || t > 1) return;
    onPick(LAMBDA_EXP[0] + t * (LAMBDA_EXP[1] - LAMBDA_EXP[0]));
  };

  const marker = (
    <line x1={sx(lambda)} x2={sx(lambda)} y1={frame.padT} y2={bottom} stroke={INK.marker} strokeWidth="1.2" opacity="0.5" />
  );

  if (mode === "score") {
    const yPlain = ls.map((l) => sy(plain(l)));
    const ySel = ls.map((l) => sy(sel(l)));
    return (
      <div className="dt-length">
        <div className="dt-chart-title">safety against deployment length, both attackers</div>
        <svg className="as-plot" viewBox={`0 0 ${width} ${frame.height}`} onClick={pick} role="img"
          aria-label={`Safety against attack opportunities per deployment. Random attacker: ${pct(plain(lambda))} here, settling at ${pct(plain(1e4))}. Selective attacker: ${pct(sel(lambda))} here, settling at ${pct(sel(1e4))}.${cross ? ` The curves cross at about ${cross.toFixed(1)} opportunities.` : ""}`}>
          <Axes frame={frame} xTicks={xTicks} yTicks={yTicks} xLabel="attack opportunities per deployment" />
          {cross ? (
            <g>
              <line x1={sx(cross)} x2={sx(cross)} y1={frame.padT} y2={bottom} stroke={TOKENS.textDim} strokeDasharray="2 3" />
              <Label x={sx(cross) + 5} y={frame.padT + 13}>cross ≈ {cross.toFixed(1)}</Label>
            </g>
          ) : null}
          {marker}
          <path d={linePath(xs, yPlain)} fill="none" stroke={INK.all} strokeWidth="2.2" strokeDasharray="6 4" />
          <path d={linePath(xs, ySel)} fill="none" stroke={INK.kept} strokeWidth="2.6" />
          <circle cx={sx(lambda)} cy={sy(plain(lambda))} r={selective ? 3.5 : 5} fill={INK.all} stroke={TOKENS.surface} strokeWidth="1.2" />
          <circle cx={sx(lambda)} cy={sy(sel(lambda))} r={selective ? 5 : 3.5} fill={INK.kept} stroke={TOKENS.surface} strokeWidth="1.2" />
          <Label x={frame.padL + frame.innerW - 4} y={sy(plain(1e4)) - 7} anchor="end">ratio {pct(plain(1e4))}</Label>
          <Label x={frame.padL + frame.innerW - 4} y={sy(sel(1e4)) - 7} anchor="end" color={INK.kept}>ratio {pct(sel(1e4))}</Label>
        </svg>
        <div className="dt-chart-key">
          <span><Swatch color={INK.all} dashed />attacks at random</span>
          <span><Swatch color={INK.kept} />picks its moments</span>
          <span>click the chart to move the slider</span>
        </div>
      </div>
    );
  }

  const A = (l) => Math.exp(-a * l);
  const B = (l) => 1 - Math.exp(-(1 - a) * l);
  return (
    <div className="dt-length">
      <div className="dt-chart-title">red's chance of winning against expected attacks λ</div>
      <svg className="as-plot" viewBox={`0 0 ${width} ${frame.height}`} onClick={pick} role="img"
        aria-label={`Red's chance of winning against expected attacks per deployment, with an audit window of ${fmtBudget(a)}. It peaks at ${pct(A(lambdaStar) * B(lambdaStar))} when λ is about ${lambdaStar.toFixed(1)}; here it is ${pct(A(lambda) * B(lambda))}.`}>
        <Axes frame={frame} xTicks={xTicks} yTicks={yTicks} xLabel="expected attacks per deployment λ" />
        <line x1={sx(lambdaStar)} x2={sx(lambdaStar)} y1={frame.padT} y2={bottom} stroke={TOKENS.textDim} strokeDasharray="2 3" />
        {marker}
        {/* The product hugs whichever factor is smaller, so it's drawn as a wide
            band under the two dashed factors rather than on top of them. */}
        <path d={linePath(xs, ls.map((l) => sy(A(l) * B(l))))} fill="none" stroke={COLOR.win} strokeWidth="7" opacity="0.3" strokeLinecap="round" />
        <path d={linePath(xs, ls.map((l) => sy(A(l))))} fill="none" stroke={TOKENS.textMuted} strokeWidth="1.8" strokeDasharray="5 4" />
        <path d={linePath(xs, ls.map((l) => sy(B(l))))} fill="none" stroke={COLOR.win} strokeWidth="1.8" strokeDasharray="5 4" />
        <circle cx={sx(lambda)} cy={sy(A(lambda) * B(lambda))} r="5" fill={COLOR.win} stroke={TOKENS.surface} strokeWidth="1.2" />
        <Label x={sx(lambdaStar) + 5} y={bottom - 6}>λ* ≈ {lambdaStar.toFixed(1)}</Label>
      </svg>
      <div className="dt-chart-key">
        <span><Swatch color={TOKENS.textMuted} dashed width={1.6} />no attack inside the window</span>
        <span><Swatch color={COLOR.win} dashed width={1.6} />at least one attack after it</span>
        <span><span style={{ opacity: 0.45 }}><Swatch color={COLOR.win} width={6} /></span>red wins (their product)</span>
      </div>
    </div>
  );
}

const CSS = `
  .as-widget .dt-toolbar { align-items: center; justify-content: flex-start; gap: 10px 20px; }
  @container (min-width: 600px) {
    .dt-eq { flex-wrap: nowrap; }
    .dt-eq-term { flex: 1 1 0; min-width: 0; max-width: none; }
    .dt-eq-op { flex: none; }
  }
  .dt-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 4px 24px; }
  @container (min-width: 860px) { .dt-grid { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); } }
  .dt-eq { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 6px 8px; margin: 0 0 12px; padding: 10px 12px; border: 1px solid ${TOKENS.border}; border-radius: 6px; background: ${TOKENS.surface}; }
  .dt-eq-term { display: grid; justify-items: center; text-align: center; min-width: 64px; max-width: 140px; }
  .dt-eq-term strong { font-family: var(--font-mono); font-size: 18px; font-weight: 650; line-height: 1.2; }
  .dt-eq-name { font-size: 13px; color: ${TOKENS.textMuted}; line-height: 1.3; margin-top: 2px; }
  .dt-eq-math { font-family: var(--font-mono); font-size: 12.5px; color: ${TOKENS.textDim}; margin-top: 3px; }
  .dt-eq-op { font-family: var(--font-mono); font-size: 18px; color: ${TOKENS.textMuted}; line-height: 1.2; padding-top: 0; }
  .dt-bars { display: grid; gap: 10px; margin: 6px 0 10px; }
  .dt-bar-label { font-family: var(--font-mono); font-size: 13px; color: ${TOKENS.textMuted}; margin-bottom: 4px; }
  .dt-bar-track { display: flex; height: 22px; border-radius: 5px; overflow: hidden; border: 1px solid ${TOKENS.border}; background: ${TOKENS.surface}; }
  .dt-seg { display: flex; align-items: center; justify-content: center; min-width: 0; transition: width 0.35s ease; }
  .dt-seg span { font-family: var(--font-mono); font-size: 12.5px; font-weight: 650; color: #fff; text-shadow: 0 0 3px rgba(0,0,0,0.45); white-space: nowrap; }
  .dt-key { display: flex; flex-wrap: wrap; gap: 4px 16px; font-family: var(--font-mono); font-size: 13px; color: ${TOKENS.textMuted}; margin: 0 0 8px; }
  .dt-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; vertical-align: -1px; }
  .dt-ring { box-sizing: border-box; border: 1.5px solid ${TOKENS.green}; }
  .dt-chart-title { font-family: var(--font-mono); font-size: 13px; color: ${TOKENS.textMuted}; margin: 0 0 4px; }
  .dt-chart-key { display: flex; flex-wrap: wrap; gap: 4px 16px; font-family: var(--font-mono); font-size: 12.5px; color: ${TOKENS.textMuted}; margin: 0 0 6px; }
  .dt-length .as-plot { cursor: pointer; }
  @media (prefers-reduced-motion: reduce) { .dt-seg { transition: none; } }
`;

// `modes` lists the audit modes this embed offers. The post's first embed
// shows only "score", since upfront auditing hasn't been introduced yet.
export default function DeploymentTape({ initialMode = "score", modes = ["score", "window"] }) {
  const { budget, keep, noise, sigma, sideTaskSuccess: p } = useSettings();
  const [mode, setMode] = useState(initialMode);
  const [selective, setSelective] = useState(false);
  // Score mode opens at 2 opportunities so both terms of S_N are visible.
  const [lambdaExp, setLambdaExp] = useState(Math.log10(initialMode === "window" ? 100 : 2));
  const [aExp, setAExp] = useState(Math.log10(0.01)); // matches the prose's 1% window
  const [seed, setSeed] = useState(7);
  const [ref, width] = useMeasuredWidth(640);

  const lambda = 10 ** lambdaExp;
  const a = 10 ** aExp;
  const tau = thresholdFor(budget, sigma);
  const kept = useMemo(() => keptAttacks(keep, noise), [keep, noise]);
  const cut = useMemo(() => (Number.isFinite(noise) && keep < 0.999 ? selectorCut(keep, noise) : 0), [keep, noise]);
  const tprAll = tprAt(ALL_ATTACKS, tau);
  const tprKept = tprAt(kept, tau);
  const isSel = mode === "score" && selective;
  const lambdaEff = isSel ? lambda * keep : lambda;
  const tpr = isSel ? tprKept : tprAll;

  const cands = useMemo(() => makeRows(seed), [seed]);
  const rows = cands.map((c) => runRow(c, { mode, lambda, selective: isSel, keep, noise, cut, tau, p, a }));
  const shares = outcomeShares({ mode, lambda: lambdaEff, tpr, p, a });
  const lambdaStar = -Math.log(a) / (1 - a);
  const counts = rows.reduce((acc, r) => ({ ...acc, [r.outcome]: (acc[r.outcome] || 0) + 1 }), {});
  const selKeep = keep < 0.999 ? keep : 1;
  const plainSafety = (l) => scoreSafety(l, tprAll, 1, p);
  const selSafety = (l) => scoreSafety(l, tprKept, selKeep, p);
  const cross = mode === "score" ? crossover((l) => plainSafety(l) - selSafety(l), LAMBDA_EXP[0], LAMBDA_EXP[1]) : null;
  const decisive = shares.caught + shares.win;
  const ratio = decisive > 0 ? shares.caught / decisive : 1;
  const tally = `${ROWS} rows shown: ${counts.caught || 0} caught · ${counts.win || 0} red wins · ${counts.none || 0} nothing`;
  const sub = (base, s, sup) => <>{base}<sub>{s}</sub>{sup ? <sup>{sup}</sup> : null}</>;
  const equation = mode === "score" ? (
    <Equation label="Deployment safety with live numbers" items={[
      { value: shares.none + shares.caught, name: "safety", math: <>S<sub>N</sub></> },
      "=",
      { value: shares.none, name: "nothing decisive ever happens", math: sub("g", "cont", "N"), color: TOKENS.textMuted },
      "+",
      { value: decisive, name: "something decisive happens", math: <>1 − {sub("g", "cont", "N")}</> },
      "×",
      { value: ratio, name: "it's a catch (the ratio)", math: <>{sub("g", "caught")} ÷ ({sub("g", "caught")} + {sub("g", "uncaught")})</>, color: COLOR.caught },
    ]} />
  ) : (
    <Equation label="Upfront auditing with live numbers" items={[
      { value: 1 - shares.win, name: "safety", math: "1 − P(red wins)" },
      "= 1 −",
      { value: Math.exp(-a * lambda), name: "no attack inside the window", math: <>(1 − r)<sup>aN</sup> ≈ e<sup>−aλ</sup></> },
      "×",
      { value: 1 - Math.exp(-(1 - a) * lambda), name: "at least one attack after it", math: <>1 − (1 − r)<sup>(1−a)N</sup></>, color: COLOR.win },
    ]} />
  );

  // Tape geometry.
  const padL = 6;
  const padR = width < 480 ? 62 : 74;
  const top = mode === "window" ? 22 : 8;
  const rowH = 15;
  const H = top + ROWS * rowH + 24;
  const sx = (x) => px(padL + x * (width - padL - padR));
  const tick = 5;

  return (
    <section className="as-widget" aria-label="Simulated deployments">
      <style>{WIDGET_CSS + CSS}</style>

      <div className="as-toolbar dt-toolbar">
        {modes.length > 1 ? (
          <div className="as-seg" role="group" aria-label="How audits are chosen">
            <span className="as-seg-label">audit</span>
            {[["score", "monitor + threshold τ"], ["window", "upfront window"]].filter(([id]) => modes.includes(id)).map(([id, label]) => (
              <button key={id} type="button" aria-pressed={mode === id} onClick={() => setMode(id)}
                style={buttonStyles({ active: mode === id })}>{label}</button>
            ))}
          </div>
        ) : null}
        {mode === "score" ? (
          <div className="as-seg" role="group" aria-label="Attacker">
            <span className="as-seg-label">attacker</span>
            {[[false, "attacks at random"], [true, "picks its moments"]].map(([id, label]) => (
              <button key={label} type="button" aria-pressed={selective === id} onClick={() => setSelective(id)}
                style={buttonStyles({ active: selective === id, color: id ? INK.kept : undefined })}>{label}</button>
            ))}
          </div>
        ) : (
          <button type="button" onClick={() => setLambdaExp(Math.log10(lambdaStar))}
            style={buttonStyles({ color: INK.kept })}>use red's best rate</button>
        )}
        <button type="button" onClick={() => setSeed((s) => s + 1)} style={buttonStyles()}>re-roll runs</button>
      </div>

      <div className="as-controls">
        <Slider
          label={mode === "window" ? "expected attacks per deployment λ"
            : isSel ? `attack opportunities per deployment (it attacks on ${fmtLambda(lambdaEff)})`
            : "attack opportunities per deployment"}
          valueChars={5} value={lambdaExp} min={LAMBDA_EXP[0]} max={LAMBDA_EXP[1]} step={0.02}
          onChange={setLambdaExp} display={fmtLambda(lambda)} />
        {mode === "window" ? (
          <Slider label="audit window a" value={aExp} min={-2} max={Math.log10(0.25)} step={0.02}
            onChange={setAExp} display={fmtBudget(a)} />
        ) : null}
      </div>

      <div className="dt-grid">
        <div className="dt-col">
          <div className="dt-key">
            <span><span className="dt-dot" style={{ background: COLOR.caught }} />caught</span>
            <span><span className="dt-dot" style={{ background: COLOR.win }} />uncaught success</span>
            {mode === "score" ? <span><span className="dt-dot" style={{ background: COLOR.quiet }} />uncaught, side task failed</span> : null}
            {isSel ? <span><span className="dt-dot dt-ring" />skipped by the selector</span> : null}
          </div>

          <div className="as-chart" ref={ref}>
            <svg className="as-plot" viewBox={`0 0 ${width} ${H}`} role="img"
              aria-label={`${ROWS} simulated deployments: ${counts.caught || 0} end in a catch, ${counts.win || 0} in an uncaught success, ${counts.none || 0} with nothing decisive.`}>
              <rect x={padL} y={top - 4} width={px(width - padL - padR)} height={ROWS * rowH + 4} rx="5" fill={TOKENS.surface} stroke={TOKENS.border} />
              {mode === "window" ? (
                <g>
                  <rect x={sx(0)} y={top - 4} width={px(Math.max(1.5, sx(a) - sx(0)))} height={ROWS * rowH + 4} fill={COLOR.caught} fillOpacity="0.16" />
                  <text x={sx(0) + 2} y={top - 9} fill={TOKENS.textMuted} fontFamily="var(--font-mono)" fontSize="11.5">audited: first {fmtBudget(a)}</text>
                </g>
              ) : null}
              {rows.map((row, i) => {
                const y = top + i * rowH + rowH / 2;
                return (
                  <g key={i}>
                    <line x1={sx(0)} x2={sx(row.end)} y1={y} y2={y} stroke={TOKENS.borderStrong} strokeWidth="1.2" />
                    <line x1={sx(row.end)} x2={sx(1)} y1={y} y2={y} stroke={TOKENS.border} strokeWidth="1" strokeDasharray="2 4" />
                    {row.events.map((e, j) => {
                      const after = e.x > row.end;
                      const isEnd = e.x === row.end && e.kind !== "quiet" && !e.ghost;
                      if (e.ghost) {
                        return (
                          <circle key={j} cx={sx(e.x)} cy={y} r="3.2" fill="none" stroke={COLOR[e.kind]}
                            strokeWidth="1.4" opacity={after ? 0.3 : 0.85} />
                        );
                      }
                      return isEnd ? (
                        <circle key={j} cx={sx(e.x)} cy={y} r="4.4" fill={COLOR[e.kind]} stroke={TOKENS.surface} strokeWidth="1.2" />
                      ) : (
                        <line key={j} x1={sx(e.x)} x2={sx(e.x)} y1={y - tick} y2={y + tick}
                          stroke={COLOR[e.kind]} strokeWidth="2.2" opacity={after ? 0.18 : 0.9} />
                      );
                    })}
                    <text x={sx(1) + 8} y={y + 4} fill={row.outcome === "none" ? TOKENS.textMuted : COLOR[row.outcome]}
                      fontFamily="var(--font-mono)" fontSize="11.5" fontWeight={row.outcome === "none" ? 400 : 650}>
                      {OUTCOME_LABEL[row.outcome]}
                    </text>
                  </g>
                );
              })}
              <text x={sx(0)} y={H - 7} fill={TOKENS.textMuted} fontFamily="var(--font-mono)" fontSize="11.5">start</text>
              {width >= 420 ? (
                <text x={(sx(0) + sx(1)) / 2} y={H - 7} textAnchor="middle" fill={TOKENS.textMuted} fontFamily="var(--font-mono)" fontSize="11.5">
                  one deployment per row → time
                </text>
              ) : null}
              <text x={sx(1)} y={H - 7} textAnchor="end" fill={TOKENS.textMuted} fontFamily="var(--font-mono)" fontSize="11.5">end</text>
            </svg>
          </div>

          <div className="dt-bars" aria-live="polite">
            <Bar label={`over many deployments (${tally})`} parts={[
              { key: "caught", name: "caught first", value: shares.caught, color: COLOR.caught },
              { key: "win", name: "red wins first", value: shares.win, color: COLOR.win },
              { key: "none", name: "nothing decisive", value: shares.none, color: COLOR.none },
            ]} />
          </div>
        </div>

        <div className="dt-col">
          {equation}
          <LengthChart width={width} mode={mode} lambda={lambda} onPick={setLambdaExp} plain={plainSafety}
            sel={selSafety} cross={cross} a={a} lambdaStar={lambdaStar} selective={isSel} />
        </div>
      </div>

      {mode === "score" ? (
        <p className="as-note">
          Rows that end with nothing are the first term. Drag right and they disappear, leaving safety on the
          ratio; drag left and they take over. The ratio itself doesn't move. Then switch to <em>picks its
          moments</em>: the hollow circles it skipped are mostly green, the ones the monitor would have caught, so
          the ratio drops. Its curve sits below the random attacker's everywhere right of
          {cross ? <> {cross.toFixed(1)} opportunities</> : " the crossing"}, and above it to the left only because
          it often never acts. (Explorer settings: {fmtBudget(budget)} budget, side-task success {pct(p)}, selector
          keeps {pct(keep)}.)
        </p>
      ) : (
        <p className="as-note">
          Every attack inside the shaded window is caught and every attack after it wins, so red needs both factors.
          Attacking often sinks the first (gray dashes) and attacking rarely sinks the second (red dashes), so the
          product peaks in between, at λ* ≈ {fmtLambda(lambdaStar)}. That's a count, so it's the same at any
          deployment length. Only the rate changes: r* = λ*/N is {fmtRate(lambdaStar / 1e3)} at N = 1,000
          and {fmtRate(lambdaStar / 1e6)} at N = 1,000,000.
        </p>
      )}
    </section>
  );
}
