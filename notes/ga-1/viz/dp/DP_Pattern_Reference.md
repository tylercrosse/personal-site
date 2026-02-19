# Dynamic Programming Pattern Reference

## Required Solution Format

Every DP solution in this course requires four components:

**(a) Subproblem Definition.** Define T(i) or T(i,j) in words, built on a subset of the input (e.g., A[1..i]). May or may not require inclusion of the last element.

**(b) Recurrence.** Mathematical notation only — no code, no prose. A single definition covering all entries, with base cases and variable bounds.

**(c) Implementation Analysis:**
1. Number of subproblems in Big-O.
2. Runtime to fill table.
3. Where/how to extract the final answer.
4. Runtime of extraction.

*Key rules: No recursion/memoization. Inputs indexed from 1. Inputs are immutable. Tables store primitives only. Tables may start from index 0 or -1 for base cases.*

## Problem-Solving Heuristics

**1. What is the topology?** Is the input a 1D array, a pair of strings, items with weights, an interval, a tree, or a set of elements?

**2. What are you optimizing?** Max/min value? Count of ways? Length of a subsequence?

**3. What constraint distinguishes the flavor?** Must be contiguous (Kadane) vs. no-adjacent (Robber) vs. any subsequence (LIS)? Match-based (LCS) vs. cost-based (Edit Dist)? Items used once (0/1) vs. unlimited (Unbounded)?

**4. Write the subproblem in words first.** This is the most important step. The recurrence follows naturally from a correct subproblem definition.

**5. Always define base cases.** Ensure every referenced table entry is well-defined. If T(i) references T(i-2), define T(0) and possibly T(-1).

**6. Provide bounds for all variables.** Every variable in the recurrence must have explicit bounds (e.g., "for 1 ≤ i ≤ n").

---

## Quick Reference Table

| Pattern / Flavor | Subproblem Sketch | # Subprobs | Fill Time | Return | Key Signal |
|---|---|---|---|---|---|
| A1: Kadane's | Best contiguous ending at i | O(n) | O(n) | max{T(\*)} | Contiguous subarray |
| A2: House Robber | Best from 1..i (skip adj.) | O(n) | O(n) | T(n) | No adjacent selections |
| A3: LIS | LIS ending at i | O(n) | O(n²) | max{T(\*)} | Non-contiguous subseq. |
| B1: LCS | LCS of A[1..i], B[1..j] | O(n·m) | O(n·m) | T(n,m) | Two strings, matching |
| B2: Edit Dist. | Edit dist A[1..i]→B[1..j] | O(n·m) | O(n·m) | T(n,m) | Transform w/ penalties |
| B3: Path Sum | Min cost to (i,j) | O(n·m) | O(n·m) | T(n,m) | Grid traversal |
| C1: 0/1 Knapsack | Max val, items 1..i, cap w | O(n·W) | O(n·W) | T(n,W) | Each item once |
| C2: Unbounded | Min coins for amount j | O(W) | O(n·W) | T(W) | Reusable items |
| C3: Counting | # ways, coins 1..i, amt w | O(n·W) | O(n·W) | T(n,W) | Count paths, not max |
| D1: MCM / BST | Min cost for interval [i,j] | O(n²) | O(n³) | T(1,n) | Split at k |
| D2: Palindrome | LPS of A[i..j] | O(n²) | O(n²) | T(1,n) | Shrink from edges |
| D3: Burst Balloons | Max coins in (i,j) | O(n²) | O(n³) | T(0,n+1) | Last action in interval |
| E1: Indep. Set | Max weight excl/incl u | O(n) | O(n) | max(T(r,0),T(r,1)) | Tree, no adj. nodes |
| E2: Diameter | Longest arm from u | O(n) | O(n) | max arch | Longest path in tree |
| F1: TSP | Min cost, visited S, at i | O(2ⁿ·n) | O(2ⁿ·n²) | min{T(all,i)+d(i,1)} | Visit all, min cost cycle |
| F2: Partition | Min cost to partition S | O(2ⁿ) | O(3ⁿ) | T({1..n}) | Partition into groups |

---

## Pattern A: Linear (1D Chain)

