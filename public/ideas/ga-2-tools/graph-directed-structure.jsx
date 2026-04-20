import {
  STRUCTURE_PRESETS,
  THEME,
  TWO_SAT_PRESETS,
  analyzeDirectedStructure,
  analyzeTwoSatFormula,
} from "./graph-widgets-shared.mjs";

const { useMemo, useState } = React;

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

function edgeStrokeForMode(mode, edgeId, analysis, selectedClause, edge) {
  if (mode === "topo") {
    const type = analysis.edgeTypes[edgeId];
    if (edgeId === analysis.firstBackEdge) return { color: THEME.rose, width: 4 };
    if (
      analysis.violatingEdge &&
      edge.from === analysis.violatingEdge.from &&
      edge.to === analysis.violatingEdge.to
    ) {
      return { color: THEME.rose, width: 4 };
    }
    if (type === "tree") return { color: THEME.accent, width: 3 };
    if (type === "back") return { color: THEME.rose, width: 3 };
    if (type === "forward") return { color: THEME.amber, width: 2 };
    if (type === "cross") return { color: THEME.violet, width: 2 };
    return { color: "rgba(142,163,191,0.36)", width: 1.5 };
  }

  if (mode === "scc") {
    const fromComponent = analysis.scc.ccnum[edge.from];
    const toComponent = analysis.scc.ccnum[edge.to];
    if (fromComponent === toComponent) {
      return {
        color:
          THEME.componentColors[(fromComponent - 1) % THEME.componentColors.length],
        width: 3,
      };
    }
    return { color: THEME.muted, width: 2 };
  }

  if (selectedClause != null && edge.clauseIndex === selectedClause) {
    return { color: THEME.amber, width: 4 };
  }

  return { color: "rgba(142,163,191,0.42)", width: 1.8 };
}

