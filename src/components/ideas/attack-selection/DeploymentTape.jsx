import { useMemo, useState } from "react";
import { TOKENS, buttonStyles } from "./vizTheme";
import { Slider, Stat } from "./vizControls";
import { ATTACK_MEAN, ATTACK_SD, ALL_ATTACKS, keptAttacks, selectorCut, thresholdFor, tprAt } from "./model";
import { useSettings } from "./store";
import { INK, WIDGET_CSS, fmtBudget, fmtRate, pct, px, useMeasuredWidth } from "./chartKit";

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

const ROWS = 16;
const CANDIDATES = 240; // per row; attacks are the candidates with u < λ / LAMBDA_MAX
const LAMBDA_MAX = CANDIDATES;
const LAMBDA_EXP = [-1, 1.8]; // 0.1 to ~63 expected attacks per deployment

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

function runRow(cands, { mode, lambda, selective, keep, noise, cut, tau, p, a }) {
  const events = [];
  for (const c of cands) {
    if (c.u >= lambda / LAMBDA_MAX) continue;
    if (mode === "score" && selective && keep < 0.999) {
      const kept = Number.isFinite(noise) ? c.s + noise * c.z < cut : c.k < keep;
      if (!kept) continue;
    }
    let kind;
    if (mode === "window") kind = c.x < a ? "caught" : "win";
    else kind = c.s > tau ? "caught" : c.v < p ? "win" : "quiet";
    events.push({ x: c.x, kind });
  }
  const first = events.find((e) => e.kind !== "quiet");
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

const CSS = `
  .dt-bars { display: grid; gap: 10px; margin: 6px 0 14px; }
  .dt-bar-label { font-family: var(--font-mono); font-size: 13px; color: ${TOKENS.textMuted}; margin-bottom: 4px; }
  .dt-bar-track { display: flex; height: 26px; border-radius: 5px; overflow: hidden; border: 1px solid ${TOKENS.border}; background: ${TOKENS.surface}; }
  .dt-seg { display: flex; align-items: center; justify-content: center; min-width: 0; transition: width 0.35s ease; }
  .dt-seg span { font-family: var(--font-mono); font-size: 12.5px; font-weight: 650; color: #fff; text-shadow: 0 0 3px rgba(0,0,0,0.45); white-space: nowrap; }
  .dt-key { display: flex; flex-wrap: wrap; gap: 4px 16px; font-family: var(--font-mono); font-size: 13px; color: ${TOKENS.textMuted}; margin: 0 0 8px; }
  .dt-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; vertical-align: -1px; }
  @media (prefers-reduced-motion: reduce) { .dt-seg { transition: none; } }
`;

export default function DeploymentTape({ initialMode = "score" }) {
  const { budget, keep, noise, sigma, sideTaskSuccess: p } = useSettings();
  const [mode, setMode] = useState(initialMode);
  const [selective, setSelective] = useState(false);
  const [lambdaExp, setLambdaExp] = useState(Math.log10(initialMode === "window" ? 20 : 5));
  const [aExp, setAExp] = useState(Math.log10(0.05));
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
  const decided = shares.caught + shares.win;
  const lambdaStar = -Math.log(a) / (1 - a);
  const counts = rows.reduce((acc, r) => ({ ...acc, [r.outcome]: (acc[r.outcome] || 0) + 1 }), {});

  // Tape geometry.
  const padL = 6;
  const padR = width < 480 ? 62 : 78;
  const top = mode === "window" ? 22 : 8;
  const rowH = 17;
  const H = top + ROWS * rowH + 26;
  const sx = (x) => px(padL + x * (width - padL - padR));
  const tick = 5.5;

  return (
    <section className="as-widget" aria-label="Simulated deployments">
      <style>{WIDGET_CSS + CSS}</style>

      <div className="as-toolbar">
        <div className="as-seg" role="group" aria-label="How audits are chosen">
          <span className="as-seg-label">audit</span>
          {[["score", "monitor + threshold τ"], ["window", "upfront window"]].map(([id, label]) => (
            <button key={id} type="button" aria-pressed={mode === id} onClick={() => setMode(id)}
              style={buttonStyles({ active: mode === id, color: INK.kept })}>{label}</button>
          ))}
        </div>
        {mode === "score" ? (
          <div className="as-seg" role="group" aria-label="Attacker">
            <span className="as-seg-label">attacker</span>
            {[[false, "attacks at random"], [true, "picks its moments"]].map(([id, label]) => (
              <button key={label} type="button" aria-pressed={selective === id} onClick={() => setSelective(id)}
                style={buttonStyles({ active: selective === id, color: INK.kept })}>{label}</button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="as-controls">
        <Slider label={mode === "score" ? "attack opportunities taken per deployment" : "expected attacks per deployment"}
          valueChars={5} value={lambdaExp} min={LAMBDA_EXP[0]} max={LAMBDA_EXP[1]} step={0.02}
          onChange={setLambdaExp} display={fmtLambda(lambda)} />
        {mode === "window" ? (
          <Slider label="audit window a" value={aExp} min={-2} max={Math.log10(0.25)} step={0.02}
            onChange={setAExp} display={fmtBudget(a)} />
        ) : null}
      </div>

      <div className="as-presets">
        {mode === "window" ? (
          <button type="button" onClick={() => setLambdaExp(Math.log10(lambdaStar))}
            style={buttonStyles({ color: INK.kept })}>use red's best rate</button>
        ) : null}
        <button type="button" onClick={() => setSeed((s) => s + 1)} style={buttonStyles()}>re-roll runs</button>
      </div>

      <div className="dt-key">
        <span><span className="dt-dot" style={{ background: COLOR.caught }} />caught (blue wins)</span>
        <span><span className="dt-dot" style={{ background: COLOR.win }} />uncaught success (red wins)</span>
        {mode === "score" ? <span><span className="dt-dot" style={{ background: COLOR.quiet }} />failed quietly</span> : null}
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
                  const isEnd = e.x === row.end && e.kind !== "quiet";
                  return isEnd ? (
                    <circle key={j} cx={sx(e.x)} cy={y} r="4.6" fill={COLOR[e.kind]} stroke={TOKENS.surface} strokeWidth="1.2" />
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
          <text x={sx(0)} y={H - 8} fill={TOKENS.textMuted} fontFamily="var(--font-mono)" fontSize="11.5">start</text>
          {width >= 480 ? (
            <text x={(sx(0) + sx(1)) / 2} y={H - 8} textAnchor="middle" fill={TOKENS.textMuted} fontFamily="var(--font-mono)" fontSize="11.5">
              one deployment per row → time
            </text>
          ) : null}
          <text x={sx(1)} y={H - 8} textAnchor="end" fill={TOKENS.textMuted} fontFamily="var(--font-mono)" fontSize="11.5">end</text>
        </svg>
      </div>

      <div className="dt-bars" aria-live="polite">
        <Bar label="over many deployments" parts={[
          { key: "caught", name: "caught first", value: shares.caught, color: COLOR.caught },
          { key: "win", name: "red wins first", value: shares.win, color: COLOR.win },
          { key: "none", name: "nothing decisive", value: shares.none, color: COLOR.none },
        ]} />
        <Bar label="only deployments where something decisive happened" parts={[
          { key: "caught", name: "caught first", value: shares.caught, color: COLOR.caught },
          { key: "win", name: "red wins first", value: shares.win, color: COLOR.win },
        ]} />
      </div>

      <div className="as-stats">
        {mode === "score" ? (
          <>
            <Stat label="attacks per deployment" value={isSel ? `${fmtLambda(lambda)} → ${fmtLambda(lambdaEff)} kept` : fmtLambda(lambda)} />
            <Stat label="caught rate per attack" value={pct(tpr)} color={isSel ? INK.kept : undefined} />
            <Stat label="safety, many deployments" value={pct(shares.none + shares.caught)} color={INK.kept} />
          </>
        ) : (
          <>
            <Stat label="red's best rate λ*" value={`${fmtLambda(lambdaStar)} per deployment`} />
            <Stat label="safety at λ*, any N" value={pct(1 - (Math.exp(-a * lambdaStar) - Math.exp(-lambdaStar)))} color={INK.kept} />
            <Stat label="λ* as a rate, N = 1k → 1M" value={`${fmtRate(lambdaStar / 1e3)} → ${fmtRate(lambdaStar / 1e6)}`} />
          </>
        )}
      </div>

      {mode === "score" ? (
        <p className="as-note">
          Drag the attacks down. Rows thin out and more of them end with nothing decisive, but the lower bar,
          the split among deployments where something happened, doesn't move ({pct(decided > 0 ? shares.caught / decided : 1)} caught).
          Now switch to <em>picks its moments</em>. The ticks that disappear are mostly green, because the selector skips
          the opportunities the monitor would have flagged, and the lower bar shifts toward red. Caught rate and
          side-task success follow the explorer above.
        </p>
      ) : (
        <p className="as-note">
          Here there's no threshold. Every attack inside the shaded window is caught and every attack after it wins.
          Attack often and the first attack lands in the window. Attack rarely and most deployments end with no
          attack at all. Red does best at about {fmtLambda(lambdaStar)} attacks per deployment, and because that's a count, not a
          rate, the picture and the safety are the same at any deployment length.
        </p>
      )}
    </section>
  );
}