The topology is a 1D array. The flavor depends on how far back you look and what you accumulate.

### Flavor 1: "Look-Back-One" (Contiguous / Kadane's Style)

**Concept:** *You must extend the immediately preceding subproblem, or start completely over. The current element must be included.*

**(a) Subproblem:** T(i) = maximum sum of a contiguous subarray of A[1..i] which includes A[i].

**(b) Recurrence:**

```
T(1) = A[1]
T(i) = max( A[i],  T(i-1) + A[i] )     for 2 ≤ i ≤ n
```

> *Interpretation: either start a new subarray at A[i], or extend the best subarray ending at A[i-1].*

**(c) Analysis:**
- **(1) Subproblems:** `O(n)`
- **(2) Fill time:** `O(n)`
- **(3) Return:** `max{ T(i) : 1 ≤ i ≤ n }`
- **(4) Return time:** `O(n)`

---

### Flavor 2: "Look-Back-Two" (Skip / House Robber Style)

**Concept:** *Adjacent elements cannot both be selected. Decide whether to take the current element (skip previous) or leave it (keep previous optimal). The current element need not be included.*

**(a) Subproblem:** T(i) = maximum sum obtainable from A[1..i] (A[i] may or may not be selected).

**(b) Recurrence:**

```
T(0) = 0
T(1) = A[1]
T(i) = max( T(i-1),  T(i-2) + A[i] )    for 2 ≤ i ≤ n
```

> *T(i-1) = skip A[i]; T(i-2) + A[i] = take A[i] and skip A[i-1].*

**(c) Analysis:**
- **(1) Subproblems:** `O(n)`
- **(2) Fill time:** `O(n)`
- **(3) Return:** `T(n)`
- **(4) Return time:** `O(1)`

---

### Flavor 3: "Look-Back-All" (Subsequence / LIS Style)

**Concept:** *The sequence need not be contiguous. Scan all previous valid subproblems to find the best predecessor. The current element must be included.*

**(a) Subproblem:** T(i) = length of the longest increasing subsequence of A[1..i] which includes A[i].

**(b) Recurrence:**

```
T(1) = 1
T(i) = 1 + max( {0} U { T(j) : 1 ≤ j < i, A[j] < A[i] } )    for 2 ≤ i ≤ n
```

> *If no j satisfies A[j] < A[i], the max is taken over {0} (set containing zero), so T(i) = 1.*

**(c) Analysis:**
- **(1) Subproblems:** `O(n)`
- **(2) Fill time:** `O(n²)`
- **(3) Return:** `max{ T(i) : 1 ≤ i ≤ n }`
- **(4) Return time:** `O(n)`

---

## Pattern B: Grid (2D / Strings)

The topology is the (i-1, j), (i, j-1), (i-1, j-1) neighborhood. The flavor depends on whether you match elements or accumulate path costs.

### Flavor 1: "Match or Drop" (Longest Common Subsequence)

**Concept:** *If elements match, gain 1 and consume both. If not, drop one element from either sequence and take the best.*

**(a) Subproblem:** T(i,j) = length of the LCS of A[1..i] and B[1..j].

**(b) Recurrence:**

```
T(0,j) = 0  for 0 ≤ j ≤ m
T(i,0) = 0  for 0 ≤ i ≤ n
T(i,j) = T(i-1,j-1) + 1                          if A[i] = B[j]
T(i,j) = max( T(i-1,j),  T(i,j-1) )              if A[i] ≠ B[j]
                                     for 1 ≤ i ≤ n, 1 ≤ j ≤ m
```

**(c) Analysis:**
- **(1) Subproblems:** `O(n·m)`
- **(2) Fill time:** `O(n·m)`
- **(3) Return:** `T(n,m)`
- **(4) Return time:** `O(1)`

---

### Flavor 2: "Penalty Cost" (Edit Distance)

**Concept:** *Transform A into B. Every mismatch incurs a cost; take the minimum of substitution, deletion, or insertion.*

**(a) Subproblem:** T(i,j) = minimum edit distance to transform A[1..i] into B[1..j].

**(b) Recurrence:**

