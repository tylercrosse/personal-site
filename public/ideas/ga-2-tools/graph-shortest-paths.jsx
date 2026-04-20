import {
  FW_PRESETS,
  PATH_PRESETS,
  THEME,
  getApplicableNote,
  getTreeEdgeTokens,
  runBellmanFordQuery,
  runBfsQuery,
  runDijkstraQuery,
  runFloydWarshall,
} from "./graph-widgets-shared.mjs";

const { useEffect, useMemo, useState } = React;

function formatValue(value) {
  return value === Infinity ? "inf" : value == null ? "nil" : String(value);
}

function graphModeLabel(graph) {
  return graph.directed ? "Directed graph" : "Undirected graph";
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

function recoverPath(graph, prev, source, destination) {
  if (source == null || destination == null) return [];
  if (source === destination) return [source];
  const path = [];
  const seen = new Set();
  let current = destination;

  while (current != null && !seen.has(current)) {
    path.push(current);
    if (current === source) break;
    seen.add(current);
    current = prev[current];
  }

  if (path[path.length - 1] !== source) return [];
  return path.reverse();
}

function pathEdgeTokens(path, directed = true) {
  const tokens = new Set();
  for (let index = 0; index < path.length - 1; index++) {
    const from = path[index];
    const to = path[index + 1];
    tokens.add(`${from}->${to}`);
    if (!directed) tokens.add(`${to}->${from}`);
  }
  return tokens;
}

function toneForStatus(status) {
  if (status === "good") return { border: THEME.emerald, bg: "rgba(52,211,153,0.14)" };
  if (status === "warning") return { border: THEME.amber, bg: "rgba(251,191,36,0.14)" };
  return { border: THEME.rose, bg: "rgba(251,113,133,0.14)" };
}

function finiteValues(matrix) {
  return matrix.flat().filter((value) => value !== Infinity);
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

function Chip({ children, bg = THEME.accentSoft, color = THEME.text }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
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

function PathStateTable({ graph, snapshot, algorithm, progressRows, destination }) {
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
        Current Output Snapshot
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 420 }}>
          <thead>
            <tr style={{ background: "rgba(7,17,31,0.72)" }}>
              {["Vertex", "dist[]", "prev[]"].map((label) => (
                <th key={label} style={compactThStyle}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {graph.vertices.map((vertex, index) => {
              const isDestination = index === destination;
              return (
                <tr
                  key={vertex.id}
                  style={isDestination ? { background: "rgba(251,113,133,0.12)" } : undefined}
                >
                  <td style={compactTdStyle}>
                    {vertex.label}
                    {isDestination ? " (T)" : ""}
                  </td>
                  <td style={compactTdStyle}>{formatValue(snapshot.dist[index])}</td>
                  <td style={compactTdStyle}>
                    {snapshot.prev[index] == null
                      ? "nil"
                      : graph.vertices[snapshot.prev[index]].label}
                  </td>
                </tr>
              );
            })}
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
          {algorithm === "dijkstra"
            ? "Settled Order"
            : algorithm === "bfs"
              ? "Visit Order"
              : "Iterations Seen"}
        </div>
        {progressRows.length ? (
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              color: THEME.text,
              lineHeight: 1.6,
            }}
          >
            {progressRows.map((row) => row.value).join(" -> ")}
          </div>
        ) : (
          <div style={{ color: THEME.dim, fontSize: 12 }}>No progress recorded yet.</div>
        )}
      </div>
    </div>
  );
}

function GraphCanvas({
  graph,
  snapshot,
  source,
  destination,
  algorithm,
  onSelectVertex,
  selectedPath,
}) {
  const treeTokens = getTreeEdgeTokens(snapshot.prev, graph);
  const selectedPathTokens = pathEdgeTokens(selectedPath, graph.directed);
  const selectedPathVertices = new Set(selectedPath);
  const markerId = `shortest-${algorithm}-${graph.directed ? "dir" : "undir"}`;
  const vertexRadius = 24;

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
          graph.directed ? vertexRadius + 2 : vertexRadius + 3,
        );
        const midX = (line.x1 + line.x2) / 2;
        const midY = (line.y1 + line.y2) / 2;
        const isTree = treeTokens.has(`${edge.from}->${edge.to}`);
        const onSelectedPath = selectedPathTokens.has(`${edge.from}->${edge.to}`);
        const isCurrent =
          snapshot.activeEdge === `${edge.from}->${edge.to}` ||
          (!graph.directed && snapshot.activeEdge === `${edge.to}->${edge.from}`);
        const stroke = isCurrent
          ? THEME.amber
          : onSelectedPath
            ? THEME.rose
            : isTree
              ? THEME.accent
              : "rgba(142,163,191,0.36)";

        return (
          <g key={`edge-${index}`}>
            <line
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke={stroke}
              strokeWidth={isCurrent ? 4 : onSelectedPath ? 4 : isTree ? 3 : 1.5}
              markerEnd={graph.directed ? `url(#${markerId})` : undefined}
              strokeLinecap="round"
            />
            {graph.weighted ? (
              <text
                x={midX}
                y={midY - 8}
                textAnchor="middle"
                fontFamily="'JetBrains Mono', monospace"
                fontSize="12"
                fill={isCurrent ? THEME.amber : THEME.muted}
              >
                {edge.weight}
              </text>
            ) : null}
          </g>
        );
      })}

      {graph.vertices.map((vertex, index) => {
        const pos = graph.positions[index];
        const isCurrent = snapshot.current === index;
        const isSource = source === index;
        const isDestination = destination === index;
        const settled = snapshot.settled.includes(index);
        const dist = snapshot.dist[index];
        const onSelectedPath = selectedPathVertices.has(index);
        const fill = isCurrent
          ? THEME.amber
          : onSelectedPath
            ? THEME.rose
            : settled
              ? THEME.emerald
              : dist !== Infinity && dist != null
                ? THEME.accent
                : "#102038";
        const stroke = isSource
          ? "#ffffff"
          : isDestination
            ? THEME.rose
            : "rgba(255,255,255,0.1)";
        const strokeWidth = isSource || isDestination ? 2.5 : 1;
        const roleLabel = isSource && isDestination ? "S/T" : isSource ? "S" : isDestination ? "T" : "";

        return (
          <g
            key={vertex.id}
            onClick={() => onSelectVertex(index)}
            style={{ cursor: "pointer" }}
          >
            <circle
              cx={pos.x}
              cy={pos.y}
              r={vertexRadius}
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
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
            <text
              x={pos.x}
              y={pos.y + 42}
              textAnchor="middle"
              fill={THEME.muted}
              fontFamily="'JetBrains Mono', monospace"
              fontSize="11"
            >
              {dist === Infinity ? "inf" : dist == null ? "nil" : dist}
            </text>
            {roleLabel ? (
              <text
                x={pos.x}
                y={pos.y - 32}
                textAnchor="middle"
                fill={isSource ? "#ffffff" : THEME.rose}
                fontFamily="'JetBrains Mono', monospace"
                fontSize="11"
                fontWeight="700"
              >
                {roleLabel}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

function IterationTable({ graph, rows }) {
  return (
    <div
      style={{
        overflowX: "auto",
        border: `1px solid ${THEME.border}`,
        borderRadius: 12,
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 420 }}>
        <thead>
          <tr style={{ background: "rgba(7,17,31,0.72)" }}>
            <th style={thStyle}>iter</th>
            {graph.vertices.map((vertex) => (
              <th key={vertex.id} style={thStyle}>
                {vertex.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`iter-${index}`}>
              <td style={tdStyle}>{index}</td>
              {row.map((value, cellIndex) => (
                <td key={`iter-${index}-${cellIndex}`} style={tdStyle}>
                  {value === Infinity ? "inf" : value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function QueryComparisonTable({
  graph,
  source,
  destination,
  bfs,
  dijkstra,
  bellman,
}) {
  const bfsNote = getApplicableNote(graph, "bfs");
  const dijkstraNote = getApplicableNote(graph, "dijkstra");
  const bellmanNote = getApplicableNote(graph, "bellman-ford");

  function renderPath(prev) {
    const path = recoverPath(graph, prev, source, destination);
    return path.length
      ? path.map((vertex) => graph.vertices[vertex].label).join(" -> ")
      : "no path";
  }

  const rows = [
    {
      algorithm: "BFS",
      note: bfsNote,
      distance:
        bfs.outputs.dist[destination] === Infinity
          ? "inf"
          : graph.weighted
            ? `hop ${bfs.outputs.dist[destination]}`
            : String(bfs.outputs.dist[destination]),
      path: renderPath(bfs.outputs.prev),
    },
    {
      algorithm: "Dijkstra",
      note: dijkstraNote,
      distance:
        dijkstraNote.status === "bad"
          ? "invalid"
          : dijkstra.outputs.dist[destination] === Infinity
            ? "inf"
            : String(dijkstra.outputs.dist[destination]),
      path: dijkstraNote.status === "bad" ? "not allowed" : renderPath(dijkstra.outputs.prev),
    },
    {
      algorithm: "Bellman-Ford",
      note: bellmanNote,
      distance:
        bellman.outputs.dist[destination] === Infinity
          ? "inf"
          : String(bellman.outputs.dist[destination]),
      path: renderPath(bellman.outputs.prev),
    },
  ];

  return (
    <div
      style={{
        overflowX: "auto",
        border: `1px solid ${THEME.border}`,
        borderRadius: 14,
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
        <thead>
          <tr style={{ background: "rgba(7,17,31,0.72)" }}>
            <th style={thStyle}>Algorithm</th>
            <th style={thStyle}>Applicable?</th>
            <th style={thStyle}>
              dist[{graph.vertices[source].label} -> {graph.vertices[destination].label}]
            </th>
            <th style={thStyle}>Recovered Path</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const tone =
              row.note.status === "bad"
                ? THEME.rose
                : row.note.status === "warning"
                  ? THEME.amber
                  : THEME.emerald;
            return (
              <tr key={row.algorithm}>
                <td style={tdStyle}>{row.algorithm}</td>
                <td style={{ ...tdStyle, color: tone }}>{row.note.label}</td>
                <td style={tdStyle}>{row.distance}</td>
                <td style={tdStyle}>{row.path}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div
        style={{
          padding: "10px 12px",
          borderTop: `1px solid ${THEME.border}`,
          color: THEME.muted,
          fontSize: 12,
          lineHeight: 1.5,
          background: "rgba(15,28,44,0.9)",
        }}
      >
        This table answers the currently selected source-to-destination query.
        The per-vertex table below still shows the full single-source output
        arrays for the current algorithm.
      </div>
    </div>
  );
}

function SingleSourceExplorer() {
  const [presetKey, setPresetKey] = useState(PATH_PRESETS[0].key);
  const [algorithm, setAlgorithm] = useState("bfs");
  const [source, setSource] = useState(PATH_PRESETS[0].defaultStart);
  const [destination, setDestination] = useState(
    PATH_PRESETS[0].graph.vertices.length - 1,
  );
  const [graphMode, setGraphMode] = useState(
    PATH_PRESETS[0].graph.directed ? "directed" : "undirected",
  );
  const [selectionMode, setSelectionMode] = useState("source");
  const [step, setStep] = useState(0);

  const preset = PATH_PRESETS.find((item) => item.key === presetKey) ?? PATH_PRESETS[0];
  const graph = useMemo(
    () => ({
      ...preset.graph,
      directed: graphMode === "directed",
    }),
    [preset, graphMode],
  );
  const modeOverride = graph.directed !== preset.graph.directed;
  const canToggleUndirected = preset.graph.directed;

  useEffect(() => {
    setSource(preset.defaultStart);
    setDestination(preset.graph.vertices.length - 1);
    setGraphMode(preset.graph.directed ? "directed" : "undirected");
    setSelectionMode("source");
    setStep(0);
  }, [presetKey]);

  const bfsRun = useMemo(
    () => runBfsQuery(graph, source, destination),
    [graph, source, destination],
  );
  const dijkstraRun = useMemo(
    () => runDijkstraQuery(graph, source, destination),
    [graph, source, destination],
  );
  const bellmanRun = useMemo(
    () => runBellmanFordQuery(graph, source, destination),
    [graph, source, destination],
  );

  const selectedRun = useMemo(() => {
    if (algorithm === "bfs") return bfsRun;
    if (algorithm === "dijkstra") return dijkstraRun;
    return bellmanRun;
  }, [algorithm, bfsRun, dijkstraRun, bellmanRun]);

  useEffect(() => {
    setStep(0);
  }, [algorithm, source, destination, graphMode]);

  const snapshot = selectedRun.snapshots[Math.min(step, selectedRun.snapshots.length - 1)];
  const note = getApplicableNote(graph, algorithm);
  const selectedPath = recoverPath(graph, snapshot.prev, source, destination);
  const destinationDist = snapshot.dist[destination];
  const hasDestinationPath =
    selectedPath.length > 0 &&
    (source === destination || destinationDist !== Infinity);
  const queryFinished = snapshot.queryKind === "done";
  const progressRows =
    algorithm === "dijkstra"
      ? snapshot.settled.map((vertex, index) => ({
          vertex: index + 1,
          value: graph.vertices[vertex].label,
        }))
      : algorithm === "bfs"
        ? snapshot.visitOrder.map((vertex) => ({
            value: graph.vertices[vertex].label,
          }))
        : snapshot.iterTable.map((_, index) => ({
            value: `iteration ${index}`,
          }));

  function handleSelectVertex(vertex) {
    if (selectionMode === "destination") {
      setDestination(vertex);
      return;
    }
    setSource(vertex);
  }

  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
        {PATH_PRESETS.map((item) => {
          const active = item.key === presetKey;
          return (
            <button
              key={item.key}
              onClick={() => setPresetKey(item.key)}
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

      <div className="paths-main">
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
                <div style={{ fontWeight: 700, fontSize: 18 }}>{preset.title}</div>
                <div style={{ color: THEME.muted, fontSize: 13, marginTop: 4 }}>
                  {preset.prompt}
                </div>
                {modeOverride ? (
                  <div style={{ color: THEME.amber, fontSize: 12, marginTop: 6 }}>
                    Mode override: treating every shown edge as bidirectional.
                  </div>
                ) : null}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <Chip bg="rgba(255,255,255,0.06)" color={THEME.muted}>
                  {graphModeLabel(graph)}
                </Chip>
                {graph.directed ? (
                  <Chip bg="rgba(255,255,255,0.06)" color={THEME.muted}>
                    Arrows show edge direction
                  </Chip>
                ) : null}
                <Chip bg="rgba(255,255,255,0.06)" color={THEME.muted}>
                  Click nodes to set {selectionMode}
                </Chip>
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
              {[
                { key: "bfs", label: "BFS", color: THEME.queue },
                { key: "dijkstra", label: "Dijkstra", color: THEME.accent },
                { key: "bellman-ford", label: "Bellman-Ford", color: THEME.violet },
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
              {canToggleUndirected
                ? [
                    { key: "directed", label: "Directed", color: THEME.amber },
                    { key: "undirected", label: "Undirected", color: THEME.emerald },
                  ].map((item) => {
                    const active = graphMode === item.key;
                    return (
                      <button
                        key={item.key}
                        onClick={() => setGraphMode(item.key)}
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
                  })
                : null}
              {[
                { key: "source", label: "Set Source", color: "#ffffff" },
                { key: "destination", label: "Set Destination", color: THEME.rose },
              ].map((item) => {
                const active = selectionMode === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => setSelectionMode(item.key)}
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
              destination={destination}
              algorithm={algorithm}
              onSelectVertex={handleSelectVertex}
              selectedPath={selectedPath}
            />
          </div>

          <div
            style={{
              padding: "16px 20px 20px",
              borderTop: `1px solid ${THEME.border}`,
              background: "rgba(7,17,31,0.56)",
            }}
          >
            <SectionTitle accent={note.status === "bad" ? THEME.rose : THEME.accent}>
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
              <button onClick={() => setStep((value) => Math.max(0, value - 1))} style={stepButtonStyle}>
                Back
              </button>
              <button
                onClick={() =>
                  setStep((value) => Math.min(selectedRun.snapshots.length - 1, value + 1))
                }
                style={stepButtonStyle}
              >
                Next
              </button>
              <button onClick={() => setStep(0)} style={stepButtonStyle}>
                Reset
              </button>
              <Chip bg="rgba(255,255,255,0.06)" color={THEME.muted}>
                Step {step} / {selectedRun.snapshots.length - 1}
              </Chip>
            </div>
            <input
              type="range"
              min="0"
              max={selectedRun.snapshots.length - 1}
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
            <SectionTitle>Applicability</SectionTitle>
            <div style={{ display: "grid", gap: 10 }}>
              {["bfs", "dijkstra", "bellman-ford"].map((name) => {
                const data = getApplicableNote(graph, name);
                const tone = toneForStatus(data.status);
                return (
                  <div
                    key={name}
                    style={{
                      border: `1px solid ${tone.border}`,
                      background: tone.bg,
                      borderRadius: 12,
                      padding: "10px 12px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <strong style={{ textTransform: "capitalize" }}>{name}</strong>
                      <span style={{ color: THEME.muted }}>{data.label}</span>
                    </div>
                    <div style={{ color: THEME.muted, lineHeight: 1.5, marginTop: 4 }}>
                      {data.detail}
                    </div>
                  </div>
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
            <SectionTitle accent={THEME.violet}>Algorithm State</SectionTitle>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              {algorithm === "dijkstra" ? (
                snapshot.settled.length ? (
                  snapshot.settled.map((vertex) => (
                    <Chip key={vertex} bg="rgba(52,211,153,0.16)">
                      {graph.vertices[vertex].label}
                    </Chip>
                  ))
                ) : (
                  <span style={{ color: THEME.dim }}>No settled vertices yet</span>
                )
              ) : algorithm === "bellman-ford" ? (
                <Chip bg="rgba(167,139,250,0.16)">Iteration {snapshot.iteration ?? 0}</Chip>
              ) : snapshot.frontier.length ? (
                snapshot.frontier.map((vertex) => (
                  <Chip key={vertex} bg="rgba(34,197,94,0.16)">
                    {graph.vertices[vertex].label}
                  </Chip>
                ))
              ) : (
                <span style={{ color: THEME.dim }}>Frontier empty</span>
              )}
            </div>
            <div style={{ color: THEME.muted, fontSize: 13, lineHeight: 1.6 }}>
              {algorithm === "bfs"
                ? "BFS keeps a queue and interprets every edge as one hop."
                : algorithm === "dijkstra"
                  ? "Dijkstra grows a settled region whose distances will never change again."
                  : "Bellman-Ford grows correctness by edge count; iter[k][v] means at most k edges."}
              <br />
              {algorithm === "bfs"
                ? "This query trace ends when BFS first reaches T, or when reachability is exhausted."
                : algorithm === "dijkstra"
                  ? "This query trace ends when Dijkstra settles T, or when no more reachable vertices remain."
                  : "This query trace keeps the Bellman-Ford iterations relevant to the selected destination."}
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
            <SectionTitle accent={THEME.rose}>Selected Route</SectionTitle>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              <Chip bg="rgba(255,255,255,0.06)" color={THEME.text}>
                Source: {graph.vertices[source].label}
              </Chip>
              <Chip bg="rgba(251,113,133,0.14)" color={THEME.text}>
                Destination: {graph.vertices[destination].label}
              </Chip>
            </div>
            <div style={{ color: THEME.muted, fontSize: 13, lineHeight: 1.6 }}>
              {hasDestinationPath ? (
                <>
                  Current path:
                  {" "}
                  <span style={{ color: THEME.text, fontFamily: "'JetBrains Mono', monospace" }}>
                    {selectedPath.map((vertex) => graph.vertices[vertex].label).join(" -> ")}
                  </span>
                  <br />
                  Current {algorithm === "bfs" ? "distance / hops" : "distance / cost"}:
                  {" "}
                  <span style={{ color: THEME.text, fontFamily: "'JetBrains Mono', monospace" }}>
                    {formatValue(destinationDist)}
                  </span>
                </>
              ) : queryFinished ? (
                <>
                  No path from {graph.vertices[source].label} to {graph.vertices[destination].label} exists in this{" "}
                  {graph.directed ? "directed" : "undirected"} graph.
                  {graph.directed ? " The algorithms only follow outgoing edges." : ""}
                </>
              ) : (
                <>No complete source-to-destination path has been established in the current snapshot yet.</>
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
            <SectionTitle>Black-box Outputs You Would Cite</SectionTitle>
            <div style={{ display: "grid", gap: 10 }}>
              <div style={infoBlockStyle}>
                Cite <code>dist[]</code> for the final path cost from the source to every vertex.
              </div>
              <div style={infoBlockStyle}>
                Cite <code>prev[]</code> when the problem also asks you to recover an actual shortest path.
              </div>
              <div style={infoBlockStyle}>
                Bellman-Ford also exposes <code>iter[][]</code>, which is useful when the proof or explanation needs the iteration story.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <SectionTitle>Selected Query Across All Three Black Boxes</SectionTitle>
        <QueryComparisonTable
          graph={graph}
          source={source}
          destination={destination}
          bfs={bfsRun}
          dijkstra={dijkstraRun}
          bellman={bellmanRun}
        />
      </div>

      <div style={{ display: "grid", gap: 14, marginTop: 18 }}>
        <PathStateTable
          graph={graph}
          snapshot={snapshot}
          algorithm={algorithm}
          progressRows={progressRows}
          destination={destination}
        />
        {algorithm === "bellman-ford" ? (
          <div
            style={{
              background: "rgba(15,28,44,0.9)",
              border: `1px solid ${THEME.border}`,
              borderRadius: 16,
              padding: 18,
            }}
          >
            <SectionTitle accent={THEME.violet}>Bellman-Ford iter[][]</SectionTitle>
            <IterationTable
              graph={graph}
              rows={snapshot.iterTable.length ? snapshot.iterTable : bellmanRun.outputs.iter}
            />
          </div>
        ) : null}
      </div>
    </>
  );
}

function FwGraphCanvas({ graph, pivot, selected }) {
  const markerId = "fw-graph";
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
        return (
          <g key={index}>
            <line
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke="rgba(142,163,191,0.42)"
              strokeWidth="2"
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
              {edge.weight}
            </text>
          </g>
        );
      })}

      {graph.vertices.map((vertex, index) => {
        const pos = graph.positions[index];
        const isFrom = selected.from === index;
        const isTo = selected.to === index;
        const isPivot = pivot === index;
        const fill = isPivot ? THEME.amber : isFrom ? THEME.rose : isTo ? THEME.accent : "#102038";
        const stroke = isFrom || isTo ? "#ffffff" : "rgba(255,255,255,0.12)";
        return (
          <g key={vertex.id}>
            <circle
              cx={pos.x}
              cy={pos.y}
              r="24"
              fill={fill}
              stroke={stroke}
              strokeWidth={isFrom || isTo ? 2.5 : 1.5}
            />
            <text
              x={pos.x}
              y={pos.y + 5}
              textAnchor="middle"
              fill={isPivot ? "#0f172a" : "#ffffff"}
              fontWeight="700"
              fontSize="14"
            >
              {vertex.label}
            </text>
            {(isFrom || isTo || isPivot) ? (
              <text
                x={pos.x}
                y={pos.y - 31}
                textAnchor="middle"
                fill="#ffffff"
                fontFamily="'JetBrains Mono', monospace"
                fontSize="11"
                fontWeight="700"
              >
                {isPivot ? "k" : isFrom ? "u" : "v"}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

function MatrixTable({ graph, matrix, updates, selected, onSelectCell }) {
  const updateSet = new Set(updates.map((item) => `${item.from}-${item.to}`));
  const values = finiteValues(matrix);
  const maxFinite = values.length ? Math.max(...values.map((value) => Math.abs(value))) : 1;

  return (
    <div
      style={{
        overflowX: "auto",
        border: `1px solid ${THEME.border}`,
        borderRadius: 14,
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
        <thead>
          <tr style={{ background: "rgba(7,17,31,0.72)" }}>
            <th style={thStyle}>u\v</th>
            {graph.vertices.map((vertex) => (
              <th key={vertex.id} style={thStyle}>
                {vertex.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, rowIndex) => (
            <tr key={rowIndex}>
              <td style={tdStyle}>{graph.vertices[rowIndex].label}</td>
              {row.map((value, colIndex) => {
                const selectedCell = selected.from === rowIndex && selected.to === colIndex;
                const changed = updateSet.has(`${rowIndex}-${colIndex}`);
                const diagonalNegative = rowIndex === colIndex && value < 0;
                const intensity =
                  value === Infinity ? 0 : Math.max(0.15, 1 - Math.abs(value) / (maxFinite || 1));
                const background = diagonalNegative
                  ? "rgba(251,113,133,0.24)"
                  : changed
                    ? "rgba(56,189,248,0.22)"
                    : value === Infinity
                      ? "rgba(7,17,31,0.72)"
                      : `rgba(52,211,153,${intensity * 0.18})`;
                return (
                  <td
                    key={`${rowIndex}-${colIndex}`}
                    onClick={() => onSelectCell({ from: rowIndex, to: colIndex })}
                    style={{
                      ...tdStyle,
                      background,
                      border: selectedCell
                        ? `2px solid ${THEME.amber}`
                        : `1px solid rgba(32,49,74,0.28)`,
                      cursor: "pointer",
                      textAlign: "center",
                    }}
                  >
                    {formatValue(value)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AllPairsExplorer() {
  const [presetKey, setPresetKey] = useState(FW_PRESETS[0].key);
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState({ from: 0, to: 1 });
  const preset = FW_PRESETS.find((item) => item.key === presetKey) ?? FW_PRESETS[0];
  const run = useMemo(() => runFloydWarshall(preset.graph), [preset]);

  useEffect(() => {
    setStep(0);
    setSelected({ from: 0, to: Math.min(1, preset.graph.vertices.length - 1) });
  }, [presetKey, preset.graph.vertices.length]);

  const matrix = run.iter[step];
  const updates = run.updates[step] ?? [];
  const pivot = step === 0 ? null : step - 1;
  const previous = run.iter[Math.max(0, step - 1)];
  const selectedUpdate =
    updates.find((item) => item.from === selected.from && item.to === selected.to) ?? null;
  const through =
    pivot == null ||
    previous[selected.from][pivot] === Infinity ||
    previous[pivot][selected.to] === Infinity
      ? Infinity
      : previous[selected.from][pivot] + previous[pivot][selected.to];

  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
        {FW_PRESETS.map((item) => {
          const active = item.key === presetKey;
          return (
            <button
              key={item.key}
              onClick={() => setPresetKey(item.key)}
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

      <div className="paths-main">
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
              <Chip bg="rgba(255,255,255,0.06)" color={THEME.muted}>
                {preset.title}
              </Chip>
              <Chip bg="rgba(255,255,255,0.06)" color={THEME.muted}>
                k = {step}
              </Chip>
              {pivot != null ? (
                <Chip bg="rgba(251,191,36,0.14)" color={THEME.text}>
                  Intermediate {preset.graph.vertices[pivot].label}
                </Chip>
              ) : (
                <Chip bg="rgba(255,255,255,0.06)" color={THEME.muted}>
                  No intermediates yet
                </Chip>
              )}
              {run.hasNegativeCycle ? (
                <Chip bg="rgba(251,113,133,0.14)" color={THEME.text}>
                  Negative cycle detected
                </Chip>
              ) : null}
            </div>
            <div style={{ color: THEME.muted, lineHeight: 1.6 }}>{preset.prompt}</div>
          </div>

          <div style={{ padding: 20 }}>
            <FwGraphCanvas graph={preset.graph} pivot={pivot} selected={selected} />
          </div>

          <div
            style={{
              padding: "16px 20px 20px",
              borderTop: `1px solid ${THEME.border}`,
              background: "rgba(7,17,31,0.56)",
            }}
          >
            <SectionTitle accent={THEME.accent}>Iteration Controls</SectionTitle>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
              <button onClick={() => setStep((value) => Math.max(0, value - 1))} style={stepButtonStyle}>
                Back
              </button>
              <button
                onClick={() => setStep((value) => Math.min(preset.graph.vertices.length, value + 1))}
                style={stepButtonStyle}
              >
                Next
              </button>
              <button onClick={() => setStep(0)} style={stepButtonStyle}>
                Reset
              </button>
              <Chip bg="rgba(255,255,255,0.06)" color={THEME.muted}>
                Iteration {step} / {preset.graph.vertices.length}
              </Chip>
            </div>
            <input
              type="range"
              min="0"
              max={preset.graph.vertices.length}
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
              {pivot == null
                ? "Iteration 0 allows no intermediate vertices, so only direct edges and diagonal zeros appear."
                : updates.length
                  ? `Iteration ${step} allows ${preset.graph.vertices[pivot].label} as a new intermediate. Blue cells are the pairs that improved through it.`
                  : `Iteration ${step} allows ${preset.graph.vertices[pivot].label} as an intermediate, but no pair improved.`}
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
            <SectionTitle accent={THEME.violet}>Selected Pair Proof</SectionTitle>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              <Chip bg="rgba(251,113,133,0.14)" color={THEME.text}>
                u = {preset.graph.vertices[selected.from].label}
              </Chip>
              <Chip bg="rgba(56,189,248,0.16)" color={THEME.text}>
                v = {preset.graph.vertices[selected.to].label}
              </Chip>
            </div>
            <div style={{ color: THEME.muted, lineHeight: 1.65 }}>
              <div>
                Previous distance:
                {" "}
                <span style={{ color: THEME.text, fontFamily: "'JetBrains Mono', monospace" }}>
                  {formatValue(previous[selected.from][selected.to])}
                </span>
              </div>
              <div style={{ marginTop: 8 }}>
                Through k candidate:
                {" "}
                <span style={{ color: THEME.text, fontFamily: "'JetBrains Mono', monospace" }}>
                  {pivot == null
                    ? "n/a"
                    : `${formatValue(previous[selected.from][pivot])} + ${formatValue(previous[pivot][selected.to])} = ${formatValue(through)}`}
                </span>
              </div>
              <div style={{ marginTop: 8 }}>
                Current distance:
                {" "}
                <span style={{ color: THEME.text, fontFamily: "'JetBrains Mono', monospace" }}>
                  {formatValue(matrix[selected.from][selected.to])}
                </span>
              </div>
              <div style={{ marginTop: 10 }}>
                {selectedUpdate
                  ? "This pair improved in the current iteration."
                  : "This pair did not improve in the current iteration."}
              </div>
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
            <SectionTitle accent={THEME.emerald}>Black-box Output</SectionTitle>
            <div style={{ color: THEME.muted, lineHeight: 1.65 }}>
              Floyd-Warshall returns <code>dist[][]</code> for every ordered pair and
              exposes <code>iter[][][]</code> through these intermediate snapshots.
              A negative value on the diagonal signals a negative cycle.
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <SectionTitle>dist^(k) Matrix</SectionTitle>
        <MatrixTable
          graph={preset.graph}
          matrix={matrix}
          updates={updates}
          selected={selected}
          onSelectCell={setSelected}
        />
      </div>
    </>
  );
}

function ShortestPathComparator() {
  const [view, setView] = useState("single-source");
  const intro =
    view === "single-source"
      ? "Compare three single-source black boxes on the same graph family. Choose a source and destination, then step through the destination-relevant moments while keeping the full output arrays visible."
      : "Switch from one-source queries to all ordered pairs. Floyd-Warshall updates the whole distance matrix one intermediate vertex at a time.";

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, rgba(167,139,250,0.16), transparent 30%), #07111f",
        color: THEME.text,
        fontFamily: "'IBM Plex Sans', -apple-system, sans-serif",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap"
        rel="stylesheet"
      />
      <style>{`
        .paths-shell { max-width: 1180px; margin: 0 auto; padding: 28px 20px 56px; }
        .paths-main { display: grid; grid-template-columns: minmax(0, 1.8fr) minmax(320px, 1fr); gap: 22px; }
        @media (max-width: 980px) {
          .paths-main { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="paths-shell">
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
            Shortest Path Comparator
          </h1>
          <p style={{ margin: "10px 0 0", color: THEME.muted, maxWidth: 760, lineHeight: 1.6 }}>
            {intro}
          </p>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
          {[
            { key: "single-source", label: "Single-source", color: THEME.accent },
            { key: "all-pairs", label: "All-pairs (FW)", color: THEME.violet },
          ].map((item) => {
            const active = view === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setView(item.key)}
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

        {view === "single-source" ? <SingleSourceExplorer /> : <AllPairsExplorer />}
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

const thStyle = {
  padding: "10px 12px",
  fontSize: 12,
  color: THEME.muted,
  fontWeight: 700,
  textAlign: "left",
  borderBottom: `1px solid ${THEME.border}`,
};

const tdStyle = {
  padding: "9px 12px",
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 12,
  color: THEME.text,
  borderBottom: `1px solid rgba(32,49,74,0.6)`,
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

const infoBlockStyle = {
  padding: "10px 12px",
  borderRadius: 12,
  background: "rgba(7,17,31,0.62)",
  color: THEME.muted,
  lineHeight: 1.5,
};

const container = document.getElementById("root");
const root = ReactDOM.createRoot(container);
root.render(<ShortestPathComparator />);
