import { useState } from "react";
import { TOKENS, TYPO, SIZES, buttonStyles } from "./vizTheme";

const C = {
  bg: TOKENS.panelBg,
  surface: TOKENS.surface,
  surfaceHover: TOKENS.surfaceStrong,
  border: TOKENS.border,
  borderActive: TOKENS.borderStrong,
  text: TOKENS.text,
  textMuted: TOKENS.textMuted,
  textDim: TOKENS.textDim,
  accent: TOKENS.accent,
  accentDim: "rgba(45,212,191,0.15)",
  orange: "#f59e0b",
  orangeDim: "rgba(245,158,11,0.15)",
  violet: "#a78bfa",
  violetDim: "rgba(167,139,250,0.15)",
  rose: "#fb7185",
  blue: "#60a5fa",
  emerald: "#34d399",
  edgeDim: "rgba(100,116,139,0.25)",
  edgeActive: TOKENS.accent,
  nodeDefault: TOKENS.surfaceStrong,
  nodeOnPath: "rgba(45,212,191,0.2)",
  codeBg: TOKENS.panelBg,
  cardShadow: TOKENS.shadow,
};

// ═══════════════════════════════════════
// PATTERN A BUILDERS
// ═══════════════════════════════════════

function buildLIS() {
  const seq = [3, 1, 4, 1, 5, 9, 2, 6],
    n = seq.length;
  const nodes = seq.map((v, i) => ({
    id: i,
    sublabel: `val=${v}`,
    dpValue: 1,
  }));
  const edges = [];
  for (let i = 1; i < n; i++) {
    let best = 0;
    for (let j = 0; j < i; j++)
      if (seq[j] < seq[i]) {
        edges.push({ from: j, to: i, active: false });
        if (nodes[j].dpValue >= best) best = nodes[j].dpValue;
      }
    nodes[i].dpValue = 1 + best;
  }
  let mx = 0,
    mi = 0;
  nodes.forEach((nd, i) => {
    if (nd.dpValue > mx) {
      mx = nd.dpValue;
      mi = i;
    }
  });
  const onP = new Set([mi]);
  let cur = mi;
  while (nodes[cur].dpValue > 1) {
    let f = false;
    for (let j = cur - 1; j >= 0; j--)
      if (seq[j] < seq[cur] && nodes[j].dpValue === nodes[cur].dpValue - 1) {
        onP.add(j);
        edges.forEach((e) => {
          if (e.from === j && e.to === cur) e.active = true;
        });
        cur = j;
        f = true;
        break;
      }
    if (!f) break;
  }
  nodes.forEach((nd, i) => {
    nd.onPath = onP.has(i);
  });
  return { nodes, edges, topoNote: "Left → right: i = 0, 1, ... n−1" };
}

function buildMaxSubarray() {
  const seq = [2, -3, 5, -1, 4, -2, 1],
    n = seq.length;
  const nodes = seq.map((v, i) => ({ id: i, sublabel: `a=${v}`, dpValue: 0 }));
  const edges = [];
  nodes[0].dpValue = seq[0];
  for (let i = 1; i < n; i++) {
    edges.push({ from: i - 1, to: i, active: false });
    nodes[i].dpValue = Math.max(seq[i], nodes[i - 1].dpValue + seq[i]);
  }
  let mx = -Infinity,
    mi = 0;
  nodes.forEach((nd, i) => {
    if (nd.dpValue > mx) {
      mx = nd.dpValue;
      mi = i;
    }
  });
  const onP = new Set([mi]);
  let cur = mi;
  while (cur > 0 && nodes[cur].dpValue !== seq[cur]) {
    onP.add(cur - 1);
    edges.forEach((e) => {
      if (e.from === cur - 1 && e.to === cur) e.active = true;
    });
    cur--;
  }
  nodes.forEach((nd, i) => {
    nd.onPath = onP.has(i);
  });
  return {
    nodes,
    edges,
    topoNote:
      "Left → right: each node depends only on its immediate predecessor",
  };
}

function buildCoinChange() {
  const coins = [1, 3, 4],
    V = 7,
    dp = Array(V + 1).fill(Infinity);
  dp[0] = 0;
  for (let v = 1; v <= V; v++)
    for (const c of coins)
      if (c <= v && dp[v - c] !== Infinity && dp[v - c] + 1 < dp[v])
        dp[v] = dp[v - c] + 1;
  const nodes = [],
    edges = [];
  for (let v = 0; v <= V; v++)
    nodes.push({
      id: v,
      sublabel: `$${v}`,
      dpValue: dp[v] === Infinity ? "∞" : dp[v],
    });
  for (let v = 1; v <= V; v++)
    for (const c of coins)
      if (c <= v) edges.push({ from: v - c, to: v, active: false, coinVal: c });
  const onP = new Set([V]);
  let cur = V;
  while (cur > 0) {
    let f = false;
    for (const c of coins)
      if (c <= cur && dp[cur - c] !== Infinity && dp[cur - c] + 1 === dp[cur]) {
        onP.add(cur - c);
        edges.forEach((e) => {
          if (e.from === cur - c && e.to === cur && e.coinVal === c)
            e.active = true;
        });
        cur -= c;
        f = true;
        break;
      }
    if (!f) break;
  }
  nodes.forEach((nd, i) => {
    nd.onPath = onP.has(i);
  });
  return {
    nodes,
    edges,
    topoNote: "Left → right: T(v) depends on T(v−c) for each coin c ∈ {1,3,4}",
  };
}

function buildLOS() {
  const seq = [1, 5, 3, 8, 2, 7],
    n = seq.length,
    up = Array(n).fill(1),
    down = Array(n).fill(1);
  const nodes = seq.map((v, i) => ({
    id: i,
    sublabel: `val=${v}`,
    dpValue: 1,
  }));
  const edges = [];
  for (let i = 1; i < n; i++) {
    for (let j = 0; j < i; j++) {
      if (seq[i] > seq[j]) {
        edges.push({ from: j, to: i, active: false, dir: "up" });
        if (down[j] + 1 > up[i]) up[i] = down[j] + 1;
      }
      if (seq[i] < seq[j]) {
        edges.push({ from: j, to: i, active: false, dir: "down" });
        if (up[j] + 1 > down[i]) down[i] = up[j] + 1;
      }
    }
    nodes[i].dpValue = Math.max(up[i], down[i]);
  }
  let mx = 0,
    mi = 0;
  nodes.forEach((nd, i) => {
    if (nd.dpValue > mx) {
      mx = nd.dpValue;
      mi = i;
    }
  });
  const onP = new Set([mi]);
  let cur = mi,
    lastD = up[cur] >= down[cur] ? "up" : "down",
    safe = 0;
  while (safe++ < 20) {
    let f = false;
    for (let j = cur - 1; j >= 0; j--) {
      if (lastD === "up" && seq[cur] > seq[j] && down[j] === up[cur] - 1) {
        onP.add(j);
        edges.forEach((e) => {
          if (e.from === j && e.to === cur && e.dir === "up") e.active = true;
        });
        cur = j;
        lastD = "down";
        f = true;
        break;
      }
      if (lastD === "down" && seq[cur] < seq[j] && up[j] === down[cur] - 1) {
        onP.add(j);
        edges.forEach((e) => {
          if (e.from === j && e.to === cur && e.dir === "down") e.active = true;
        });
        cur = j;
        lastD = "up";
        f = true;
        break;
      }
    }
    if (!f) break;
  }
  nodes.forEach((nd, i) => {
    nd.onPath = onP.has(i);
  });
  return {
    nodes,
    edges,
    topoNote:
      "Left → right: two DP values per node (up/down), alternating direction arcs",
  };
}

// PATTERN B BUILDERS
function buildGrid(X, Y, dpFn, baseFn, traceFn) {
  const m = X.length,
    n = Y.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  if (baseFn) baseFn(dp, m, n);
  const nodes = [],
    edges = [],
    id = (i, j) => i * (n + 1) + j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++) dpFn(dp, i, j, X, Y);
  for (let i = 0; i <= m; i++)
    for (let j = 0; j <= n; j++) {
      nodes.push({
        id: id(i, j),
        gridRow: i,
        gridCol: j,
        sublabel: `${dp[i][j]}`,
        dpValue: dp[i][j],
        onPath: false,
      });
      if (i > 0)
        edges.push({
          from: id(i - 1, j),
          to: id(i, j),
          active: false,
          type: "vertical",
        });
      if (j > 0)
        edges.push({
          from: id(i, j - 1),
          to: id(i, j),
          active: false,
          type: "horizontal",
        });
      if (i > 0 && j > 0)
        edges.push({
          from: id(i - 1, j - 1),
          to: id(i, j),
          active: false,
          type: "diagonal",
        });
    }
  const onP = new Set();
  traceFn(dp, m, n, X, Y, id, edges, onP);
  nodes.forEach((nd) => {
    nd.onPath = onP.has(nd.id);
  });
  return { nodes, edges, grid: true, rows: m + 1, cols: n + 1 };
}

