# Dynamic Programming Guidance

https://edstem.org/us/courses/91623/discussion/7498824

Solutions for **Dynamic Programming** (DP) Homework are in a written format with
required components. This post is intended to give a general overview of those
parts of such a solution. You will also see quiz and exam questions based on
what constitutes a complete solution for DP.

## General Rules

- Submissions must be a Dynamic Programming approach to be eligible for points.
- No recursion or memoization.
- _Inputs_ are always indexed starting from 1, unless stated otherwise (i.e.
  `A[0]` is usually invalid).
- _Inputs_ may not be modified - they are to be treated as immutable.
- Tables may start from anywhere. If you need `T[0]` or `T[-1]` for a base case,
  this is valid as long as it is defined.
- Tables may only store primitive values: integers, decimals, characters, or
  Booleans.

## Required Sections

- **(a) Subproblem Definition**
  - **ALWAYS** build on a **_subset_** of the input (e.g., `A[1..i]`).
    - Conceptually, the subproblem should always be defined against "previous"
      subproblems and not on the entire input.
  - Is represented using words: "`T(i,j)` is the ....."
  - Should use words from the problem statement without redefining their meaning
  - May or may not require inclusion of the last element: ", including `A[i]`"
  - The lectures use the phrase "which includes `a[i]`" to add the constraint
    "element `a[i]` must be used in the subproblem output." The phrases "which
    includes `i`" and "ending at `a[i]`" would also imply this constraint. These
    are **_not_** referring to the range of indices considered for the
    subproblem, `1,2,...,i`, which is assumed inclusive [1,i][1,i].
- **(b) Recurrence Definition**
  - [#11](https://edstem.org/us/courses/91623/discussion/threads/11)
    [#11](https://edstem.org/us/courses/91623/discussion/threads/11)
    [#11](https://edstem.org/us/courses/91623/discussion/threads/11) Read,
    absorb, and love
    [#11](https://edstem.org/us/courses/91623/discussion/threads/11)
    [#11](https://edstem.org/us/courses/91623/discussion/threads/11)
    [#11](https://edstem.org/us/courses/91623/discussion/threads/11)
  - Expressed using mathematical notation - no programming constructs and not in
    words
    - The table gets a **single** mathematical definition for all entries -
      there is no logic/flow control structure other than stating a set of
      conditional definitions.
  - Defines the value of all table entries recursively to smaller subproblems
    - Any referenced table entry must also be well-defined
      - i.e. a reference for `T(i-2)` for `1 <= i <= n` requires a definition
        for `T(-1)`
    - It cannot be defined self-referentially (e.g. `T(i) = max(T(i), ...)`)
  - When base case(s) are necessary, include them and their applicable bounds
    - Example: `T(i) = 0 for 1 <= i <= n`
  - Always provide bounds for any variables used, scoped to where they are used
  - Focus on table definitions, not a final solution (i.e. no return value)
- **(c) Implementation Analysis (1,2,3,4)**
  - These parts should be based on the recurrence you use in the previous
    section.
  - **(1) State the number of subproblems in big-O notation**
    - This scales similar to runtime complexity
      - A one-dimensional table ranging from indices -1 to n would be `O(n)`.
    - e.g. `O(n)`, `O(n*m)`
  - **(2) State the runtime to fill this table**
    - Always, _always_ in this course - worst case Big-O notation.
  - e.g. `O(n^2)`
  - **(3) State how/where the final return is extracted from that table**
    - e.g. `sum{T(*)}`, `max{T(*)}`, `T(n)`, `max(T(n), T(n-1))`
  - **(4) State the runtime to extract the final return in big-O notation**

## Tips and Tricks

- You will be tempted to start with code. This is a terrible idea. Starting with
  code ensures your recurrence will be nearly impossible to craft. Do these
  sections in order - Dr. Vigoda does the same thing, and you should see how
  seamlessly the final solution comes together. Define a subproblem, which can
  then be translated to the mathematical recurrence, and the analysis can be
  easily derived from that.
- The lectures contain multiple approaches (LIS, LCS, Knapsack, CMM, etc.). When
  solving a new problem, first try to think of which approach makes the most
  sense to adapt for a solution to the new problem.

## Example Solution

Expand the spoiler below for an example of what a complete DP solution looks
like:

## Longest Increasing Subsequence (LIS)

**a. Define the entries of your table in words. E.g., T(i) or T(i, j) is ...**

Let T(i) = length of LIS in a[1...i] which includes a[i]

**b. State recurrence for entries of your table in terms of smaller
subproblems.**

```
T(1) = 1
T(i) = 1 + max{T(j) if a[i] > a[j] : where 1 <= j <= i-1} where 2 <= i <= n
```

**c. Implementation Analysis**

**(1) State the number of subproblems:** `O(n)` **(2) State the runtime for
table fill:** `O(n^2)` **(3) State how the return is extracted:**
`return max{T(*)}` **(4) State the runtime of that return extraction:** `O(n)`
