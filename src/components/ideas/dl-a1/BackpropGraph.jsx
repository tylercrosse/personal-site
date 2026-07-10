import { useId, useMemo, useState } from "react";
import { TOKENS, TYPO, buttonStyles, formatNumber } from "./vizTheme";
import { CONTROL_CSS, Slider } from "./vizControls";

const X_INPUT = [1.2, -0.7];

function sigmoid(value) {
  return 1 / (1 + Math.exp(-value));
}

function fmt(value, digits = 3) {
  return formatNumber(value, digits);
}

function fmtVec(values, digits = 2) {
  return `[${values.map((v) => formatNumber(v, digits)).join(", ")}]`;
}

// Each circuit is hand-authored: params (sliders), an optional toggle, a
// compute() for all forward/backward values, node layout with per-node
// equations and local rules, edges, and a 5-step walkthrough.
const CIRCUITS = [
  {
    id: "logistic",
    label: "logistic regression",
    viewBox: "0 0 780 302",
    params: [
      { key: "w1", label: "w₁", min: -4, max: 4, step: 0.1, def: 0.8 },
      { key: "w2", label: "w₂", min: -4, max: 4, step: 0.1, def: -0.4 },
      { key: "b", label: "b", min: -3, max: 3, step: 0.1, def: 0.1 },
    ],
    toggle: { key: "y", label: "target", options: [1, 0] },
    defaults: { w1: 0.8, w2: -0.4, b: 0.1, y: 1 },
    compute(s) {
      const u = s.w1 * X_INPUT[0] + s.w2 * X_INPUT[1] + s.b;
      const p = sigmoid(u);
      const loss = s.y === 1 ? -Math.log(p) : -Math.log(1 - p);
      const dLdp = s.y === 1 ? -1 / p : 1 / (1 - p);
      const dpdu = p * (1 - p);
      const uBar = p - s.y;
      return {
        u,
        p,
        loss,
        dLdp,
        dpdu,
        uBar,
        wBar: X_INPUT.map((x) => uBar * x),
        bBar: uBar,
        xBar: [uBar * s.w1, uBar * s.w2],
      };
    },
    nodes(s, v) {
      return [
        {
          id: "x", x: 105, y: 95, w: 136, label: "x (input, fixed)",
          fwd: `x = ${fmtVec(X_INPUT, 1)}`, bar: `x̄ = ${fmtVec(v.xBar)}`, barStep: 4,
          eq: "leaf: input example", rule: "x̄ = ū·w",
        },
        {
          id: "u", x: 315, y: 95, label: "dot + bias",
          fwd: `u = ${fmt(v.u)}`, bar: `ū = ${fmt(v.uBar)}`, barStep: 3,
          eq: "u = w·x + b", rule: "∂u/∂w = x · ∂u/∂b = 1 · ∂u/∂x = w",
        },
        {
          id: "p", x: 525, y: 95, label: "sigmoid",
          fwd: `p = ${fmt(v.p, 4)}`, bar: `p̄ = ${fmt(v.dLdp)}`, barStep: 2,
          eq: "p = σ(u) = 1/(1+e⁻ᵘ)", rule: "∂p/∂u = p(1−p)",
        },
        {
          id: "L", x: 702, y: 95, label: s.y === 1 ? "L = −log p" : "L = −log(1−p)",
          fwd: `L = ${fmt(v.loss)}`, bar: "L̄ = 1", barStep: 1,
          eq: "binary cross-entropy", rule: s.y === 1 ? "∂L/∂p = −1/p" : "∂L/∂p = 1/(1−p)",
        },
        {
          id: "w", x: 215, y: 255, w: 136, label: "w (weights)",
          fwd: `w = ${fmtVec([s.w1, s.w2], 1)}`, bar: `w̄ = ${fmtVec(v.wBar)}`, barStep: 4,
          eq: "parameter of the dot + bias module", rule: "w̄ = ū·x",
        },
        {
          id: "b", x: 415, y: 255, w: 136, label: "b (bias)",
          fwd: `b = ${fmt(s.b, 1)}`, bar: `b̄ = ${fmt(v.bBar)}`, barStep: 4,
          eq: "parameter of the dot + bias module", rule: "b̄ = ū",
        },
      ];
    },
    fwdEdges: [
      [173, 87, 245, 87],
      [379, 87, 455, 87],
      [589, 87, 632, 87],
      [230, 219, 300, 133, true],
      [400, 219, 330, 133, true],
    ],
    backEdges: [
      { step: 2, line: [638, 109, 595, 109], label: "p̄", at: [616, 124] },
      { step: 3, line: [461, 109, 385, 109], label: "ū", at: [423, 124] },
      { step: 4, line: [245, 109, 179, 109], label: "x̄", at: [212, 124] },
      { step: 4, line: [275, 133, 205, 219], label: "w̄", at: [222, 180], dashed: true },
      { step: 4, line: [355, 133, 425, 219], label: "b̄", at: [408, 180], dashed: true },
    ],
    steps(s, v) {
      const saturated = Math.abs(v.u) > 3.5;
      const satCallout = `u = ${fmt(v.u)} is deep in the sigmoid's flat region: p̄ = ${fmt(v.dLdp)} explodes while p(1−p) = ${fmt(v.dpdu)} vanishes. Their product stays tame: ū = p − y = ${fmt(v.uBar)}.`;
      return [
        {
          name: "forward pass",
          note: "Compute and cache every intermediate value on the way to the loss. These cached values are what the backward pass will reuse.",
          eqs: [
            `u = w·x + b = ${fmt(v.u)}`,
            `p = sigmoid(u) = ${fmt(v.p, 4)}`,
            `L = ${s.y === 1 ? "−log(p)" : "−log(1−p)"} = ${fmt(v.loss)}`,
          ],
          active: ["u", "p", "L"],
          callout: null,
        },
        {
          name: "seed the loss",
          note: "The backward pass starts at the output with the only gradient known for free: the loss with respect to itself, L̄ = 1.",
          eqs: ["L̄ = dL/dL = 1"],
          active: ["L"],
          callout: null,
        },
        {
          name: "back through −log",
          note: "One local rule converts L̄ into p̄. Push u far from zero with the sliders and watch this factor explode as p saturates.",
          eqs: [`p̄ = ${s.y === 1 ? "−1/p" : "1/(1−p)"} = ${fmt(v.dLdp)}`],
          active: ["p"],
          callout: saturated ? satCallout : null,
        },
        {
          name: "back through sigmoid",
          note: "Multiply by the local derivative p(1−p). The two extreme factors collapse into the tame shortcut ū = p − y.",
          eqs: [
            `dp/du = p(1−p) = ${fmt(v.dpdu)}`,
            `ū = p̄ · dp/du = ${fmt(v.dLdp * v.dpdu)}`,
            `shortcut: ū = p − y = ${fmt(v.uBar)}`,
          ],
          active: ["u"],
          callout: saturated ? satCallout : null,
        },
        {
          name: "into the parameters",
          note: "The affine rules fan ū out to w, b, and x. The parameter gradients w̄ and b̄ are what the optimizer will use.",
          eqs: [`w̄ = ū x = ${fmtVec(v.wBar)}`, `b̄ = ū = ${fmt(v.bBar)}`, `x̄ = ū w = ${fmtVec(v.xBar)}`],
          active: ["w", "x", "b"],
          callout: null,
        },
      ];
    },
  },
  {
    id: "relu",
    label: "ReLU unit",
    viewBox: "0 0 780 302",
    params: [
      { key: "w1", label: "w₁", min: -4, max: 4, step: 0.1, def: 0.8 },
      { key: "w2", label: "w₂", min: -4, max: 4, step: 0.1, def: -0.4 },
      { key: "b", label: "b", min: -3, max: 3, step: 0.1, def: 0.1 },
    ],
    toggle: null,
    defaults: { w1: 0.8, w2: -0.4, b: 0.1 },
    compute(s) {
      const t = 1;
      const u = s.w1 * X_INPUT[0] + s.w2 * X_INPUT[1] + s.b;
      const h = Math.max(0, u);
      const loss = 0.5 * (h - t) ** 2;
      const hBar = h - t;
      const gate = u > 0 ? 1 : 0;
      const uBar = hBar * gate;
      return {
        u,
        h,
        t,
        loss,
        hBar,
        gate,
        uBar,
        wBar: X_INPUT.map((x) => uBar * x),
        bBar: uBar,
        xBar: [uBar * s.w1, uBar * s.w2],
      };
    },
    nodes(s, v) {
      return [
        {
          id: "x", x: 105, y: 95, w: 136, label: "x (input, fixed)",
          fwd: `x = ${fmtVec(X_INPUT, 1)}`, bar: `x̄ = ${fmtVec(v.xBar)}`, barStep: 4,
          eq: "leaf: input example", rule: "x̄ = ū·w",
        },
        {
          id: "u", x: 315, y: 95, label: "dot + bias",
          fwd: `u = ${fmt(v.u)}`, bar: `ū = ${fmt(v.uBar)}`, barStep: 3,
          eq: "u = w·x + b", rule: "∂u/∂w = x · ∂u/∂b = 1 · ∂u/∂x = w",
        },
        {
          id: "h", x: 510, y: 95, label: v.gate ? "ReLU (open)" : "ReLU (closed)",
          fwd: `h = ${fmt(v.h)}`, bar: `h̄ = ${fmt(v.hBar)}`, barStep: 2,
          eq: "h = max(0, u)", rule: "∂h/∂u = 1[u>0], exactly 0 or 1",
        },
        {
          id: "L", x: 690, y: 95, label: "½(h−t)², t = 1",
          fwd: `L = ${fmt(v.loss)}`, bar: "L̄ = 1", barStep: 1,
          eq: "squared error to target t", rule: "∂L/∂h = h−t",
        },
        {
          id: "w", x: 215, y: 255, w: 136, label: "w (weights)",
          fwd: `w = ${fmtVec([s.w1, s.w2], 1)}`, bar: `w̄ = ${fmtVec(v.wBar)}`, barStep: 4,
          eq: "parameter of the dot + bias module", rule: "w̄ = ū·x",
        },
        {
          id: "b", x: 415, y: 255, w: 136, label: "b (bias)",
          fwd: `b = ${fmt(s.b, 1)}`, bar: `b̄ = ${fmt(v.bBar)}`, barStep: 4,
          eq: "parameter of the dot + bias module", rule: "b̄ = ū",
        },
      ];
    },
    fwdEdges: [
      [173, 87, 245, 87],
      [379, 87, 440, 87],
      [574, 87, 620, 87],
      [230, 219, 300, 133, true],
      [400, 219, 330, 133, true],
    ],
    backEdges: [
      { step: 2, line: [626, 109, 580, 109], label: "h̄", at: [603, 124] },
      { step: 3, line: [446, 109, 385, 109], label: "ū", at: [415, 124] },
      { step: 4, line: [245, 109, 179, 109], label: "x̄", at: [212, 124] },
      { step: 4, line: [275, 133, 205, 219], label: "w̄", at: [222, 180], dashed: true },
      { step: 4, line: [355, 133, 425, 219], label: "b̄", at: [408, 180], dashed: true },
    ],
    steps(s, v) {
      const deadCallout = `u = ${fmt(v.u)} ≤ 0, so the gate is closed: ū = 0 exactly, and w̄, b̄, x̄ are all zero. No learning signal reaches the parameters — a "dead" ReLU for this input.`;
      return [
        {
          name: "forward pass",
          note: "The ReLU either passes u through unchanged or clamps it to zero. Slide b negative until u drops below zero and watch what happens downstream.",
          eqs: [`u = w·x + b = ${fmt(v.u)}`, `h = max(0, u) = ${fmt(v.h)}`, `L = ½(h−1)² = ${fmt(v.loss)}`],
          active: ["u", "h", "L"],
          callout: null,
        },
        {
          name: "seed the loss",
          note: "As always, the backward pass starts with L̄ = 1 at the output.",
          eqs: ["L̄ = dL/dL = 1"],
          active: ["L"],
          callout: null,
        },
        {
          name: "back through the loss",
          note: "Squared error has the simplest local rule of all: the residual.",
          eqs: [`h̄ = ∂L/∂h = h − t = ${fmt(v.hBar)}`],
          active: ["h"],
          callout: null,
        },
        {
          name: "back through ReLU",
          note: "The local derivative is a hard gate: 1 if u > 0, else 0. The forward-pass mask decides whether any gradient survives.",
          eqs: [`gate: 1[u>0] = ${v.gate}`, `ū = h̄ · ${v.gate} = ${fmt(v.uBar)}`],
          active: ["u"],
          callout: v.gate === 0 ? deadCallout : null,
        },
        {
          name: "into the parameters",
          note: "The same affine rules as before — but everything is multiplied by the gate.",
          eqs: [`w̄ = ū x = ${fmtVec(v.wBar)}`, `b̄ = ū = ${fmt(v.bBar)}`, `x̄ = ū w = ${fmtVec(v.xBar)}`],
          active: ["w", "x", "b"],
          callout: v.gate === 0 ? deadCallout : null,
        },
      ];
    },
  },
  {
    id: "shared",
    label: "shared input",
    viewBox: "0 0 780 310",
    params: [
      { key: "x", label: "x", min: -3, max: 3, step: 0.1, def: 1.2 },
      { key: "y", label: "y", min: -3, max: 3, step: 0.1, def: -0.7 },
    ],
    toggle: null,
    defaults: { x: 1.2, y: -0.7 },
    compute(s) {
      const q = s.x * s.y;
      const sum = s.x + q;
      const loss = 0.5 * sum * sum;
      const sBar = sum;
      const qBar = sBar;
      const xBar1 = sBar;
      const xBar2 = qBar * s.y;
      return { q, sum, loss, sBar, qBar, xBar1, xBar2, xBar: xBar1 + xBar2, yBar: qBar * s.x };
    },
    nodes(s, v, step) {
      return [
        {
          id: "x", x: 105, y: 105, w: 136, label: "x (used twice)",
          fwd: `x = ${fmt(s.x, 2)}`,
          bar: step >= 4 ? `x̄ = ${fmt(v.xBar)} (both paths)` : `x̄ = ${fmt(v.xBar1)} (path 1 of 2)`,
          barStep: 3,
          eq: "leaf: input, feeds both + and ×", rule: "x̄ = s̄·1 + q̄·y — two paths, added",
        },
        {
          id: "y", x: 105, y: 245, w: 136, label: "y",
          fwd: `y = ${fmt(s.y, 2)}`, bar: `ȳ = ${fmt(v.yBar)}`, barStep: 4,
          eq: "leaf: input", rule: "ȳ = q̄·x",
        },
        {
          id: "q", x: 315, y: 245, label: "× (multiply)",
          fwd: `q = x·y = ${fmt(v.q)}`, bar: `q̄ = ${fmt(v.qBar)}`, barStep: 3,
          eq: "q = x·y", rule: "∂q/∂x = y · ∂q/∂y = x",
        },
        {
          id: "s", x: 510, y: 175, label: "+ (add)",
          fwd: `s = x + q = ${fmt(v.sum)}`, bar: `s̄ = ${fmt(v.sBar)}`, barStep: 2,
          eq: "s = x + q", rule: "∂s/∂x = 1 · ∂s/∂q = 1",
        },
        {
          id: "L", x: 690, y: 175, label: "L = ½s²",
          fwd: `L = ${fmt(v.loss)}`, bar: "L̄ = 1", barStep: 1,
          eq: "L = ½s²", rule: "∂L/∂s = s",
        },
      ];
    },
    fwdEdges: [
      [173, 95, 443, 163],
      [173, 117, 248, 229],
      [173, 249, 248, 253],
      [379, 231, 443, 187],
      [574, 167, 623, 167],
    ],
    backEdges: [
      { step: 2, line: [626, 183, 578, 183], label: "s̄", at: [602, 198] },
      { step: 3, line: [443, 175, 177, 107], label: "x̄ (1)", at: [320, 130] },
      { step: 3, line: [446, 193, 384, 239], label: "q̄", at: [432, 224] },
      { step: 4, line: [251, 235, 179, 121], label: "x̄ (2)", at: [244, 172] },
      { step: 4, line: [251, 259, 177, 257], label: "ȳ", at: [214, 274] },
    ],
    steps(s, v) {
      const sumCallout = `x feeds two operations, so its gradient is the sum over both paths: x̄ = ${fmt(v.xBar1)} + ${fmt(v.xBar2)} = ${fmt(v.xBar)}. This is the accumulation rule (the Σ from the article) — forget to add and the gradient is silently wrong.`;
      return [
        {
          name: "forward pass",
          note: "One value, two uses: x flows into the multiply and also skips ahead into the add — like a shared parameter or a residual connection.",
          eqs: [`q = x·y = ${fmt(v.q)}`, `s = x + q = ${fmt(v.sum)}`, `L = ½s² = ${fmt(v.loss)}`],
          active: ["q", "s", "L"],
          callout: null,
        },
        {
          name: "seed the loss",
          note: "The backward pass starts with L̄ = 1 at the output.",
          eqs: ["L̄ = dL/dL = 1"],
          active: ["L"],
          callout: null,
        },
        {
          name: "back through ½s²",
          note: "The local rule for ½s² is just s.",
          eqs: [`s̄ = ∂L/∂s = s = ${fmt(v.sBar)}`],
          active: ["s"],
          callout: null,
        },
        {
          name: "back through +",
          note: "Addition copies the upstream gradient to both of its inputs. x banks its first contribution — a second one is still coming through ×.",
          eqs: [`q̄ = s̄·1 = ${fmt(v.qBar)}`, `x̄ (path 1) = s̄·1 = ${fmt(v.xBar1)}`],
          active: ["q", "x"],
          callout: null,
        },
        {
          name: "back through ×",
          note: "The multiply sends gradients to both inputs — and x's second contribution ADDS to its first.",
          eqs: [
            `ȳ = q̄·x = ${fmt(v.yBar)}`,
            `x̄ (path 2) = q̄·y = ${fmt(v.xBar2)}`,
            `x̄ = path 1 + path 2 = ${fmt(v.xBar)}`,
          ],
          active: ["y", "x"],
          callout: sumCallout,
        },
      ];
    },
  },
];