function buildLCS() {
  const X = "ABCB",
    Y = "BDCB";
  const g = buildGrid(
    X,
    Y,
    (dp, i, j, X, Y) => {
      if (X[i - 1] === Y[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
    },
    null,
    (dp, m, n, X, Y, id, edges, onP) => {
      let ci = m,
        cj = n;
      onP.add(id(ci, cj));
      while (ci > 0 && cj > 0) {
        if (X[ci - 1] === Y[cj - 1]) {
          edges.forEach((e) => {
            if (
              e.from === id(ci - 1, cj - 1) &&
              e.to === id(ci, cj) &&
              e.type === "diagonal"
            )
              e.active = true;
          });
          ci--;
          cj--;
        } else if (dp[ci - 1][cj] >= dp[ci][cj - 1]) {
          edges.forEach((e) => {
            if (e.from === id(ci - 1, cj) && e.to === id(ci, cj))
              e.active = true;
          });
          ci--;
        } else {
          edges.forEach((e) => {
            if (e.from === id(ci, cj - 1) && e.to === id(ci, cj))
              e.active = true;
          });
          cj--;
        }
        onP.add(id(ci, cj));
      }
      while (ci > 0) {
        onP.add(id(ci - 1, cj));
        edges.forEach((e) => {
          if (e.from === id(ci - 1, cj) && e.to === id(ci, cj)) e.active = true;
        });
        ci--;
      }
      while (cj > 0) {
        onP.add(id(ci, cj - 1));
        edges.forEach((e) => {
          if (e.from === id(ci, cj - 1) && e.to === id(ci, cj)) e.active = true;
        });
        cj--;
      }
    },
  );
  return {
    ...g,
    X: "ε" + X,
    Y: "ε" + Y,
    topoNote: "Row by row, left → right. Diagonal = character match.",
  };
}

function buildEditDistance() {
  const X = "SAT",
    Y = "SUN";
  const g = buildGrid(
    X,
    Y,
    (dp, i, j, X, Y) => {
      if (X[i - 1] === Y[j - 1]) dp[i][j] = dp[i - 1][j - 1];
      else
        dp[i][j] = 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    },
    (dp, m, n) => {
      for (let i = 0; i <= m; i++) dp[i][0] = i;
      for (let j = 0; j <= n; j++) dp[0][j] = j;
    },
    (dp, m, n, X, Y, id, edges, onP) => {
      let ci = m,
        cj = n;
      onP.add(id(ci, cj));
      while (ci > 0 || cj > 0) {
        if (
          ci > 0 &&
          cj > 0 &&
          X[ci - 1] === Y[cj - 1] &&
          dp[ci][cj] === dp[ci - 1][cj - 1]
        ) {
          edges.forEach((e) => {
            if (
              e.from === id(ci - 1, cj - 1) &&
              e.to === id(ci, cj) &&
              e.type === "diagonal"
            )
              e.active = true;
          });
          ci--;
          cj--;
        } else if (ci > 0 && cj > 0 && dp[ci][cj] === dp[ci - 1][cj - 1] + 1) {
          edges.forEach((e) => {
            if (
              e.from === id(ci - 1, cj - 1) &&
              e.to === id(ci, cj) &&
              e.type === "diagonal"
            )
              e.active = true;
          });
          ci--;
          cj--;
        } else if (ci > 0 && dp[ci][cj] === dp[ci - 1][cj] + 1) {
          edges.forEach((e) => {
            if (e.from === id(ci - 1, cj) && e.to === id(ci, cj))
              e.active = true;
          });
          ci--;
        } else if (cj > 0) {
          edges.forEach((e) => {
            if (e.from === id(ci, cj - 1) && e.to === id(ci, cj))
              e.active = true;
          });
          cj--;
        } else break;
        onP.add(id(ci, cj));
      }
    },
  );
  return {
    ...g,
    X: "ε" + X,
    Y: "ε" + Y,
    topoNote: "Row by row. Base cases: T(i,0)=i, T(0,j)=j (non-zero!)",
  };
}

function buildMaxSquare() {
  const mat = [
      [1, 1, 0, 1],
      [1, 1, 1, 1],
      [0, 1, 1, 1],
      [1, 1, 1, 0],
    ],
    m = mat.length,
    n = mat[0].length;
  const dp = Array.from({ length: m }, () => Array(n).fill(0));
  const nodes = [],
    edges = [],
    id = (i, j) => i * n + j;
  for (let i = 0; i < m; i++)
    for (let j = 0; j < n; j++) {
      if (mat[i][j] === 0) dp[i][j] = 0;
      else if (i === 0 || j === 0) dp[i][j] = 1;
      else
        dp[i][j] = 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  for (let i = 0; i < m; i++)
    for (let j = 0; j < n; j++) {
      nodes.push({
        id: id(i, j),
        gridRow: i,
        gridCol: j,
        sublabel: `${dp[i][j]}`,
        dpValue: dp[i][j],
        onPath: false,
      });
      if (i > 0)
        edges.push({
          from: id(i - 1, j),
          to: id(i, j),
          active: false,
          type: "vertical",
        });
      if (j > 0)
        edges.push({
          from: id(i, j - 1),
          to: id(i, j),
          active: false,
          type: "horizontal",
        });
      if (i > 0 && j > 0)
        edges.push({
          from: id(i - 1, j - 1),
          to: id(i, j),
          active: false,
          type: "diagonal",
        });
    }
  let mx = 0,
    mi2 = 0,
    mj = 0;
  for (let i = 0; i < m; i++)
    for (let j = 0; j < n; j++)
      if (dp[i][j] > mx) {
        mx = dp[i][j];
        mi2 = i;
        mj = j;
      }
  const onP = new Set();
  for (let di = 0; di < mx; di++)
    for (let dj = 0; dj < mx; dj++) onP.add(id(mi2 - di, mj - dj));
  for (let i = mi2 - mx + 2; i <= mi2; i++)
    for (let j = mj - mx + 2; j <= mj; j++) {
      edges.forEach((e) => {
        if (e.from === id(i - 1, j) && e.to === id(i, j)) e.active = true;
      });
      edges.forEach((e) => {
        if (e.from === id(i, j - 1) && e.to === id(i, j)) e.active = true;
      });
      edges.forEach((e) => {
        if (
          e.from === id(i - 1, j - 1) &&
          e.to === id(i, j) &&
          e.type === "diagonal"
        )
          e.active = true;
      });
    }
  nodes.forEach((nd) => {
    nd.onPath = onP.has(nd.id);
  });
  return {
    nodes,
    edges,
    grid: true,
    rows: m,
    cols: n,
    colLabels: ["c0", "c1", "c2", "c3"],
    rowLabels: ["r0", "r1", "r2", "r3"],
    topoNote:
      "Row by row. T(i,j) = 1+min(↖,↑,←) if cell=1. Answer = max over ALL cells.",
  };
}

function buildPalindrome() {
  const S = "ABCBA",
    R = S.split("").reverse().join("");
  const g = buildGrid(
    S,
    R,
    (dp, i, j, S, R) => {
      if (S[i - 1] === R[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
    },
    null,
    (dp, m, n, S, R, id, edges, onP) => {
      let ci = m,
        cj = n;
      onP.add(id(ci, cj));
      while (ci > 0 && cj > 0) {
        if (S[ci - 1] === R[cj - 1]) {
          edges.forEach((e) => {
            if (
              e.from === id(ci - 1, cj - 1) &&
              e.to === id(ci, cj) &&
              e.type === "diagonal"
            )
              e.active = true;
          });
          ci--;
          cj--;
        } else if (dp[ci - 1][cj] >= dp[ci][cj - 1]) {
          edges.forEach((e) => {
            if (e.from === id(ci - 1, cj) && e.to === id(ci, cj))
              e.active = true;
          });
          ci--;
        } else {
          edges.forEach((e) => {
            if (e.from === id(ci, cj - 1) && e.to === id(ci, cj))
              e.active = true;
          });
          cj--;
        }
        onP.add(id(ci, cj));
      }
      while (ci > 0) {
        onP.add(id(ci - 1, cj));
        edges.forEach((e) => {
          if (e.from === id(ci - 1, cj) && e.to === id(ci, cj)) e.active = true;
        });
        ci--;
      }
      while (cj > 0) {
        onP.add(id(ci, cj - 1));
        edges.forEach((e) => {
          if (e.from === id(ci, cj - 1) && e.to === id(ci, cj)) e.active = true;
        });
        cj--;
      }
    },
  );
  return {
    ...g,
    X: "ε" + S,
    Y: "ε" + R,
    topoNote:
      "LCS(S, reverse(S)). Same grid DAG — problem transforms, not the algorithm.",
  };
}

// PATTERN C BUILDERS
function buildKnapsack() {
  const items = [
      { w: 2, v: 3 },
      { w: 3, v: 4 },
      { w: 4, v: 5 },
    ],
    W = 6,
    n = items.length;
  const dp = Array.from({ length: n + 1 }, () => Array(W + 1).fill(0));
  const nodes = [],
    edges = [],
    id = (i, w) => i * (W + 1) + w;
  for (let i = 1; i <= n; i++)
    for (let w = 0; w <= W; w++) {
      dp[i][w] = dp[i - 1][w];
      if (items[i - 1].w <= w)
        dp[i][w] = Math.max(
          dp[i][w],
          items[i - 1].v + dp[i - 1][w - items[i - 1].w],
        );
    }
  for (let i = 0; i <= n; i++)
    for (let w = 0; w <= W; w++) {
      nodes.push({
        id: id(i, w),
        gridRow: i,
        gridCol: w,
        sublabel: `${dp[i][w]}`,
        dpValue: dp[i][w],
        onPath: false,
      });
      if (i > 0) {
        edges.push({
          from: id(i - 1, w),
          to: id(i, w),
          active: false,
          type: "skip",
        });
        if (items[i - 1].w <= w)
          edges.push({
            from: id(i - 1, w - items[i - 1].w),
            to: id(i, w),
            active: false,
            type: "take",
          });
      }
    }
  let ci = n,
    cw = W;
  const onP = new Set([id(ci, cw)]);
  while (ci > 0) {
    if (
      items[ci - 1].w <= cw &&
      dp[ci][cw] === items[ci - 1].v + dp[ci - 1][cw - items[ci - 1].w]
    ) {
      const pw = cw - items[ci - 1].w;
      edges.forEach((e) => {
        if (e.from === id(ci - 1, pw) && e.to === id(ci, cw)) e.active = true;
      });
      cw = pw;
    } else {
      edges.forEach((e) => {
        if (
          e.from === id(ci - 1, cw) &&
          e.to === id(ci, cw) &&
          e.type === "skip"
        )
          e.active = true;
      });
    }
    ci--;
    onP.add(id(ci, cw));
  }
  nodes.forEach((nd) => {
    nd.onPath = onP.has(nd.id);
  });
  return {
    nodes,
    edges,
    grid: true,
    rows: n + 1,
    cols: W + 1,
    rowLabels: [
      "ε",
      ...items.map((it, i) => `item${i + 1}(w=${it.w},v=${it.v})`),
    ],
    colLabels: Array.from({ length: W + 1 }, (_, i) => `w=${i}`),
    topoNote:
      "Row by row. Skip = straight down, Take = diagonal jump left by w_i",
  };
}

function buildSubsetSum() {
  const nums = [3, 7, 1, 8, 4],
    K = 11,
    n = nums.length;
  const dp = Array.from({ length: n + 1 }, () => Array(K + 1).fill(false));
  dp[0][0] = true;
  const nodes = [],
    edges = [],
    id = (i, s) => i * (K + 1) + s;
  for (let i = 1; i <= n; i++)
    for (let s = 0; s <= K; s++) {
      dp[i][s] = dp[i - 1][s];
      if (nums[i - 1] <= s) dp[i][s] = dp[i][s] || dp[i - 1][s - nums[i - 1]];
    }
  for (let i = 0; i <= n; i++)
    for (let s = 0; s <= K; s++) {
      nodes.push({
        id: id(i, s),
        gridRow: i,
        gridCol: s,
        sublabel: dp[i][s] ? "T" : "F",
        dpValue: dp[i][s],
        onPath: false,
      });
      if (i > 0) {
        edges.push({
          from: id(i - 1, s),
          to: id(i, s),
          active: false,
          type: "skip",
        });
        if (nums[i - 1] <= s)
          edges.push({
            from: id(i - 1, s - nums[i - 1]),
            to: id(i, s),
            active: false,
            type: "take",
          });
      }
    }
  if (dp[n][K]) {
    let ci = n,
      cs = K;
    const onP = new Set([id(ci, cs)]);
    while (ci > 0) {
      if (nums[ci - 1] <= cs && dp[ci - 1][cs - nums[ci - 1]]) {
        const ps = cs - nums[ci - 1];
        edges.forEach((e) => {
          if (e.from === id(ci - 1, ps) && e.to === id(ci, cs)) e.active = true;
        });
        cs = ps;
      } else {
        edges.forEach((e) => {
          if (
            e.from === id(ci - 1, cs) &&
            e.to === id(ci, cs) &&
            e.type === "skip"
          )
            e.active = true;
        });
      }
      ci--;
      onP.add(id(ci, cs));
    }
    nodes.forEach((nd) => {
      nd.onPath = onP.has(nd.id);
    });
  }
  return {
    nodes,
    edges,
    grid: true,
    rows: n + 1,
    cols: K + 1,
    rowLabels: ["ε", ...nums.map((v) => `num=${v}`)],
    colLabels: Array.from({ length: K + 1 }, (_, i) => `s=${i}`),
    topoNote:
      "Boolean knapsack: T/F via OR instead of max. Same DAG shape as 0/1 knapsack.",
  };
}

function buildUnbounded() {
  const items = [
      { w: 2, v: 3 },
      { w: 3, v: 4 },
      { w: 5, v: 7 },
    ],
    W = 8;
  const dp = Array(W + 1).fill(0),
    nodes = [],
    edges = [];
  for (let w = 1; w <= W; w++)
    for (const it of items)
      if (it.w <= w && dp[w - it.w] + it.v > dp[w]) dp[w] = dp[w - it.w] + it.v;
  for (let w = 0; w <= W; w++)
    nodes.push({ id: w, sublabel: `cap=${w}`, dpValue: dp[w] });
  for (let w = 1; w <= W; w++)
    for (const it of items)
      if (it.w <= w)
        edges.push({ from: w - it.w, to: w, active: false, itemW: it.w });
  const onP = new Set([W]);
  let cur = W;
  while (cur > 0) {
    let f = false;
    for (const it of items)
      if (it.w <= cur && dp[cur] === dp[cur - it.w] + it.v) {
        onP.add(cur - it.w);
        edges.forEach((e) => {
          if (e.from === cur - it.w && e.to === cur && e.itemW === it.w)
            e.active = true;
        });
        cur -= it.w;
        f = true;
        break;
      }
    if (!f) break;
  }
  nodes.forEach((nd, i) => {
    nd.onPath = onP.has(i);
  });
  return {
    nodes,
    edges,
    topoNote:
      "1D: T(w) depends on T(w−w_i) for all items. Repetition → edges can reuse same source.",
  };
}

function buildFloydWarshall() {
  // 4-node weighted graph
  const n = 4;
  const INF = 999;
  const W = [
    [0, 3, INF, 7],
    [8, 0, 2, INF],
    [5, INF, 0, 1],
    [2, INF, INF, 0],
  ];
  // Run Floyd-Warshall
  const dp = W.map((r) => r.slice());
  const via = Array.from({ length: n }, () => Array(n).fill(-1));
  for (let k = 0; k < n; k++)
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++)
        if (dp[i][k] + dp[k][j] < dp[i][j]) {
          dp[i][j] = dp[i][k] + dp[k][j];
          via[i][j] = k;
        }
  const nodes = [],
    edges = [],
    id = (i, j) => i * n + j;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const val = dp[i][j];
      nodes.push({
        id: id(i, j),
        gridRow: i,
        gridCol: j,
        sublabel: val >= INF ? "∞" : `${val}`,
        dpValue: val >= INF ? -1 : val,
        onPath: false,
      });
      // Edges: each cell depends on row i col k and row k col j for each k
      if (i !== j)
        for (let k = 0; k < n; k++)
          if (k !== i && k !== j) {
            edges.push({
              from: id(i, k),
              to: id(i, j),
              active: false,
              type: "take",
            });
            edges.push({
              from: id(k, j),
              to: id(i, j),
              active: false,
              type: "take",
            });
          }
    }
  // Highlight shortest path 0→3
  const si = 0,
    sj = 3;
  function tracePath(i, j) {
    if (via[i][j] === -1) return;
    const k = via[i][j];
    nodes[id(i, k)].onPath = true;
    nodes[id(k, j)].onPath = true;
    tracePath(i, k);
    tracePath(k, j);
  }
  nodes[id(si, sj)].onPath = true;
  tracePath(si, sj);
  return {
    nodes,
    edges,
    grid: true,
    rows: n,
    cols: n,
    rowLabels: Array.from({ length: n }, (_, i) => `from ${i}`),
    colLabels: Array.from({ length: n }, (_, j) => `to ${j}`),
    topoNote:
      "n×n grid collapsed over k. Skip = keep dist(i,j). Take = route through node k: dist(i,k)+dist(k,j).",
  };
}

// PATTERN D BUILDERS (RESTORE BUT SHORTER CODE IF POSSIBLE)
function buildMatrixChain() {
  const dims = [10, 30, 5, 20],
    n = dims.length - 1;
  const dp = Array.from({ length: n }, () => Array(n).fill(0));
  const splits = Array.from({ length: n }, () => Array(n).fill(-1));
  for (let len = 2; len <= n; len++) {
    for (let i = 0; i <= n - len; i++) {
      const j = i + len - 1;
      dp[i][j] = Infinity;
      for (let k = i; k < j; k++) {
        const cost =
          dp[i][k] + dp[k + 1][j] + dims[i] * dims[k + 1] * dims[j + 1];
        if (cost < dp[i][j]) {
          dp[i][j] = cost;
          splits[i][j] = k;
        }
      }
    }
  }
  const nodes = [],
    edges = [],
    id = (i, j) => i * n + j;
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      nodes.push({
        id: id(i, j),
        gridRow: i,
        gridCol: j,
        sublabel: `${dp[i][j]}`,
        dpValue: dp[i][j],
        onPath: false,
      });
      if (i < j) {
        const k = splits[i][j];
        if (k !== -1) {
          edges.push({
            from: id(i, k),
            to: id(i, j),
            active: false,
            type: "left",
          });
          edges.push({
            from: id(k + 1, j),
            to: id(i, j),
            active: false,
            type: "right",
          });
        }
      }
    }
  }
  const onP = new Set();
  const recursePath = (i, j) => {
    onP.add(id(i, j));
    if (i === j) return;
    const k = splits[i][j];
    edges.forEach((e) => {
      if (e.to === id(i, j) && (e.from === id(i, k) || e.from === id(k + 1, j)))
        e.active = true;
    });
    recursePath(i, k);
    recursePath(k + 1, j);
  };
  recursePath(0, n - 1);
  nodes.forEach((nd) => {
    nd.onPath = onP.has(nd.id);
  });
  return {
    nodes,
    edges,
    grid: true,
    rows: n,
    cols: n,
    rowLabels: ["i=0", "i=1", "i=2"],
    colLabels: ["j=0", "j=1", "j=2"],
    topoNote:
      "Diagonal (len=1) → outward to Top-Right (len=n). Pyramidal build-up.",
  };
}

function buildIntervalLPS() {
  const S = "BBABCBCAB",
    n = S.length;
  const dp = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) dp[i][i] = 1;
  for (let len = 2; len <= n; len++) {
    for (let i = 0; i <= n - len; i++) {
      const j = i + len - 1;
      if (S[i] === S[j]) dp[i][j] = 2 + (len === 2 ? 0 : dp[i + 1][j - 1]);
      else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j - 1]);
    }
  }
  const nodes = [],
    edges = [],
    id = (i, j) => i * n + j;
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      nodes.push({
        id: id(i, j),
        gridRow: i,
        gridCol: j,
        sublabel: `${dp[i][j]}`,
        dpValue: dp[i][j],
        onPath: false,
      });
      if (i < j) {
        if (S[i] === S[j]) {
          if (j > i + 1)
            edges.push({
              from: id(i + 1, j - 1),
              to: id(i, j),
              active: false,
              type: "inner",
            });
        } else {
          edges.push({
            from: id(i + 1, j),
            to: id(i, j),
            active: false,
            type: "skip_i",
          });
          edges.push({
            from: id(i, j - 1),
            to: id(i, j),
            active: false,
            type: "skip_j",
          });
        }
      }
    }
  }
  const onP = new Set();
  let ci = 0,
    cj = n - 1;
  while (ci <= cj) {
    onP.add(id(ci, cj));
    if (ci === cj) break;
    if (S[ci] === S[cj]) {
      if (cj > ci + 1) {
        const ni = ci + 1,
          nj = cj - 1;
        edges.forEach((e) => {
          if (e.from === id(ni, nj) && e.to === id(ci, cj)) e.active = true;
        });
        ci = ni;
        cj = nj;
      } else break;
    } else {
      if (dp[ci + 1][cj] >= dp[ci][cj - 1]) {
        edges.forEach((e) => {
          if (e.from === id(ci + 1, cj) && e.to === id(ci, cj)) e.active = true;
        });
        ci++;
      } else {
        edges.forEach((e) => {
          if (e.from === id(ci, cj - 1) && e.to === id(ci, cj)) e.active = true;
        });
        cj--;
      }
    }
  }
  nodes.forEach((nd) => {
    nd.onPath = onP.has(nd.id);
  });
  return {
    nodes,
    edges,
    grid: true,
    rows: n,
    cols: n,
    rowLabels: [...S].map((c) => `i:${c}`),
    colLabels: [...S].map((c) => `j:${c}`),
    topoNote:
      "Diagonal → Top-Right. Interval shrinks to center or expands from center.",
  };
}

