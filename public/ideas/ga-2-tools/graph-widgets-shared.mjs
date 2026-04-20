export const THEME = {
  bg: "#07111f",
  panel: "#0f1c2c",
  panelAlt: "#152338",
  border: "#20314a",
  text: "#e5eefb",
  muted: "#8ea3bf",
  dim: "#5d718d",
  accent: "#38bdf8",
  accentSoft: "rgba(56,189,248,0.16)",
  emerald: "#34d399",
  amber: "#fbbf24",
  rose: "#fb7185",
  violet: "#a78bfa",
  queue: "#22c55e",
  stack: "#f97316",
  componentColors: ["#38bdf8", "#f59e0b", "#34d399", "#fb7185", "#a78bfa"],
};

const INF = Infinity;

function token(from, to) {
  return `${from}->${to}`;
}

function formatValue(value) {
  return value === INF ? "inf" : value == null ? "nil" : String(value);
}

function cloneNumbers(values) {
  return values.map((value) => value);
}

function cloneParents(values) {
  return values.map((value) => value);
}

function normalizeEdge(edge) {
  return { ...edge, weight: edge.weight ?? 1 };
}

function withPositions(graph) {
  return {
    ...graph,
    edges: graph.edges.map(normalizeEdge),
  };
}

function labeledVertices(labels) {
  return labels.map((label, index) => ({ id: index, label }));
}

function outgoing(graph) {
  const adj = graph.vertices.map(() => []);
  graph.edges.forEach((edge) => {
    adj[edge.from].push({
      from: edge.from,
      to: edge.to,
      weight: edge.weight,
      id: token(edge.from, edge.to),
    });
    if (!graph.directed) {
      adj[edge.to].push({
        from: edge.to,
        to: edge.from,
        weight: edge.weight,
        id: token(edge.to, edge.from),
      });
    }
  });
  adj.forEach((list) => list.sort((a, b) => a.to - b.to));
  return adj;
}

function incoming(graph) {
  const ins = graph.vertices.map(() => []);
  graph.edges.forEach((edge) => {
    ins[edge.to].push({
      from: edge.from,
      to: edge.to,
      weight: edge.weight,
      id: token(edge.from, edge.to),
    });
    if (!graph.directed) {
      ins[edge.from].push({
        from: edge.to,
        to: edge.from,
        weight: edge.weight,
        id: token(edge.to, edge.from),
      });
    }
  });
  ins.forEach((list) => list.sort((a, b) => a.from - b.from));
  return ins;
}

function orderFromStart(size, start) {
  const order = [start];
  for (let i = 0; i < size; i++) {
    if (i !== start) order.push(i);
  }
  return order;
}

function baseSnapshot(state, extra) {
  return {
    current: extra.current ?? null,
    frontier: [...state.frontier],
    frontierKind: state.frontierKind,
    visited: [...state.visited],
    visitOrder: [...state.visitOrder],
    dist: cloneNumbers(state.dist),
    prev: cloneParents(state.prev),
    pre: cloneNumbers(state.pre),
    post: cloneNumbers(state.post),
    ccnum: cloneNumbers(state.ccnum),
    activeEdge: extra.activeEdge ?? null,
    settled: extra.settled ? [...extra.settled] : [],
    iteration: extra.iteration ?? null,
    iterTable: extra.iterTable ? extra.iterTable.map((row) => [...row]) : [],
    queryKind: extra.queryKind ?? null,
    message: extra.message,
  };
}

function treeEdgeTokens(prev, graph) {
  const tokens = new Set();
  prev.forEach((parent, vertex) => {
    if (parent == null) return;
    tokens.add(token(parent, vertex));
    if (!graph.directed) tokens.add(token(vertex, parent));
  });
  return tokens;
}

export function getTreeEdgeTokens(prev, graph) {
  return treeEdgeTokens(prev, graph);
}

export function getApplicableNote(graph, algorithm) {
  const hasNonUnitWeight = graph.edges.some((edge) => (edge.weight ?? 1) !== 1);
  const hasNegativeWeight = graph.edges.some((edge) => (edge.weight ?? 1) < 0);
  if (algorithm === "bfs") {
    if (!graph.weighted || !hasNonUnitWeight) {
      return {
        status: "good",
        label: "Applicable",
        detail: "BFS returns minimum hops on unweighted or unit-weight graphs.",
      };
    }
    return {
      status: "warning",
      label: "Different objective",
      detail: "BFS still finds minimum hops, not minimum total weight.",
    };
  }
  if (algorithm === "dijkstra") {
    if (hasNegativeWeight) {
      return {
        status: "bad",
        label: "Not applicable",
        detail: "Dijkstra requires all edge weights to be non-negative.",
      };
    }
    return {
      status: "good",
      label: "Applicable",
      detail: "Dijkstra returns weighted shortest paths with non-negative edges.",
    };
  }
  return {
    status: "good",
    label: "Applicable",
    detail: "Bellman-Ford supports negative edges and exposes iteration-by-iteration distances.",
  };
}

export function formatArray(values, graph) {
  return values.map((value, index) => ({
    vertex: graph.vertices[index].label,
    value: formatValue(
      typeof value === "number" && Number.isFinite(value) && value !== Math.trunc(value)
        ? value.toFixed(1)
        : value,
    ),
  }));
}

export function runBfsTraversal(graph, start) {
  const adj = outgoing(graph);
  const visited = graph.vertices.map(() => false);
  const dist = graph.vertices.map(() => INF);
  const prev = graph.vertices.map(() => null);
  const frontier = [];
  const visitOrder = [];
  const pre = graph.vertices.map(() => null);
  const post = graph.vertices.map(() => null);
  const ccnum = graph.vertices.map(() => null);
  const snapshots = [];

  visited[start] = true;
  dist[start] = 0;
  frontier.push(start);

  const state = {
    frontier,
    frontierKind: "Queue",
    visited,
    visitOrder,
    dist,
    prev,
    pre,
    post,
    ccnum,
  };

  snapshots.push(
    baseSnapshot(state, {
      current: start,
      message: `Start BFS at ${graph.vertices[start].label}.`,
    }),
  );

  while (frontier.length) {
    const current = frontier.shift();
    visitOrder.push(current);
    snapshots.push(
      baseSnapshot(state, {
        current,
        message: `Dequeue ${graph.vertices[current].label} and scan its neighbors.`,
      }),
    );

    adj[current].forEach((edge) => {
      if (visited[edge.to]) return;
      visited[edge.to] = true;
      dist[edge.to] = dist[current] + 1;
      prev[edge.to] = current;
      frontier.push(edge.to);
      snapshots.push(
        baseSnapshot(state, {
          current,
          activeEdge: edge.id,
          message: `Discover ${graph.vertices[edge.to].label}; set dist=${dist[edge.to]} and prev=${graph.vertices[current].label}.`,
        }),
      );
    });
  }

  snapshots.push(
    baseSnapshot(state, {
      message: "BFS finished. dist[] and prev[] are the black-box outputs you would cite.",
    }),
  );

  return {
    algorithm: "bfs",
    outputs: {
      dist,
      prev,
    },
    snapshots,
  };
}

export function runBfsQuery(graph, start, destination) {
  const adj = outgoing(graph);
  const visited = graph.vertices.map(() => false);
  const dist = graph.vertices.map(() => INF);
  const prev = graph.vertices.map(() => null);
  const frontier = [];
  const visitOrder = [];
  const pre = graph.vertices.map(() => null);
  const post = graph.vertices.map(() => null);
  const ccnum = graph.vertices.map(() => null);
  const snapshots = [];

  visited[start] = true;
  dist[start] = 0;
  frontier.push(start);

  const state = {
    frontier,
    frontierKind: "Queue",
    visited,
    visitOrder,
    dist,
    prev,
    pre,
    post,
    ccnum,
  };

  snapshots.push(
    baseSnapshot(state, {
      current: start,
      queryKind: "initial",
      message: `Start BFS query from ${graph.vertices[start].label} toward ${graph.vertices[destination].label}.`,
    }),
  );

  if (start === destination) {
    snapshots.push(
      baseSnapshot(state, {
        current: start,
        queryKind: "done",
        message: "Source and destination are the same vertex, so the query is already solved.",
      }),
    );
    return {
      algorithm: "bfs",
      outputs: { dist, prev },
      snapshots,
    };
  }

  while (frontier.length) {
    const current = frontier.shift();
    visitOrder.push(current);
    snapshots.push(
      baseSnapshot(state, {
        current,
        queryKind: "visit",
        message: `Dequeue ${graph.vertices[current].label} and scan its neighbors.`,
      }),
    );

    for (const edge of adj[current]) {
      if (visited[edge.to]) continue;
      visited[edge.to] = true;
      dist[edge.to] = dist[current] + 1;
      prev[edge.to] = current;
      frontier.push(edge.to);
      snapshots.push(
        baseSnapshot(state, {
          current,
          activeEdge: edge.id,
          queryKind: "discover",
          message: `Discover ${graph.vertices[edge.to].label}; set dist=${dist[edge.to]} and prev=${graph.vertices[current].label}.`,
        }),
      );
      if (edge.to === destination) {
        snapshots.push(
          baseSnapshot(state, {
            current: edge.to,
            queryKind: "done",
            message: `BFS reached ${graph.vertices[destination].label}; the first discovery gives the minimum-hop answer.`,
          }),
        );
        return {
          algorithm: "bfs",
          outputs: { dist, prev },
          snapshots,
        };
      }
    }
  }

  snapshots.push(
    baseSnapshot(state, {
      queryKind: "done",
      message: `BFS exhausted the reachable region without reaching ${graph.vertices[destination].label}.`,
    }),
  );

  return {
    algorithm: "bfs",
    outputs: { dist, prev },
    snapshots,
  };
}