function GraphCanvas({
  graph,
  mode,
  analysis,
  selectedClause,
  contradictions = [],
}) {
  const markerId = `structure-${mode}`;
  const contradictionSet = new Set(contradictions);
  const vertexRadius = 24;
  const orderRank = analysis.order
    ? analysis.order.reduce((acc, vertex, index) => ({ ...acc, [vertex]: index + 1 }), {})
    : {};

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
        const line = trimEdge(from, to, vertexRadius + 3, vertexRadius + 2);
        const edgeId = `${edge.from}->${edge.to}`;
        const tone = edgeStrokeForMode(mode, edgeId, analysis, selectedClause, edge);
        return (
          <g key={`edge-${index}`}>
            <line
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke={tone.color}
              strokeWidth={tone.width}
              markerEnd={`url(#${markerId})`}
              strokeLinecap="round"
            />
          </g>
        );
      })}

      {graph.vertices.map((vertex, index) => {
        const pos = graph.positions[index];
        const component =
          mode === "2sat" ? analysis.scc.ccnum[index] : analysis.scc.ccnum[index];
        const isContradiction =
          mode === "2sat" && contradictionSet.has(vertex.label.replace("¬", ""));
        const fill =
          mode === "topo"
            ? "#102038"
            : THEME.componentColors[(component - 1) % THEME.componentColors.length];
        return (
          <g key={vertex.id}>
            <circle
              cx={pos.x}
              cy={pos.y}
              r={vertexRadius}
              fill={fill}
              stroke={isContradiction ? THEME.rose : "rgba(255,255,255,0.12)"}
              strokeWidth={isContradiction ? 3 : 1}
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
            {mode === "topo" ? (
              <text
                x={pos.x}
                y={pos.y + 40}
                textAnchor="middle"
                fill={THEME.muted}
                fontFamily="'JetBrains Mono', monospace"
                fontSize="11"
              >
                post={analysis.post[index]}
              </text>
            ) : null}
            {mode === "topo" ? (
              <text
                x={pos.x}
                y={pos.y - 32}
                textAnchor="middle"
                fill={THEME.accent}
                fontFamily="'JetBrains Mono', monospace"
                fontSize="11"
                fontWeight="700"
              >
                #{orderRank[index]}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

function MetaGraphCanvas({ graph, sourceComponents, sinkComponents }) {
  const markerId = "meta-graph";
  const sources = new Set(sourceComponents);
  const sinks = new Set(sinkComponents);
  return (
    <svg viewBox="0 0 700 220" style={{ width: "100%", height: "auto" }}>
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
        const line = trimEdge(from, to, 28, 28);
        return (
          <line
            key={index}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke={THEME.accent}
            strokeWidth="2.5"
            markerEnd={`url(#${markerId})`}
            strokeLinecap="round"
          />
        );
      })}

      {graph.vertices.map((vertex) => {
        const pos = graph.positions[vertex.id];
        const source = sources.has(vertex.id + 1);
        const sink = sinks.has(vertex.id + 1);
        return (
          <g key={vertex.id}>
            <circle
              cx={pos.x}
              cy={pos.y}
              r="28"
              fill={THEME.panelAlt}
              stroke={source ? THEME.emerald : sink ? THEME.rose : THEME.border}
              strokeWidth={3}
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
          </g>
        );
      })}
    </svg>
  );
}

function VertexTable({ graph, analysis }) {
  return (
    <div
      style={{
        overflowX: "auto",
        border: `1px solid ${THEME.border}`,
        borderRadius: 14,
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 480 }}>
        <thead>
          <tr style={{ background: "rgba(7,17,31,0.72)" }}>
            {["Vertex", "pre[]", "post[]", "ccnum[]"].map((label) => (
              <th key={label} style={thStyle}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {graph.vertices.map((vertex, index) => (
            <tr key={vertex.id}>
              <td style={tdStyle}>{vertex.label}</td>
              <td style={tdStyle}>{analysis.pre[index]}</td>
              <td style={tdStyle}>{analysis.post[index]}</td>
              <td style={tdStyle}>{analysis.ccnum[index]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function clauseText(clause) {
  return `(${clause[0].replace("!", "¬")} ∨ ${clause[1].replace("!", "¬")})`;
}

function DirectedStructureLab() {
  const [mode, setMode] = useState("topo");
  const [graphPresetKey, setGraphPresetKey] = useState(STRUCTURE_PRESETS[0].key);
  const [formulaPresetKey, setFormulaPresetKey] = useState(TWO_SAT_PRESETS[0].key);
  const [selectedClause, setSelectedClause] = useState(0);

  const graphPreset =
    STRUCTURE_PRESETS.find((item) => item.key === graphPresetKey) ?? STRUCTURE_PRESETS[0];
  const formulaPreset =
    TWO_SAT_PRESETS.find((item) => item.key === formulaPresetKey) ?? TWO_SAT_PRESETS[0];
  const structure = useMemo(
    () => analyzeDirectedStructure(graphPreset.graph),
    [graphPreset],
  );
  const sat = useMemo(() => analyzeTwoSatFormula(formulaPreset), [formulaPreset]);

  const activeGraph = mode === "2sat" ? sat.graph : graphPreset.graph;
  const activeAnalysis =
    mode === "2sat"
      ? {
          ...sat,
          order: sat.scc.topoOrder.map((index) => sat.scc.metaGraph.vertices[index]?.id ?? index),
        }
      : structure;

  const headerText =
    mode === "topo"
      ? "Interpret reverse postorder as a candidate topological order, then watch one back edge destroy it."
      : mode === "scc"
        ? "Collapse a directed graph into SCCs and see why the condensed metagraph is always a DAG."
        : "Turn clauses into implications, color SCCs, and detect satisfiability by looking for literal contradictions.";

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, rgba(56,189,248,0.16), transparent 30%), #07111f",
        color: THEME.text,
        fontFamily: "'IBM Plex Sans', -apple-system, sans-serif",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap"
        rel="stylesheet"
      />
      <style>{`
        .structure-shell { max-width: 1180px; margin: 0 auto; padding: 28px 20px 56px; }
        .structure-main { display: grid; grid-template-columns: minmax(0, 1.7fr) minmax(320px, 1fr); gap: 22px; }
        .structure-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
        @media (max-width: 980px) {
          .structure-main { grid-template-columns: 1fr; }
          .structure-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="structure-shell">
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
          <h1 style={{ margin: 0, fontSize: 34, lineHeight: 1.05 }}>Directed Structure Lab</h1>
          <p style={{ margin: "10px 0 0", color: THEME.muted, maxWidth: 760, lineHeight: 1.6 }}>
            {headerText}
          </p>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
          {[
            { key: "topo", label: "Topo", color: THEME.accent },
            { key: "scc", label: "SCC", color: THEME.emerald },
            { key: "2sat", label: "2-SAT", color: THEME.violet },
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
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
          {(mode === "2sat" ? TWO_SAT_PRESETS : STRUCTURE_PRESETS).map((item) => {
            const active =
              mode === "2sat" ? item.key === formulaPresetKey : item.key === graphPresetKey;
            return (
              <button
                key={item.key}
                onClick={() => {
                  if (mode === "2sat") {
                    setFormulaPresetKey(item.key);
                    setSelectedClause(0);
                  } else {
                    setGraphPresetKey(item.key);
                  }
                }}
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

        <div className="structure-main">
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
                  {mode === "2sat" ? formulaPreset.title : graphPreset.title}
                </Pill>
                {mode !== "2sat" ? (
                  <Pill
                    bg={structure.isDag ? "rgba(52,211,153,0.14)" : "rgba(251,113,133,0.14)"}
                    color={THEME.text}
                  >
                    {structure.isDag ? "DAG" : "Not a DAG"}
                  </Pill>
                ) : (
                  <Pill
                    bg={sat.satisfiable ? "rgba(52,211,153,0.14)" : "rgba(251,113,133,0.14)"}
                    color={THEME.text}
                  >
                    {sat.satisfiable ? "Satisfiable" : "Unsatisfiable"}
                  </Pill>
                )}
              </div>
              <div style={{ color: THEME.muted, lineHeight: 1.6 }}>
                {mode === "2sat" ? formulaPreset.prompt : graphPreset.prompt}
              </div>
            </div>

            <div style={{ padding: 20 }}>
              <GraphCanvas
                graph={activeGraph}
                mode={mode}
                analysis={activeAnalysis}
                selectedClause={selectedClause}
                contradictions={sat.contradictions}
              />
            </div>

            {mode === "scc" ? (
              <div
                style={{
                  padding: "18px 20px 22px",
                  borderTop: `1px solid ${THEME.border}`,
                  background: "rgba(7,17,31,0.56)",
                }}
              >
                <SectionTitle accent={THEME.emerald}>Condensed Metagraph G_SCC</SectionTitle>
                <MetaGraphCanvas
                  graph={structure.scc.metaGraph}
                  sourceComponents={structure.scc.sourceComponents}
                  sinkComponents={structure.scc.sinkComponents}
                />
              </div>
            ) : null}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {mode !== "2sat" ? (
              <>
                <div
                  style={{
                    background: "rgba(15,28,44,0.9)",
                    border: `1px solid ${THEME.border}`,
                    borderRadius: 16,
                    padding: 18,
                  }}
                >
                  <SectionTitle accent={mode === "topo" ? THEME.accent : THEME.emerald}>
                    Key Output Arrays
                  </SectionTitle>
                  <VertexTable graph={graphPreset.graph} analysis={structure} />
                </div>

                <div
                  style={{
                    background: "rgba(15,28,44,0.9)",
                    border: `1px solid ${THEME.border}`,
                    borderRadius: 16,
                    padding: 18,
                  }}
                >
                  <SectionTitle accent={mode === "topo" ? THEME.amber : THEME.violet}>
                    {mode === "topo" ? "Topological Consequence" : "SCC Membership"}
                  </SectionTitle>
                  {mode === "topo" ? (
                    <div style={{ color: THEME.muted, lineHeight: 1.65, fontSize: 14 }}>
                      Candidate order:
                      <div
                        style={{
                          marginTop: 10,
                          fontFamily: "'JetBrains Mono', monospace",
                          color: THEME.text,
                        }}
                      >
                        {structure.order
                          .map((vertex) => graphPreset.graph.vertices[vertex].label)
                          .join(" -> ")}
                      </div>
                      <div style={{ marginTop: 12 }}>
                        {structure.isDag ? (
                          <>Every edge respects this order, so reverse postorder is a valid topological order.</>
                        ) : (
                          <>
                            The highlighted edge
                            {" "}
                            <code>
                              {structure.firstBackEdge
                                ?.split("->")
                                .map((value) => graphPreset.graph.vertices[Number(value)].label)
                                .join(" -> ")}
                            </code>
                            {" "}
                            is a cycle witness, so no topological order exists.
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "grid", gap: 10 }}>
                      {structure.scc.components.map((members, index) => (
                        <div
                          key={index}
                          style={{
                            border: `1px solid ${THEME.border}`,
                            borderRadius: 12,
                            padding: "10px 12px",
                            background: "rgba(7,17,31,0.62)",
                            color: THEME.muted,
                          }}
                        >
                          <strong style={{ color: THEME.text }}>C{index + 1}</strong>
                          :{" "}
                          {members
                            .map((vertex) => graphPreset.graph.vertices[vertex].label)
                            .join(", ")}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {mode === "scc" ? (
                  <div
                    style={{
                      background: "rgba(15,28,44,0.9)",
                      border: `1px solid ${THEME.border}`,
                      borderRadius: 16,
                      padding: 18,
                    }}
                  >
                    <SectionTitle accent={THEME.rose}>Metagraph Facts</SectionTitle>
                    <div style={{ display: "grid", gap: 10, color: THEME.muted, lineHeight: 1.6 }}>
                      <div>
                        Source SCCs:
                        {" "}
                        <span style={{ color: THEME.text }}>
                          {structure.scc.sourceComponents.map((value) => `C${value}`).join(", ")}
                        </span>
                      </div>
                      <div>
                        Sink SCCs:
                        {" "}
                        <span style={{ color: THEME.text }}>
                          {structure.scc.sinkComponents.map((value) => `C${value}`).join(", ")}
                        </span>
                      </div>
                      <div>
                        Once SCCs are collapsed, every remaining edge goes between different components and the result is a DAG.
                      </div>
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <div
                  style={{
                    background: "rgba(15,28,44,0.9)",
                    border: `1px solid ${THEME.border}`,
                    borderRadius: 16,
                    padding: 18,
                  }}
                >
                  <SectionTitle accent={THEME.amber}>Clauses</SectionTitle>
                  <div style={{ display: "grid", gap: 10 }}>
                    {formulaPreset.clauses.map((clause, index) => {
                      const active = index === selectedClause;
                      return (
                        <button
                          key={index}
                          onClick={() => setSelectedClause(index)}
                          style={{
                            textAlign: "left",
                            border: `1px solid ${active ? THEME.amber : THEME.border}`,
                            background: active ? "rgba(251,191,36,0.14)" : "rgba(7,17,31,0.58)",
                            color: active ? THEME.text : THEME.muted,
                            borderRadius: 12,
                            padding: "10px 12px",
                            cursor: "pointer",
                          }}
                        >
                          {clauseText(clause)}
                        </button>
                      );
                    })}
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
                  <SectionTitle accent={sat.satisfiable ? THEME.emerald : THEME.rose}>
                    SCC Test
                  </SectionTitle>
                  <div style={{ color: THEME.muted, lineHeight: 1.65 }}>
                    {sat.satisfiable ? (
                      <>
                        No variable shares an SCC with its negation, so the implication graph passes the satisfiability test.
                        {sat.assignment ? (
                          <div style={{ marginTop: 10, color: THEME.text }}>
                            One satisfying assignment:
                            {" "}
                            {Object.entries(sat.assignment)
                              .map(([variable, value]) => `${variable}=${value ? "T" : "F"}`)
                              .join(", ")}
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <>
                        Contradiction found:
                        {" "}
                        <span style={{ color: THEME.text }}>
                          {sat.contradictions
                            .map((variable) => `${variable} and ¬${variable}`)
                            .join(", ")}
                        </span>
                        {" "}
                        lie in the same SCC.
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
                  <SectionTitle accent={THEME.violet}>Implication Graph View</SectionTitle>
                  <div style={{ display: "grid", gap: 10, color: THEME.muted, lineHeight: 1.6 }}>
                    {sat.scc.components.map((members, index) => (
                      <div key={index}>
                        <strong style={{ color: THEME.text }}>C{index + 1}</strong>
                        :{" "}
                        {members.map((vertex) => sat.graph.vertices[vertex].label).join(", ")}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const thStyle = {
  padding: "10px 12px",
  fontSize: 12,
  color: THEME.muted,
  fontWeight: 700,
  textAlign: "left",
  borderBottom: `1px solid ${THEME.border}`,
};

const tdStyle = {
  padding: "8px 12px",
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 12,
  color: THEME.text,
  borderBottom: `1px solid rgba(32,49,74,0.6)`,
};

const container = document.getElementById("root");
const root = ReactDOM.createRoot(container);
root.render(<DirectedStructureLab />);