```
T(0,j) = j   for 0 ≤ j ≤ m      (insert j characters)
T(i,0) = i   for 0 ≤ i ≤ n      (delete i characters)
T(i,j) = T(i-1,j-1)                              if A[i] = B[j]
T(i,j) = 1 + min( T(i-1,j-1),                    (substitute)
                   T(i-1,j),                      (delete)
                   T(i,j-1) )                     (insert)
                                  if A[i] ≠ B[j]
                                     for 1 ≤ i ≤ n, 1 ≤ j ≤ m
```

**(c) Analysis:**
- **(1) Subproblems:** `O(n·m)`
- **(2) Fill time:** `O(n·m)`
- **(3) Return:** `T(n,m)`
- **(4) Return time:** `O(1)`

---

### Flavor 3: "Path Accumulation" (Min Path Sum)

**Concept:** *Move through a physical grid accumulating weights. No matching — just movement constraints (right or down).*

**(a) Subproblem:** T(i,j) = minimum cost to reach cell (i,j) from cell (1,1).

**(b) Recurrence:**

```
T(1,1) = C[1][1]
T(i,1) = T(i-1,1) + C[i][1]                      for 2 ≤ i ≤ n
T(1,j) = T(1,j-1) + C[1][j]                      for 2 ≤ j ≤ m
T(i,j) = C[i][j] + min( T(i-1,j), T(i,j-1) )    for 2 ≤ i ≤ n, 2 ≤ j ≤ m
```

**(c) Analysis:**
- **(1) Subproblems:** `O(n·m)`
- **(2) Fill time:** `O(n·m)`
- **(3) Return:** `T(n,m)`
- **(4) Return time:** `O(1)`

---

## Pattern C: Knapsack

The topology involves jumping leftwards across a capacity dimension. The flavor changes based on whether items are unique, reusable, or you are counting combinations.

### Flavor 1: "Take It or Leave It" (0/1 Knapsack)

**Concept:** *Each item can only be used once. You transition from the previous row (i-1).*

**(a) Subproblem:** T(i,w) = maximum value achievable using items from {1..i} with capacity w.

**(b) Recurrence:**

```
T(0,w) = 0   for 0 ≤ w ≤ W
T(i,w) = T(i-1,w)                                 if wᵢ > w
T(i,w) = max( T(i-1,w),  T(i-1, w-wᵢ) + vᵢ )    if wᵢ ≤ w
                                     for 1 ≤ i ≤ n, 0 ≤ w ≤ W
```

> *wᵢ and vᵢ are the weight and value of item i.*

**(c) Analysis:**
- **(1) Subproblems:** `O(n·W)`
- **(2) Fill time:** `O(n·W)`
- **(3) Return:** `T(n,W)`
- **(4) Return time:** `O(1)`

---

### Flavor 2: "Infinite Reuse" (Unbounded Knapsack / Min Coin Change)

**Concept:** *If you take an item, you can take it again. You transition from the current row (i), not (i-1). Shown here as Minimum Coin Change.*

**(a) Subproblem:** T(j) = minimum number of coins needed to make change for amount j, using coins from the given denominations.

**(b) Recurrence:**

```
T(0) = 0
T(j) = ∞                                          if no coin ≤ j
T(j) = 1 + min{ T(j - cᵢ) : 1 ≤ i ≤ n, cᵢ ≤ j }  for 1 ≤ j ≤ W
```

> *Can also be written as 2D: T(i,w) = min( T(i-1,w), T(i, w-cᵢ) + 1 ), where row i means "using coins 1..i" and staying in row i allows reuse.*

**(c) Analysis:**
- **(1) Subproblems:** `O(W)`
- **(2) Fill time:** `O(n·W)`
- **(3) Return:** `T(W)`
- **(4) Return time:** `O(1)`

---

### Flavor 3: "Counting Combinations" (Subset Sum / Coin Change 2)

**Concept:** *You are not maximizing value — you are summing all possible ways to reach a state. Replace max with +.*

**(a) Subproblem:** T(i,w) = number of ways to form amount w using coins from {1..i}.

**(b) Recurrence:**

