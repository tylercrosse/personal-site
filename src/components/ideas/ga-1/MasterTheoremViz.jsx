import { useState, useMemo } from "react";
import { TOKENS, TYPO, SIZES, buttonStyles } from "./vizTheme";

const CASES = {
  1: {
    label: "Case 1",
    color: "#ff6b4a",
    desc: "Work increases geometrically — leaves dominate",
  },
  2: {
    label: "Case 2",
    color: "#f5c842",
    desc: "Work is ~equal at each level — all levels contribute",
  },
  3: {
    label: "Case 3",
    color: "#4ae0ff",
    desc: "Work decreases geometrically — root dominates",
  },
};

function determineCase(a, b, d) {
  const logba = Math.log(a) / Math.log(b);
  if (Math.abs(logba - d) < 0.001) return 2;
  if (logba > d) return 1;
  return 3;
}

function getComplexity(a, b, d) {
  const c = determineCase(a, b, d);
  const logba = Math.log(a) / Math.log(b);
  if (c === 1) {
    const exp = logba;
    if (Math.abs(exp - Math.round(exp)) < 0.01) {
      const r = Math.round(exp);
      if (r === 1) return "O(n)";
      return `O(n^${r})`;
    }
    return `O(n^{log_${b}(${a})}) ≈ O(n^{${logba.toFixed(2)}})`;
  }
  if (c === 2) {
    if (d === 0) return "O(log n)";
    if (d === 1) return "O(n log n)";
    return `O(n^${d} log n)`;
  }
  if (d === 0) return "O(1)";
  if (d === 1) return "O(n)";
  return `O(n^${d})`;
}