function Node({ node, active, barShown, selected, onSelect }) {
  const half = (node.w ?? 128) / 2;
  const fill = active
    ? `color-mix(in srgb, ${TOKENS.accent} 20%, ${TOKENS.surfaceStrong})`
    : TOKENS.surfaceSoft;
  const stroke = selected ? TOKENS.green : active ? TOKENS.accent : barShown ? TOKENS.borderStrong : TOKENS.border;

  return (
    <g
      className="bp-node"
      role="button"
      tabIndex={0}
      aria-label={`Inspect node ${node.label}`}
      onClick={() => onSelect(node.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(node.id);
        }
      }}
    >
      <rect
        x={node.x - half}
        y={node.y - 34}
        width={node.w ?? 128}
        height="68"
        rx="8"
        fill={fill}
        stroke={stroke}
        strokeWidth={selected ? 2 : 1}
      />
      <text x={node.x} y={node.y - 15} textAnchor="middle" fill={TOKENS.text} fontFamily={TYPO.mono} fontSize="12.5" fontWeight="700">
        {node.label}
      </text>
      <text x={node.x} y={node.y + 4} textAnchor="middle" fill={TOKENS.textMuted} fontFamily={TYPO.mono} fontSize="11">
        {node.fwd}
      </text>
      {barShown ? (
        <text x={node.x} y={node.y + 22} textAnchor="middle" fill={TOKENS.accent} fontFamily={TYPO.mono} fontSize="11" fontWeight="700">
          {node.bar}
        </text>
      ) : null}
    </g>
  );
}