export function runDfsTraversal(graph, start) {
  const adj = outgoing(graph);
  const visited = graph.vertices.map(() => false);
  const dist = graph.vertices.map(() => null);
  const prev = graph.vertices.map(() => null);
  const frontier = [];
  const visitOrder = [];
  const pre = graph.vertices.map(() => null);
  const post = graph.vertices.map(() => null);
  const ccnum = graph.vertices.map(() => null);
  const snapshots = [];
  let clock = 1;
  let component = 0;

  const state = {
    frontier,
    frontierKind: "Call stack",
    visited,
    visitOrder,
    dist,
    prev,
    pre,
    post,
    ccnum,
  };

  function explore(vertex) {
    visited[vertex] = true;
    visitOrder.push(vertex);
    frontier.push(vertex);
    pre[vertex] = clock++;
    snapshots.push(
      baseSnapshot(state, {
        current: vertex,
        message: `Pre-visit ${graph.vertices[vertex].label}; assign pre=${pre[vertex]} in component ${component}.`,
      }),
    );

    adj[vertex].forEach((edge) => {
      if (visited[edge.to]) return;
      prev[edge.to] = vertex;
      ccnum[edge.to] = component;
      snapshots.push(
        baseSnapshot(state, {
          current: vertex,
          activeEdge: edge.id,
          message: `Tree edge ${graph.vertices[vertex].label} -> ${graph.vertices[edge.to].label}; recurse.`,
        }),
      );
      explore(edge.to);
    });

    post[vertex] = clock++;
    snapshots.push(
      baseSnapshot(state, {
        current: vertex,
        message: `Post-visit ${graph.vertices[vertex].label}; assign post=${post[vertex]}.`,
      }),
    );
    frontier.pop();
  }

  const order = orderFromStart(graph.vertices.length, start);
  order.forEach((vertex) => {
    if (visited[vertex]) return;
    component += 1;
    ccnum[vertex] = component;
    snapshots.push(
      baseSnapshot(state, {
        current: vertex,
        message: `Start connected component ${component} from ${graph.vertices[vertex].label}.`,
      }),
    );
    explore(vertex);
  });

  snapshots.push(
    baseSnapshot(state, {
      message: "DFS finished. prev[], pre[], post[], and ccnum[] are ready to cite.",
    }),
  );

  return {
    algorithm: "dfs",
    outputs: {
      prev,
      pre,
      post,
      ccnum,
    },
    snapshots,
  };
}

export function runDijkstra(graph, start) {
  const adj = outgoing(graph);
  const dist = graph.vertices.map(() => INF);
  const prev = graph.vertices.map(() => null);
  const visited = graph.vertices.map(() => false);
  const frontier = [];
  const visitOrder = [];
  const pre = graph.vertices.map(() => null);
  const post = graph.vertices.map(() => null);
  const ccnum = graph.vertices.map(() => null);
  const snapshots = [];
  const settled = [];
  dist[start] = 0;

  const state = {
    frontier,
    frontierKind: "Settled set",
    visited,
    visitOrder,
    dist,
    prev,
    pre,
    post,
    ccnum,
  };

  snapshots.push(
    baseSnapshot(state, {
      current: start,
      settled,
      message: `Initialize Dijkstra at ${graph.vertices[start].label} with dist=0.`,
    }),
  );

  while (settled.length < graph.vertices.length) {
    let current = null;
    for (let i = 0; i < graph.vertices.length; i++) {
      if (visited[i]) continue;
      if (current == null || dist[i] < dist[current]) current = i;
    }
    if (current == null || dist[current] === INF) break;

    visited[current] = true;
    settled.push(current);
    visitOrder.push(current);
    snapshots.push(
      baseSnapshot(state, {
        current,
        settled,
        message: `Settle ${graph.vertices[current].label}; it has the smallest tentative distance.`,
      }),
    );

    adj[current].forEach((edge) => {
      if (visited[edge.to]) return;
      const candidate = dist[current] + edge.weight;
      if (candidate >= dist[edge.to]) return;
      dist[edge.to] = candidate;
      prev[edge.to] = current;
      snapshots.push(
        baseSnapshot(state, {
          current,
          activeEdge: edge.id,
          settled,
          message: `Relax ${graph.vertices[current].label} -> ${graph.vertices[edge.to].label}; update dist to ${candidate}.`,
        }),
      );
    });
  }

  snapshots.push(
    baseSnapshot(state, {
      settled,
      message: "Dijkstra finished. dist[] and prev[] are the black-box outputs you would cite.",
    }),
  );

  return {
    algorithm: "dijkstra",
    outputs: {
      dist,
      prev,
      settledOrder: settled,
    },
    snapshots,
  };
}

export function runDijkstraQuery(graph, start, destination) {
  const adj = outgoing(graph);
  const dist = graph.vertices.map(() => INF);
  const prev = graph.vertices.map(() => null);
  const visited = graph.vertices.map(() => false);
  const frontier = [];
  const visitOrder = [];
  const pre = graph.vertices.map(() => null);
  const post = graph.vertices.map(() => null);
  const ccnum = graph.vertices.map(() => null);
  const snapshots = [];
  const settled = [];
  dist[start] = 0;

  const state = {
    frontier,
    frontierKind: "Settled set",
    visited,
    visitOrder,
    dist,
    prev,
    pre,
    post,
    ccnum,
  };

  snapshots.push(
    baseSnapshot(state, {
      current: start,
      settled,
      queryKind: "initial",
      message: `Initialize Dijkstra from ${graph.vertices[start].label} toward ${graph.vertices[destination].label}.`,
    }),
  );

  if (start === destination) {
    snapshots.push(
      baseSnapshot(state, {
        current: start,
        settled,
        queryKind: "done",
        message: "Source and destination are the same vertex, so the query is already solved.",
      }),
    );
    return {
      algorithm: "dijkstra",
      outputs: { dist, prev, settledOrder: settled },
      snapshots,
    };
  }

  while (settled.length < graph.vertices.length) {
    let current = null;
    for (let i = 0; i < graph.vertices.length; i++) {
      if (visited[i]) continue;
      if (current == null || dist[i] < dist[current]) current = i;
    }
    if (current == null || dist[current] === INF) break;

    visited[current] = true;
    settled.push(current);
    visitOrder.push(current);
    snapshots.push(
      baseSnapshot(state, {
        current,
        settled,
        queryKind: "settle",
        message: `Settle ${graph.vertices[current].label}; it has the smallest tentative distance.`,
      }),
    );

    if (current === destination) {
      snapshots.push(
        baseSnapshot(state, {
          current,
          settled,
          queryKind: "done",
          message: `${graph.vertices[destination].label} is now settled, so its shortest-path value is final.`,
        }),
      );
      return {
        algorithm: "dijkstra",
        outputs: { dist, prev, settledOrder: settled },
        snapshots,
      };
    }

    adj[current].forEach((edge) => {
      if (visited[edge.to]) return;
      const candidate = dist[current] + edge.weight;
      if (candidate >= dist[edge.to]) return;
      dist[edge.to] = candidate;
      prev[edge.to] = current;
      snapshots.push(
        baseSnapshot(state, {
          current,
          activeEdge: edge.id,
          settled,
          queryKind: edge.to === destination ? "dest-relax" : "relax",
          message: `Relax ${graph.vertices[current].label} -> ${graph.vertices[edge.to].label}; update dist to ${candidate}.`,
        }),
      );
    });
  }

  snapshots.push(
    baseSnapshot(state, {
      settled,
      queryKind: "done",
      message: `Dijkstra finished without settling ${graph.vertices[destination].label}; the destination is unreachable.`,
    }),
  );

  return {
    algorithm: "dijkstra",
    outputs: { dist, prev, settledOrder: settled },
    snapshots,
  };
}

