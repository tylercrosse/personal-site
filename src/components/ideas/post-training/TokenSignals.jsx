import { useEffect, useRef, useState } from "react";
import { TOKENS, TYPO, buttonStyles, formatNumber } from "../attack-selection/vizTheme";
import DATA from "./token-signals.json";

// What each learning signal says about each token of one answer. Real numbers
// from token_signals.py (post folder, viz/): a 0.5B student, a 3B teacher, one
// word problem. Blue = this token is made more likely, orange = less likely,
// purple = how unsure the student was (no direction).
//
// Deliberately not named *Figure: remarkCrossRefs counts any component whose
// name ends in "Figure", and TokenSignalFigure.astro already wraps this one.

const UP = TOKENS.blue;
const DOWN = TOKENS.orange;
const FORK = TOKENS.purple;
const MAX_TINT = 62; // % of the hue mixed into the token background (light theme)

// --ts-tint is raised in the dark theme, where a thin tint over the dark
// background reads as muddy.
const tint = (color, strength) =>
  strength <= 0.005
    ? "transparent"
    : `color-mix(in srgb, ${color} calc(var(--ts-tint, ${MAX_TINT}%) * ${Math.min(1, strength).toFixed(3)}), transparent)`;
const pct = (p) => (p >= 0.995 ? ">99%" : p < 0.01 ? "<1%" : `${Math.round(p * 100)}%`);
const signed = (v, d = 1) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${formatNumber(Math.abs(v), d)}`;
const show = (t) => JSON.stringify(t.replace(/\n/g, "↵")).slice(1, -1);

const { demo, student, rl, gold } = DATA;
const MISTAKE = student.mistake;
const STUDENT_NAME = DATA.meta.student.split("/")[1];
const TEACHER_NAME = DATA.meta.teacher.split("/")[1];

// Entropy: the top fifth of positions are "forks" (Wang et al. 2025 found RL
// mostly changes roughly this share of tokens).
const FORK_CUTOFF = (() => {
  const hs = student.tokens.map((t) => t.entropy).sort((a, b) => b - a);
  return hs[Math.max(0, Math.ceil(hs.length * 0.2) - 1)];
})();

const VIEWS = {
  sft: {
    label: "SFT",
    texts: [{ key: "demo", tokens: demo.tokens, tag: `Teacher's demonstration (${TEACHER_NAME}), not the student's answer` }],
    color: (t) => tint(UP, (t.surprise / 4) ** 0.75),
    tip: (t) => [`Student gave it ${pct(t.p)}`, `Push up: ${formatNumber(t.surprise, 1)}`],
    legend:
      "Every token of someone else's answer is pushed up. Darker blue means the student found that token more surprising, so it gets a bigger push.",
  },
  dpo: {
    label: "DPO",
    texts: [
      { key: "chosen", tokens: demo.tokens, tag: "Preferred answer", uniform: "up" },
      { key: "rejected", tokens: student.tokens, tag: "Rejected answer", uniform: "down" },
    ],
    legend:
      "A pair of answers, one marked better. The whole preferred answer is pushed up and the whole rejected one down, one judgment per answer.",
  },
  opd: {
    label: "On-policy distillation",
    texts: [{ key: "student", tokens: student.tokens, tag: `Student's own answer (${STUDENT_NAME}): ${student.answer}, wrong`, own: true }],
    color: (t) => (t.opd < 0 ? tint(DOWN, (-t.opd / 6) ** 0.7) : tint(UP, (t.opd / 6) ** 0.7)),
    tip: (t) => [
      `Teacher ${pct(t.pTeacher)} vs student ${pct(t.pStudent)}`,
      `Score: ${signed(t.opd)}`,
      t.opd < -1 && t.teacherTop !== t.t ? `Teacher would write “${show(t.teacherTop)}”` : null,
    ],
    legend:
      "The teacher reads the student's answer and scores every token. Orange where the teacher would have been less likely to write it, blue where more.",
  },
  rl: {
    label: "RL",
    texts: [{ key: "student", tokens: student.tokens, tag: `Student's own answer (${STUDENT_NAME}): ${student.answer}, wrong`, own: true }],
    color: () => tint(DOWN, Math.min(1, Math.abs(rl.advantage) / 1.5) ** 0.7),
    tip: () => [`Same for every token: ${signed(rl.advantage, 2)}`],
    legend: `One number for the whole answer. The final answer is wrong, and ${rl.nCorrect} of ${rl.nSamples} tries at this prompt were right, so this one scores ${signed(rl.advantage, 2)}, and every token gets that same push down.`,
  },
  entropy: {
    label: "Forks",
    texts: [{ key: "student", tokens: student.tokens, tag: `Student's own answer (${STUDENT_NAME})`, own: true }],
    color: (t) => tint(FORK, (t.entropy / 3) ** 0.8),
    tip: (t) => [`Uncertainty: ${formatNumber(t.entropy, 2)} bits`, t.entropy >= FORK_CUTOFF ? "A fork (top fifth)" : null],
    legend:
      "Not a training signal: how unsure the student was before each token. Most tokens are nearly forced; the darkest fifth, outlined, are forks where it was choosing.",
  },
};

