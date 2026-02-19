# DP Patterns

This document outlines the six major Dynamic Programming patterns. Each pattern
represents a distinct "shape" of the underlying DAG (Directed Acyclic Graph).

### **Pattern A: Linear (1D Chain)**

> _The "Domino Effect." You solve for `dp[i]` using previous values `dp[i-k]`._

- **The Shape:** A straight line of dominoes. To knock over domino `i`, you look
  back at some subset of dominoes `j < i`.
- **Visual Intuition:** A 1D array where arrows only point right.
- **The Trap:** Sometimes the answer is at `n` (reach the end), sometimes it is
  `max(dp)` (best state found _anywhere_ along the path).
- **Sub-variant (State Machine):** The "nodes" at step `i` aren't just a single
  value, but a fixed set of states (e.g., _Stock Buy/Sell_). The DAG looks like
  a few parallel ropes twisted together.

**Common Problems:**

1. **Climbing Stairs / Fibonacci:** The "Hello World" of DP. `dp[i]` depends
   only on `dp[i-1]` and `dp[i-2]`.
2. **House Robber:** `dp[i]`. The constraint is you cannot touch adjacent nodes
   `i-1`.
3. **Longest Increasing Subsequence (LIS):** The `O(N^2)` version. `dp[i]` scans
   **all** `j < i` to find the best connection.
4. **Decode Ways:** A string parsing problem where you look back at the last 1
   or 2 characters to determine validity.
5. **Best Time to Buy and Sell Stock (with Cooldown):** A "State Machine"
   variant. The chain has parallel states (Hold, Sold, Rest) that weave together
   at each step `i`.

---

### **Pattern B: Grid / Dual-Sequence (2D Mesh)**

> _The "Spatial Neighbor." You solve `dp[i][j]` using immediate neighbors (top,
> left, diagonal)._

- **The Shape:** A rectangular mesh. To calculate cell `[i][j]`, you only need
  immediate neighbors (usually `[i-1][j]`, `[i][j-1]`, and `[i-1][j-1]`).
- **Visual Intuition:** A wave that propagates from top-left to bottom-right.
- **The Trap:** Thinking you need to look back further than immediate neighbors.
  If you do, you likely drifted into Pattern A or D.

**Common Problems:**

1. **Unique Paths / Min Path Sum:** The purest form. You only move Down or
   Right. Value at `[i][j]` is sum/min of `[i-1][j]` and `[i][j-1]`.
2. **Longest Common Subsequence (LCS):** The parent of all string comparison
   problems. If chars match, look at diagonal `[i-1][j-1]`; else, max of
   top/left.
3. **Edit Distance (Levenshtein):** Adds a cost for replacement (diagonal),
   insertion (left), or deletion (top).
4. **Maximal Square:** Finds the largest square of 1s. `dp[i][j]` depends on the
   `min` of its three neighbors.
5. **Interleaving String:** Checks if string `s3` is formed by weaving `s1` and
   `s2`. The grid tracks validity of prefixes.

---

### **Pattern C: The Pseudo-Polynomial Grid (Knapsack)**

> _The "Capacity Constraint." You pick items to fill a volume. The jump size
> depends on item weight._

- **The Shape:** Still a 2D grid, but the "width" axis is **Capacity/Sum**, not
  an index of an array.
- **Visual Intuition:** The "Take" arrow doesn't go to a neighbor; it jumps
  deeply to the left by a variable distance `weight[i]`.
- **The Trap:** Confusing the "Item Index" axis (processed 1-by-1) with the
  "Capacity" axis. Also, mistakenly trying to apply this when Capacity is huge
  (`10^9`), which requires a Greedy approach or Meet-in-the-middle.

**Common Problems:**

1. **0/1 Knapsack:** The classic. Maximize value with weight limit `W`. Each
   item is taken or left (binary).
2. **Partition Equal Subset Sum:** Can you split an array into two equal sums?
   This is just 0/1 Knapsack where capacity = TotalSum / 2.
3. **Coin Change (Unbounded Knapsack):** Find min coins to make amount `A`.
   "Unbounded" means you can reuse the coin, so the transition stays in the
   _current_ row rather than the previous row.
4. **Coin Change II:** Count _ways_ to make amount `A`. (Crucial distinction:
   Loop order matters to avoid duplicates).
5. **Target Sum:** Assign `+` or `-` to numbers to reach a target. Reduces to a
   subset sum problem.

---

### **Pattern D: The Interval Pyramid (Range DP)**

- **The Shape:** A Triangle or Pyramid. The base layer is all intervals of
  length 1 `(i==j)`. You build upward to length 2, then length 3, culminating at
  the single peak `[0..n-1]`.
- **Visual Intuition:** Merging adjacent blocks. To solve for range `[i, j]`,
  you try every possible "split point" `k` between them, combining the left
  triangle `[i, k]` and right triangle `[k+1, j]`.