```
T(0,0) = 1
T(0,w) = 0   for 1 ≤ w ≤ W
T(i,w) = T(i-1,w)                                 if cᵢ > w
T(i,w) = T(i-1,w) + T(i, w-cᵢ)                    if cᵢ ≤ w
                                     for 1 ≤ i ≤ n, 0 ≤ w ≤ W
```

> *Staying in row i (for the cᵢ ≤ w case) allows reuse of coin i. Moving to row i-1 only would give 0/1 counting.*

**(c) Analysis:**
- **(1) Subproblems:** `O(n·W)`
- **(2) Fill time:** `O(n·W)`
- **(3) Return:** `T(n,W)`
- **(4) Return time:** `O(1)`

---

## Pattern D: Interval (Pyramid)

The topology always merges sub-intervals. The flavor depends on whether you split at an arbitrary k, shrink from edges, or pivot on the last action.

### Flavor 1: "The K-Split" (Matrix Chain Multiplication / Optimal BST)

**Concept:** *The cost of interval (i,j) depends on splitting it into (i,k) and (k+1,j) plus the cost to merge.*

**(a) Subproblem:** T(i,j) = minimum cost to multiply matrices Aᵢ through Aⱼ. (Matrix Aᵢ has dimensions p[i-1] × p[i].)

**(b) Recurrence:**

```
T(i,i) = 0                                         for 1 ≤ i ≤ n
T(i,j) = min{ T(i,k) + T(k+1,j) + p[i-1]·p[k]·p[j] : i ≤ k ≤ j-1 }
                                     for 1 ≤ i < j ≤ n
```

> *Fill order: by increasing interval length ℓ = j - i, from ℓ=1 up to ℓ=n-1.*

**(c) Analysis:**
- **(1) Subproblems:** `O(n²)`
- **(2) Fill time:** `O(n³)`
- **(3) Return:** `T(1,n)`
- **(4) Return time:** `O(1)`

---

### Flavor 2: "Shrink from Edges" (Longest Palindromic Subsequence)

**Concept:** *No k-loop needed. Compare the two outermost elements. If they match, the interval shrinks by 2. If not, shrink by 1 from either side.*

**(a) Subproblem:** T(i,j) = length of the longest palindromic subsequence of A[i..j].

**(b) Recurrence:**

```
T(i,i) = 1                                         for 1 ≤ i ≤ n
T(i,j) = T(i+1,j-1) + 2                           if A[i] = A[j]
T(i,j) = max( T(i+1,j),  T(i,j-1) )              if A[i] ≠ A[j]
                                     for 1 ≤ i < j ≤ n
```

> *Base case T(i,i+1): if A[i]=A[i+1] then 2, else 1. This is handled by the recurrence if you define T(i,i-1)=0 for empty intervals.*

**(c) Analysis:**
- **(1) Subproblems:** `O(n²)`
- **(2) Fill time:** `O(n²)`
- **(3) Return:** `T(1,n)`
- **(4) Return time:** `O(1)`

---

### Flavor 3: "The Last Action" (Burst Balloons)

**Concept:** *Instead of the first split, think about k as the last balloon popped in interval (i,j). This makes left and right subproblems independent.*

**(a) Subproblem:** T(i,j) = maximum coins from bursting all balloons in the open interval (i,j), where i and j are unpopped boundary balloons.

**(b) Recurrence:**

```
T(i,j) = 0                                         if j = i+1  (no balloons between)
T(i,j) = max{ T(i,k) + T(k,j) + A[i]·A[k]·A[j] : i < k < j }
                                     for 0 ≤ i < j ≤ n+1
```

> *Boundaries A[0] and A[n+1] are sentinel values = 1. The key insight: choosing k last means the left/right subproblems don't interfere.*

**(c) Analysis:**
- **(1) Subproblems:** `O(n²)`
- **(2) Fill time:** `O(n³)`
- **(3) Return:** `T(0, n+1)`
- **(4) Return time:** `O(1)`

---

## Pattern E: Tree DP

Tree DP requires defining multiple states per node to handle inclusion/exclusion constraints. Fill order is post-order (leaves first, root last).

