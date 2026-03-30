import {
  SEARCH_FAMILIES,
  THEME,
  getTreeEdgeTokens,
  runBfsTraversal,
  runDfsTraversal,
} from "./graph-widgets-shared.mjs";

const { useEffect, useMemo, useState } = React;

function formatValue(value) {
  return value === Infinity ? "inf" : value == null ? "nil" : String(value);
}

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

function FrontierStateTable({ graph, snapshot }) {
  return (
    <div
      style={{
        background: "rgba(15,28,44,0.9)",
        border: `1px solid ${THEME.border}`,
        borderRadius: 16,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "12px 16px",
          borderBottom: `1px solid ${THEME.border}`,
          color: THEME.accent,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        Vertex State Snapshot
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
          <thead>
            <tr style={{ background: "rgba(7,17,31,0.72)" }}>
              {["Vertex", "dist[]", "prev[]", "pre[]", "post[]", "ccnum[]"].map((label) => (
                <th key={label} style={compactThStyle}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {graph.vertices.map((vertex, index) => (
              <tr key={vertex.id}>
                <td style={compactTdStyle}>{vertex.label}</td>
                <td style={compactTdStyle}>{formatValue(snapshot.dist[index])}</td>
                <td style={compactTdStyle}>
                  {snapshot.prev[index] == null
                    ? "nil"
                    : graph.vertices[snapshot.prev[index]].label}
                </td>
                <td style={compactTdStyle}>{formatValue(snapshot.pre[index])}</td>
                <td style={compactTdStyle}>{formatValue(snapshot.post[index])}</td>
                <td style={compactTdStyle}>{formatValue(snapshot.ccnum[index])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div
        style={{
          padding: "12px 16px",
          borderTop: `1px solid ${THEME.border}`,
          background: "rgba(7,17,31,0.62)",
        }}
      >
        <div
          style={{
            fontSize: 11,
            color: THEME.emerald,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          Visit Order
        </div>
        {snapshot.visitOrder.length ? (
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              color: THEME.text,
              lineHeight: 1.6,
            }}
          >
            {snapshot.visitOrder
              .map((vertex) => graph.vertices[vertex].label)
              .join(" -> ")}
          </div>
        ) : (
          <div style={{ color: THEME.dim, fontSize: 12 }}>No vertices visited yet.</div>
        )}
      </div>
    </div>
  );
}

function Chip({ children, color = THEME.accentSoft, text = THEME.text }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "6px 10px",
        borderRadius: 999,
        background: color,
        color: text,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {children}
    </span>
  );
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

function GraphCanvas({ graph, snapshot, source, algorithm, onSelectSource }) {
  const treeTokens = getTreeEdgeTokens(snapshot.prev, graph);
  const markerId = `arrow-${algorithm}-${graph.directed ? "dir" : "undir"}`;
  const vertexRadius = 24;
  const arrowTipOvershoot = 2;

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
        const line = trimEdge(
          from,
          to,
          vertexRadius + 3,
          graph.directed ? vertexRadius + arrowTipOvershoot : vertexRadius + 3,
        );
        const isTree = treeTokens.has(`${edge.from}->${edge.to}`);
        const isCurrent =
          snapshot.activeEdge === `${edge.from}->${edge.to}` ||
          (!graph.directed && snapshot.activeEdge === `${edge.to}->${edge.from}`);
        const stroke = isCurrent
          ? THEME.amber
          : isTree
            ? THEME.accent
            : "rgba(142,163,191,0.36)";
        const width = isCurrent ? 4 : isTree ? 3 : 1.5;

        return (
          <line
            key={`edge-${index}`}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke={stroke}
            strokeWidth={width}
            markerEnd={graph.directed ? `url(#${markerId})` : undefined}
            strokeLinecap="round"
          />
        );
      })}

      {graph.vertices.map((vertex, index) => {
        const pos = graph.positions[index];
        const component = snapshot.ccnum[index];
        const componentColor =
          component == null
            ? null
            : THEME.componentColors[(component - 1) % THEME.componentColors.length];
        const isVisited = snapshot.visited[index];
        const isCurrent = snapshot.current === index;
        const isSource = source === index;
        const fill = isCurrent
          ? THEME.amber
          : componentColor ?? (isVisited ? THEME.accent : "#102038");
        const outline = isSource ? "#ffffff" : "rgba(255,255,255,0.1)";

        return (
          <g
            key={vertex.id}
            onClick={() => onSelectSource(index)}
            style={{ cursor: "pointer" }}
          >
            <circle
              cx={pos.x}
              cy={pos.y}
              r={vertexRadius}
              fill={fill}
              stroke={outline}
              strokeWidth={isSource ? 2.5 : 1}
            />
            <text
              x={pos.x}
              y={pos.y + 5}
              textAnchor="middle"
              fill={isCurrent ? "#0f172a" : "#ffffff"}
              fontWeight="700"
              fontSize="15"
            >
              {vertex.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function SearchFrontierLab() {
  const [familyKey, setFamilyKey] = useState(SEARCH_FAMILIES[0].key);
  const initialFamily = SEARCH_FAMILIES[0];
  const initialVariant = Object.keys(initialFamily.variants)[0];
  const [variantKey, setVariantKey] = useState(initialVariant);
  const [algorithm, setAlgorithm] = useState("bfs");
  const [source, setSource] = useState(initialFamily.variants[initialVariant].defaultStart);
  const [step, setStep] = useState(0);

  const family = SEARCH_FAMILIES.find((item) => item.key === familyKey) ?? SEARCH_FAMILIES[0];
  const variantNames = Object.keys(family.variants);
  const activeVariantKey = family.variants[variantKey] ? variantKey : variantNames[0];
  const activeVariant = family.variants[activeVariantKey];
  const graph = activeVariant.graph;

  useEffect(() => {
    if (!family.variants[variantKey]) {
      const nextVariant = Object.keys(family.variants)[0];
      setVariantKey(nextVariant);
      setSource(family.variants[nextVariant].defaultStart);
      setStep(0);
    }
  }, [family, variantKey]);

  useEffect(() => {
    if (source >= graph.vertices.length) {
      setSource(activeVariant.defaultStart);
    }
  }, [graph, source, activeVariant.defaultStart]);

  const run = useMemo(() => {
    return algorithm === "bfs"
      ? runBfsTraversal(graph, source)
      : runDfsTraversal(graph, source);
  }, [algorithm, graph, source]);

  useEffect(() => {
    setStep(0);
  }, [familyKey, activeVariantKey, algorithm, source]);

  const snapshot = run.snapshots[Math.min(step, run.snapshots.length - 1)];
  const frontierLabels = snapshot.frontier.map((vertex) => graph.vertices[vertex].label);

  const citeRows =
    algorithm === "bfs"
      ? [
          "Use dist[] to justify reachability and minimum-hop answers.",
          "Use prev[] to reconstruct an actual path from the source.",
          "Do not cite pre/post/ccnum here; those are DFS outputs in this course.",
        ]
      : [
          "Use prev[] when the problem asks for an actual path or DFS tree.",
          "Use pre[] and post[] when the ordering itself matters.",
          "Use ccnum[] when the problem asks about connected components.",
        ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, rgba(56,189,248,0.16), transparent 32%), #07111f",
        color: THEME.text,
        fontFamily: "'IBM Plex Sans', -apple-system, sans-serif",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap"
        rel="stylesheet"
      />
      <style>{`
        .frontier-shell { max-width: 1180px; margin: 0 auto; padding: 28px 20px 56px; }
        .frontier-main { display: grid; grid-template-columns: minmax(0, 1.8fr) minmax(320px, 1fr); gap: 22px; }
        @media (max-width: 960px) {
          .frontier-main { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="frontier-shell">
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
          <h1 style={{ margin: 0, fontSize: 34, lineHeight: 1.05 }}>
            Search Frontier Lab
          </h1>
          <p
            style={{
              margin: "10px 0 0",
              color: THEME.muted,
              maxWidth: 760,
              lineHeight: 1.6,
            }}
          >
            Step through BFS and DFS on the same curated graph. The focus is the
            frontier shape, the search tree, and the exact output arrays the
            course black boxes hand back.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            marginBottom: 18,
          }}
        >
          {SEARCH_FAMILIES.map((item) => {
            const active = item.key === familyKey;
            return (
              <button
                key={item.key}
                onClick={() => {
                  setFamilyKey(item.key);
                  const nextVariant = Object.keys(item.variants)[0];
                  setVariantKey(nextVariant);
                  setSource(item.variants[nextVariant].defaultStart);
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

        <div className="frontier-main">
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
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>{family.title}</div>
                  <div style={{ color: THEME.muted, fontSize: 13, marginTop: 4 }}>
                    {family.description}
                  </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <Chip color="rgba(255,255,255,0.06)" text={THEME.muted}>
                    {graph.directed ? "Directed graph" : "Undirected graph"}
                  </Chip>
                  {graph.directed ? (
                    <Chip color="rgba(255,255,255,0.06)" text={THEME.muted}>
                      Arrows show edge direction
                    </Chip>
                  ) : null}
                  <Chip color="rgba(255,255,255,0.06)" text={THEME.muted}>
                    Runtime: O(n + m)
                  </Chip>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                  marginTop: 14,
                }}
              >
                {variantNames.map((name) => {
                  const active = name === activeVariantKey;
                  return (
                    <button
                      key={name}
                      onClick={() => {
                        setVariantKey(name);
                        setSource(family.variants[name].defaultStart);
                      }}
                      style={{
                        border: `1px solid ${active ? THEME.violet : THEME.border}`,
                        background: active ? "rgba(167,139,250,0.16)" : "transparent",
                        color: active ? THEME.text : THEME.muted,
                        borderRadius: 999,
                        padding: "8px 12px",
                        cursor: "pointer",
                      }}
                    >
                      {family.variants[name].title}
                    </button>
                  );
                })}
                {[
                  { key: "bfs", label: "BFS", color: THEME.queue },
                  { key: "dfs", label: "DFS", color: THEME.stack },
                ].map((item) => {
                  const active = algorithm === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => setAlgorithm(item.key)}
                      style={{
                        border: `1px solid ${active ? item.color : THEME.border}`,
                        background: active ? `${item.color}22` : "transparent",
                        color: active ? THEME.text : THEME.muted,
                        borderRadius: 999,
                        padding: "8px 12px",
                        cursor: "pointer",
                        fontWeight: 700,
                      }}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ padding: 20 }}>
              <GraphCanvas
                graph={graph}
                snapshot={snapshot}
                source={source}
                algorithm={algorithm}
                onSelectSource={setSource}
              />
            </div>

            <div
              style={{
                padding: "16px 20px 20px",
                borderTop: `1px solid ${THEME.border}`,
                background: "rgba(7,17,31,0.56)",
              }}
            >
              <SectionTitle accent={algorithm === "bfs" ? THEME.queue : THEME.stack}>
                Step Controls
              </SectionTitle>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <button
                  onClick={() => setStep((value) => Math.max(0, value - 1))}
                  style={stepButtonStyle}
                >
                  Back
                </button>
                <button
                  onClick={() =>
                    setStep((value) => Math.min(run.snapshots.length - 1, value + 1))
                  }
                  style={stepButtonStyle}
                >
                  Next
                </button>
                <button onClick={() => setStep(0)} style={stepButtonStyle}>
                  Reset
                </button>
                <Chip color="rgba(255,255,255,0.06)" text={THEME.muted}>
                  Click any node to choose the source
                </Chip>
              </div>

              <input
                type="range"
                min="0"
                max={run.snapshots.length - 1}
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
              <SectionTitle accent={algorithm === "bfs" ? THEME.queue : THEME.stack}>
                Current Frontier
              </SectionTitle>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                {frontierLabels.length ? (
                  frontierLabels.map((label) => (
                    <Chip
                      key={label}
                      color={
                        algorithm === "bfs" ? "rgba(34,197,94,0.16)" : "rgba(249,115,22,0.16)"
                      }
                    >
                      {label}
                    </Chip>
                  ))
                ) : (
                  <span style={{ color: THEME.dim }}>Frontier empty</span>
                )}
              </div>
              <div style={{ color: THEME.muted, fontSize: 13, lineHeight: 1.6 }}>
                {snapshot.frontierKind}:{" "}
                {algorithm === "bfs"
                  ? "BFS expands the oldest discovered vertex first."
                  : "DFS keeps diving until it has to backtrack."}
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
              <SectionTitle>Black-box Outputs You Would Cite</SectionTitle>
              <div style={{ display: "grid", gap: 10 }}>
                {citeRows.map((line) => (
                  <div
                    key={line}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 12,
                      background: "rgba(7,17,31,0.62)",
                      color: THEME.muted,
                      lineHeight: 1.5,
                    }}
                  >
                    {line}
                  </div>
                ))}
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
              <SectionTitle>What This Teaches</SectionTitle>
              <div style={{ color: THEME.muted, lineHeight: 1.6, fontSize: 14 }}>
                BFS and DFS have the same asymptotic traversal cost, but they
                expose different kinds of evidence. BFS is the clean shortest-hop
                black box. DFS is the richer structural black box: its tree,
                timestamps, and component labels answer a wider range of graph
                questions.
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <FrontierStateTable graph={graph} snapshot={snapshot} />
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

const compactThStyle = {
  padding: "10px 12px",
  fontSize: 12,
  color: THEME.muted,
  fontWeight: 700,
  textAlign: "left",
  borderBottom: `1px solid ${THEME.border}`,
};

const compactTdStyle = {
  padding: "8px 12px",
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 12,
  color: THEME.text,
  borderBottom: `1px solid rgba(32,49,74,0.6)`,
};

const container = document.getElementById("root");
const root = ReactDOM.createRoot(container);
root.render(<SearchFrontierLab />);