function buildOBST() {
  const keys = [10, 20, 30],
    freq = [5, 4, 1],
    n = keys.length;
  const dp = Array.from({ length: n }, () => Array(n).fill(0));
  const sumFreq = (i, j) => {
    let s = 0;
    for (let k = i; k <= j; k++) s += freq[k];
    return s;
  };
  for (let i = 0; i < n; i++) dp[i][i] = freq[i];
  for (let len = 2; len <= n; len++) {
    for (let i = 0; i <= n - len; i++) {
      const j = i + len - 1;
      let minCost = Infinity;
      const s = sumFreq(i, j);
      for (let r = i; r <= j; r++) {
        const c = s + (r > i ? dp[i][r - 1] : 0) + (r < j ? dp[r + 1][j] : 0);
        if (c < minCost) minCost = c;
      }
      dp[i][j] = minCost;
    }
  }
  const nodes = [],
    edges = [],
    id = (i, j) => i * n + j;
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      nodes.push({
        id: id(i, j),
        gridRow: i,
        gridCol: j,
        sublabel: `${dp[i][j]}`,
        dpValue: dp[i][j],
        onPath: false,
      });
      if (i < j) {
        edges.push({
          from: id(i, j - 1),
          to: id(i, j),
          active: false,
          type: "sub",
        });
        edges.push({
          from: id(i + 1, j),
          to: id(i, j),
          active: false,
          type: "sub",
        });
      }
    }
  }
  const onP = new Set([id(0, n - 1)]);
  nodes.forEach((nd) => (nd.onPath = onP.has(nd.id)));
  return {
    nodes,
    edges,
    grid: true,
    rows: n,
    cols: n,
    rowLabels: keys.map((k) => `k:${k}`),
    colLabels: keys.map((k) => `k:${k}`),
    topoNote: "Pyramid build-up. Cost calculated gathering sub-trees.",
  };
}

// ═══════════════════════════════════════
// PATTERN E BUILDERS (Tree DP)
// ═══════════════════════════════════════