function TreeVisualization({ a, b, d, maxDepth }) {
  const caseNum = determineCase(a, b, d);
  const caseColor = CASES[caseNum].color;

  const treeData = useMemo(() => {
    const levels = [];
    const displayDepth = Math.min(maxDepth, 5);
    const cappedA = Math.min(a, 6);

    for (let level = 0; level <= displayDepth; level++) {
      const numNodes = Math.pow(cappedA, level);
      const subproblemSize = Math.pow(b, level);
      const workPerNode = Math.pow(1 / subproblemSize, d);
      const totalWork = numNodes * workPerNode;
      levels.push({ level, numNodes, subproblemSize, workPerNode, totalWork });
    }
    return levels;
  }, [a, b, d, maxDepth]);

  const svgWidth = 700;
  const svgHeight = 360;
  const levelHeight = svgHeight / (treeData.length + 0.5);
  const cappedA = Math.min(a, 6);

  const maxTotalWork = Math.max(...treeData.map((l) => l.totalWork));

  function renderLevel(levelData, index) {
    const y = levelHeight * (index + 0.5);
    const numNodes = Math.min(levelData.numNodes, 64);
    const displayNodes = Math.min(numNodes, 32);
    const spacing = svgWidth / (displayNodes + 1);
    const maxRadius = 16;
    const minRadius = 3;
    const radius = Math.max(minRadius, Math.min(maxRadius, spacing * 0.35));

    const workRatio = maxTotalWork > 0 ? levelData.totalWork / maxTotalWork : 0;
    const opacity = 0.25 + workRatio * 0.75;

    const nodes = [];
    for (let i = 0; i < displayNodes; i++) {
      const x = spacing * (i + 1);
      nodes.push(
        <circle
          key={`node-${index}-${i}`}
          cx={x}
          cy={y}
          r={radius}
          fill={caseColor}
          opacity={opacity}
          stroke={TOKENS.borderStrong}
          strokeWidth={0.5}
        />,
      );
    }

    if (numNodes > displayNodes) {
      const x = svgWidth / 2;
      nodes.push(
        <text
          key={`ellipsis-${index}`}
          x={x}
          y={y + 4}
          textAnchor="middle"
          fill={TOKENS.textMuted}
          fontSize="12"
          fontFamily={TYPO.mono}
        >
          ⋯ ({levelData.numNodes} nodes)
        </text>,
      );
    }

    // Draw edges to children for non-leaf levels
    if (index < treeData.length - 1) {
      const nextDisplayNodes = Math.min(Math.pow(cappedA, index + 1), 32);
      const nextSpacing = svgWidth / (nextDisplayNodes + 1);
      const nextY = levelHeight * (index + 1.5);
      const edges = [];

      const maxEdges = Math.min(displayNodes * cappedA, 48);
      let edgeCount = 0;

      for (let i = 0; i < displayNodes && edgeCount < maxEdges; i++) {
        const px = spacing * (i + 1);
        for (let c = 0; c < cappedA && edgeCount < maxEdges; c++) {
          const childIdx = i * cappedA + c;
          if (childIdx < nextDisplayNodes) {
            const cx = nextSpacing * (childIdx + 1);
            edges.push(
              <line
                key={`edge-${index}-${i}-${c}`}
                x1={px}
                y1={y + radius}
                x2={cx}
                y2={nextY - radius}
                stroke={TOKENS.border}
                strokeWidth={0.8}
              />,
            );
            edgeCount++;
          }
        }
      }
      return [...edges, ...nodes];
    }

    return nodes;
  }

  return (
    <div style={{ position: "relative" }}>
      <svg
        width="100%"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        style={{ overflow: "visible" }}
      >
        {treeData.map((level, i) => renderLevel(level, i))}
      </svg>
      {/* Work per level bar overlay */}
      <div
        style={{
          position: "absolute",
          right: -108,
          top: 0,
          bottom: 0,
          width: 100,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-around",
          padding: "8px 0",
        }}
      >
        {treeData.map((level, i) => {
          const workRatio =
            maxTotalWork > 0 ? level.totalWork / maxTotalWork : 0;
          return (
            <div
              key={i}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <div
                style={{
                  width: Math.max(2, workRatio * 60),
                  height: 8,
                  background: caseColor,
                  borderRadius: 4,
                  opacity: 0.25 + workRatio * 0.75,
                  transition: "all 0.4s ease",
                }}
              />
              <span
                style={{
                  fontSize: 9,
                  color: TOKENS.textDim,
                  fontFamily: TYPO.mono,
                }}
              >
                {level.numNodes > 1 ? `${level.numNodes}×` : "1×"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Slider({ label, value, min, max, step, onChange, note }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 6,
        }}
      >
        <label
          style={{
            fontFamily: TYPO.mono,
            fontSize: 13,
            color: TOKENS.text,
            letterSpacing: 1,
          }}
        >
          {label}
        </label>
        <span
          style={{
            fontFamily: TYPO.mono,
            fontSize: 22,
            fontWeight: 700,
            color: TOKENS.text,
          }}
        >
          {value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: TOKENS.accent, cursor: "pointer" }}
      />
      {note && (
        <div
          style={{
            fontSize: 10,
            color: TOKENS.textFaint,
            marginTop: 3,
            fontFamily: TYPO.mono,
          }}
        >
          {note}
        </div>
      )}
    </div>
  );
}

export default function MasterTheoremViz() {
  const [a, setA] = useState(2);
  const [b, setB] = useState(2);
  const [d, setD] = useState(1);

  const caseNum = determineCase(a, b, d);
  const logba = Math.log(a) / Math.log(b);
  const complexity = getComplexity(a, b, d);
  const caseInfo = CASES[caseNum];
  const maxDepth = Math.min(Math.ceil(Math.log(64) / Math.log(b)), 6);

  const presets = [
    { name: "Merge Sort", a: 2, b: 2, d: 1 },
    { name: "Binary Search", a: 1, b: 2, d: 0 },
    { name: "Karatsuba", a: 3, b: 2, d: 1 },
    { name: "Strassen", a: 7, b: 2, d: 2 },
    { name: "Median of Medians", a: 1, b: 5, d: 1 },
  ];

  return (
    <div
      style={{
        color: TOKENS.text,
        fontFamily: TYPO.body,
        padding: "24px 16px",
      }}
    >
      <div style={{ maxWidth: SIZES.maxWidth, margin: "0 auto" }}>
        {/* Header */}
        {/* <div style={{ marginBottom: 36 }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: 4,
              color: TOKENS.textDim,
              textTransform: "uppercase",
              fontFamily: TYPO.mono,
              marginBottom: 8,
            }}
          >
            Divide & Conquer
          </div>
          <h1
            style={{
              fontSize: 30,
              fontWeight: 700,
              margin: 0,
              letterSpacing: -1,
              lineHeight: 1.1,
            }}
          >
            Master Theorem
          </h1>
          <p
            style={{
              fontSize: 14,
              color: TOKENS.textMuted,
              marginTop: 8,
              maxWidth: 600,
              lineHeight: 1.6,
            }}
          >
            For recurrences of the form{" "}
            <span
              style={{
                fontFamily: TYPO.mono,
                color: TOKENS.text,
              }}
            >
              T(n) = a·T(n/b) + O(n^d)
            </span>
            , the runtime depends on how work distributes across the recursion
            tree.
          </p>
        </div> */}

        {/* Presets */}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 28,
            flexWrap: "wrap",
          }}
        >
          {presets.map((p) => {
            const active = p.a === a && p.b === b && p.d === d;
            return (
              <button
                key={p.name}
                onClick={() => {
                  setA(p.a);
                  setB(p.b);
                  setD(p.d);
                }}
                aria-pressed={active}
                style={buttonStyles({ active })}
              >
                {p.name}
              </button>
            );
          })}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "300px 1fr",
            gap: 32,
            alignItems: "start",
          }}
        >
          {/* Controls */}
          <div
            style={{
              background: TOKENS.surfaceSoft,
              border: `1px solid ${TOKENS.border}`,
              borderRadius: 12,
              padding: 24,
            }}
          >
            <Slider
              label="a"
              value={a}
              min={1}
              max={8}
              step={1}
              onChange={setA}
              note="# of subproblems"
            />
            <Slider
              label="b"
              value={b}
              min={2}
              max={8}
              step={1}
              onChange={setB}
              note="factor each subproblem shrinks by"
            />
            <Slider
              label="d"
              value={d}
              min={0}
              max={4}
              step={1}
              onChange={setD}
              note="exponent of work done at merge step"
            />

            {/* Key comparison */}
            <div
              style={{
                marginTop: 20,
                padding: 16,
                background: TOKENS.surface,
                borderRadius: 8,
                border: `1px solid ${TOKENS.border}`,
              }}
            >
              <div
                style={{
                  fontFamily: TYPO.mono,
                  fontSize: 12,
                  color: TOKENS.textMuted,
                  marginBottom: 10,
                }}
              >
                Key comparison
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontSize: 10,
                      color: TOKENS.textDim,
                      marginBottom: 2,
                    }}
                  >
                    log_b(a)
                  </div>
                  <div
                    style={{
                      fontFamily: TYPO.mono,
                      fontSize: 22,
                      fontWeight: 700,
                      color: caseInfo.color,
                    }}
                  >
                    {logba.toFixed(2)}
                  </div>
                </div>
                <div style={{ fontSize: 20, color: TOKENS.textDim }}>
                  {caseNum === 1 ? ">" : caseNum === 2 ? "=" : "<"}
                </div>
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontSize: 10,
                      color: TOKENS.textDim,
                      marginBottom: 2,
                    }}
                  >
                    d
                  </div>
                  <div
                    style={{
                      fontFamily: TYPO.mono,
                      fontSize: 22,
                      fontWeight: 700,
                      color: caseInfo.color,
                    }}
                  >
                    {d.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right side */}
          <div>
            {/* Case result banner */}
            <div
              style={{
                background: `linear-gradient(135deg, ${caseInfo.color}12, ${caseInfo.color}06)`,
                border: `1px solid ${caseInfo.color}30`,
                borderRadius: 12,
                padding: "20px 24px",
                marginBottom: 24,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
                transition: "all 0.4s ease",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 11,
                    letterSpacing: 3,
                    textTransform: "uppercase",
                    color: caseInfo.color,
                    fontFamily: TYPO.mono,
                    marginBottom: 4,
                    fontWeight: 600,
                  }}
                >
                  {caseInfo.label}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: TOKENS.textMuted,
                    lineHeight: 1.5,
                  }}
                >
                  {caseInfo.desc}
                </div>
              </div>
              <div
                style={{
                  fontFamily: TYPO.mono,
                  fontSize: 26,
                  fontWeight: 700,
                  color: TOKENS.text,
                  letterSpacing: -0.5,
                }}
              >
                {complexity}
              </div>
            </div>

            {/* Tree */}
            <div
              style={{
                background: TOKENS.surfaceSoft,
                border: `1px solid ${TOKENS.border}`,
                borderRadius: 12,
                padding: "20px 24px 20px 24px",
                position: "relative",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    letterSpacing: 3,
                    textTransform: "uppercase",
                    color: TOKENS.textDim,
                    fontFamily: TYPO.mono,
                  }}
                >
                  Recursion tree
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: TOKENS.textFaint,
                    fontFamily: TYPO.mono,
                  }}
                >
                  depth ≈ log_{b}(n) = log_{b === 2 ? "₂" : b}(n) → {maxDepth}{" "}
                  levels shown
                </div>
              </div>
              <div style={{ paddingRight: 100 }}>
                <TreeVisualization a={a} b={b} d={d} maxDepth={maxDepth} />
              </div>
              <div
                style={{
                  position: "absolute",
                  right: 24,
                  top: 20,
                  fontSize: 9,
                  color: TOKENS.textFaint,
                  fontFamily: TYPO.mono,
                }}
              >
                work/level →
              </div>
            </div>

            {/* Level breakdown table */}
            <div
              style={{
                marginTop: 20,
                background: TOKENS.surfaceSoft,
                border: `1px solid ${TOKENS.border}`,
                borderRadius: 12,
                padding: "16px 20px",
                overflowX: "auto",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: 3,
                  textTransform: "uppercase",
                  color: TOKENS.textDim,
                  fontFamily: TYPO.mono,
                  marginBottom: 12,
                }}
              >
                Per-level breakdown
              </div>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontFamily: TYPO.mono,
                  fontSize: 12,
                }}
              >
                <thead>
                  <tr style={{ color: TOKENS.textDim }}>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "4px 12px 8px 0",
                        fontWeight: 500,
                        borderBottom: `1px solid ${TOKENS.border}`,
                      }}
                    >
                      Level
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "4px 12px 8px",
                        fontWeight: 500,
                        borderBottom: `1px solid ${TOKENS.border}`,
                      }}
                    >
                      # Nodes
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "4px 12px 8px",
                        fontWeight: 500,
                        borderBottom: `1px solid ${TOKENS.border}`,
                      }}
                    >
                      Subproblem size
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "4px 12px 8px",
                        fontWeight: 500,
                        borderBottom: `1px solid ${TOKENS.border}`,
                      }}
                    >
                      Work/node
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "4px 0 8px 12px",
                        fontWeight: 500,
                        borderBottom: `1px solid ${TOKENS.border}`,
                      }}
                    >
                      Total work
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: Math.min(maxDepth + 1, 7) }, (_, i) => {
                    const nodes = Math.pow(a, i);
                    const size = `n/${Math.pow(b, i) === 1 ? "1" : Math.pow(b, i)}`;
                    const workNode = `(n/${Math.pow(b, i)})^${d}`;
                    const totalRatio = Math.pow(a / Math.pow(b, d), i);
                    const maxRatio = Math.max(
                      ...Array.from(
                        { length: Math.min(maxDepth + 1, 7) },
                        (_, j) => Math.pow(a / Math.pow(b, d), j),
                      ),
                    );
                    const barWidth =
                      maxRatio > 0 ? (totalRatio / maxRatio) * 100 : 0;

                    return (
                      <tr key={i} style={{ color: TOKENS.textMuted }}>
                        <td style={{ padding: "6px 12px 6px 0" }}>{i}</td>
                        <td style={{ textAlign: "right", padding: "6px 12px" }}>
                          {nodes > 1000 ? nodes.toExponential(0) : nodes}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            padding: "6px 12px",
                            color: TOKENS.textDim,
                          }}
                        >
                          {i === 0 ? "n" : size}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            padding: "6px 12px",
                            color: TOKENS.textDim,
                          }}
                        >
                          {i === 0 ? `n^${d}` : workNode}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            padding: "6px 0 6px 12px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "flex-end",
                              gap: 8,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 11,
                                color: TOKENS.textDim,
                              }}
                            >
                              {totalRatio === 1
                                ? "n^" + d
                                : `${totalRatio > 100 ? totalRatio.toExponential(1) : totalRatio.toFixed(2)}·n^${d}`}
                            </span>
                            <div
                              style={{
                                width: Math.max(2, barWidth * 0.6),
                                height: 6,
                                background: caseInfo.color,
                                borderRadius: 3,
                                opacity: 0.6,
                                transition: "all 0.3s ease",
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Intuition box */}
            <div
              style={{
                marginTop: 20,
                padding: "16px 20px",
                background: `${caseInfo.color}08`,
                border: `1px solid ${caseInfo.color}15`,
                borderRadius: 10,
                fontSize: 13,
                color: TOKENS.textMuted,
                lineHeight: 1.7,
                transition: "all 0.4s ease",
              }}
            >
              <strong style={{ color: caseInfo.color }}>Intuition: </strong>
              {caseNum === 1 && (
                <>
                  With a={a} subproblems and b={b} shrink factor, the number of
                  subproblems grows faster (a/b^d ={" "}
                  {(a / Math.pow(b, d)).toFixed(2)} {">"} 1) than the per-node
                  work decreases. Each level does <em>more</em> total work, so
                  the leaves (level {maxDepth}) dominate the sum. The runtime is
                  determined by the number of leaves: n^(log_{b} {a}) ≈ n^
                  {logba.toFixed(2)}.
                </>
              )}
              {caseNum === 2 && (
                <>
                  With a={a} subproblems and b={b} shrink factor, the branching
                  exactly compensates for shrinking (a/b^d ={" "}
                  {(a / Math.pow(b, d)).toFixed(2)}). Every level contributes
                  roughly the same amount of work — O(n^{d}). With O(log n)
                  levels, the total is O(n^{d} · log n).
                </>
              )}
              {caseNum === 3 && (
                <>
                  With a={a} subproblems and b={b} shrink factor, the per-node
                  work shrinks faster than the tree branches (a/b^d ={" "}
                  {(a / Math.pow(b, d)).toFixed(2)} {"<"} 1). Each deeper level
                  does <em>less</em> total work, so the root dominates. Runtime
                  is just the cost of the root level: O(n^{d}).
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