export default function BackpropGraph() {
  const svgId = useId().replace(/:/g, "");
  const fwdMarkerId = `bp-fwd-${svgId}`;
  const backMarkerId = `bp-back-${svgId}`;
  const [circuitId, setCircuitId] = useState("logistic");
  const [step, setStep] = useState(0);
  const [state, setState] = useState(CIRCUITS[0].defaults);
  const [selected, setSelected] = useState(null);

  const circuit = CIRCUITS.find((c) => c.id === circuitId);
  const vals = useMemo(() => circuit.compute(state), [circuit, state]);
  const steps = circuit.steps(state, vals);
  const stepDef = steps[Math.min(step, steps.length - 1)];
  const nodes = circuit.nodes(state, vals, step);
  const selectedNode = nodes.find((n) => n.id === selected) ?? null;

  const pickCircuit = (id) => {
    if (id === circuitId) return;
    const next = CIRCUITS.find((c) => c.id === id);
    setCircuitId(id);
    setState(next.defaults);
    setStep(0);
    setSelected(null);
  };

  const setParam = (key, value) => setState((prev) => ({ ...prev, [key]: value }));

  const reset = () => {
    setState(circuit.defaults);
    setStep(0);
  };

  return (
    <section className="bp-widget" aria-label="Backpropagation graph walkthrough">
      <style>{`
        ${CONTROL_CSS}
        .bp-widget {
          color: ${TOKENS.text};
          font-family: ${TYPO.body};
          background: ${TOKENS.panelBg};
          border: 1px solid ${TOKENS.border};
          border-radius: 8px;
          padding: 18px;
        }
        .bp-controls {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 14px;
        }
        .bp-buttons {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }
        .bp-buttons span {
          color: ${TOKENS.textMuted};
          font-family: ${TYPO.mono};
          font-size: 12px;
        }
        .bp-stepper {
          min-width: min(300px, 100%);
          flex: 1;
          display: flex;
          align-items: center;
          gap: 12px;
          color: ${TOKENS.textMuted};
          font-family: ${TYPO.mono};
          font-size: 12px;
        }
        .bp-stepper input {
          flex: 1;
          accent-color: ${TOKENS.accent};
        }
        .bp-params {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 16px;
          align-items: end;
          margin-bottom: 14px;
        }
        .bp-toggle {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .bp-toggle span {
          color: ${TOKENS.textMuted};
          font-family: ${TYPO.mono};
          font-size: 12px;
        }
        .bp-grid {
          display: grid;
          grid-template-columns: minmax(480px, 1.3fr) minmax(260px, 0.7fr);
          gap: 16px;
          align-items: stretch;
        }
        .bp-panel {
          background: ${TOKENS.surfaceSoft};
          border: 1px solid ${TOKENS.border};
          border-radius: 8px;
          padding: 16px;
        }
        .bp-panel svg {
          display: block;
          max-width: 820px;
          margin: 0 auto;
        }
        .bp-node {
          cursor: pointer;
        }
        .bp-node:focus {
          outline: none;
        }
        .bp-node:focus rect {
          stroke: ${TOKENS.green};
        }
        .bp-svg-hint {
          color: ${TOKENS.textMuted};
          font-family: ${TYPO.mono};
          font-size: 11px;
          margin: 8px 0 0;
          text-align: center;
        }
        .bp-equations {
          display: grid;
          gap: 8px;
          align-content: start;
        }
        .bp-equations h4 {
          font-size: 13px;
          margin: 0;
          color: ${TOKENS.textMuted};
          font-family: ${TYPO.mono};
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .bp-equations p {
          margin: 0 0 4px;
          color: ${TOKENS.textMuted};
          font-size: 13px;
          line-height: 1.5;
        }
        .bp-equations code {
          display: block;
          background: ${TOKENS.surface};
          border: 1px solid ${TOKENS.border};
          border-radius: 6px;
          color: ${TOKENS.text};
          font-family: ${TYPO.mono};
          font-size: 13px;
          line-height: 1.45;
          padding: 8px 10px;
          white-space: normal;
        }
        .bp-nodecard {
          border: 1px solid color-mix(in srgb, ${TOKENS.green} 55%, transparent);
          background: color-mix(in srgb, ${TOKENS.green} 8%, ${TOKENS.surface});
          border-radius: 6px;
          padding: 10px;
          display: grid;
          gap: 6px;
        }
        .bp-nodecard strong {
          font-family: ${TYPO.mono};
          font-size: 12px;
        }
        .bp-nodecard code {
          background: transparent;
          border: none;
          padding: 0;
          font-size: 12.5px;
        }
        .bp-callout {
          border: 1px solid color-mix(in srgb, ${TOKENS.orange} 55%, transparent);
          background: color-mix(in srgb, ${TOKENS.orange} 9%, ${TOKENS.surface});
          border-radius: 6px;
          padding: 8px 10px;
          color: ${TOKENS.text};
          font-size: 12.5px;
          line-height: 1.5;
        }
        @media (max-width: 900px) {
          .bp-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="bp-controls">
        <div className="bp-buttons" role="group" aria-label="Circuit">
          {CIRCUITS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => pickCircuit(c.id)}
              aria-pressed={circuitId === c.id}
              style={buttonStyles({ active: circuitId === c.id })}
            >
              {c.label}
            </button>
          ))}
          <button type="button" onClick={reset} style={buttonStyles({})}>
            reset
          </button>
        </div>
        <label className="bp-stepper">
          <span>
            step {Math.min(step, steps.length - 1) + 1}/{steps.length}: {stepDef.name}
          </span>
          <input
            type="range"
            min="0"
            max={steps.length - 1}
            step="1"
            value={Math.min(step, steps.length - 1)}
            onChange={(event) => setStep(Number(event.target.value))}
          />
        </label>
      </div>

      <div className="bp-params">
        {circuit.params.map((param) => (
          <Slider
            key={param.key}
            label={param.label}
            value={state[param.key]}
            min={param.min}
            max={param.max}
            step={param.step}
            onChange={(value) => setParam(param.key, value)}
            digits={1}
          />
        ))}
        {circuit.toggle ? (
          <div className="bp-toggle" role="group" aria-label={circuit.toggle.label}>
            <span>{circuit.toggle.label}</span>
            {circuit.toggle.options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setParam(circuit.toggle.key, option)}
                aria-pressed={state[circuit.toggle.key] === option}
                style={buttonStyles({ active: state[circuit.toggle.key] === option })}
              >
                {circuit.toggle.key} = {option}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="bp-grid">
        <div className="bp-panel">
          <svg
            viewBox={circuit.viewBox}
            width="100%"
            role="img"
            aria-label="Backpropagation computation graph with forward values and gradients"
          >
            <defs>
              <marker id={fwdMarkerId} markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
                <path d="M0,0 L8,3 L0,6 Z" fill={TOKENS.borderStrong} />
              </marker>
              <marker id={backMarkerId} markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
                <path d="M0,0 L8,3 L0,6 Z" fill={TOKENS.accent} />
              </marker>
            </defs>

            {circuit.fwdEdges.map(([x1, y1, x2, y2, dashed], index) => (
              <line
                key={index}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={TOKENS.borderStrong}
                strokeWidth="1.5"
                strokeDasharray={dashed ? "5 4" : undefined}
                markerEnd={`url(#${fwdMarkerId})`}
              />
            ))}
            {circuit.backEdges.map((edge, index) =>
              step >= edge.step ? (
                <g key={index}>
                  <line
                    x1={edge.line[0]}
                    y1={edge.line[1]}
                    x2={edge.line[2]}
                    y2={edge.line[3]}
                    stroke={TOKENS.accent}
                    strokeWidth="2.5"
                    strokeDasharray={edge.dashed ? "5 4" : undefined}
                    markerEnd={`url(#${backMarkerId})`}
                  />
                  {edge.label ? (
                    <text
                      x={edge.at[0]}
                      y={edge.at[1]}
                      textAnchor="middle"
                      fill={TOKENS.accent}
                      fontFamily={TYPO.mono}
                      fontSize="11.5"
                      fontWeight="700"
                    >
                      {edge.label}
                    </text>
                  ) : null}
                </g>
              ) : null,
            )}

            {nodes.map((node) => (
              <Node
                key={node.id}
                node={node}
                active={stepDef.active.includes(node.id)}
                barShown={step >= node.barStep}
                selected={selected === node.id}
                onSelect={(id) => setSelected((prev) => (prev === id ? null : id))}
              />
            ))}
          </svg>
          <p className="bp-svg-hint">click a node for its equation and local derivative rule</p>
        </div>

        <div className="bp-panel bp-equations">
          {selectedNode ? (
            <div className="bp-nodecard">
              <strong>{selectedNode.label}</strong>
              <code>{selectedNode.eq}</code>
              <code>local rule: {selectedNode.rule}</code>
              <code>
                now: {selectedNode.fwd}
                {step >= selectedNode.barStep ? ` · ${selectedNode.bar}` : ""}
              </code>
            </div>
          ) : null}
          <h4>
            step {Math.min(step, steps.length - 1) + 1}: {stepDef.name}
          </h4>
          <p>{stepDef.note}</p>
          {stepDef.eqs.map((eq) => (
            <code key={eq}>{eq}</code>
          ))}
          {stepDef.callout ? <div className="bp-callout">{stepDef.callout}</div> : null}
        </div>
      </div>
    </section>
  );
}