function buildHouseRobberTree() {
  // Binary tree: [3, 2, 3, 3, null, null, 1]
  //       3
  //      / \
  //     2   3
  //    /     \
  //   3       1
  const vals = [3, 2, 3, 3, null, null, 1];
  const n = vals.length;
  // Compute rob/skip pairs (post-order)
  const rob = Array(n).fill(0),
    skip = Array(n).fill(0);
  const left = (i) =>
    2 * i + 1 < n && vals[2 * i + 1] !== null ? 2 * i + 1 : -1;
  const right = (i) =>
    2 * i + 2 < n && vals[2 * i + 2] !== null ? 2 * i + 2 : -1;
  function solve(i) {
    if (i === -1) return;
    solve(left(i));
    solve(right(i));
    const ls = left(i) === -1 ? 0 : skip[left(i)];
    const rs = right(i) === -1 ? 0 : skip[right(i)];
    const lr = left(i) === -1 ? 0 : rob[left(i)];
    const rr = right(i) === -1 ? 0 : rob[right(i)];
    rob[i] = vals[i] + ls + rs;
    skip[i] = Math.max(lr, ls) + Math.max(rr, rs);
  }
  solve(0);
  const opt = Math.max(rob[0], skip[0]);
  const nodes = [],
    edges = [];
  // Build tree layout with depth/position
  function layout(i, depth, xMin, xMax) {
    if (i === -1 || i >= n || vals[i] === null) return;
    const x = (xMin + xMax) / 2;
    const chosen = rob[i] >= skip[i] ? "rob" : "skip";
    nodes.push({
      id: i,
      treeX: x,
      treeY: depth,
      sublabel: `v=${vals[i]}`,
      dpValue: Math.max(rob[i], skip[i]),
      label2: `rob=${rob[i]} skip=${skip[i]}`,
      onPath: rob[0] >= skip[0] ? chosen === "rob" : chosen === "skip",
    });
    const li = left(i),
      ri = right(i);
    if (li !== -1) {
      edges.push({ from: li, to: i, active: false });
      layout(li, depth + 1, xMin, x);
    }
    if (ri !== -1) {
      edges.push({ from: ri, to: i, active: false });
      layout(ri, depth + 1, x, xMax);
    }
  }
  layout(0, 0, 0, 6);
  // Mark optimal path
  function markOpt(i, shouldRob) {
    if (i === -1) return;
    const nd = nodes.find((n) => n.id === i);
    nd.onPath = true;
    if (shouldRob) {
      nd.highlight = "rob";
      if (left(i) !== -1) markOpt(left(i), false);
      if (right(i) !== -1) markOpt(right(i), false);
    } else {
      nd.highlight = "skip";
      if (left(i) !== -1) markOpt(left(i), rob[left(i)] >= skip[left(i)]);
      if (right(i) !== -1) markOpt(right(i), rob[right(i)] >= skip[right(i)]);
    }
  }
  markOpt(0, rob[0] >= skip[0]);
  edges.forEach((e) => {
    const fn = nodes.find((n) => n.id === e.from);
    const tn = nodes.find((n) => n.id === e.to);
    if (fn && tn && fn.onPath && tn.onPath) e.active = true;
  });
  return {
    nodes,
    edges,
    tree: true,
    treeDepth: 3,
    topoNote:
      "Post-order: solve children first, then merge. Rob = val + skip(children). Skip = max(rob,skip) of each child.",
  };
}

function buildDiameter() {
  //       1
  //      / \
  //     2   3
  //    / \
  //   4   5
  //  /
  // 6
  const adj = { 1: [2, 3], 2: [4, 5], 3: [], 4: [6], 5: [], 6: [] };
  const depth = {};
  let diameter = 0;
  function dfs(v) {
    let maxD = 0,
      secD = 0;
    for (const c of adj[v]) {
      dfs(c);
      const d = depth[c] + 1;
      if (d > maxD) {
        secD = maxD;
        maxD = d;
      } else if (d > secD) secD = d;
    }
    depth[v] = maxD;
    diameter = Math.max(diameter, maxD + secD);
  }
  dfs(1);
  const nodes = [],
    edges = [];
  const positions = {
    1: [3, 0],
    2: [1.5, 1],
    3: [4.5, 1],
    4: [0.75, 2],
    5: [2.25, 2],
    6: [0.75, 3],
  };
  for (const v of [1, 2, 3, 4, 5, 6]) {
    nodes.push({
      id: v,
      treeX: positions[v][0],
      treeY: positions[v][1],
      sublabel: `node ${v}`,
      dpValue: depth[v],
      label2: `depth=${depth[v]}`,
      onPath: false,
    });
  }
  for (const [p, children] of Object.entries(adj))
    for (const c of children)
      edges.push({ from: c, to: Number(p), active: false });
  // Highlight diameter path: 6→4→2→5 (longest path = 3)
  // Actually the diameter path: find by tracing
  [6, 4, 2, 5].forEach((v) => {
    nodes.find((n) => n.id === v).onPath = true;
  });
  edges.forEach((e) => {
    if ([6, 4, 2, 5].includes(e.from) && [6, 4, 2, 5].includes(e.to))
      e.active = true;
  });
  // Also mark edge 2→5 (need reverse since our edges are child→parent)
  return {
    nodes,
    edges,
    tree: true,
    treeDepth: 4,
    topoNote:
      "Post-order: T(v) = max depth below v. Diameter candidate = left_depth + right_depth at each node.",
  };
}

function buildMaxPathSum() {
  //      -10
  //      / \
  //     9   20
  //        / \
  //       15  7
  const vals = [-10, 9, 20, null, null, 15, 7];
  const n = 7;
  const left = (i) =>
    2 * i + 1 < n && vals[2 * i + 1] !== null ? 2 * i + 1 : -1;
  const right = (i) =>
    2 * i + 2 < n && vals[2 * i + 2] !== null ? 2 * i + 2 : -1;
  const gain = Array(n).fill(0);
  let maxSum = -Infinity;
  let bestNode = 0;
  function solve(i) {
    if (i === -1) return 0;
    const lg = Math.max(0, solve(left(i)));
    const rg = Math.max(0, solve(right(i)));
    const pathThrough = vals[i] + lg + rg;
    if (pathThrough > maxSum) {
      maxSum = pathThrough;
      bestNode = i;
    }
    gain[i] = vals[i] + Math.max(lg, rg);
    return Math.max(0, gain[i]);
  }
  solve(0);
  const nodes = [],
    edges = [];
  const positions = {
    0: [3, 0],
    1: [1.5, 1],
    2: [4.5, 1],
    5: [3.5, 2],
    6: [5.5, 2],
  };
  const validNodes = [0, 1, 2, 5, 6];
  for (const i of validNodes) {
    nodes.push({
      id: i,
      treeX: positions[i][0],
      treeY: positions[i][1],
      sublabel: `val=${vals[i]}`,
      dpValue: gain[i],
      label2: `gain=${gain[i]}`,
      onPath: false,
    });
  }
  for (const i of validNodes) {
    if (left(i) !== -1 && validNodes.includes(left(i)))
      edges.push({ from: left(i), to: i, active: false });
    if (right(i) !== -1 && validNodes.includes(right(i)))
      edges.push({ from: right(i), to: i, active: false });
  }
  // Highlight the max path: 15→20→7 (sum = 42)
  [2, 5, 6].forEach((v) => {
    nodes.find((n) => n.id === v).onPath = true;
  });
  edges.forEach((e) => {
    if ([2, 5, 6].includes(e.from) && [2, 5, 6].includes(e.to)) e.active = true;
  });
  return {
    nodes,
    edges,
    tree: true,
    treeDepth: 3,
    topoNote:
      "Post-order: gain(v) = val(v) + max(0, best child gain). Path through v = val + max(0,left) + max(0,right). Global max = 42.",
  };
}

// ═══════════════════════════════════════
// PATTERN F BUILDERS (Bitmask DP)
// ═══════════════════════════════════════

function buildTSP() {
  // 4 cities, distance matrix
  const dist = [
    [0, 10, 15, 20],
    [10, 0, 35, 25],
    [15, 35, 0, 30],
    [20, 25, 30, 0],
  ];
  const n = 4;
  const full = (1 << n) - 1;
  const INF = 9999;
  // dp[mask][last] = min cost to visit cities in mask ending at last
  const dp = Array.from({ length: 1 << n }, () => Array(n).fill(INF));
  const parent = Array.from({ length: 1 << n }, () => Array(n).fill(-1));
  // Base: start at city 0
  dp[1][0] = 0;
  for (let mask = 1; mask <= full; mask++)
    for (let last = 0; last < n; last++) {
      if (!(mask & (1 << last)) || dp[mask][last] >= INF) continue;
      for (let next = 0; next < n; next++) {
        if (mask & (1 << next)) continue;
        const nm = mask | (1 << next);
        const cost = dp[mask][last] + dist[last][next];
        if (cost < dp[nm][next]) {
          dp[nm][next] = cost;
          parent[nm][next] = last;
        }
      }
    }
  // Find best return to 0
  let bestLast = 0,
    bestCost = INF;
  for (let last = 1; last < n; last++) {
    const total = dp[full][last] + dist[last][0];
    if (total < bestCost) {
      bestCost = total;
      bestLast = last;
    }
  }
  // Trace path
  const pathCells = [];
  let cm = full,
    cl = bestLast;
  while (cl !== -1) {
    pathCells.push({ mask: cm, last: cl });
    const pl = parent[cm][cl];
    cm = cm ^ (1 << cl);
    cl = pl;
  }
  pathCells.push({ mask: 1, last: 0 });
  const pathSet = new Set(pathCells.map((p) => `${p.mask},${p.last}`));
  // Build nodes grouped by popcount
  const nodes = [],
    edges = [];
  const popcount = (m) => {
    let c = 0;
    for (let i = 0; i < n; i++) if (m & (1 << i)) c++;
    return c;
  };
  const maskStr = (m) => m.toString(2).padStart(n, "0");
  // Sort masks by popcount
  const allMasks = [];
  for (let m = 1; m <= full; m++) allMasks.push(m);
  allMasks.sort((a, b) => popcount(a) - popcount(b) || a - b);
  const maskRow = {};
  let row = 0,
    prevPop = 0;
  const maskGroups = new Map();
  for (const m of allMasks) {
    const p = popcount(m);
    if (!maskGroups.has(p)) maskGroups.set(p, []);
    maskGroups.get(p).push(m);
  }
  let rowIdx = 0;
  for (const [pop, masks] of maskGroups) {
    for (const m of masks) {
      maskRow[m] = rowIdx;
      rowIdx++;
    }
  }
  const id = (mask, last) => mask * n + last;
  for (const m of allMasks)
    for (let last = 0; last < n; last++) {
      if (!(m & (1 << last))) continue;
      const val = dp[m][last];
      nodes.push({
        id: id(m, last),
        maskRow: maskRow[m],
        maskCol: last,
        mask: m,
        last,
        sublabel: val >= INF ? "∞" : `${val}`,
        dpValue: val >= INF ? -1 : val,
        onPath: pathSet.has(`${m},${last}`),
        maskLabel: maskStr(m),
      });
    }
  // Edges: from dp[mask\{last}][prev] to dp[mask][last]
  for (const m of allMasks)
    for (let last = 0; last < n; last++) {
      if (!(m & (1 << last)) || dp[m][last] >= INF) continue;
      const pm = m ^ (1 << last);
      if (pm === 0) continue;
      for (let prev = 0; prev < n; prev++) {
        if (!(pm & (1 << prev)) || dp[pm][prev] >= INF) continue;
        edges.push({
          from: id(pm, prev),
          to: id(m, last),
          active:
            pathSet.has(`${m},${last}`) &&
            pathSet.has(`${pm},${prev}`) &&
            parent[m][last] === prev,
        });
      }
    }
  return {
    nodes,
    edges,
    mask: true,
    numCities: n,
    topoNote: `TSP tour cost = ${bestCost}. Masks sorted by popcount. Each cell dp[mask][last] = min cost to visit set "mask" ending at city "last".`,
  };
}