const GRID = [
  { row: "Someone else's text", cells: ["sft", "dpo"] },
  { row: "Its own text", cells: ["opd", "rl"] },
];

const CSS = `
  .ts-widget {
    color: rgb(var(--gray-dark));
    font-family: ${TYPO.body};
    background: ${TOKENS.panelBg};
    border: 1px solid ${TOKENS.border};
    border-radius: 8px;
    padding: 16px;
    text-align: left;
  }
  [data-effective-theme="dark"] .ts-widget { --ts-tint: 80%; }
  .ts-prompt {
    background: ${TOKENS.surfaceSoft};
    border-radius: 6px;
    padding: 8px 12px;
    margin: 0 0 14px;
    font-size: 15px;
    line-height: 1.5;
  }
  .ts-kicker {
    display: block;
    font-family: ${TYPO.mono};
    font-size: 12px;
    color: ${TOKENS.textMuted};
    margin-bottom: 2px;
  }
  .ts-grid {
    display: grid;
    grid-template-columns: minmax(0, auto) minmax(0, 1fr) minmax(0, 1fr);
    gap: 6px;
    align-items: stretch;
    margin: 0 0 8px;
  }
  .ts-colhead, .ts-rowhead {
    font-family: ${TYPO.mono};
    font-size: 12px;
    color: ${TOKENS.textMuted};
    line-height: 1.25;
  }
  .ts-colhead { text-align: center; align-self: end; }
  .ts-rowhead { display: flex; align-items: center; max-width: 9.5em; }
  .ts-grid button, .ts-extra button { width: 100%; height: 100%; text-align: center; line-height: 1.2; }
  .ts-extra {
    display: grid;
    grid-template-columns: minmax(0, auto) minmax(0, 2fr);
    gap: 6px;
    margin: 0 0 14px;
  }
  .ts-text {
    position: relative;
    font-family: ${TYPO.mono};
    font-size: 14.5px;
    line-height: 1.9;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    border-radius: 6px;
    padding: 2px 0;
    outline: none;
  }
  .ts-text:focus-visible { box-shadow: ${TOKENS.focus}; }
  .ts-block + .ts-block { margin-top: 12px; }
  .ts-tag {
    font-family: ${TYPO.mono};
    font-size: 12px;
    color: ${TOKENS.textMuted};
    margin: 0 0 2px;
  }
  .ts-tok {
    padding: 2px 0;
    cursor: default;
    transition: background-color 0.25s ease;
    -webkit-box-decoration-break: clone;
    box-decoration-break: clone;
  }
  .ts-tok.ts-active { outline: 2px solid rgb(var(--gray-dark)); outline-offset: 0; }
  .ts-tok.ts-fork { box-shadow: inset 0 0 0 1px ${FORK}; }
  .ts-tok.ts-mistake {
    text-decoration: underline dashed ${TOKENS.textMuted};
    text-decoration-thickness: 1.5px;
    text-underline-offset: 5px;
  }
  .ts-key {
    font-family: ${TYPO.mono};
    font-size: 12px;
    color: ${TOKENS.textMuted};
    margin: 2px 0 0;
  }
  .ts-key u {
    text-decoration: underline dashed;
    text-decoration-thickness: 1.5px;
    text-underline-offset: 4px;
  }
  .ts-nl { color: ${TOKENS.textDim}; }
  .ts-badge {
    display: inline-block;
    font-family: ${TYPO.mono};
    font-size: 12px;
    border-radius: 4px;
    padding: 0 6px;
    margin-left: 6px;
  }
  .ts-tip {
    position: absolute;
    z-index: 2;
    pointer-events: none;
    background: ${TOKENS.surface};
    border: 1px solid ${TOKENS.borderStrong};
    border-radius: 6px;
    padding: 5px 8px;
    font-size: 12.5px;
    line-height: 1.4;
    white-space: nowrap;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
  }
  .ts-tip strong { font-family: ${TYPO.mono}; }
  .ts-legend {
    color: ${TOKENS.textMuted};
    font-size: 14.5px;
    line-height: 1.5;
    margin: 12px 0 0;
  }
  .ts-hint {
    color: ${TOKENS.textDim};
    font-size: 12.5px;
    margin: 6px 0 0;
  }
  @media (max-width: 480px) {
    .ts-widget { padding: 12px; }
    .ts-text { font-size: 13.5px; }
    .ts-grid button, .ts-extra button { font-size: 12.5px; padding: 6px 6px; }
  }
`;