export function runBellmanFord(graph, start) {
  const incomingEdges = incoming(graph);
  const frontier = [];
  const visited = graph.vertices.map(() => false);
  const visitOrder = [];
  const prev = graph.vertices.map(() => null);
  const pre = graph.vertices.map(() => null);
  const post = graph.vertices.map(() => null);
  const ccnum = graph.vertices.map(() => null);
  const iter = [];
  const parentIter = [];
  const snapshots = [];

  iter[0] = graph.vertices.map((_, index) => (index === start ? 0 : INF));
  parentIter[0] = graph.vertices.map(() => null);

  const state = {
    frontier,
    frontierKind: "Iteration",
    visited,
    visitOrder,
    dist: iter[0],
    prev,
    pre,
    post,
    ccnum,
  };

  snapshots.push(
    baseSnapshot(state, {
      current: start,
      iteration: 0,
      iterTable: [iter[0]],
      message: `Iteration 0: only ${graph.vertices[start].label} has distance 0.`,
    }),
  );

  for (let step = 1; step <= graph.vertices.length; step++) {
    const row = [...iter[step - 1]];
    const rowParents = [...parentIter[step - 1]];
    let improved = false;

    for (let vertex = 0; vertex < graph.vertices.length; vertex++) {
      let best = iter[step - 1][vertex];
      let bestParent = parentIter[step - 1][vertex];
      incomingEdges[vertex].forEach((edge) => {
        if (iter[step - 1][edge.from] === INF) return;
        const candidate = iter[step - 1][edge.from] + edge.weight;
        if (candidate >= best) return;
        best = candidate;
        bestParent = edge.from;
      });
      row[vertex] = best;
      rowParents[vertex] = bestParent;
      if (row[vertex] !== iter[step - 1][vertex]) {
        improved = true;
        snapshots.push(
          baseSnapshot(
            {
              ...state,
              dist: row,
              prev: rowParents,
            },
            {
              current: vertex,
              activeEdge:
                rowParents[vertex] == null ? null : token(rowParents[vertex], vertex),
              iteration: step,
              iterTable: [...iter, row].slice(0, step + 1),
              message: `Iteration ${step}: improve ${graph.vertices[vertex].label} to ${row[vertex]}.`,
            },
          ),
        );
      }
    }

    iter[step] = row;
    parentIter[step] = rowParents;

    snapshots.push(
      baseSnapshot(
        {
          ...state,
          dist: row,
          prev: rowParents,
        },
        {
          iteration: step,
          iterTable: iter.slice(0, step + 1),
          message: improved
            ? `End iteration ${step}; shortest paths using at most ${step} edges are recorded.`
            : `End iteration ${step}; no values changed.`,
        },
      ),
    );
  }

  const finalIndex = graph.vertices.length - 1;
  const dist = iter[finalIndex];
  const finalPrev = parentIter[finalIndex];
  const hasNegativeCycle = iter[graph.vertices.length].some(
    (value, index) => value < iter[graph.vertices.length - 1][index],
  );

  snapshots.push(
    baseSnapshot(
      {
        ...state,
        dist,
        prev: finalPrev,
      },
      {
        iteration: finalIndex,
        iterTable: iter,
        message: hasNegativeCycle
          ? "A negative cycle was detected because iteration n improved a distance."
          : "Bellman-Ford finished. dist[], prev[], and iter[][] are ready to cite.",
      },
    ),
  );

  return {
    algorithm: "bellman-ford",
    outputs: {
      dist,
      prev: finalPrev,
      iter,
      hasNegativeCycle,
    },
    snapshots,
  };
}

export function runBellmanFordQuery(graph, start, destination) {
  const incomingEdges = incoming(graph);
  const frontier = [];
  const visited = graph.vertices.map(() => false);
  const visitOrder = [];
  const prev = graph.vertices.map(() => null);
  const pre = graph.vertices.map(() => null);
  const post = graph.vertices.map(() => null);
  const ccnum = graph.vertices.map(() => null);
  const iter = [];
  const parentIter = [];
  const snapshots = [];

  iter[0] = graph.vertices.map((_, index) => (index === start ? 0 : INF));
  parentIter[0] = graph.vertices.map(() => null);

  const state = {
    frontier,
    frontierKind: "Iteration",
    visited,
    visitOrder,
    dist: iter[0],
    prev,
    pre,
    post,
    ccnum,
  };

  snapshots.push(
    baseSnapshot(state, {
      current: start,
      iteration: 0,
      iterTable: [iter[0]],
      queryKind: "initial",
      message: `Iteration 0 for source ${graph.vertices[start].label}.`,
    }),
  );

  let lastDestinationChangeStep = -1;

  for (let step = 1; step <= graph.vertices.length; step++) {
    const row = [...iter[step - 1]];
    const rowParents = [...parentIter[step - 1]];
    let improved = false;

    for (let vertex = 0; vertex < graph.vertices.length; vertex++) {
      let best = iter[step - 1][vertex];
      let bestParent = parentIter[step - 1][vertex];
      incomingEdges[vertex].forEach((edge) => {
        if (iter[step - 1][edge.from] === INF) return;
        const candidate = iter[step - 1][edge.from] + edge.weight;
        if (candidate >= best) return;
        best = candidate;
        bestParent = edge.from;
      });
      row[vertex] = best;
      rowParents[vertex] = bestParent;
      if (row[vertex] !== iter[step - 1][vertex]) improved = true;
    }

    iter[step] = row;
    parentIter[step] = rowParents;

    const destinationChanged =
      row[destination] !== iter[step - 1][destination] ||
      rowParents[destination] !== parentIter[step - 1][destination];
    if (destinationChanged) lastDestinationChangeStep = step;

    snapshots.push(
      baseSnapshot(
        {
          ...state,
          dist: row,
          prev: rowParents,
        },
        {
          current: destinationChanged ? destination : null,
          activeEdge:
            destinationChanged && rowParents[destination] != null
              ? token(rowParents[destination], destination)
              : null,
          iteration: step,
          iterTable: iter.slice(0, step + 1),
          queryKind: destinationChanged ? "dest-change" : "iteration-summary",
          message: destinationChanged
            ? `Iteration ${step}: ${graph.vertices[destination].label} improves to ${formatValue(row[destination])}.`
            : improved
              ? `End iteration ${step}; destination unchanged.`
              : `End iteration ${step}; no values changed.`,
        },
      ),
    );
  }

  const finalIndex = graph.vertices.length - 1;
  const dist = iter[finalIndex];
  const finalPrev = parentIter[finalIndex];
  const hasNegativeCycle = iter[graph.vertices.length].some(
    (value, index) => value < iter[graph.vertices.length - 1][index],
  );

  let cutoff = snapshots.length - 1;
  if (lastDestinationChangeStep !== -1) {
    cutoff = snapshots.findLastIndex(
      (snapshot) =>
        snapshot.iteration === lastDestinationChangeStep &&
        (snapshot.queryKind === "dest-change" ||
          snapshot.queryKind === "iteration-summary"),
    );
    if (cutoff === -1) cutoff = snapshots.length - 1;
  }

  const trimmedSnapshots = snapshots.slice(0, cutoff + 1);
  trimmedSnapshots.push(
    baseSnapshot(
      {
        ...state,
        dist,
        prev: finalPrev,
      },
      {
        iteration: finalIndex,
        iterTable: iter,
        queryKind: "done",
        message: hasNegativeCycle
          ? "A negative cycle was detected because iteration n improved a distance."
          : dist[destination] === INF
            ? `${graph.vertices[destination].label} remains unreachable after Bellman-Ford.`
            : `Bellman-Ford has determined the shortest-path value for ${graph.vertices[destination].label}.`,
      },
    ),
  );

  return {
    algorithm: "bellman-ford",
    outputs: {
      dist,
      prev: finalPrev,
      iter,
      hasNegativeCycle,
    },
    snapshots: trimmedSnapshots,
  };
}