function buildCanIWin() {
  // Numbers 1–4, target = 6
  const maxN = 4,
    target = 6;
  const full = (1 << maxN) - 1;
  const memo = {};
  function canWin(mask, total) {
    const key = mask;
    if (key in memo) return memo[key];
    for (let i = 0; i < maxN; i++) {
      if (mask & (1 << i)) continue; // already used
      const pick = i + 1;
      if (total + pick >= target) {
        memo[key] = true;
        return true;
      }
      if (!canWin(mask | (1 << i), total + pick)) {
        memo[key] = true;
        return true;
      }
    }
    memo[key] = false;
    return false;
  }
  canWin(0, 0);
  const nodes = [],
    edges = [];
  const popcount = (m) => {
    let c = 0;
    for (let i = 0; i < maxN; i++) if (m & (1 << i)) c++;
    return c;
  };
  const maskStr = (m) => m.toString(2).padStart(maxN, "0");
  const allMasks = [];
  for (let m = 0; m <= full; m++) allMasks.push(m);
  allMasks.sort((a, b) => popcount(a) - popcount(b) || a - b);
  const maskRow = {};
  let rowIdx = 0;
  for (const m of allMasks) {
    maskRow[m] = rowIdx++;
  }
  // Calculate totals
  const sumUsed = (m) => {
    let s = 0;
    for (let i = 0; i < maxN; i++) if (m & (1 << i)) s += i + 1;
    return s;
  };
  for (const m of allMasks) {
    const val = memo[m];
    if (val === undefined && m !== 0) continue;
    nodes.push({
      id: m,
      maskRow: maskRow[m],
      maskCol: 0,
      mask: m,
      sublabel: val === undefined ? "start" : val ? "WIN" : "LOSE",
      dpValue: val ? 1 : 0,
      onPath: m === 0,
      maskLabel: maskStr(m),
    });
  }
  // Edges: from mask to mask | (1<<i)
  for (const m of allMasks) {
    if (!(m in memo) && m !== 0) continue;
    for (let i = 0; i < maxN; i++) {
      if (m & (1 << i)) continue;
      const nm = m | (1 << i);
      if (nm in memo || sumUsed(nm) >= target) {
        edges.push({
          from: m,
          to: nm,
          active: false,
        });
      }
    }
  }
  // Highlight winning strategy from empty mask
  function markWinPath(m, total) {
    const nd = nodes.find((n) => n.id === m);
    if (nd) nd.onPath = true;
    for (let i = 0; i < maxN; i++) {
      if (m & (1 << i)) continue;
      const pick = i + 1;
      if (total + pick >= target) {
        const nm = m | (1 << i);
        const nnd = nodes.find((n) => n.id === nm);
        if (nnd) nnd.onPath = true;
        edges.forEach((e) => {
          if (e.from === m && e.to === nm) e.active = true;
        });
        return;
      }
      if (!canWin(m | (1 << i), total + pick)) {
        const nm = m | (1 << i);
        edges.forEach((e) => {
          if (e.from === m && e.to === nm) e.active = true;
        });
        markWinPath(nm, total + pick);
        return;
      }
    }
  }
  if (memo[0]) markWinPath(0, 0);
  return {
    nodes,
    edges,
    mask: true,
    numCities: 1,
    singleCol: true,
    topoNote: `Can first player win? ${memo[0] ? "YES" : "NO"}. Mask tracks used numbers. Each state: can current player force a win?`,
  };
}

function buildBeautifulArrangement() {
  // N = 4: count permutations where perm[i] % i == 0 or i % perm[i] == 0
  const N = 4;
  const full = (1 << N) - 1;
  const dp = Array(1 << N).fill(0);
  dp[0] = 1;
  const popcount = (m) => {
    let c = 0;
    for (let i = 0; i < N; i++) if (m & (1 << i)) c++;
    return c;
  };
  // dp[mask] = # beautiful arrangements using numbers in mask
  // Position = popcount(mask)
  for (let mask = 0; mask < 1 << N; mask++) {
    if (dp[mask] === 0) continue;
    const pos = popcount(mask) + 1; // next position to fill
    if (pos > N) continue;
    for (let num = 1; num <= N; num++) {
      if (mask & (1 << (num - 1))) continue; // already used
      if (pos % num === 0 || num % pos === 0) {
        dp[mask | (1 << (num - 1))] += dp[mask];
      }
    }
  }
  const nodes = [],
    edges = [];
  const maskStr = (m) => m.toString(2).padStart(N, "0");
  const allMasks = [];
  for (let m = 0; m <= full; m++) allMasks.push(m);
  allMasks.sort((a, b) => popcount(a) - popcount(b) || a - b);
  const maskRow = {};
  let rowIdx = 0;
  for (const m of allMasks) {
    maskRow[m] = rowIdx++;
  }
  for (const m of allMasks) {
    if (dp[m] === 0 && m !== 0) continue;
    nodes.push({
      id: m,
      maskRow: maskRow[m],
      maskCol: 0,
      mask: m,
      sublabel: `#${dp[m]}`,
      dpValue: dp[m],
      onPath: m === 0 || m === full,
      maskLabel: maskStr(m),
    });
  }
  for (const m of allMasks) {
    if (dp[m] === 0 && m !== 0) continue;
    const pos = popcount(m) + 1;
    if (pos > N) continue;
    for (let num = 1; num <= N; num++) {
      if (m & (1 << (num - 1))) continue;
      if (pos % num === 0 || num % pos === 0) {
        const nm = m | (1 << (num - 1));
        if (dp[nm] > 0)
          edges.push({
            from: m,
            to: nm,
            active: false,
          });
      }
    }
  }
  return {
    nodes,
    edges,
    mask: true,
    numCities: 1,
    singleCol: true,
    topoNote: `Count = ${dp[full]}. Mask tracks used numbers. Position = popcount+1. Transition if pos%num=0 or num%pos=0.`,
  };
}

