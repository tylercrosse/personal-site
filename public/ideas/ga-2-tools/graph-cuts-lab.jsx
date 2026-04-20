import {
  FLOW_PRESETS,
  MST_PRESETS,
  THEME,
  runFordFulkerson,
  runKruskalMst,
  runPrimMst,
} from "./graph-widgets-shared.mjs";

const { useEffect, useMemo, useState } = React;

function trimEdge(from, to, startInset, endInset) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;

  return {
    x1: from.x + ux * startInset,
    y1: from.y + uy * startInset,
    x2: to.x - ux * endInset,
    y2: to.y - uy * endInset,
  };
}

function edgeKey(edge) {
  return edge.from < edge.to ? `${edge.from}-${edge.to}` : `${edge.to}-${edge.from}`;
}

function SectionTitle({ children, accent = THEME.accent }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: accent,
        marginBottom: 10,
      }}
    >
      {children}
    </div>
  );
}

function Pill({ children, bg = THEME.accentSoft, color = THEME.text }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "7px 10px",
        borderRadius: 999,
        background: bg,
        color,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {children}
    </span>
  );
}

function MstCanvas({ graph, snapshot, algorithm }) {
  const accepted = new Set(snapshot.accepted ?? []);
  const rejected = new Set(snapshot.rejected ?? []);
  const inTree = snapshot.inTree ?? [];
  const prev = snapshot.prev ?? [];
  const treeEdges = new Set();
  prev.forEach((parent, vertex) => {
    if (parent == null) return;
    treeEdges.add(edgeKey({ from: parent, to: vertex }));
  });
  const currentEdge = snapshot.currentEdge;
  const markerId = `mst-${algorithm}`;

  return (
    <svg viewBox="0 0 700 360" style={{ width: "100%", height: "auto" }}>
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 12 12"
          refX="10"
          refY="6"
          markerWidth="10"
          markerHeight="10"
          markerUnits="userSpaceOnUse"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 12 6 L 0 12 z" fill="context-stroke" />
        </marker>
      </defs>

      {graph.edges.map((edge, index) => {
        const key = edgeKey(edge);
        const from = graph.positions[edge.from];
        const to = graph.positions[edge.to];
        const line = trimEdge(from, to, 26, 26);
        const isCurrent = currentEdge === key;
        const isAccepted = algorithm === "kruskal" ? accepted.has(key) : treeEdges.has(key);
        const isRejected = rejected.has(key);
        const crossing =
          algorithm === "prim" && inTree.some(Boolean) && inTree[edge.from] !== inTree[edge.to];
        const stroke = isCurrent
          ? THEME.amber
          : isAccepted
            ? THEME.emerald
            : isRejected
              ? THEME.rose
              : crossing
                ? THEME.violet
                : "rgba(142,163,191,0.36)";

        return (
          <g key={index}>
            <line
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke={stroke}
              strokeWidth={isCurrent ? 4 : isAccepted ? 3.5 : 2}
              strokeDasharray={crossing && !isAccepted ? "8 6" : undefined}
              strokeLinecap="round"
            />
            <text
              x={(line.x1 + line.x2) / 2}
              y={(line.y1 + line.y2) / 2 - 8}
              textAnchor="middle"
              fontFamily="'JetBrains Mono', monospace"
              fontSize="12"
              fill={THEME.muted}
            >
              {edge.weight}
            </text>
          </g>
        );
      })}

      {graph.vertices.map((vertex, index) => {
        const pos = graph.positions[index];
        const component = snapshot.componentLabels?.[index] ?? null;
        const fill =
          algorithm === "kruskal"
            ? THEME.componentColors[((component ?? 1) - 1) % THEME.componentColors.length]
            : inTree[index]
              ? THEME.emerald
              : "#102038";
        const current = snapshot.currentVertex === index;
        return (
          <g key={vertex.id}>
            <circle
              cx={pos.x}
              cy={pos.y}
              r="24"
              fill={current ? THEME.amber : fill}
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="1.5"
            />
            <text
              x={pos.x}
              y={pos.y + 5}
              textAnchor="middle"
              fill={current ? "#0f172a" : "#ffffff"}
              fontWeight="700"
              fontSize="14"
            >
              {vertex.label}
            </text>
            {algorithm === "prim" ? (
              <text
                x={pos.x}
                y={pos.y + 40}
                textAnchor="middle"
                fill={THEME.muted}
                fontFamily="'JetBrains Mono', monospace"
                fontSize="11"
              >
                {snapshot.key[index] === Infinity ? "inf" : snapshot.key[index]}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

function FlowCanvas({ graph, snapshot, source, sink }) {
  const pathEdges = new Set(snapshot.augmentPath ?? []);
  const cutEdges = new Set(snapshot.cutEdges ?? []);
  const markerId = "flow-canvas";

  return (
    <svg viewBox="0 0 700 360" style={{ width: "100%", height: "auto" }}>
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 12 12"
          refX="10"
          refY="6"
          markerWidth="10"
          markerHeight="10"
          markerUnits="userSpaceOnUse"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 12 6 L 0 12 z" fill="context-stroke" />
        </marker>
      </defs>

      {graph.edges.map((edge, index) => {
        const from = graph.positions[edge.from];
        const to = graph.positions[edge.to];
        const line = trimEdge(from, to, 26, 26);
        const edgeId = `${edge.from}->${edge.to}`;
        const stroke = pathEdges.has(edgeId)
          ? THEME.amber
          : cutEdges.has(index)
            ? THEME.rose
            : THEME.accent;
        return (
          <g key={index}>
            <line
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke={stroke}
              strokeWidth={pathEdges.has(edgeId) ? 4 : 3}
              markerEnd={`url(#${markerId})`}
              strokeLinecap="round"
            />
            <text
              x={(line.x1 + line.x2) / 2}
              y={(line.y1 + line.y2) / 2 - 8}
              textAnchor="middle"
              fontFamily="'JetBrains Mono', monospace"
              fontSize="12"
              fill={THEME.muted}
            >
              {snapshot.flowValues[index]}/{edge.capacity ?? edge.weight}
            </text>
          </g>
        );
      })}

      {(snapshot.residualEdges ?? [])
        .filter((edge) => edge.kind === "backward")
        .map((edge, index) => {
          const from = graph.positions[edge.from];
          const to = graph.positions[edge.to];
          const line = trimEdge(from, to, 18, 18);
          return (
            <line
              key={`residual-${index}`}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke={THEME.violet}
              strokeWidth="2"
              markerEnd={`url(#${markerId})`}
              strokeDasharray="8 6"
              opacity="0.75"
            />
          );
        })}

      {graph.vertices.map((vertex, index) => {
        const pos = graph.positions[index];
        const reachable = snapshot.reachable?.[index];
        const fill = reachable ? THEME.emerald : "#102038";
        const label = index === source ? "S" : index === sink ? "T" : "";
        return (
          <g key={vertex.id}>
            <circle
              cx={pos.x}
              cy={pos.y}
              r="24"
              fill={fill}
              stroke={label ? "#ffffff" : "rgba(255,255,255,0.12)"}
              strokeWidth={label ? 2.5 : 1.5}
            />
            <text
              x={pos.x}
              y={pos.y + 5}
              textAnchor="middle"
              fill="#ffffff"
              fontWeight="700"
              fontSize="14"
            >
              {vertex.label}
            </text>
            {label ? (
              <text
                x={pos.x}
                y={pos.y - 30}
                textAnchor="middle"
                fill="#ffffff"
                fontFamily="'JetBrains Mono', monospace"
                fontSize="11"
                fontWeight="700"
              >
                {label}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

function CutsLab() {
  const [mode, setMode] = useState("mst");
  const [mstAlgorithm, setMstAlgorithm] = useState("kruskal");
  const [mstPresetKey, setMstPresetKey] = useState(MST_PRESETS[0].key);
  const [flowPresetKey, setFlowPresetKey] = useState(FLOW_PRESETS[0].key);
  const [step, setStep] = useState(0);

  const mstPreset = MST_PRESETS.find((item) => item.key === mstPresetKey) ?? MST_PRESETS[0];
  const flowPreset = FLOW_PRESETS.find((item) => item.key === flowPresetKey) ?? FLOW_PRESETS[0];
  const kruskal = useMemo(() => runKruskalMst(mstPreset.graph), [mstPreset]);
  const prim = useMemo(
    () => runPrimMst(mstPreset.graph, mstPreset.defaultStart),
    [mstPreset],
  );
  const flow = useMemo(
    () => runFordFulkerson(flowPreset.graph, flowPreset.source, flowPreset.sink),
    [flowPreset],
  );

  const activeRun =
    mode === "mst" ? (mstAlgorithm === "kruskal" ? kruskal : prim) : flow;
  const snapshot = activeRun.snapshots[Math.min(step, activeRun.snapshots.length - 1)];

  useEffect(() => {
    setStep(0);
  }, [mode, mstAlgorithm, mstPresetKey, flowPresetKey]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, rgba(52,211,153,0.14), transparent 30%), #07111f",
        color: THEME.text,
        fontFamily: "'IBM Plex Sans', -apple-system, sans-serif",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap"
        rel="stylesheet"
      />
      <style>{`
        .cuts-shell { max-width: 1180px; margin: 0 auto; padding: 28px 20px 56px; }
        .cuts-main { display: grid; grid-template-columns: minmax(0, 1.7fr) minmax(320px, 1fr); gap: 22px; }
        @media (max-width: 980px) {
          .cuts-main { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="cuts-shell">
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              color: THEME.muted,
              letterSpacing: "0.18em",
              fontSize: 11,
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Graphs
          </div>
          <h1 style={{ margin: 0, fontSize: 34, lineHeight: 1.05 }}>Cuts Lab</h1>
          <p style={{ margin: "10px 0 0", color: THEME.muted, maxWidth: 760, lineHeight: 1.6 }}>
            Use partitions and crossing edges to understand why MST choices are safe and why max flow is blocked by a minimum cut.
          </p>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
          {[
            { key: "mst", label: "MST", color: THEME.emerald },
            { key: "flow", label: "Flow", color: THEME.accent },
          ].map((item) => {
            const active = mode === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setMode(item.key)}
                style={{
                  border: `1px solid ${active ? item.color : THEME.border}`,
                  background: active ? `${item.color}22` : "rgba(15,28,44,0.7)",
                  color: active ? THEME.text : THEME.muted,
                  borderRadius: 999,
                  padding: "10px 14px",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                {item.label}
              </button>
            );
          })}

          {mode === "mst"
            ? [
                { key: "kruskal", label: "Kruskal", color: THEME.amber },
                { key: "prim", label: "Prim", color: THEME.violet },
              ].map((item) => {
                const active = mstAlgorithm === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => setMstAlgorithm(item.key)}
                    style={{
                      border: `1px solid ${active ? item.color : THEME.border}`,
                      background: active ? `${item.color}22` : "rgba(15,28,44,0.7)",
                      color: active ? THEME.text : THEME.muted,
                      borderRadius: 999,
                      padding: "10px 14px",
                      cursor: "pointer",
                      fontWeight: 700,
                    }}
                  >
                    {item.label}
                  </button>
                );
              })
            : null}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
          {(mode === "mst" ? MST_PRESETS : FLOW_PRESETS).map((item) => {
            const active = mode === "mst" ? item.key === mstPresetKey : item.key === flowPresetKey;
            return (
              <button
                key={item.key}
                onClick={() => (mode === "mst" ? setMstPresetKey(item.key) : setFlowPresetKey(item.key))}
                style={{
                  border: `1px solid ${active ? THEME.accent : THEME.border}`,
                  background: active ? THEME.accentSoft : "rgba(15,28,44,0.7)",
                  color: active ? THEME.text : THEME.muted,
                  borderRadius: 999,
                  padding: "10px 14px",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                {item.title}
              </button>
            );
          })}
        </div>

        <div className="cuts-main">
          <div
            style={{
              background: "rgba(15,28,44,0.9)",
              border: `1px solid ${THEME.border}`,
              borderRadius: 18,
              overflow: "hidden",
              boxShadow: "0 18px 50px rgba(0,0,0,0.28)",
            }}
          >
            <div
              style={{
                padding: "18px 20px",
                borderBottom: `1px solid ${THEME.border}`,
                background: THEME.panelAlt,
              }}
            >
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                <Pill bg="rgba(255,255,255,0.06)" color={THEME.muted}>
                  {mode === "mst" ? mstPreset.title : flowPreset.title}
                </Pill>
                <Pill bg="rgba(255,255,255,0.06)" color={THEME.muted}>
                  Step {step} / {activeRun.snapshots.length - 1}
                </Pill>
              </div>
              <div style={{ color: THEME.muted, lineHeight: 1.6 }}>
                {mode === "mst" ? mstPreset.prompt : flowPreset.prompt}
              </div>
            </div>

            <div style={{ padding: 20 }}>
              {mode === "mst" ? (
                <MstCanvas graph={mstPreset.graph} snapshot={snapshot} algorithm={mstAlgorithm} />
              ) : (
                <FlowCanvas
                  graph={flowPreset.graph}
                  snapshot={snapshot}
                  source={flowPreset.source}
                  sink={flowPreset.sink}
                />
              )}
            </div>

            <div
              style={{
                padding: "16px 20px 20px",
                borderTop: `1px solid ${THEME.border}`,
                background: "rgba(7,17,31,0.56)",
              }}
            >
              <SectionTitle accent={mode === "mst" ? THEME.emerald : THEME.accent}>
                Step Controls
              </SectionTitle>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
                <button onClick={() => setStep((value) => Math.max(0, value - 1))} style={stepButtonStyle}>
                  Back
                </button>
                <button
                  onClick={() => setStep((value) => Math.min(activeRun.snapshots.length - 1, value + 1))}
                  style={stepButtonStyle}
                >
                  Next
                </button>
                <button onClick={() => setStep(0)} style={stepButtonStyle}>
                  Reset
                </button>
              </div>
              <input
                type="range"
                min="0"
                max={activeRun.snapshots.length - 1}
                value={step}
                onChange={(event) => setStep(Number(event.target.value))}
                style={{ width: "100%", accentColor: THEME.accent }}
              />
              <div
                style={{
                  marginTop: 12,
                  color: THEME.text,
                  lineHeight: 1.6,
                  background: "rgba(15,28,44,0.82)",
                  border: `1px solid ${THEME.border}`,
                  borderRadius: 12,
                  padding: "12px 14px",
                }}
              >
                {snapshot.message}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div
              style={{
                background: "rgba(15,28,44,0.9)",
                border: `1px solid ${THEME.border}`,
                borderRadius: 16,
                padding: 18,
              }}
            >
              <SectionTitle accent={mode === "mst" ? THEME.amber : THEME.rose}>
                Current Invariant
              </SectionTitle>
              <div style={{ color: THEME.muted, lineHeight: 1.65 }}>
                {mode === "mst"
                  ? mstAlgorithm === "kruskal"
                    ? "Kruskal only accepts an edge when it crosses between two different components. Rejected edges are exactly the ones that would form a cycle."
                    : "Prim grows one tree. At each step, the next edge is the cheapest edge crossing from the current tree to an outside vertex."
                  : "Ford-Fulkerson keeps a feasible flow and searches the residual graph for another augmenting path. When none exists, the reachable residual side defines a minimum cut."}
              </div>
            </div>

            <div
              style={{
                background: "rgba(15,28,44,0.9)",
                border: `1px solid ${THEME.border}`,
                borderRadius: 16,
                padding: 18,
              }}
            >
              <SectionTitle accent={mode === "mst" ? THEME.emerald : THEME.accent}>
                Summary
              </SectionTitle>
              <div style={{ display: "grid", gap: 10, color: THEME.muted, lineHeight: 1.6 }}>
                {mode === "mst" ? (
                  <>
                    <div>
                      Current tree weight:
                      {" "}
                      <span style={{ color: THEME.text }}>{snapshot.totalWeight}</span>
                    </div>
                    <div>
                      Final MST weight:
                      {" "}
                      <span style={{ color: THEME.text }}>{activeRun.totalWeight}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      Current flow value:
                      {" "}
                      <span style={{ color: THEME.text }}>{snapshot.maxFlow}</span>
                    </div>
                    <div>
                      Final max flow:
                      {" "}
                      <span style={{ color: THEME.text }}>{flow.maxFlow}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div
              style={{
                background: "rgba(15,28,44,0.9)",
                border: `1px solid ${THEME.border}`,
                borderRadius: 16,
                padding: 18,
              }}
            >
              <SectionTitle accent={THEME.violet}>
                {mode === "mst" ? "Crossing / Partition View" : "Residual / Cut View"}
              </SectionTitle>
              <div style={{ color: THEME.muted, lineHeight: 1.65 }}>
                {mode === "mst" ? (
                  mstAlgorithm === "kruskal" ? (
                    <>Vertices with the same color are currently in the same component. Safe edges cross between colors; rejected edges stay inside one color.</>
                  ) : (
                    <>Green vertices are already in the tree. Dashed violet edges are the current crossing edges from the tree to the outside.</>
                  )
                ) : snapshot.reachable ? (
                  <>
                    The green vertices are still reachable from S in the final residual graph. Any original edge leaving that set belongs to the displayed minimum cut.
                  </>
                ) : (
                  <>
                    Dashed violet arrows are backward residual edges. They represent flow you can undo if an earlier augmenting path made a bad local choice.
                  </>
                )}
              </div>
            </div>

            {mode === "flow" ? (
              <div
                style={{
                  background: "rgba(15,28,44,0.9)",
                  border: `1px solid ${THEME.border}`,
                  borderRadius: 16,
                  padding: 18,
                }}
              >
                <SectionTitle accent={THEME.rose}>Augmenting Path</SectionTitle>
                <div style={{ color: THEME.muted, lineHeight: 1.65 }}>
                  {snapshot.augmentPath.length ? (
                    <>
                      Current residual path:
                      {" "}
                      <span style={{ color: THEME.text, fontFamily: "'JetBrains Mono', monospace" }}>
                        {[
                          flowPreset.graph.vertices[flowPreset.source].label,
                          ...snapshot.augmentPath.map((item) => {
                            const [, to] = item.split("->");
                            return flowPreset.graph.vertices[Number(to)].label;
                          }),
                        ].join(" -> ")}
                      </span>
                      <br />
                      Bottleneck:
                      {" "}
                      <span style={{ color: THEME.text }}>{snapshot.bottleneck}</span>
                    </>
                  ) : (
                    <>No augmenting path is active in this snapshot.</>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

const stepButtonStyle = {
  border: `1px solid ${THEME.border}`,
  background: "rgba(15,28,44,0.9)",
  color: THEME.text,
  borderRadius: 10,
  padding: "9px 12px",
  cursor: "pointer",
  fontWeight: 600,
};

const container = document.getElementById("root");
const root = ReactDOM.createRoot(container);
root.render(<CutsLab />);