export const SEARCH_FAMILIES = [
  {
    key: "branching",
    title: "Branching search",
    description: "A small graph where BFS layers and DFS depth-first choices visibly diverge.",
    variants: {
      undirected: {
        title: "Undirected",
        defaultStart: 0,
        graph: withPositions({
          directed: false,
          weighted: false,
          vertices: labeledVertices(["A", "B", "C", "D", "E", "F"]),
          positions: [
            { x: 80, y: 180 },
            { x: 190, y: 90 },
            { x: 190, y: 270 },
            { x: 320, y: 90 },
            { x: 320, y: 270 },
            { x: 450, y: 180 },
          ],
          edges: [
            { from: 0, to: 1 },
            { from: 0, to: 2 },
            { from: 1, to: 3 },
            { from: 2, to: 4 },
            { from: 1, to: 4 },
            { from: 3, to: 5 },
            { from: 4, to: 5 },
          ],
        }),
      },
      directed: {
        title: "Directed",
        defaultStart: 0,
        graph: withPositions({
          directed: true,
          weighted: false,
          vertices: labeledVertices(["A", "B", "C", "D", "E", "F"]),
          positions: [
            { x: 80, y: 180 },
            { x: 190, y: 90 },
            { x: 190, y: 270 },
            { x: 320, y: 90 },
            { x: 320, y: 270 },
            { x: 450, y: 180 },
          ],
          edges: [
            { from: 0, to: 1 },
            { from: 0, to: 2 },
            { from: 1, to: 3 },
            { from: 2, to: 4 },
            { from: 4, to: 1 },
            { from: 3, to: 5 },
            { from: 4, to: 5 },
          ],
        }),
      },
    },
  },
  {
    key: "branching-large",
    title: "Larger branching graph",
    description:
      "A 12-vertex example with several layers of branching so you can watch the frontier stay readable but grow more realistic.",
    variants: {
      undirected: {
        title: "Undirected",
        defaultStart: 0,
        graph: withPositions({
          directed: false,
          weighted: false,
          vertices: labeledVertices([
            "A",
            "B",
            "C",
            "D",
            "E",
            "F",
            "G",
            "H",
            "I",
            "J",
            "K",
            "L",
          ]),
          positions: [
            { x: 70, y: 180 },
            { x: 170, y: 80 },
            { x: 170, y: 180 },
            { x: 170, y: 280 },
            { x: 300, y: 50 },
            { x: 300, y: 130 },
            { x: 300, y: 230 },
            { x: 300, y: 310 },
            { x: 460, y: 90 },
            { x: 460, y: 180 },
            { x: 460, y: 270 },
            { x: 620, y: 180 },
          ],
          edges: [
            { from: 0, to: 1 },
            { from: 0, to: 2 },
            { from: 0, to: 3 },
            { from: 1, to: 4 },
            { from: 1, to: 5 },
            { from: 2, to: 5 },
            { from: 2, to: 6 },
            { from: 3, to: 6 },
            { from: 3, to: 7 },
            { from: 4, to: 8 },
            { from: 5, to: 8 },
            { from: 5, to: 9 },
            { from: 6, to: 9 },
            { from: 6, to: 10 },
            { from: 7, to: 10 },
            { from: 8, to: 11 },
            { from: 9, to: 11 },
            { from: 10, to: 11 },
          ],
        }),
      },
      directed: {
        title: "Directed",
        defaultStart: 0,
        graph: withPositions({
          directed: true,
          weighted: false,
          vertices: labeledVertices([
            "A",
            "B",
            "C",
            "D",
            "E",
            "F",
            "G",
            "H",
            "I",
            "J",
            "K",
            "L",
          ]),
          positions: [
            { x: 70, y: 180 },
            { x: 170, y: 80 },
            { x: 170, y: 180 },
            { x: 170, y: 280 },
            { x: 300, y: 50 },
            { x: 300, y: 130 },
            { x: 300, y: 230 },
            { x: 300, y: 310 },
            { x: 460, y: 90 },
            { x: 460, y: 180 },
            { x: 460, y: 270 },
            { x: 620, y: 180 },
          ],
          edges: [
            { from: 0, to: 1 },
            { from: 0, to: 2 },
            { from: 0, to: 3 },
            { from: 1, to: 4 },
            { from: 1, to: 5 },
            { from: 2, to: 5 },
            { from: 2, to: 6 },
            { from: 3, to: 6 },
            { from: 3, to: 7 },
            { from: 4, to: 8 },
            { from: 5, to: 8 },
            { from: 5, to: 9 },
            { from: 6, to: 9 },
            { from: 6, to: 10 },
            { from: 7, to: 10 },
            { from: 8, to: 11 },
            { from: 9, to: 11 },
            { from: 10, to: 11 },
            { from: 5, to: 10 },
            { from: 2, to: 7 },
          ],
        }),
      },
    },
  },
  {
    key: "disconnected",
    title: "Disconnected graph",
    description: "Useful for seeing that DFS continues into later components while BFS stops after the reachable region.",
    variants: {
      undirected: {
        title: "Undirected",
        defaultStart: 0,
        graph: withPositions({
          directed: false,
          weighted: false,
          vertices: labeledVertices(["A", "B", "C", "D", "E", "F", "G"]),
          positions: [
            { x: 80, y: 110 },
            { x: 190, y: 60 },
            { x: 190, y: 160 },
            { x: 340, y: 110 },
            { x: 520, y: 70 },
            { x: 520, y: 180 },
            { x: 640, y: 125 },
          ],
          edges: [
            { from: 0, to: 1 },
            { from: 0, to: 2 },
            { from: 1, to: 3 },
            { from: 4, to: 5 },
            { from: 5, to: 6 },
          ],
        }),
      },
    },
  },
  {
    key: "cycle",
    title: "Cycle and backtrack",
    description: "Highlights how DFS pre/post numbers behave around a directed cycle.",
    variants: {
      directed: {
        title: "Directed",
        defaultStart: 0,
        graph: withPositions({
          directed: true,
          weighted: false,
          vertices: labeledVertices(["A", "B", "C", "D", "E", "F"]),
          positions: [
            { x: 90, y: 180 },
            { x: 220, y: 80 },
            { x: 220, y: 280 },
            { x: 370, y: 80 },
            { x: 370, y: 280 },
            { x: 520, y: 180 },
          ],
          edges: [
            { from: 0, to: 1 },
            { from: 0, to: 2 },
            { from: 1, to: 3 },
            { from: 3, to: 4 },
            { from: 4, to: 1 },
            { from: 2, to: 4 },
            { from: 4, to: 5 },
          ],
        }),
      },
    },
  },
];

export const PATH_PRESETS = [
  {
    key: "unit",
    title: "Unit-weight routes",
    prompt: "Shortest route by number of hops in a directed graph.",
    defaultStart: 0,
    graph: withPositions({
      directed: true,
      weighted: false,
      vertices: labeledVertices(["A", "B", "C", "D", "E", "F"]),
      positions: [
        { x: 80, y: 180 },
        { x: 210, y: 90 },
        { x: 210, y: 270 },
        { x: 360, y: 90 },
        { x: 360, y: 270 },
        { x: 520, y: 180 },
      ],
      edges: [
        { from: 0, to: 1 },
        { from: 0, to: 2 },
        { from: 1, to: 3 },
        { from: 2, to: 3 },
        { from: 2, to: 4 },
        { from: 3, to: 5 },
        { from: 4, to: 5 },
      ],
    }),
  },
  {
    key: "positive-large",
    title: "Larger branching network",
    prompt: "A 12-vertex weighted graph with several plausible branches and merge points.",
    defaultStart: 0,
    graph: withPositions({
      directed: true,
      weighted: true,
      vertices: labeledVertices([
        "A",
        "B",
        "C",
        "D",
        "E",
        "F",
        "G",
        "H",
        "I",
        "J",
        "K",
        "L",
      ]),
      positions: [
        { x: 70, y: 180 },
        { x: 170, y: 80 },
        { x: 170, y: 180 },
        { x: 170, y: 280 },
        { x: 300, y: 50 },
        { x: 300, y: 130 },
        { x: 300, y: 230 },
        { x: 300, y: 310 },
        { x: 460, y: 90 },
        { x: 460, y: 180 },
        { x: 460, y: 270 },
        { x: 620, y: 180 },
      ],
      edges: [
        { from: 0, to: 1, weight: 2 },
        { from: 0, to: 2, weight: 4 },
        { from: 0, to: 3, weight: 3 },
        { from: 1, to: 4, weight: 2 },
        { from: 1, to: 5, weight: 5 },
        { from: 2, to: 5, weight: 1 },
        { from: 2, to: 6, weight: 4 },
        { from: 3, to: 6, weight: 2 },
        { from: 3, to: 7, weight: 6 },
        { from: 4, to: 8, weight: 4 },
        { from: 5, to: 8, weight: 2 },
        { from: 5, to: 9, weight: 3 },
        { from: 6, to: 9, weight: 2 },
        { from: 6, to: 10, weight: 5 },
        { from: 7, to: 10, weight: 2 },
        { from: 8, to: 11, weight: 3 },
        { from: 9, to: 11, weight: 2 },
        { from: 10, to: 11, weight: 1 },
        { from: 1, to: 9, weight: 9 },
        { from: 2, to: 10, weight: 8 },
      ],
    }),
  },
  {
    key: "positive",
    title: "Nonnegative weights",
    prompt: "Cheapest path when all costs are non-negative.",
    defaultStart: 0,
    graph: withPositions({
      directed: true,
      weighted: true,
      vertices: labeledVertices(["A", "B", "C", "D", "E", "F"]),
      positions: [
        { x: 80, y: 180 },
        { x: 210, y: 80 },
        { x: 210, y: 280 },
        { x: 360, y: 80 },
        { x: 360, y: 280 },
        { x: 520, y: 180 },
      ],
      edges: [
        { from: 0, to: 1, weight: 2 },
        { from: 0, to: 2, weight: 6 },
        { from: 1, to: 3, weight: 3 },
        { from: 1, to: 4, weight: 7 },
        { from: 2, to: 4, weight: 2 },
        { from: 3, to: 5, weight: 3 },
        { from: 4, to: 5, weight: 1 },
      ],
    }),
  },
  {
    key: "detour",
    title: "Fewest hops is not cheapest",
    prompt: "Same graph, but weight and hop count disagree.",
    defaultStart: 0,
    graph: withPositions({
      directed: true,
      weighted: true,
      vertices: labeledVertices(["A", "B", "C", "D", "E"]),
      positions: [
        { x: 80, y: 180 },
        { x: 220, y: 80 },
        { x: 220, y: 280 },
        { x: 390, y: 80 },
        { x: 540, y: 180 },
      ],
      edges: [
        { from: 0, to: 4, weight: 10 },
        { from: 0, to: 1, weight: 2 },
        { from: 1, to: 3, weight: 2 },
        { from: 3, to: 4, weight: 2 },
        { from: 0, to: 2, weight: 1 },
        { from: 2, to: 4, weight: 8 },
      ],
    }),
  },
  {
    key: "negative",
    title: "Negative edge rebate",
    prompt: "Cheapest path with a rebate edge but no negative cycle.",
    defaultStart: 0,
    graph: withPositions({
      directed: true,
      weighted: true,
      vertices: labeledVertices(["A", "B", "C", "D", "E"]),
      positions: [
        { x: 80, y: 180 },
        { x: 210, y: 70 },
        { x: 210, y: 290 },
        { x: 390, y: 110 },
        { x: 540, y: 180 },
      ],
      edges: [
        { from: 0, to: 1, weight: 4 },
        { from: 0, to: 2, weight: 5 },
        { from: 1, to: 3, weight: 3 },
        { from: 2, to: 3, weight: -4 },
        { from: 3, to: 4, weight: 3 },
        { from: 1, to: 4, weight: 10 },
      ],
    }),
  },
];