const PROBLEMS = {
  lis: {
    pattern: "A",
    title: "Longest Increasing Subsequence",
    subproblem: "T(i) = length of LIS in A[1…i] which includes A[i]",
    input: "A = [3,1,4,1,5,9,2,6]",
    baseCases: "T(1) = 1",
    recurrence:
      "T(i) = 1 + max{T(j) : 1 ≤ j < i, A[j] < A[i]},\n       2 ≤ i ≤ n",
    answer: "return max{T(i)}, 1 ≤ i ≤ n",
    numSubproblems: "O(n)",
    runtime: "O(n²)",
    extractionRuntime: "O(n)",
    build: buildLIS,
    insight:
      "Each node looks back at ALL prior nodes. Answer scans all nodes because the LIS can end anywhere.",
    dagShape: "1D chain, backward arcs of varying length",
  },
  maxsub: {
    pattern: "A",
    title: "Maximum Subarray (Kadane's)",
    subproblem: "T(i) = max sum of a contiguous subarray ending at A[i]",
    input: "A = [2,−3,5,−1,4,−2,1]",
    baseCases: "T(1) = A[1]",
    recurrence: "T(i) = max(A[i], T(i−1) + A[i]),  2 ≤ i ≤ n",
    answer: "return max{T(i)}, 1 ≤ i ≤ n",
    numSubproblems: "O(n)",
    runtime: "O(n)",
    extractionRuntime: "O(n)",
    build: buildMaxSubarray,
    insight:
      "Simplest linear DAG: each node depends ONLY on the previous node. Decide: extend the subarray or restart here.",
    dagShape: "1D chain, each node → next node only",
  },
  coins: {
    pattern: "A",
    title: "Coin Change (Min Coins)",
    subproblem: "T(v) = minimum number of coins to make value v",
    input: "coins = {1,3,4}, V = 7",
    baseCases: "T(0) = 0",
    recurrence: "T(v) = 1 + min{T(v−c) : c ∈ coins, c ≤ v},\n       1 ≤ v ≤ V",
    answer: "return T(V)",
    numSubproblems: "O(V)",
    runtime: "O(V·|coins|)",
    extractionRuntime: "O(1)",
    build: buildCoinChange,
    insight:
      "Multiple backward jump lengths (one per coin). Unlike LIS, the answer IS T(V) — not a max scan.",
    dagShape: "1D chain, multiple fixed backward jumps",
  },
  oscillating: {
    pattern: "A",
    title: "Longest Oscillating Subsequence",
    subproblem:
      "up(i) = length of longest oscillating subseq ending at A[i] with last move up\ndown(i) = … with last move down",
    input: "A = [1,5,3,8,2,7]",
    baseCases: "up(1) = 1,  down(1) = 1",
    recurrence:
      "up(i) = 1 + max{down(j) : A[j] < A[i], 1 ≤ j < i}\ndown(i) = 1 + max{up(j) : A[j] > A[i], 1 ≤ j < i}\n       2 ≤ i ≤ n",
    answer: "return max{up(i), down(i)}, 1 ≤ i ≤ n",
    numSubproblems: "O(n)",
    runtime: "O(n²)",
    extractionRuntime: "O(n)",
    build: buildLOS,
    insight:
      "Like LIS but with TWO DP values per node. Edges alternate between 'went up' and 'went down'. Same scan-all-nodes answer extraction.",
    dagShape: "1D chain, two interleaved layers",
  },
  lcs: {
    pattern: "B",
    title: "Longest Common Subsequence",
    subproblem: "T(i,j) = length of LCS of X[1…i] and Y[1…j]",
    input: 'X = "ABCB", Y = "BDCB"',
    baseCases: "T(i,0) = 0, 0 ≤ i ≤ m\nT(0,j) = 0, 0 ≤ j ≤ n",
    recurrence:
      "T(i,j) = T(i−1,j−1) + 1,        if X[i] = Y[j]\n       = max(T(i−1,j), T(i,j−1)), otherwise\n       1 ≤ i ≤ m, 1 ≤ j ≤ n",
    answer: "return T(m, n)",
    numSubproblems: "O(mn)",
    runtime: "O(mn)",
    extractionRuntime: "O(1)",
    build: buildLCS,
    insight:
      "3-neighbor grid. Diagonal edges appear ONLY on character matches. Answer is always at the bottom-right corner.",
    dagShape: "2D grid, ≤3 edges into each cell",
  },
  edit: {
    pattern: "B",
    title: "Edit Distance",
    subproblem: "T(i,j) = min edits to transform X[1…i] into Y[1…j]",
    input: 'X = "SAT", Y = "SUN"',
    baseCases: "T(i,0) = i, 0 ≤ i ≤ m\nT(0,j) = j, 0 ≤ j ≤ n",
    recurrence:
      "T(i,j) = T(i−1,j−1),                     if X[i] = Y[j]\n       = 1 + min(T(i−1,j−1), T(i−1,j), T(i,j−1)), otherwise\n       1 ≤ i ≤ m, 1 ≤ j ≤ n",
    answer: "return T(m, n)",
    numSubproblems: "O(mn)",
    runtime: "O(mn)",
    extractionRuntime: "O(1)",
    build: buildEditDistance,
    insight:
      "Same grid as LCS but diagonal edges ALWAYS exist (replace operation). Base cases are non-zero: T(i,0)=i, T(0,j)=j.",
    dagShape: "2D grid, always 3 edges per interior cell",
  },
  maxsquare: {
    pattern: "B",
    title: "Maximum Square Submatrix",
    subproblem:
      "T(i,j) = side length of largest square of 1s ending at cell (i,j)",
    input: "4×4 binary matrix M",
    baseCases: "T(i,j) = M[i][j] if i = 1 or j = 1",
    recurrence:
      "T(i,j) = 0,                          if M[i][j] = 0\n       = 1 + min(T(i−1,j−1), T(i−1,j), T(i,j−1)), if M[i][j] = 1\n       2 ≤ i ≤ m, 2 ≤ j ≤ n",
    answer: "return max{T(i,j)}, 1 ≤ i ≤ m, 1 ≤ j ≤ n",
    numSubproblems: "O(mn)",
    runtime: "O(mn)",
    extractionRuntime: "O(mn)",
    build: buildMaxSquare,
    insight:
      "Same 3-neighbor structure as Edit Distance, but answer requires scanning ALL cells. The highlighted region is the max square found.",
    dagShape: "2D grid, min of 3 neighbors",
  },
  palindrome: {
    pattern: "B",
    title: "Longest Palindromic Subsequence",
    subproblem: "T(i,j) = length of LCS of S[1…i] and reverse(S)[1…j]",
    input: 'S = "ABCBA" → LCS(S, rev(S))',
    baseCases: "T(i,0) = 0, T(0,j) = 0",
    recurrence: "Same as LCS with Y = reverse(X)",
    answer: "return T(n, n)",
    numSubproblems: "O(n²)",
    runtime: "O(n²)",
    extractionRuntime: "O(1)",
    build: buildPalindrome,
    insight:
      "Clever reduction: palindrome = LCS of string with its reverse. Identical DAG to LCS — the problem transforms, not the algorithm.",
    dagShape: "(n+1)×(n+1) grid, same as LCS",
  },
  knapsack: {
    pattern: "C",
    title: "0/1 Knapsack",
    subproblem: "T(i,w) = max value using items 1…i with capacity w",
    input: "items = [(w=2,v=3),(w=3,v=4),(w=4,v=5)], W=6",
    baseCases: "T(0,w) = 0, 0 ≤ w ≤ W",
    recurrence:
      "T(i,w) = max(T(i−1,w), v_i + T(i−1, w−w_i)),  if w_i ≤ w\n       = T(i−1,w),                               otherwise\n       1 ≤ i ≤ n, 0 ≤ w ≤ W",
    answer: "return T(n, W)",
    numSubproblems: "O(nW)",
    runtime: "O(nW)",
    extractionRuntime: "O(1)",
    build: buildKnapsack,
    insight:
      "Skip = straight down. Take = diagonal jump left by w_i. The variable jump distance is why capacity W must be a table dimension.",
    dagShape: "2D grid with variable diagonal jumps",
  },
  subset: {
    pattern: "C",
    title: "Subset Sum",
    subproblem: "T(i,s) = TRUE iff a subset of nums[1…i] sums to s",
    input: "nums = [3,7,1,8,4], K = 11",
    baseCases: "T(0,0) = TRUE\nT(0,s) = FALSE, 1 ≤ s ≤ K",
    recurrence:
      "T(i,s) = T(i−1,s) OR T(i−1, s−nums[i]),  if nums[i] ≤ s\n       = T(i−1,s),                           otherwise\n       1 ≤ i ≤ n, 0 ≤ s ≤ K",
    answer: "return T(n, K)",
    numSubproblems: "O(nK)",
    runtime: "O(nK)",
    extractionRuntime: "O(1)",
    build: buildSubsetSum,
    insight:
      "Boolean knapsack: OR instead of MAX. Same DAG shape — the edge semantics change but the graph is identical.",
    dagShape: "Same as 0/1 Knapsack, boolean values",
  },
  unbounded: {
    pattern: "C",
    title: "Unbounded Knapsack",
    subproblem: "T(w) = max value achievable with capacity w (items reusable)",
    input: "items = [(w=2,v=3),(w=3,v=4),(w=5,v=7)], W=8",
    baseCases: "T(0) = 0",
    recurrence:
      "T(w) = max{v_i + T(w−w_i) : w_i ≤ w, 1 ≤ i ≤ n},\n       1 ≤ w ≤ W",
    answer: "return T(W)",
    numSubproblems: "O(W)",
    runtime: "O(W·n)",
    extractionRuntime: "O(1)",
    build: buildUnbounded,
    insight:
      "With repetition allowed, the 2D grid collapses to 1D! Each T(w) pulls from T(w−w_i) for all items. Same shape as Coin Change.",
    dagShape: "1D chain, multiple backward jumps (like Coin Change)",
  },
  floyd: {
    pattern: "C",
    title: "Floyd-Warshall (APSP)",
    subproblem:
      "T(k,i,j) = shortest path from i to j using intermediate nodes {1…k}",
    input: "4-node weighted directed graph",
    baseCases: "T(0,i,j) = weight(i,j), or ∞ if no edge",
    recurrence:
      "T(k,i,j) = min(T(k−1,i,j), T(k−1,i,k) + T(k−1,k,j)),\n       1 ≤ k ≤ n, 1 ≤ i,j ≤ n",
    answer: "return T(n,i,j) for all i,j",
    numSubproblems: "O(n³)",
    runtime: "O(n³)",
    extractionRuntime: "O(n²)",
    build: buildFloydWarshall,
    insight:
      "Same skip/take as Knapsack but with intermediate nodes instead of items. The k-loop collapses in-place, so the grid shows the final n×n distance matrix.",
    dagShape: "n×n grid, collapsed over k (like Knapsack over items)",
  },
  mcm: {
    pattern: "D",
    title: "Matrix Chain Multiplication",
    subproblem: "T(i,j) = min cost to multiply matrices A_i through A_j",
    input: "dims = [10, 30, 5, 20]  (3 matrices)",
    baseCases: "T(i,i) = 0, 1 ≤ i ≤ n",
    recurrence:
      "T(i,j) = min{T(i,k) + T(k+1,j) + d_{i-1}·d_k·d_j},\n       i ≤ k < j,  for len = j−i+1 from 2 to n",
    answer: "return T(1, n)",
    numSubproblems: "O(n²)",
    runtime: "O(n³)",
    extractionRuntime: "O(1)",
    build: buildMatrixChain,
    insight:
      "Interval DP. State is a range [i, j]. We iterate by length. Dependencies come from splitting the range into two smaller sub-ranges.",
    dagShape: "Pyramid / Upper Triangular Grid",
  },
  lps_interval: {
    pattern: "D",
    title: "Longest Palindromic Subseq (Interval)",
    subproblem: "T(i,j) = length of longest palindromic subsequence in S[i…j]",
    input: "S = 'BBABCBCAB'",
    baseCases: "T(i,i) = 1, 1 ≤ i ≤ n",
    recurrence:
      "T(i,j) = 2 + T(i+1,j−1),              if S[i] = S[j]\n       = max(T(i+1,j), T(i,j−1)),      otherwise\n       for len = j−i+1 from 2 to n",
    answer: "return T(1, n)",
    numSubproblems: "O(n²)",
    runtime: "O(n²)",
    extractionRuntime: "O(1)",
    build: buildIntervalLPS,
    insight:
      "Direct Interval DP approach (vs LCS reduction). We shrink from edges inwards. Note how dependencies are 'down-left' in the grid.",
    dagShape: "Pyramid / Upper Triangular Grid",
  },
  obst: {
    pattern: "D",
    title: "Optimal Binary Search Tree",
    subproblem: "T(i,j) = min expected search cost for keys[i…j]",
    input: "keys=[10,20,30], freq=[5,4,1]",
    baseCases: "T(i,i) = freq[i], 1 ≤ i ≤ n",
    recurrence:
      "T(i,j) = sum(freq[i…j]) + min{T(i,r−1) + T(r+1,j)},\n       i ≤ r ≤ j,  for len = j−i+1 from 2 to n",
    answer: "return T(1, n)",
    numSubproblems: "O(n²)",
    runtime: "O(n³)",
    extractionRuntime: "O(1)",
    build: buildOBST,
    insight:
      "Classic Interval DP. We try every root 'r' and combine optimal left and right subtrees. Similar structure to MCM.",
    dagShape: "Pyramid / Upper Triangular Grid",
  },
  // Pattern E: Tree DP
  houserobber3: {
    pattern: "E",
    title: "House Robber III",
    subproblem: "rob(v) = max take including v\nskip(v) = max take excluding v",
    input: "Binary tree: [3, 2, 3, 3, null, null, 1]",
    baseCases: "rob(leaf) = val(leaf)\nskip(leaf) = 0",
    recurrence:
      "rob(v) = val(v) + skip(left) + skip(right)\nskip(v) = max(rob,skip)(left) + max(rob,skip)(right)",
    answer: "return max(rob(root), skip(root))",
    numSubproblems: "O(n)",
    runtime: "O(n)",
    extractionRuntime: "O(1)",
    build: buildHouseRobberTree,
    insight:
      "Each node returns a PAIR: [rob, skip]. The parent combines children's pairs. Same take/skip as Knapsack but on a tree.",
    dagShape: "Binary tree, post-order traversal",
  },
  diameter: {
    pattern: "E",
    title: "Diameter of Binary Tree",
    subproblem: "T(v) = depth of deepest leaf reachable from v",
    input: "6-node binary tree",
    baseCases: "T(leaf) = 0",
    recurrence:
      "T(v) = 1 + max(T(left), T(right))\ndiameter candidate at v = T(left) + T(right)",
    answer: "return max{T(left) + T(right)} over all v",
    numSubproblems: "O(n)",
    runtime: "O(n)",
    extractionRuntime: "O(n)  (global max scan)",
    build: buildDiameter,
    insight:
      "Return depth to parent, but track diameter globally. Like LIS: the answer isn't T(root) — it's a max scan over all nodes.",
    dagShape: "Binary tree, post-order traversal",
  },
  maxpathsum: {
    pattern: "E",
    title: "Max Path Sum",
    subproblem: "gain(v) = max path sum starting at v going downward",
    input: "Tree: [-10, 9, 20, null, null, 15, 7]",
    baseCases: "gain(null) = 0",
    recurrence:
      "gain(v) = val(v) + max(0, max(gain(left), gain(right)))\npath through v = val(v) + max(0,gain(left)) + max(0,gain(right))",
    answer: "return max{path through v} over all v",
    numSubproblems: "O(n)",
    runtime: "O(n)",
    extractionRuntime: "O(n)  (global max scan)",
    build: buildMaxPathSum,
    insight:
      "Negative values → clip child gains to 0. Path can go left-through-root-right. Global max like Diameter.",
    dagShape: "Binary tree, post-order traversal",
  },
  // Pattern F: Bitmask DP
  tsp: {
    pattern: "F",
    title: "Traveling Salesman (TSP)",
    subproblem: "T(S, j) = min cost to visit all cities in set S, ending at j",
    input: "4 cities, symmetric distance matrix",
    baseCases: "T({0}, 0) = 0  (start at city 0)",
    recurrence:
      "T(S, j) = min{T(S\\{j}, k) + dist(k, j) : k ∈ S\\{j}},\n       |S| ≥ 2, j ∈ S",
    answer: "return min{T(all, j) + dist(j, 0)}, j ≠ 0",
    numSubproblems: "O(2ⁿ · n)",
    runtime: "O(2ⁿ · n²)",
    extractionRuntime: "O(n)",
    build: buildTSP,
    insight:
      "State = (visited set, last city). Rows sorted by popcount show the level-by-level subset expansion. Each level adds one city to the tour.",
    dagShape: "Hypercube: rows = masks by popcount, cols = last city",
  },
  caniwin: {
    pattern: "F",
    title: "Can I Win?",
    subproblem:
      "T(mask) = can current player force a win with available numbers?",
    input: "Numbers 1–4, target = 6",
    baseCases: "T(mask) = TRUE if any available pick ≥ remaining",
    recurrence:
      "T(mask) = ∃ i ∉ mask : ¬T(mask ∪ {i}),\n       i.e. current player wins if ANY move leaves opponent losing",
    answer: "return T(∅)",
    numSubproblems: "O(2ⁿ)",
    runtime: "O(2ⁿ · n)",
    extractionRuntime: "O(1)",
    build: buildCanIWin,
    insight:
      "Game theory bitmask: boolean DP with NOT. A state is winning if ANY child state is losing for the opponent.",
    dagShape: "Single-column mask states, sorted by popcount",
  },
  beautiful: {
    pattern: "F",
    title: "Beautiful Arrangement",
    subproblem:
      "T(mask) = # valid arrangements using numbers in mask for positions 1…popcount(mask)",
    input: "N = 4, divisibility condition",
    baseCases: "T(∅) = 1",
    recurrence:
      "T(mask) = Σ T(mask\\{num}) for valid (num, pos) pairs,\n       pos = popcount(mask), num ∈ mask, pos|num or num|pos",
    answer: "return T(full mask)",
    numSubproblems: "O(2ⁿ)",
    runtime: "O(2ⁿ · n)",
    extractionRuntime: "O(1)",
    build: buildBeautifulArrangement,
    insight:
      "Counting (not optimizing) via bitmask. Position = popcount(mask). Shows that bitmask DP can count permutations, not just find optima.",
    dagShape: "Single-column mask states, sorted by popcount",
  },
};