### Flavor 1: "Independent Set" (Max Weight Independent Set / House Robber III)

**Concept:** *You cannot select a node and its direct children. Two states per node: exclude or include.*

**(a) Subproblem:** T(u,0) = max weight of an independent set in the subtree rooted at u, excluding u. T(u,1) = same, including u.

**(b) Recurrence:**

```
T(u,0) = Σ max( T(v,0), T(v,1) )    over all children v of u
T(u,1) = w(u) + Σ T(v,0)              over all children v of u
Base (leaf u): T(u,0) = 0,  T(u,1) = w(u)
```

> *When u is excluded, each child is free to be included or not. When u is included, all children must be excluded.*

**(c) Analysis:**
- **(1) Subproblems:** `O(n)  (2 states per node)`
- **(2) Fill time:** `O(n)`
- **(3) Return:** `max( T(root,0), T(root,1) )`
- **(4) Return time:** `O(1)`

---

### Flavor 2: "Path Tracking" (Diameter of a Tree)

**Concept:** *The longest path may arch over a node. T(u) tracks the longest straight path down from u; a secondary equation tracks the arch.*

**(a) Subproblem:** T(u) = length of the longest path starting at u and going downward into the subtree of u.

**(b) Recurrence:**

```
T(u) = 1 + max{ T(v) : v is a child of u }        (longest arm in nodes)
Base (leaf u): T(u) = 1

Diameter through u = T(v₁) + T(v₂) + 1   (where v₁, v₂ are children with largest T)
Answer = max over all u of { diameter through u } - 1  (if asking for edges)
         OR max over all u of { diameter through u }   (if asking for nodes)
```

> *If u has ≤1 child, diameter through u is just T(u). Track the global max during the fill pass.*

**(c) Analysis:**
- **(1) Subproblems:** `O(n)`
- **(2) Fill time:** `O(n)`
- **(3) Return:** `max over all u of (top two T(child) values summed)`
- **(4) Return time:** `O(n)`

---

## Pattern F: Bitmask (Subset DP)

Bitmasks track which elements have been visited/used. Subsets are encoded as integers where bit i indicates element i is in the set. The flavor changes based on whether you care about the ending node or just the groups formed.

### Flavor 1: "Path Building" (Traveling Salesperson Problem)

**Concept:** *You need to know which cities S you have visited AND which city i you are currently at, so you can extend to the next city j.*

**(a) Subproblem:** T(S,i) = minimum cost to visit exactly the cities in set S, starting from city 1 and ending at city i, where i ∈ S.

**(b) Recurrence:**

```
T({1}, 1) = 0
T(S, i) = min{ T(S\{i}, j) + d(j,i) : j ∈ S\{i} }
                                     for all S ⊆ {1..n} with 1 ∈ S, i ∈ S, i ≠ 1
```

> *S\{i} means the set S with city i removed. Fill order: by increasing |S|. d(j,i) = distance from j to i.*

**(c) Analysis:**
- **(1) Subproblems:** `O(2ⁿ · n)`
- **(2) Fill time:** `O(2ⁿ · n²)`
- **(3) Return:** `min{ T({1..n}, i) + d(i,1) : 2 ≤ i ≤ n }`
- **(4) Return time:** `O(n)`

---

### Flavor 2: "Subset Partitioning" (Minimum Cost to Partition into Groups)

**Concept:** *You don't care about order or endpoints — just split the universe into optimal subsets. Iterate over all submasks S' of S.*

**(a) Subproblem:** T(S) = minimum cost to optimally partition the elements in set S into groups.

**(b) Recurrence:**

```
T(∅) = 0
T(S) = min{ T(S\S') + cost(S') : S' ⊆ S, S' ≠ ∅ }
                                     for all non-empty S ⊆ {1..n}
```

> *The 3ⁿ runtime comes from iterating over all submasks of all masks. Each element is in S', in S\S', or not in S — three choices per element.*

**(c) Analysis:**
- **(1) Subproblems:** `O(2ⁿ)`
- **(2) Fill time:** `O(3ⁿ)`
- **(3) Return:** `T({1..n})`
- **(4) Return time:** `O(1)`