export const REDUCTION_CARDS = [
  {
    key: "reachability",
    title: "Can I get from s to t at all?",
    blackBox: "BFS or DFS",
    input: "Use the given graph unchanged and choose the required source vertex s.",
    outputArrays: ["dist[] or prev[] (BFS)", "prev[] / visited reachability (DFS narrative)"],
    postprocess:
      "Check whether t is reachable. In BFS, dist[t] != inf is the cleanest test. In DFS, t is reachable when it is explored from s.",
    runtime: "O(n + m)",
    why: "This is plain reachability. No edge weights or extra graph construction are needed.",
    modifications: "None beyond selecting the start vertex.",
  },
  {
    key: "minimum-hops",
    title: "What path uses the fewest edges?",
    blackBox: "BFS",
    input: "Treat each edge as one hop and run BFS from s.",
    outputArrays: ["dist[]", "prev[]"],
    postprocess:
      "Use dist[t] for the hop count. Follow prev[] backward from t to reconstruct an actual shortest-hop path.",
    runtime: "O(n + m)",
    why: "BFS explores vertices by layer, so the first time it reaches a vertex it has used the minimum number of edges.",
    modifications: "Do not add weights; the graph stays unweighted.",
  },
  {
    key: "recover-path",
    title: "I need an actual path, not just yes/no.",
    blackBox: "BFS or Dijkstra or Bellman-Ford",
    input:
      "Pick the black box that matches the cost model, then run it from s so that prev[] is filled in.",
    outputArrays: ["prev[]"],
    postprocess:
      "Start at the destination t and walk backward through prev[] until you reach s or nil, then reverse the sequence.",
    runtime: "Same as the chosen black box plus O(path length) to extract the path.",
    why: "All three of these black boxes return parent pointers that encode one shortest-path tree from the source.",
    modifications: "Only the choice of black box changes; path extraction is postprocessing.",
  },
  {
    key: "nonnegative-cost",
    title: "Cheapest path with non-negative edge costs",
    blackBox: "Dijkstra",
    input:
      "Keep the weighted graph and run Dijkstra from s, using the given non-negative weights.",
    outputArrays: ["dist[]", "prev[]"],
    postprocess:
      "Use dist[t] for the minimum total cost, or prev[] if you also need the actual path.",
    runtime: "O((n + m) log n)",
    why: "Non-negative weights are exactly the condition Dijkstra needs to settle vertices safely.",
    modifications: "None if the problem already gives the weighted graph.",
  },
  {
    key: "rebates",
    title: "Cheapest path with rebates or negative edges",
    blackBox: "Bellman-Ford",
    input:
      "Use the weighted directed graph and run Bellman-Ford from s even if some edges have negative weight.",
    outputArrays: ["dist[]", "prev[]", "iter[][]"],
    postprocess:
      "Use dist[t] or prev[] as usual. If iteration n improves anything beyond iteration n-1, report a reachable negative cycle instead.",
    runtime: "O(nm)",
    why: "Bellman-Ford does not assume non-negative weights and its iteration table explains how paths with more edges get considered.",
    modifications: "No graph modification is required unless the original problem first needs to be encoded as edge weights.",
  },
  {
    key: "all-destinations",
    title: "I need answers from one source to every vertex",
    blackBox: "BFS, Dijkstra, or Bellman-Ford",
    input:
      "Run the matching single-source black box once from s. The output arrays already contain an entry for every vertex.",
    outputArrays: ["dist[]", "prev[]"],
    postprocess:
      "Index directly into dist[v] or prev[v] for each destination vertex v. No reruns are needed from the same source.",
    runtime: "Exactly the runtime of the chosen black box.",
    why: "These black boxes are single-source by design: one run produces n answers at once.",
    modifications: "Choose the black box that matches whether the graph is unweighted, nonnegative weighted, or has negative edges.",
  },
  {
    key: "components",
    title: "How many connected pieces does an undirected graph have?",
    blackBox: "DFS",
    input:
      "Run DFS across the whole graph, starting from an arbitrary vertex and continuing with unexplored vertices.",
    outputArrays: ["ccnum[]"],
    postprocess:
      "The number of distinct values in ccnum[] is the number of connected components; equal labels mean same component.",
    runtime: "O(n + m)",
    why: "DFS explores one entire component before moving to the next, which is exactly what ccnum[] records.",
    modifications: "None, beyond using the full-graph DFS behavior instead of stopping after one source region.",
  },
];

export function getReductionCard(key) {
  return REDUCTION_CARDS.find((card) => card.key === key) ?? REDUCTION_CARDS[0];
}

function edgeTokenUndirected(from, to) {
  return from < to ? `${from}-${to}` : `${to}-${from}`;
}

function matrixClone(rows) {
  return rows.map((row) => [...row]);
}

function baseMatrix(graph, useCapacity = false) {
  const size = graph.vertices.length;
  const dist = Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, col) => (row === col ? 0 : INF)),
  );
  graph.edges.forEach((edge) => {
    const value = useCapacity
      ? edge.capacity ?? edge.weight ?? 0
      : edge.weight ?? edge.capacity ?? 1;
    dist[edge.from][edge.to] = Math.min(dist[edge.from][edge.to], value);
    if (!graph.directed) {
      dist[edge.to][edge.from] = Math.min(dist[edge.to][edge.from], value);
    }
  });
  return dist;
}

function topoSortDag(vertexCount, edges) {
  const indegree = Array(vertexCount).fill(0);
  const adj = Array.from({ length: vertexCount }, () => []);
  edges.forEach((edge) => {
    indegree[edge.from] += 0;
    indegree[edge.to] += 1;
    adj[edge.from].push(edge.to);
  });
  const queue = [];
  indegree.forEach((degree, vertex) => {
    if (degree === 0) queue.push(vertex);
  });
  queue.sort((left, right) => left - right);
  const order = [];
  while (queue.length) {
    const current = queue.shift();
    order.push(current);
    adj[current].forEach((next) => {
      indegree[next] -= 1;
      if (indegree[next] === 0) {
        queue.push(next);
        queue.sort((left, right) => left - right);
      }
    });
  }
  return order;
}

function buildMetaPositions(order, size) {
  const xStart = 90;
  const xEnd = 610;
  const spacing = size > 1 ? (xEnd - xStart) / (size - 1) : 0;
  const positions = Array.from({ length: size }, () => ({ x: 350, y: 180 }));
  order.forEach((component, index) => {
    positions[component] = {
      x: size === 1 ? 350 : xStart + spacing * index,
      y: 180 + (index % 2 === 0 ? -40 : 40),
    };
  });
  return positions;
}

function reverseGraph(graph) {
  return {
    ...graph,
    edges: graph.edges.map((edge) => ({
      ...edge,
      from: edge.to,
      to: edge.from,
    })),
  };
}