const PATTERN_META = {
  A: {
    label: "Pattern A: Linear (1D Chain)",
    color: C.accent,
    problems: ["lis", "maxsub", "coins", "oscillating"],
  },
  B: {
    label: "Pattern B: Grid / Dual-Sequence (2D Mesh)",
    color: C.violet,
    problems: ["lcs", "edit", "maxsquare", "palindrome"],
  },
  C: {
    label: "Pattern C: Pseudo-Polynomial (Knapsack)",
    color: C.orange,
    problems: ["knapsack", "subset", "unbounded", "floyd"],
  },
  D: {
    label: "Pattern D: Interval Pyramid (Range DP)",
    color: C.rose,
    problems: ["mcm", "lps_interval", "obst"],
  },
  E: {
    label: "Pattern E: Tree DP (Root Flow)",
    color: C.blue,
    problems: ["houserobber3", "diameter", "maxpathsum"],
  },
  F: {
    label: "Pattern F: Bitmask (Hypercube)",
    color: C.emerald,
    problems: ["tsp", "caniwin", "beautiful"],
  },
};

function LinearDAG({ graph }) {
  const { nodes, edges } = graph,
    n = nodes.length;
  const W = Math.max(700, n * 80),
    H = 260,
    padX = 50,
    spacing = (W - 100) / Math.max(n - 1, 1),
    cy = H / 2 + 10;
  const pos = (i) => ({ x: padX + i * spacing, y: cy });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
      <defs>
        <marker
          id="ad"
          markerWidth="6"
          markerHeight="4"
          refX="6"
          refY="2"
          orient="auto"
        >
          <path d="M0,0 L6,2 L0,4" fill={C.edgeDim} />
        </marker>
        <marker
          id="aa"
          markerWidth="6"
          markerHeight="4"
          refX="6"
          refY="2"
          orient="auto"
        >
          <path d="M0,0 L6,2 L0,4" fill={C.edgeActive} />
        </marker>
        <filter id="gl">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {edges.map((e, idx) => {
        const f = pos(e.from),
          t = pos(e.to),
          arc = 20 + Math.abs(e.to - e.from) * 12,
          mx = (f.x + t.x) / 2,
          my = cy - arc;
        return (
          <path
            key={idx}
            d={`M${f.x},${f.y - 18} Q${mx},${my} ${t.x},${t.y - 18}`}
            fill="none"
            stroke={e.active ? C.edgeActive : C.edgeDim}
            strokeWidth={e.active ? 2 : 1}
            markerEnd={e.active ? "url(#aa)" : "url(#ad)"}
            opacity={e.active ? 1 : 0.5}
            filter={e.active ? "url(#gl)" : undefined}
          />
        );
      })}
      {nodes.map((nd, i) => {
        const p = pos(i);
        return (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r={18}
              fill={nd.onPath ? C.nodeOnPath : C.nodeDefault}
              stroke={nd.onPath ? C.accent : C.border}
              strokeWidth={nd.onPath ? 2 : 1}
              filter={nd.onPath ? "url(#gl)" : undefined}
            />
            <text
              x={p.x}
              y={p.y - 2}
              textAnchor="middle"
              fill={nd.onPath ? C.accent : C.text}
              fontSize="10"
              fontFamily={TYPO.mono}
              fontWeight="600"
            >
              {nd.dpValue}
            </text>
            <text
              x={p.x}
              y={p.y + 10}
              textAnchor="middle"
              fill={C.textDim}
              fontSize="7"
              fontFamily={TYPO.mono}
            >
              {nd.sublabel}
            </text>
            <text
              x={p.x}
              y={p.y + 30}
              textAnchor="middle"
              fill={C.textMuted}
              fontSize="9"
              fontFamily={TYPO.mono}
            >
              T({i})
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function GridDAG({ graph }) {
  const { nodes, edges, rows, cols, X, Y, rowLabels, colLabels } = graph;
  const cellW = 50,
    cellH = 40,
    padX = rowLabels ? 100 : X ? 30 : 30,
    padY = 36;
  const W = padX + cols * cellW + 20,
    H = padY + rows * cellH + 20;
  const pos = (r, c) => ({
    x: padX + c * cellW + cellW / 2,
    y: padY + r * cellH + cellH / 2,
  });
  const nm = {};
  nodes.forEach((nd) => {
    nm[nd.id] = nd;
  });
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: "100%", height: "auto", maxHeight: 380 }}
    >
      {/* <defs> ... (Shortened for brevity but assume full content) same markers as before ...</defs> */}
      <defs>
        <marker
          id="gd"
          markerWidth="5"
          markerHeight="4"
          refX="5"
          refY="2"
          orient="auto"
        >
          <path d="M0,0 L5,2 L0,4" fill={C.edgeDim} />
        </marker>
        <marker
          id="ga"
          markerWidth="5"
          markerHeight="4"
          refX="5"
          refY="2"
          orient="auto"
        >
          <path d="M0,0 L5,2 L0,4" fill={C.edgeActive} />
        </marker>
        <marker
          id="gt"
          markerWidth="5"
          markerHeight="4"
          refX="5"
          refY="2"
          orient="auto"
        >
          <path d="M0,0 L5,2 L0,4" fill={C.orange} />
        </marker>
        <filter id="gg">
          <feGaussianBlur stdDeviation="2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {X &&
        [...X].map((ch, j) => (
          <text
            key={`c${j}`}
            x={pos(0, j).x}
            y={padY - 10}
            textAnchor="middle"
            fill={C.textMuted}
            fontSize="12"
            fontFamily={TYPO.mono}
            fontWeight="600"
          >
            {ch}
          </text>
        ))}
      {colLabels &&
        colLabels.map((l, j) => (
          <text
            key={`c${j}`}
            x={pos(0, j).x}
            y={padY - 10}
            textAnchor="middle"
            fill={C.textMuted}
            fontSize="10"
            fontFamily={TYPO.mono}
          >
            {l}
          </text>
        ))}
      {Y &&
        [...Y].map((ch, i) => (
          <text
            key={`r${i}`}
            x={padX - 16}
            y={pos(i, 0).y + 4}
            textAnchor="middle"
            fill={C.textMuted}
            fontSize="12"
            fontFamily={TYPO.mono}
            fontWeight="600"
          >
            {ch}
          </text>
        ))}
      {rowLabels &&
        rowLabels.map((l, i) => (
          <text
            key={`r${i}`}
            x={padX - 6}
            y={pos(i, 0).y + 4}
            textAnchor="end"
            fill={C.textMuted}
            fontSize="10"
            fontFamily={TYPO.mono}
          >
            {l}
          </text>
        ))}
      {edges.map((e, idx) => {
        const fn = nm[e.from],
          tn = nm[e.to];
        if (!fn || !tn) return null;
        const f = pos(fn.gridRow, fn.gridCol),
          t = pos(tn.gridRow, tn.gridCol);
        let s = e.active ? C.edgeActive : C.edgeDim,
          mk = e.active ? "url(#ga)" : "url(#gd)";
        if (e.type === "take" && e.active) {
          s = C.orange;
          mk = "url(#gt)";
        }
        return (
          <line
            key={idx}
            x1={f.x}
            y1={f.y}
            x2={t.x}
            y2={t.y}
            stroke={s}
            strokeWidth={e.active ? 2 : 0.7}
            markerEnd={mk}
            opacity={e.active ? 1 : 0.3}
            filter={e.active ? "url(#gg)" : undefined}
          />
        );
      })}
      {nodes.map((nd) => {
        const p = pos(nd.gridRow, nd.gridCol);
        return (
          <g key={nd.id}>
            <rect
              x={p.x - 14}
              y={p.y - 10}
              width={28}
              height={20}
              rx={4}
              fill={nd.onPath ? C.nodeOnPath : C.nodeDefault}
              stroke={nd.onPath ? C.accent : C.border}
              strokeWidth={nd.onPath ? 1.5 : 0}
              filter={nd.onPath ? "url(#gg)" : undefined}
            />
            <text
              x={p.x}
              y={p.y + 4}
              textAnchor="middle"
              fill={nd.onPath ? C.accent : C.textDim}
              fontSize="9"
              fontFamily={TYPO.mono}
              fontWeight={nd.onPath ? "600" : "400"}
            >
              {nd.sublabel}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ═══════════════════════════════════════
// TREE DAG RENDERER (Pattern E)
// ═══════════════════════════════════════

function TreeDAG({ graph }) {
  const { nodes, edges, treeDepth } = graph;
  const W = 500,
    rowH = 90,
    pad = 50;
  const H = treeDepth * rowH + pad * 2;
  const pos = (nd) => ({
    x: pad + nd.treeX * ((W - pad * 2) / 6),
    y: pad + nd.treeY * rowH,
  });
  return (
    <svg width={W} height={H} style={{ display: "block", margin: "0 auto" }}>
      {/* Edges */}
      {edges.map((e, i) => {
        const fn = nodes.find((n) => n.id === e.from);
        const tn = nodes.find((n) => n.id === e.to);
        if (!fn || !tn) return null;
        const fp = pos(fn),
          tp = pos(tn);
        return (
          <line
            key={`e${i}`}
            x1={fp.x}
            y1={fp.y}
            x2={tp.x}
            y2={tp.y}
            stroke={e.active ? C.accent : C.border}
            strokeWidth={e.active ? 2.5 : 1}
            opacity={e.active ? 1 : 0.3}
          />
        );
      })}
      {/* Nodes */}
      {nodes.map((nd) => {
        const p = pos(nd);
        const color = nd.onPath
          ? nd.highlight === "rob"
            ? "#f472b6"
            : nd.highlight === "skip"
              ? C.accent
              : C.accent
          : C.border;
        return (
          <g key={nd.id}>
            <circle
              cx={p.x}
              cy={p.y}
              r={22}
              fill={nd.onPath ? `${color}22` : "transparent"}
              stroke={color}
              strokeWidth={nd.onPath ? 2.5 : 1}
            />
            <text
              x={p.x}
              y={p.y - 4}
              textAnchor="middle"
              fill={nd.onPath ? C.text : C.textMuted}
              fontSize="12"
              fontFamily={TYPO.mono}
              fontWeight="600"
            >
              {nd.dpValue}
            </text>
            <text
              x={p.x}
              y={p.y + 8}
              textAnchor="middle"
              fill={C.textDim}
              fontSize="10"
              fontFamily={TYPO.mono}
            >
              {nd.sublabel}
            </text>
            {nd.label2 && (
              <text
                x={p.x}
                y={p.y + 38}
                textAnchor="middle"
                fill={C.textDim}
                fontSize="10"
                fontFamily={TYPO.mono}
              >
                {nd.label2}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ═══════════════════════════════════════
// MASK DAG RENDERER (Pattern F)
// ═══════════════════════════════════════

function MaskDAG({ graph }) {
  const { nodes, edges, numCities, singleCol } = graph;
  if (!nodes.length) return null;
  const cols = singleCol ? 1 : numCities;
  const cellW = singleCol ? 80 : 70;
  const cellH = 36;
  const labelW = 60;
  const pad = 30;
  // Group nodes by maskRow
  const maxRow = Math.max(...nodes.map((n) => n.maskRow));
  const W = labelW + cols * cellW + pad * 2;
  const H = (maxRow + 1) * cellH + pad * 2;
  const pos = (nd) => ({
    x: pad + labelW + nd.maskCol * cellW + cellW / 2,
    y: pad + nd.maskRow * cellH + cellH / 2,
  });
  // Deduplicate mask labels per row
  const rowLabels = {};
  nodes.forEach((nd) => {
    rowLabels[nd.maskRow] = nd.maskLabel;
  });
  return (
    <svg
      width={Math.min(W, 800)}
      height={Math.min(H, 700)}
      viewBox={`0 0 ${W} ${H}`}
      style={{ display: "block", margin: "0 auto" }}
    >
      {/* Row labels (masks) */}
      {Object.entries(rowLabels).map(([row, label]) => (
        <text
          key={`rl${row}`}
          x={pad + labelW - 6}
          y={pad + Number(row) * cellH + cellH / 2 + 3}
          textAnchor="end"
          fill={C.textDim}
          fontSize="9"
          fontFamily={TYPO.mono}
        >
          {label}
        </text>
      ))}
      {/* Column headers for TSP */}
      {!singleCol &&
        Array.from({ length: cols }, (_, c) => (
          <text
            key={`ch${c}`}
            x={pad + labelW + c * cellW + cellW / 2}
            y={pad - 8}
            textAnchor="middle"
            fill={C.textDim}
            fontSize="9"
            fontFamily={TYPO.mono}
          >
            city {c}
          </text>
        ))}
      {/* Edges */}
      {edges.map((e, i) => {
        const fn = nodes.find((n) => n.id === e.from);
        const tn = nodes.find((n) => n.id === e.to);
        if (!fn || !tn) return null;
        const fp = pos(fn),
          tp = pos(tn);
        return (
          <line
            key={`e${i}`}
            x1={fp.x}
            y1={fp.y}
            x2={tp.x}
            y2={tp.y}
            stroke={e.active ? C.accent : C.border}
            strokeWidth={e.active ? 2 : 0.5}
            opacity={e.active ? 1 : 0.15}
          />
        );
      })}
      {/* Nodes */}
      {nodes.map((nd) => {
        const p = pos(nd);
        const color = nd.onPath ? C.accent : C.border;
        return (
          <g key={nd.id}>
            <rect
              x={p.x - cellW / 2 + 4}
              y={p.y - cellH / 2 + 4}
              width={cellW - 8}
              height={cellH - 8}
              rx={4}
              fill={nd.onPath ? `${C.accent}22` : "transparent"}
              stroke={color}
              strokeWidth={nd.onPath ? 2 : 0.5}
            />
            <text
              x={p.x}
              y={p.y + 3}
              textAnchor="middle"
              fill={nd.onPath ? C.text : C.textMuted}
              fontSize="10"
              fontFamily={TYPO.mono}
              fontWeight={nd.onPath ? "600" : "400"}
            >
              {nd.sublabel}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function DPDagVisualizer({ pattern }) {
  const defaultPat = pattern || "D";
  const [selPat, setSelPat] = useState(defaultPat);
  const [selProb, setSelProb] = useState(
    pattern ? PATTERN_META[pattern].problems[0] : "mcm",
  );

  const prob = PROBLEMS[selProb];
  // Fallback if problem key doesn't match available pattern (e.g. if switching back and forth)
  const Pat = PATTERN_META[selPat];
  const graph = prob.build();

  return (
    <div
      style={{
        padding: 24,
        paddingBottom: 60,
        fontFamily: TYPO.body,
        color: C.text,
        display: "flex",
        flexDirection: "column",
        gap: 24,
        maxWidth: SIZES.maxWidth,
        margin: "0 auto",
      }}
    >
      {/* Header */}
      {/* <div style={{ borderBottom: `1px solid ${C.border}`, paddingBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: C.text }}>
          DP Pattern Visualizer
        </h1>
        <p style={{ margin: "4px 0 0 0", color: C.textMuted, fontSize: 14 }}>
          Interactive Directed Acyclic Graphs for common DP patterns
        </p>
      </div> */}

      {/* Pattern Tabs */}
      {!pattern && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {Object.entries(PATTERN_META).map(([k, meta]) => {
            const isActive = k === selPat;
            return (
              <button
                key={k}
                onClick={() => {
                  setSelPat(k);
                  setSelProb(meta.problems[0]);
                }}
                aria-pressed={isActive}
                style={buttonStyles({
                  active: isActive,
                  tone: "semantic",
                  color: meta.color,
                })}
              >
                {meta.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Problem Tabs */}
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          padding: "12px",
          background: C.surface,
          borderRadius: 8,
          border: `1px solid ${C.border}`,
        }}
      >
        {Pat.problems.map((pk) => {
          const isActive = pk === selProb;
          return (
            <button
              key={pk}
              onClick={() => setSelProb(pk)}
              aria-pressed={isActive}
              style={buttonStyles({
                active: isActive,
                tone: "semantic",
                color: Pat.color,
              })}
            >
              {PROBLEMS[pk].title}
            </button>
          );
        })}
      </div>

      {/* Visualization Card */}
      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          overflow: "hidden",
          // boxShadow: C.cardShadow,
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: `1px solid ${C.border}`,
            background: C.surfaceHover,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontWeight: 600, color: C.text }}>{prob.title}</div>
          <div
            style={{ fontSize: 12, color: C.textDim, fontFamily: TYPO.mono }}
          >
            Runtime: {prob.runtime}
          </div>
        </div>

        <div
          style={{
            padding: 24,
            background: C.bg,
            overflowX: "auto",
            display: "flex",
            justifyContent: "center",
          }}
        >
          {graph.tree ? (
            <TreeDAG graph={graph} />
          ) : graph.mask ? (
            <MaskDAG graph={graph} />
          ) : graph.grid ? (
            <GridDAG graph={graph} />
          ) : (
            <LinearDAG graph={graph} />
          )}
        </div>

        {/* (a) Subproblem Definition */}
        <div
          style={{
            padding: "16px 20px",
            borderTop: `1px solid ${C.border}`,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: Pat.color,
              marginBottom: 6,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            (a) Subproblem Definition
          </div>
          <div
            style={{
              fontFamily: TYPO.mono,
              fontSize: 13,
              color: C.text,
              background: C.codeBg,
              padding: "10px 12px",
              borderRadius: 6,
              whiteSpace: "pre-wrap",
              lineHeight: 1.6,
            }}
          >
            {prob.subproblem}
          </div>
        </div>

        {/* (b) Recurrence Relation */}
        <div
          style={{
            padding: "16px 20px",
            borderTop: `1px solid ${C.border}`,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 20,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: Pat.color,
                marginBottom: 6,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              (b) Recurrence
            </div>
            <div
              style={{
                fontFamily: TYPO.mono,
                fontSize: 12,
                color: C.text,
                background: C.codeBg,
                padding: "10px 12px",
                borderRadius: 6,
                whiteSpace: "pre-wrap",
                lineHeight: 1.6,
              }}
            >
              {prob.recurrence}
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: C.textDim,
                marginBottom: 6,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Base Cases
            </div>
            <div
              style={{
                fontFamily: TYPO.mono,
                fontSize: 12,
                color: C.textMuted,
                background: C.codeBg,
                padding: "10px 12px",
                borderRadius: 6,
                whiteSpace: "pre-wrap",
                lineHeight: 1.6,
              }}
            >
              {prob.baseCases}
            </div>
          </div>
        </div>

        {/* (c) Implementation Analysis */}
        <div
          style={{
            padding: "16px 20px",
            borderTop: `1px solid ${C.border}`,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: Pat.color,
              marginBottom: 10,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            (c) Implementation Analysis
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "8px 20px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "6px 10px",
                background: C.codeBg,
                borderRadius: 4,
              }}
            >
              <span style={{ fontSize: 11, color: C.textDim, fontWeight: 600 }}>
                (1) Subproblems
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: C.text,
                  fontFamily: TYPO.mono,
                }}
              >
                {prob.numSubproblems}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "6px 10px",
                background: C.codeBg,
                borderRadius: 4,
              }}
            >
              <span style={{ fontSize: 11, color: C.textDim, fontWeight: 600 }}>
                (2) Table Fill
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: C.text,
                  fontFamily: TYPO.mono,
                }}
              >
                {prob.runtime}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "6px 10px",
                background: C.codeBg,
                borderRadius: 4,
              }}
            >
              <span style={{ fontSize: 11, color: C.textDim, fontWeight: 600 }}>
                (3) Answer
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: C.text,
                  fontFamily: TYPO.mono,
                }}
              >
                {prob.answer}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "6px 10px",
                background: C.codeBg,
                borderRadius: 4,
              }}
            >
              <span style={{ fontSize: 11, color: C.textDim, fontWeight: 600 }}>
                (4) Extraction
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: C.text,
                  fontFamily: TYPO.mono,
                }}
              >
                {prob.extractionRuntime}
              </span>
            </div>
          </div>
        </div>

        {/* Insight & DAG Shape */}
        <div
          style={{
            padding: "16px 20px",
            borderTop: `1px solid ${C.border}`,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 20,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: C.textDim,
                marginBottom: 6,
                textTransform: "uppercase",
              }}
            >
              Key Insight
            </div>
            <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.5 }}>
              {prob.insight}
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: C.textDim,
                marginBottom: 6,
                textTransform: "uppercase",
              }}
            >
              DAG Shape
            </div>
            <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.5 }}>
              {prob.dagShape}
            </div>
          </div>
        </div>
        <div
          style={{
            padding: "12px 20px",
            background: C.surfaceHover,
            borderTop: `1px solid ${C.border}`,
            fontSize: 12,
            color: C.textDim,
            fontStyle: "italic",
          }}
        >
          Visual Notes: {graph.topoNote}
        </div>
      </div>
    </div>
  );
}