function ViewButton({ id, view, setView }) {
  const v = VIEWS[id];
  return (
    <button type="button" aria-pressed={view === id} onClick={() => setView(id)} style={buttonStyles({ active: view === id })}>
      {v.label}
    </button>
  );
}

function Token({ tok, index, block, bg, active, fork, mistake, onPick }) {
  const nl = tok.t.includes("\n");
  const visible = nl ? tok.t.replace(/\n+/g, "") : tok.t;
  return (
    <>
      <span
        className={`ts-tok${active ? " ts-active" : ""}${fork ? " ts-fork" : ""}${mistake ? " ts-mistake" : ""}`}
        style={{ backgroundColor: bg }}
        data-block={block}
        data-index={index}
        onMouseEnter={() => onPick(block, index)}
        onClick={() => onPick(block, index)}
      >
        {visible}
        {nl && <span className="ts-nl">↵</span>}
      </span>
      {nl && tok.t.replace(/[^\n]/g, "")}
    </>
  );
}

export default function TokenSignals() {
  const [view, setView] = useState("opd");
  const [active, setActive] = useState(null); // { block, index }
  const [tipPos, setTipPos] = useState(null);
  const wrapRef = useRef(null);
  const v = VIEWS[view];

  useEffect(() => setActive(null), [view]);

  // Place the tooltip above the active token, clamped inside the widget.
  useEffect(() => {
    if (!active || !wrapRef.current) return setTipPos(null);
    const el = wrapRef.current.querySelector(`[data-block="${active.block}"][data-index="${active.index}"]`);
    const tip = wrapRef.current.querySelector(".ts-tip");
    if (!el || !tip) return undefined;
    const box = wrapRef.current.getBoundingClientRect();
    const r = el.getClientRects()[0] ?? el.getBoundingClientRect();
    const w = tip.offsetWidth;
    const left = Math.max(0, Math.min(box.width - w, r.left - box.left + r.width / 2 - w / 2));
    // Always above the token, so it never covers the text still to be read;
    // on the first line it overlaps the controls instead.
    setTipPos({ left, top: r.top - box.top - tip.offsetHeight - 6 });
  }, [active, view]);

  const pick = (block, index) => setActive({ block, index });

  const onKey = (block, n) => (e) => {
    if (!["ArrowRight", "ArrowLeft", "Home", "End", "Escape"].includes(e.key)) return;
    e.preventDefault();
    if (e.key === "Escape") return setActive(null);
    const cur = active?.block === block ? active.index : -1;
    const next =
      e.key === "Home" ? 0 : e.key === "End" ? n - 1 : e.key === "ArrowRight" ? Math.min(n - 1, cur + 1) : Math.max(0, cur - 1);
    setActive({ block, index: next });
  };

  const activeBlock = active && v.texts.find((b) => b.key === active.block);
  const activeTok = activeBlock?.tokens[active.index];
  const tipLines = activeTok
    ? activeBlock.uniform
      ? [activeBlock.uniform === "up" ? "Pushed up, like every token in this answer" : "Pushed down, like every token in this answer"]
      : v.tip(activeTok).filter(Boolean)
    : [];

  return (
    <div className="ts-widget">
      <style>{CSS}</style>

      <p className="ts-prompt">
        <span className="ts-kicker">Prompt</span>
        {DATA.question}
      </p>

      <div className="ts-grid" role="group" aria-label="Learning signal">
        <span />
        <span className="ts-colhead">Signal on every token</span>
        <span className="ts-colhead">One signal per answer</span>
        {GRID.map(({ row, cells }) => (
          <div key={row} style={{ display: "contents" }}>
            <span className="ts-rowhead">{row}</span>
            {cells.map((id) => (
              <ViewButton key={id} id={id} view={view} setView={setView} />
            ))}
          </div>
        ))}
      </div>
      <div className="ts-extra">
        <span className="ts-rowhead">Not a signal</span>
        <button
          type="button"
          aria-pressed={view === "entropy"}
          onClick={() => setView("entropy")}
          style={buttonStyles({ active: view === "entropy", color: FORK })}
        >
          Where the student was unsure
        </button>
      </div>

      <div ref={wrapRef} style={{ position: "relative" }} onMouseLeave={() => setActive(null)}>
        {v.texts.map((b) => (
          <div className="ts-block" key={b.key}>
            <p className="ts-tag">
              {b.tag}
              {view === "rl" && (
                <span className="ts-badge" style={{ background: v.color() }}>
                  {signed(rl.advantage, 2)} × every token
                </span>
              )}
            </p>
            <div
              className="ts-text"
              tabIndex={0}
              role="group"
              aria-label={`${b.tag}. Use the arrow keys to read each token's value.`}
              onKeyDown={onKey(b.key, b.tokens.length)}
              onBlur={() => setActive(null)}
            >
              {b.tokens.map((t, i) => (
                <Token
                  key={i}
                  tok={t}
                  index={i}
                  block={b.key}
                  bg={b.uniform ? tint(b.uniform === "up" ? UP : DOWN, 0.55) : v.color(t)}
                  active={active?.block === b.key && active.index === i}
                  fork={view === "entropy" && t.entropy >= FORK_CUTOFF}
                  mistake={b.tokens === student.tokens && MISTAKE && i >= MISTAKE.start && i < MISTAKE.end}
                  onPick={pick}
                />
              ))}
            </div>
            {b.tokens === student.tokens && MISTAKE && (
              <p className="ts-key">
                <u>dashed</u>: the mistake. 14 is how many he sold, not how many are left.
              </p>
            )}
          </div>
        ))}
        {activeTok && (
          <div
            className="ts-tip"
            role="status"
            style={tipPos ? { left: tipPos.left, top: tipPos.top } : { left: 0, top: 0, visibility: "hidden" }}
          >
            <strong>“{show(activeTok.t)}”</strong>
            {tipLines.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
        )}
      </div>

      <p className="ts-legend">{v.legend}</p>
      <p className="ts-hint">Hover or tap a token for its value. Correct answer: {gold}.</p>
    </div>
  );
}