function computeScc(graph) {
  const reversed = outgoing(reverseGraph(graph));
  const visited = Array(graph.vertices.length).fill(false);
  const order = [];

  function visitReverse(vertex) {
    visited[vertex] = true;
    reversed[vertex].forEach((edge) => {
      if (!visited[edge.to]) visitReverse(edge.to);
    });
    order.push(vertex);
  }

  for (let vertex = 0; vertex < graph.vertices.length; vertex++) {
    if (!visited[vertex]) visitReverse(vertex);
  }

  const adj = outgoing(graph);
  const ccnum = Array(graph.vertices.length).fill(null);
  const components = [];
  const metaEdgeTokens = new Set();

  function assign(vertex, componentIndex) {
    ccnum[vertex] = componentIndex + 1;
    components[componentIndex].push(vertex);
    adj[vertex].forEach((edge) => {
      if (ccnum[edge.to] == null) assign(edge.to, componentIndex);
    });
  }

  for (let index = order.length - 1; index >= 0; index--) {
    const vertex = order[index];
    if (ccnum[vertex] != null) continue;
    const componentIndex = components.length;
    components.push([]);
    assign(vertex, componentIndex);
  }

  const metaEdges = [];
  graph.edges.forEach((edge) => {
    const from = ccnum[edge.from] - 1;
    const to = ccnum[edge.to] - 1;
    if (from === to) return;
    const edgeId = token(from, to);
    if (metaEdgeTokens.has(edgeId)) return;
    metaEdgeTokens.add(edgeId);
    metaEdges.push({ from, to });
  });

  const topoOrder = topoSortDag(components.length, metaEdges);
  const indegree = Array(components.length).fill(0);
  const outdegree = Array(components.length).fill(0);
  metaEdges.forEach((edge) => {
    indegree[edge.to] += 1;
    outdegree[edge.from] += 1;
  });
  const positions = buildMetaPositions(topoOrder, components.length);
  const metaGraph = withPositions({
    directed: true,
    weighted: false,
    vertices: components.map((members, index) => ({
      id: index,
      label: `C${index + 1}`,
      size: members.length,
      members,
    })),
    positions,
    edges: metaEdges,
  });

  return {
    ccnum,
    components,
    metaGraph,
    topoOrder,
    sourceComponents: indegree
      .map((degree, index) => (degree === 0 ? index + 1 : null))
      .filter((value) => value != null),
    sinkComponents: outdegree
      .map((degree, index) => (degree === 0 ? index + 1 : null))
      .filter((value) => value != null),
  };
}

export function analyzeDirectedStructure(graph) {
  const adj = outgoing(graph);
  const visited = Array(graph.vertices.length).fill(false);
  const inStack = Array(graph.vertices.length).fill(false);
  const prev = Array(graph.vertices.length).fill(null);
  const pre = Array(graph.vertices.length).fill(null);
  const post = Array(graph.vertices.length).fill(null);
  const ccnum = Array(graph.vertices.length).fill(null);
  const edgeTypes = {};
  let clock = 1;
  let component = 0;
  let firstBackEdge = null;

  function explore(vertex) {
    visited[vertex] = true;
    inStack[vertex] = true;
    pre[vertex] = clock++;
    adj[vertex].forEach((edge) => {
      const edgeId = token(edge.from, edge.to);
      if (!visited[edge.to]) {
        edgeTypes[edgeId] = "tree";
        prev[edge.to] = vertex;
        ccnum[edge.to] = component;
        explore(edge.to);
        return;
      }
      if (inStack[edge.to]) {
        edgeTypes[edgeId] = "back";
        if (!firstBackEdge) firstBackEdge = edgeId;
        return;
      }
      edgeTypes[edgeId] = pre[vertex] < pre[edge.to] ? "forward" : "cross";
    });
    inStack[vertex] = false;
    post[vertex] = clock++;
  }

  for (let vertex = 0; vertex < graph.vertices.length; vertex++) {
    if (visited[vertex]) continue;
    component += 1;
    ccnum[vertex] = component;
    explore(vertex);
  }

  const order = graph.vertices
    .map((_, vertex) => vertex)
    .sort((left, right) => post[right] - post[left]);
  const rank = Array(graph.vertices.length).fill(0);
  order.forEach((vertex, index) => {
    rank[vertex] = index;
  });
  const violatingEdge =
    graph.edges.find((edge) => rank[edge.from] > rank[edge.to]) ?? null;
  const scc = computeScc(graph);

  return {
    prev,
    pre,
    post,
    ccnum,
    edgeTypes,
    firstBackEdge,
    order,
    isDag: firstBackEdge == null && violatingEdge == null,
    violatingEdge,
    scc,
  };
}

function parseLiteral(literal) {
  if (literal.startsWith("!")) {
    return { variable: literal.slice(1), negated: true };
  }
  return { variable: literal, negated: false };
}

function negateLiteral(literal) {
  return literal.startsWith("!") ? literal.slice(1) : `!${literal}`;
}

function implicationPositions(variables) {
  const positions = [];
  variables.forEach((_, index) => {
    const y = 90 + index * 95;
    positions.push({ x: 190, y });
    positions.push({ x: 510, y });
  });
  return positions;
}

export function buildTwoSatImplicationGraph(formula) {
  const labels = [];
  formula.variables.forEach((variable) => {
    labels.push(variable);
    labels.push(`¬${variable}`);
  });
  const positions = implicationPositions(formula.variables);
  const indexByLiteral = new Map();
  formula.variables.forEach((variable, index) => {
    indexByLiteral.set(variable, index * 2);
    indexByLiteral.set(`!${variable}`, index * 2 + 1);
  });

  const seen = new Set();
  const edges = [];
  formula.clauses.forEach((clause, clauseIndex) => {
    const [left, right] = clause;
    const implications = [
      { from: negateLiteral(left), to: right },
      { from: negateLiteral(right), to: left },
    ];
    implications.forEach((item) => {
      const from = indexByLiteral.get(item.from);
      const to = indexByLiteral.get(item.to);
      const edgeId = token(from, to);
      if (seen.has(edgeId)) return;
      seen.add(edgeId);
      edges.push({
        from,
        to,
        clauseIndex,
        literalPair: clause,
      });
    });
  });

  return withPositions({
    directed: true,
    weighted: false,
    vertices: labeledVertices(labels),
    positions,
    edges,
  });
}

function bruteForceTwoSatAssignment(formula) {
  const total = 1 << formula.variables.length;
  for (let mask = 0; mask < total; mask++) {
    const assignment = {};
    formula.variables.forEach((variable, index) => {
      assignment[variable] = Boolean((mask >> index) & 1);
    });
    const okay = formula.clauses.every(([left, right]) => {
      const leftLit = parseLiteral(left);
      const rightLit = parseLiteral(right);
      const leftValue = leftLit.negated
        ? !assignment[leftLit.variable]
        : assignment[leftLit.variable];
      const rightValue = rightLit.negated
        ? !assignment[rightLit.variable]
        : assignment[rightLit.variable];
      return leftValue || rightValue;
    });
    if (okay) return assignment;
  }
  return null;
}

export function analyzeTwoSatFormula(formula) {
  const graph = buildTwoSatImplicationGraph(formula);
  const scc = computeScc(graph);
  const contradictions = formula.variables
    .map((variable, index) => {
      const pos = scc.ccnum[index * 2];
      const neg = scc.ccnum[index * 2 + 1];
      return pos === neg ? variable : null;
    })
    .filter((value) => value != null);

  return {
    graph,
    scc,
    satisfiable: contradictions.length === 0,
    contradictions,
    assignment: contradictions.length ? null : bruteForceTwoSatAssignment(formula),
  };
}

export function runFloydWarshall(graph) {
  const iter = [];
  const updates = [];
  iter[0] = baseMatrix(graph);

  for (let step = 1; step <= graph.vertices.length; step++) {
    const pivot = step - 1;
    const previous = iter[step - 1];
    const next = matrixClone(previous);
    const stepUpdates = [];

    for (let from = 0; from < graph.vertices.length; from++) {
      for (let to = 0; to < graph.vertices.length; to++) {
        const left = previous[from][pivot];
        const right = previous[pivot][to];
        const through =
          left === INF || right === INF ? INF : left + right;
        if (through >= previous[from][to]) continue;
        next[from][to] = through;
        stepUpdates.push({
          from,
          to,
          old: previous[from][to],
          via: pivot,
          through,
        });
      }
    }

    iter[step] = next;
    updates[step] = stepUpdates;
  }

  const final = iter[graph.vertices.length];
  const hasNegativeCycle = final.some((row, index) => row[index] < 0);

  return {
    iter,
    updates,
    dist: final,
    hasNegativeCycle,
  };
}

function findUndirectedEdge(graph, from, to) {
  return graph.edges.find(
    (edge) =>
      (edge.from === from && edge.to === to) ||
      (edge.from === to && edge.to === from),
  );
}

function relabelComponents(parent) {
  const seen = new Map();
  let next = 1;
  return parent.map((root) => {
    if (!seen.has(root)) {
      seen.set(root, next++);
    }
    return seen.get(root);
  });
}