- **The Trap:** **Iteration Order.** You cannot iterate simple nested loops
  `for i, for j`. You **must** iterate by `length` (outer loop) from 1 to `n`,
  then `start_index` (inner loop). If you don't, you try to compute a large
  interval before its smaller sub-intervals are ready.

**Common Problems:**

1. **Matrix Chain Multiplication:** The textbook example. Minimize cost to
   multiply a chain of matrices.
2. **Longest Palindromic Subsequence:** Find the longest palindrome _inside_ a
   string (can skip characters). `dp[i][j]` depends on inner range
   `dp[i+1][j-1]`.
3. **Burst Balloons:** A tricky variation. You think about which balloon pops
   _last_ to separate the array into independent sub-intervals.
4. **Minimum Cost to Merge Stones:** You merge `K` adjacent piles. Heavy
   interval logic with a split loop.
5. **Optimal Binary Search Tree:** Arrange keys to minimize total search cost
   based on frequency.

---

### **Pattern E: Tree DP (The Root Flow)**

> _The "Subtree Aggregator." You solve for a node using values bubbling up from
> children._

- **The Shape:** The DAG **is** the Tree structure itself. There are no
  "arbitrary" jumps; edges strictly follow parent-child relationships.
- **Visual Intuition:** Values "bubble up" from the leaves to the root
  (Post-Order Traversal).
- **The Trap:** **Recursion Limit.** In languages like Python, deep trees cause
  stack overflow. Also, **Re-rooting**: sometimes the answer depends on the
  parent, requiring a second DFS pass ("up-down" phase) to push parent data down
  to children.

**Common Problems:**

1. **Diameter of Binary Tree:** Longest path between any two nodes. The path
   might not pass through the root, so you maintain a global max while returning
   "max depth" to the parent.
2. **Binary Tree Maximum Path Sum:** Similar to Diameter, but nodes have
   negative values. You must decide whether to continue the path to the parent
   or start a new path.
3. **House Robber III:** Rob nodes in a binary tree (cannot rob parent and
   child). Returns a pair: `[with_root, without_root]`.
4. **Minimize Malware Spread (Graph/Tree):** Often involves finding size of
   components or affected subtrees.
5. **Sum of Distances in Tree:** The "Re-rooting" technique. Harder. Requires
   two passes: one Bottom-Up (subtree counts) and one Top-Down (moving the
   root).

---

### **Pattern F: Bitmask (The Hypercube)**

> _The "Small N." You track visited nodes in a bitmask._

- **The Shape:** A Hypercube. The states represent _subsets_ of items
  visited/used.
- **Visual Intuition:** You are visiting nodes in a graph. The state is usually
  `dp(mask, last_node)`, where `mask` is a binary integer representing the set
  of visited nodes.
- **The Trap:** Trying to use this for `N > 20`. (Time Complexity is `2^N * N^2`
  usually).

**Common Problems:**

1. **Traveling Salesman Problem (TSP):** Shortest path to visit all cities
   exactly once. State: `dp[mask][last_visited_city]`.
2. **Partition to K Equal Sum Subsets:** Can you divide array into `K` groups?
   The mask represents used numbers.
3. **Find the Shortest Superstring:** Compress strings into one. Uses TSP logic
   where "distance" is the overlap savings.
4. **Can I Win? (Minimax):** Two players pick numbers from a pool. Mask tracks
   available numbers.
5. **Beautiful Arrangement:** Count valid permutations. Mask tracks used numbers
   `1..N`.

---

### **Quick ID Guide: Which pattern is it?**

- **Input is an array, asking for result at index `i`?** -> **Pattern A**
  (Linear).
- **Input is two strings/arrays?** -> **Pattern B** (Grid).
- **Input involves "choosing" items with values/weights?** -> **Pattern C**
  (Knapsack).
- **Input is an array, problem involves merging/splitting/parentheses?** ->
  **Pattern D** (Interval).
- **Input is a binary tree?** -> **Pattern E** (Tree).
- **Input size `N < 20`?** -> **Pattern F** (Bitmask).

### **Visual Dictionary**

| Pattern          | DAG Structure            | Primary Transition          | Iteration Direction         |
| ---------------- | ------------------------ | --------------------------- | --------------------------- |
| **A (Linear)**   | 1D Chain                 | Jump back to any            | Left -> Right               |
| **B (Grid)**     | 2D Mesh                  | Neighbors (Top, Left, Diag) | Row-by-Row                  |
| **C (Knapsack)** | 2D Mesh (Variable width) | Jump left by `weight`       | Item-by-Item                |
| **D (Interval)** | Pyramid                  | Split point between         | Length (Small -> Large)     |
| **E (Tree)**     | Tree                     | Children -> Parent          | Leaves -> Root (Post-order) |
| **F (Bitmask)**  | Hypercube                | Add 1 bit to mask           | Sort by Mask                |