export function runKruskalMst(graph) {
  const parent = graph.vertices.map((_, index) => index);
  const rank = graph.vertices.map(() => 0);
  const accepted = [];
  const rejected = [];
  const sortedEdges = [...graph.edges].sort((left, right) => {
    if (left.weight !== right.weight) return left.weight - right.weight;
    if (left.from !== right.from) return left.from - right.from;
    return left.to - right.to;
  });
  const snapshots = [];
  let totalWeight = 0;

  function find(vertex) {
    if (parent[vertex] !== vertex) parent[vertex] = find(parent[vertex]);
    return parent[vertex];
  }

  function unite(left, right) {
    const leftRoot = find(left);
    const rightRoot = find(right);
    if (leftRoot === rightRoot) return false;
    if (rank[leftRoot] < rank[rightRoot]) {
      parent[leftRoot] = rightRoot;
    } else if (rank[leftRoot] > rank[rightRoot]) {
      parent[rightRoot] = leftRoot;
    } else {
      parent[rightRoot] = leftRoot;
      rank[leftRoot] += 1;
    }
    return true;
  }

  snapshots.push({
    accepted: [],
    rejected: [],
    currentEdge: null,
    totalWeight,
    componentLabels: relabelComponents(parent.map((_, index) => find(index))),
    message: "Start with every vertex in its own component and sort edges by weight.",
  });

  sortedEdges.forEach((edge) => {
    const beforeComponents = relabelComponents(parent.map((_, index) => find(index)));
    const safe = find(edge.from) !== find(edge.to);
    if (safe) {
      accepted.push(edgeTokenUndirected(edge.from, edge.to));
      totalWeight += edge.weight;
      unite(edge.from, edge.to);
    } else {
      rejected.push(edgeTokenUndirected(edge.from, edge.to));
    }
    const afterComponents = relabelComponents(parent.map((_, index) => find(index)));
    snapshots.push({
      accepted: [...accepted],
      rejected: [...rejected],
      currentEdge: edgeTokenUndirected(edge.from, edge.to),
      totalWeight,
      componentLabels: safe ? afterComponents : beforeComponents,
      message: safe
        ? `Accept ${graph.vertices[edge.from].label}-${graph.vertices[edge.to].label}; it safely connects two components.`
        : `Reject ${graph.vertices[edge.from].label}-${graph.vertices[edge.to].label}; it would close a cycle.`,
    });
  });

  snapshots.push({
    accepted: [...accepted],
    rejected: [...rejected],
    currentEdge: null,
    totalWeight,
    componentLabels: relabelComponents(parent.map((_, index) => find(index))),
    message: "Kruskal finished. The accepted edges form a minimum spanning tree.",
  });

  return {
    snapshots,
    totalWeight,
    accepted,
    rejected,
  };
}

export function runPrimMst(graph, start = 0) {
  const adj = outgoing(graph);
  const inTree = graph.vertices.map(() => false);
  const key = graph.vertices.map(() => INF);
  const prev = graph.vertices.map(() => null);
  const snapshots = [];
  let totalWeight = 0;

  key[start] = 0;
  snapshots.push({
    inTree: [...inTree],
    key: [...key],
    prev: [...prev],
    currentVertex: start,
    currentEdge: null,
    totalWeight,
    message: `Start Prim at ${graph.vertices[start].label}; it enters the tree with key 0.`,
  });

  for (let picked = 0; picked < graph.vertices.length; picked++) {
    let current = null;
    for (let vertex = 0; vertex < graph.vertices.length; vertex++) {
      if (inTree[vertex]) continue;
      if (current == null || key[vertex] < key[current]) current = vertex;
    }
    if (current == null || key[current] === INF) break;
    inTree[current] = true;
    if (prev[current] != null) {
      const edge = findUndirectedEdge(graph, current, prev[current]);
      totalWeight += edge?.weight ?? 0;
    }
    adj[current].forEach((edge) => {
      if (inTree[edge.to]) return;
      if (edge.weight >= key[edge.to]) return;
      key[edge.to] = edge.weight;
      prev[edge.to] = current;
    });
    snapshots.push({
      inTree: [...inTree],
      key: [...key],
      prev: [...prev],
      currentVertex: current,
      currentEdge:
        prev[current] == null ? null : edgeTokenUndirected(prev[current], current),
      totalWeight,
      message:
        prev[current] == null
          ? `${graph.vertices[current].label} becomes the initial tree vertex.`
          : `Add ${graph.vertices[current].label} via the cheapest crossing edge from ${graph.vertices[prev[current]].label}.`,
    });
  }

  snapshots.push({
    inTree: [...inTree],
    key: [...key],
    prev: [...prev],
    currentVertex: null,
    currentEdge: null,
    totalWeight,
    message: "Prim finished. prev[] encodes one minimum spanning tree.",
  });

  return {
    snapshots,
    totalWeight,
    prev,
  };
}

function buildResidualEdges(graph, flowValues) {
  const residualEdges = [];
  graph.edges.forEach((edge, index) => {
    const capacity = edge.capacity ?? edge.weight ?? 0;
    const flow = flowValues[index];
    const forward = capacity - flow;
    if (forward > 0) {
      residualEdges.push({
        from: edge.from,
        to: edge.to,
        residual: forward,
        kind: "forward",
        edgeIndex: index,
      });
    }
    if (flow > 0) {
      residualEdges.push({
        from: edge.to,
        to: edge.from,
        residual: flow,
        kind: "backward",
        edgeIndex: index,
      });
    }
  });
  return residualEdges;
}

function reachableInResidual(vertexCount, residualEdges, source) {
  const adj = Array.from({ length: vertexCount }, () => []);
  residualEdges.forEach((edge) => {
    adj[edge.from].push(edge);
  });
  const seen = Array(vertexCount).fill(false);
  const queue = [source];
  seen[source] = true;
  while (queue.length) {
    const current = queue.shift();
    adj[current].forEach((edge) => {
      if (seen[edge.to]) return;
      seen[edge.to] = true;
      queue.push(edge.to);
    });
  }
  return seen;
}

export function extractResidualCut(graph, flowValues, source = 0) {
  const residualEdges = buildResidualEdges(graph, flowValues);
  const reachable = reachableInResidual(graph.vertices.length, residualEdges, source);
  const cutEdges = graph.edges
    .map((edge, index) => ({ edge, index }))
    .filter(({ edge }) => reachable[edge.from] && !reachable[edge.to])
    .map(({ index }) => index);
  return {
    reachable,
    cutEdges,
    residualEdges,
  };
}

export function runFordFulkerson(graph, source = 0, sink = graph.vertices.length - 1) {
  const flowValues = graph.edges.map(() => 0);
  const snapshots = [];
  let maxFlow = 0;

  function residualAdjacency() {
    const adj = Array.from({ length: graph.vertices.length }, () => []);
    buildResidualEdges(graph, flowValues).forEach((edge) => {
      adj[edge.from].push(edge);
    });
    return adj;
  }

  function dfs(current, seen, adj, path) {
    if (current === sink) return path;
    seen[current] = true;
    for (const edge of adj[current]) {
      if (edge.residual <= 0 || seen[edge.to]) continue;
      const next = dfs(edge.to, seen, adj, [...path, edge]);
      if (next) return next;
    }
    return null;
  }

  snapshots.push({
    flowValues: [...flowValues],
    residualEdges: buildResidualEdges(graph, flowValues),
    augmentPath: [],
    bottleneck: null,
    maxFlow,
    reachable: null,
    cutEdges: [],
    message: "Start with zero flow and the original capacities as forward residual edges.",
  });

  while (true) {
    const adj = residualAdjacency();
    const path = dfs(source, Array(graph.vertices.length).fill(false), adj, []);
    if (!path) break;
    const bottleneck = Math.min(...path.map((edge) => edge.residual));
    path.forEach((edge) => {
      if (edge.kind === "forward") {
        flowValues[edge.edgeIndex] += bottleneck;
      } else {
        flowValues[edge.edgeIndex] -= bottleneck;
      }
    });
    maxFlow += bottleneck;
    snapshots.push({
      flowValues: [...flowValues],
      residualEdges: buildResidualEdges(graph, flowValues),
      augmentPath: path.map((edge) => token(edge.from, edge.to)),
      bottleneck,
      maxFlow,
      reachable: null,
      cutEdges: [],
      message: `Augment along ${[source, ...path.map((edge) => edge.to)]
        .map((vertex) => graph.vertices[vertex].label)
        .join(" -> ")} with bottleneck ${bottleneck}.`,
    });
  }

  const cut = extractResidualCut(graph, flowValues, source);
  snapshots.push({
    flowValues: [...flowValues],
    residualEdges: cut.residualEdges,
    augmentPath: [],
    bottleneck: null,
    maxFlow,
    reachable: cut.reachable,
    cutEdges: cut.cutEdges,
    message:
      "No augmenting path remains. The reachable set in the residual graph defines a minimum cut.",
  });

  return {
    snapshots,
    flowValues,
    maxFlow,
    reachable: cut.reachable,
    cutEdges: cut.cutEdges,
  };
}

export const STRUCTURE_PRESETS = [
  {
    key: "dag",
    title: "Dependency DAG",
    prompt: "A clean DAG with multiple valid topological orders.",
    graph: withPositions({
      directed: true,
      weighted: false,
      vertices: labeledVertices(["A", "B", "C", "D", "E", "F", "G"]),
      positions: [
        { x: 80, y: 180 },
        { x: 210, y: 90 },
        { x: 210, y: 270 },
        { x: 360, y: 80 },
        { x: 360, y: 180 },
        { x: 360, y: 280 },
        { x: 540, y: 180 },
      ],
      edges: [
        { from: 0, to: 1 },
        { from: 0, to: 2 },
        { from: 1, to: 3 },
        { from: 1, to: 4 },
        { from: 2, to: 4 },
        { from: 2, to: 5 },
        { from: 3, to: 6 },
        { from: 4, to: 6 },
        { from: 5, to: 6 },
      ],
    }),
  },
  {
    key: "cycle",
    title: "One edge breaks the DAG",
    prompt: "The same dependency graph plus a single back edge that creates a cycle.",
    graph: withPositions({
      directed: true,
      weighted: false,
      vertices: labeledVertices(["A", "B", "C", "D", "E", "F", "G"]),
      positions: [
        { x: 80, y: 180 },
        { x: 210, y: 90 },
        { x: 210, y: 270 },
        { x: 360, y: 80 },
        { x: 360, y: 180 },
        { x: 360, y: 280 },
        { x: 540, y: 180 },
      ],
      edges: [
        { from: 0, to: 1 },
        { from: 0, to: 2 },
        { from: 1, to: 3 },
        { from: 1, to: 4 },
        { from: 2, to: 4 },
        { from: 2, to: 5 },
        { from: 3, to: 6 },
        { from: 4, to: 6 },
        { from: 5, to: 6 },
        { from: 6, to: 1 },
      ],
    }),
  },
  {
    key: "scc",
    title: "Condensation example",
    prompt: "Three SCCs chained together so the condensed graph is visibly a DAG.",
    graph: withPositions({
      directed: true,
      weighted: false,
      vertices: labeledVertices(["A", "B", "C", "D", "E", "F"]),
      positions: [
        { x: 90, y: 170 },
        { x: 200, y: 110 },
        { x: 310, y: 170 },
        { x: 420, y: 110 },
        { x: 530, y: 170 },
        { x: 420, y: 250 },
      ],
      edges: [
        { from: 0, to: 1 },
        { from: 1, to: 0 },
        { from: 1, to: 2 },
        { from: 2, to: 3 },
        { from: 3, to: 2 },
        { from: 3, to: 4 },
        { from: 4, to: 5 },
        { from: 5, to: 4 },
      ],
    }),
  },
];

export const TWO_SAT_PRESETS = [
  {
    key: "sat",
    title: "Satisfiable formula",
    prompt: "No variable shares an SCC with its negation.",
    variables: ["x1", "x2", "x3"],
    clauses: [
      ["x1", "x2"],
      ["!x1", "x3"],
      ["!x2", "x3"],
      ["!x3", "x1"],
    ],
  },
  {
    key: "unsat",
    title: "Unsatisfiable formula",
    prompt: "One extra pair of clauses forces a contradiction.",
    variables: ["x1", "x2"],
    clauses: [
      ["x1", "x2"],
      ["!x1", "x2"],
      ["x1", "!x2"],
      ["!x1", "!x2"],
    ],
  },
];

export const FW_PRESETS = [
  {
    key: "dense",
    title: "Dense weighted graph",
    prompt: "A small all-pairs problem where several shortest paths improve through intermediates.",
    graph: withPositions({
      directed: true,
      weighted: true,
      vertices: labeledVertices(["A", "B", "C", "D", "E"]),
      positions: [
        { x: 110, y: 180 },
        { x: 250, y: 80 },
        { x: 250, y: 280 },
        { x: 430, y: 90 },
        { x: 560, y: 180 },
      ],
      edges: [
        { from: 0, to: 1, weight: 3 },
        { from: 0, to: 2, weight: 9 },
        { from: 1, to: 2, weight: 2 },
        { from: 1, to: 3, weight: 5 },
        { from: 2, to: 3, weight: 1 },
        { from: 3, to: 4, weight: 2 },
        { from: 1, to: 4, weight: 10 },
        { from: 4, to: 0, weight: 7 },
      ],
    }),
  },
  {
    key: "negative-cycle",
    title: "Negative cycle signal",
    prompt: "The diagonal becomes negative once the cycle is usable as an intermediate.",
    graph: withPositions({
      directed: true,
      weighted: true,
      vertices: labeledVertices(["A", "B", "C", "D"]),
      positions: [
        { x: 110, y: 180 },
        { x: 280, y: 80 },
        { x: 280, y: 280 },
        { x: 500, y: 180 },
      ],
      edges: [
        { from: 0, to: 1, weight: 2 },
        { from: 1, to: 2, weight: -5 },
        { from: 2, to: 1, weight: 1 },
        { from: 2, to: 3, weight: 2 },
      ],
    }),
  },
];

export const MST_PRESETS = [
  {
    key: "campus",
    title: "Campus links",
    prompt: "A connected weighted graph with tempting low edges and one clear cycle rejection.",
    defaultStart: 0,
    graph: withPositions({
      directed: false,
      weighted: true,
      vertices: labeledVertices(["A", "B", "C", "D", "E", "F"]),
      positions: [
        { x: 90, y: 180 },
        { x: 220, y: 80 },
        { x: 220, y: 280 },
        { x: 390, y: 80 },
        { x: 390, y: 280 },
        { x: 560, y: 180 },
      ],
      edges: [
        { from: 0, to: 1, weight: 2 },
        { from: 0, to: 2, weight: 4 },
        { from: 1, to: 2, weight: 1 },
        { from: 1, to: 3, weight: 5 },
        { from: 2, to: 4, weight: 2 },
        { from: 3, to: 4, weight: 3 },
        { from: 3, to: 5, weight: 4 },
        { from: 4, to: 5, weight: 2 },
        { from: 2, to: 5, weight: 6 },
      ],
    }),
  },
  {
    key: "ties",
    title: "Ties and alternatives",
    prompt: "Several edges share the same weight, so the MST is not unique.",
    defaultStart: 0,
    graph: withPositions({
      directed: false,
      weighted: true,
      vertices: labeledVertices(["A", "B", "C", "D", "E"]),
      positions: [
        { x: 100, y: 180 },
        { x: 240, y: 70 },
        { x: 240, y: 290 },
        { x: 420, y: 110 },
        { x: 560, y: 180 },
      ],
      edges: [
        { from: 0, to: 1, weight: 2 },
        { from: 0, to: 2, weight: 2 },
        { from: 1, to: 3, weight: 2 },
        { from: 2, to: 3, weight: 2 },
        { from: 3, to: 4, weight: 1 },
        { from: 1, to: 2, weight: 3 },
        { from: 2, to: 4, weight: 4 },
      ],
    }),
  },
];

export const FLOW_PRESETS = [
  {
    key: "back-edge",
    title: "Backward edge rescue",
    prompt: "A deterministic Ford-Fulkerson run first makes a bad local choice, then fixes it with a backward residual edge.",
    source: 0,
    sink: 3,
    graph: withPositions({
      directed: true,
      weighted: true,
      vertices: labeledVertices(["S", "A", "B", "T"]),
      positions: [
        { x: 90, y: 180 },
        { x: 250, y: 90 },
        { x: 250, y: 270 },
        { x: 520, y: 180 },
      ],
      edges: [
        { from: 0, to: 1, weight: 1, capacity: 1 },
        { from: 0, to: 2, weight: 1, capacity: 1 },
        { from: 1, to: 2, weight: 1, capacity: 1 },
        { from: 1, to: 3, weight: 1, capacity: 1 },
        { from: 2, to: 3, weight: 1, capacity: 1 },
      ],
    }),
  },
  {
    key: "bottleneck",
    title: "Visible min cut",
    prompt: "The final residual reachable set exposes a small bottleneck cut.",
    source: 0,
    sink: 5,
    graph: withPositions({
      directed: true,
      weighted: true,
      vertices: labeledVertices(["S", "A", "B", "C", "D", "T"]),
      positions: [
        { x: 70, y: 180 },
        { x: 220, y: 90 },
        { x: 220, y: 270 },
        { x: 390, y: 90 },
        { x: 390, y: 270 },
        { x: 580, y: 180 },
      ],
      edges: [
        { from: 0, to: 1, weight: 4, capacity: 4 },
        { from: 0, to: 2, weight: 5, capacity: 5 },
        { from: 1, to: 3, weight: 3, capacity: 3 },
        { from: 2, to: 4, weight: 4, capacity: 4 },
        { from: 3, to: 5, weight: 2, capacity: 2 },
        { from: 4, to: 5, weight: 2, capacity: 2 },
        { from: 1, to: 4, weight: 2, capacity: 2 },
        { from: 2, to: 3, weight: 1, capacity: 1 },
      ],
    }),
  },
];
