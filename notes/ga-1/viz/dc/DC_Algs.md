# Usable Divide and Conquer Algorithms

For the divide and conquer section, you may use the algorithms presented in the course materials to help you solve presented problems.

It may also be that the problem does not lend itself directly to one (or a combo) of the course algorithms, so you may choose to:

- Leverage divide and conquer techniques directly, avoiding the use of course algorithms; or,
- Make modifications to one or more of the course algorithms to make it fit the problem at hand

Any modifications made to the course algorithms must be described and have the impact of the changes accounted for in the runtime analysis.

Modifications listed below under "common modifications" do not need to be described in depth, but the use of a modified algorithm must be explicitly stated and an impact analysis must still be accounted for in the runtime analysis.

Many divide and conquer algorithms exist beyond what is covered in this course; however, only those explicitly mentioned here may be used. The use of extra-curricular algorithms will result in penalties.

Wikipedia entries are provided for supplemental reading, such as history and discovery of these algorithms.

Where differences exist, this post represents the version used in this course.

The following algorithms are available for use during the remainder of the course:

### **Binary Search** (see also: [https://en.wikipedia.org/wiki/Binary_search_algorithm](https://en.wikipedia.org/wiki/Binary_search_algorithm))

- Input:
    - A sorted list of comparable elements.
    - A starting index.
        - 1 is assumed if not provided.
    - An ending index.
        - The size of the list (i.e., `n`) is assumed if the value is known.
    - The target value.
- Output:
    - The index of the first **encountered** match if one exists or "NOT FOUND" if no match could be found.
- Runtime:
    - `O(log n)`

Reference implementation:

```js
binary_search(A, s=1, n, T)
    L = s
    R = n
    while L ≤ R do
        m = floor((L + R) / 2)
        if A[m] < T
            L = m + 1
        else if A[m] > T
            R = m − 1
        else
            return m
    return unsuccessful
```
Common modifications:

- Finding the **leftmost** matching value.
- Finding the **rightmost** matching value.
- Finding the **insertion point** for a missing matching value.

#### Text Description

- **(a) Algorithm**
  We begin by defining a search range that initially encompasses the entire sorted list. In each step, we inspect the middle element of the current range. If the middle element matches our target, the search is complete, and we return its location. If the middle element is smaller than the target, we know the target cannot be in the lower half (including the middle element itself), so we discard that half and continue our search in the upper half. Conversely, if the middle element is larger than the target, we discard the upper half and limit our search to the lower half. This process repeats, finding a new middle element and narrowing the search range by half each time, until the element is found or the range becomes empty, indicating the element is not present.

- **(b) Justification of Correctness**
  - The algorithm relies on the precondition that the input list is sorted. By comparing the middle element to the target, we can definitively determine which half of the current search space the target _must_ lie in (if it exists).
  - If the middle element is smaller than the target, all elements to its left are also smaller (because the list is sorted), so we can safely eliminate them.
  - If the middle element is larger, all elements to its right are also larger, so we eliminate them.
  - This effectively reduces the problem size by half in each iteration, ensuring we either find the element or exhaust the search space.

- **(c) Runtime Analysis**
  - Calculating the midpoint and performing comparisons are constant time operations: O(1).
  - In the worst case, the search space size `n` is halved in each iteration of the while loop.
  - The number of times we can halve `n` before reaching size 1 is `log_2(n)`.
  - Therefore, the total runtime is **O(log n)**.

### **Merge Sort** (see also: [https://en.wikipedia.org/wiki/Merge_sort](https://en.wikipedia.org/wiki/Merge_sort))

- Input:
    - A list of comparable elements.
    - A starting index.
        - 1 is assumed if not provided.
    - An ending index.
        - The size of the list (i.e., `n`) is assumed if the value is known.
- Output:
    - The original list, sorted in ascending order.
- Runtime:
    - `O(n log n)`

Reference implementation (based on DPV pp. 50-51):

```js
merge_sort(A, s=1, n)
    if n > 1
        return merge(merge_sort(A[s ... n/2],
                     merge_sort(A[n/2 + 1 ... n])
    else
        return A

merge(L[1 ... i], R[1 ... j])
    if i = 0
        return R
    if j = 0
        return L

    if L[1] ≤ R[1]
        return L[1] + merge(L[2 ... i], R[1 ... j])
    else
        return R[1] + merge(L[1 ... i], R[2 ... j])
```

Common modifications:

- Returning the list in **descending** order.

#### Text Description

- **(a) Algorithm**
  The algorithm sorts a list by first checking if the list is already trivially sorted (i.e. if it has zero or one elements). If not, we divide the current list into two equal halves. We then recursively apply the same sorting procedure to both the left and right halves. Once the two halves are sorted, we merge them back together into a single sorted list. During the merge step, we maintain pointers to the start of each sorted sublist and repeatedly select the smaller of the two elements being pointed to, adding it to our result list and advancing that pointer. This continues until one sublist is exhausted, at which point valid elements from the remaining sublist are appended to the end of the result.

- **(b) Justification of Correctness**
  - The base case handles trivially sorted lists (size 0 or 1).
  - The recursive step breaks the problem down into smaller subproblems.
  - The merge step relies on the invariant that the two sublists being merged are already sorted (due to the recursive structure). By always selecting the smallest of the available "head" elements from the two sublists, we guarantee that the merged list is constructed in ascending order.
  - This divide-and-conquer strategy ensures that every level of recursion produces sorted segments, ultimately resulting in a fully sorted list.

- **(c) Runtime Analysis**
  - The problem is divided into two subproblems of size `n/2` at each step: `T(n) = 2T(n/2) + O(n)`.
  - The merge operation iterates through all `n` elements once at each level of recursion, taking O(n) time.
  - The recursion depth is `log_2(n)` because the input size is halved at each level.
  - Summing the work across all levels: `O(n) * O(log n)`.
  - The total runtime is **O(n log n)**.

### **Fast Select** (see also: [https://en.wikipedia.org/wiki/Selection_algorithm](https://en.wikipedia.org/wiki/Selection_algorithm))

- Input:
    - A list of comparable elements.
    - A starting index.
        - 1 is assumed if not provided.
    - An ending index.
        - The size of the list (i.e., `n`) is assumed if the value is known.
    - An integer `k`
- Output:
    - The `kth` smallest element from the original list.
- Runtime:
    - `O(n)`

Reference implementation (based on DC2.12):

```js
fast_select(A, s=1, n, k)
    if n = 1
        return A[1]

    i = s
    size = 0
    medians = []

    while (i + 4) ≤ n do
        medians += merge_sort(A, i, i+4)[3]
        size += 1
        i += 5

    if i ≤ n
        medians += merge_sort(A, i, n)[ceil((n - i + 1) / 2)]
        size += 1

    pivot = fast_select(medians, size / 2)

    lows = []
    mids = []
    highs = []

    lowSize = 0
    midSize = 0

    for i = s to n
        if A[i] < pivot
            lows += A[i]
            lowSize += 1
        else if A[i] > pivot
            highs += A[i]
        else
            mids += A[i]
            midSize += 1

    if k ≤ lowSize
        return fast_select(lows, k)
    else if k > lowSize + midSize
        return fast_select(highs, k - lowSize - midSize)
    else
        return pivot
```

Common modifications:

- Return the `kth` **largest** element.

#### Text Description

- **(a) Algorithm**
  The method begins by partitioning the entire list into small groups of five elements each. We find the median of each group and collect these group medians into a new list. We then recursively find the "median of medians"—that is, the median of the newly created list of medians—which we will use as a pivot.

  Once a pivot is chosen, we iterate through the full original list and distribute elements into three buckets: those smaller than the pivot, those equal to the pivot, and those larger than the pivot. Depending on the size of these buckets relative to `k`, we determine where the target element must lie. If `k` falls within the count of smaller elements, we recurse on the "small" bucket. If `k` falls within the "equal" bucket, we have found our element and return it. Otherwise, we adjust `k` by subtracting the counts of the smaller and equal buckets, and recurse on the "large" bucket. The base case occurs when the list is small enough to be sorted directly or contains a single element.

- **(b) Justification of Correctness**
  - The base case handles the smallest possible input.
  - The recursive step reduces the problem size by eliminating a portion of the input list based on `k`'s relative position.
  - By using the "median of medians" as a pivot, we guarantee a more balanced partition than a random or arbitrary pivot. This ensures that the worst-case scenario (where the pivot is an extreme value) is avoided.
  - The recursive structure correctly identifies the `k`-th smallest element by consistently narrowing the search space to the relevant subset of elements.

- **(c) Runtime Analysis**
  - Finding the median of each group of 5 takes constant time, so finding all medians takes O(n).
  - Roughly speaking, the recurrence relation is `T(n) <= T(n/5) + T(7n/10) + O(n)`.
  - `T(n/5)` is the work to find the median of medians.
  - `T(7n/10)` is the worst-case recursive call on the sub-problem (since at least 30% of elements are guaranteed to be discarded).
  - The `O(n)` term accounts for the partitioning step.
  - Solving this recurrence shows that the total runtime is **O(n)**.

### **Fast Multiply** (see also: [https://en.wikipedia.org/wiki/Karatsuba_algorithm](https://en.wikipedia.org/wiki/Karatsuba_algorithm))

- Input:
    - An `n`-bit integer `x` such that `n = 2^k`.
    - An `n`-bit integer `y` such that `n = 2^k`.
- Output:
    - The product of `x` and `y`.
- Runtime:
    - `O(n^(log2 3))`

Reference implementation (based on DPV p. 47, DC1.10)

```js
fast_multiply(x[1 ... n], y[1 ... n])
    if n = 1
        return x * y

    xl = extract_bits(x, 1, n/2)
    xr = extract_bits(x, n/2 + 1, n)
    yl = extract_bits(y, 1, n/2)
    yr = extract_bits(y, n/2 + 1, n)

    A = fast_multiply(xl, yl)
    B = fast_multiply(xr, yr)
    C = fast_multiply(xl + xr, yl + yr)

    return 2^n * A + 2^(n/2) * (C - A - B) + B
```

Common modifications:

- None.

#### Text Description

- **(a) Algorithm**
  The algorithm handles multi-digit multiplication by dividing each number into two equal halves (high bits and low bits). Instead of performing four large sub-multiplications, we compute only three: one recursive call on the two high halves, one recursive call on the two low halves, and a third call on the sum of the halves.

  Using these three recursive results, we algebraically reconstruct the full product. We shift the result of the "high" product by the original number of bits and the intermediate term (derived from subtracting the high and low products from the third product) by half that number of bits. The base case occurs when the numbers are small enough to be multiplied directly in a single operation. This approach effectively reduces the total number of expensive recursive calls needed.
- **(b) Justification of Correctness**
  - The base case for recursion handles tiny inputs correctly.
  - The recursive step uses the Karatsuba multiplication identity, which replaces four multiplications with three multiplications and several additions/subtractions.
  - The formula `(xl * 2^(n/2) + xr)(yl * 2^(n/2) + yr)` expands to `xl*yl*2^n + (xl*yr + xr*yl)*2^(n/2) + xr*yr`.
  - The term `(xl + xr)(yl + yr)` equals `xl*yl + xl*yr + xr*yl + xr*yr`.
  - Thus, `(xl + xr)(yl + yr) - xl*yl - xr*yr` equals `xl*yr + xr*yl`, which is exactly the middle term we need.
  - This confirms the algebraic correctness of the method.

- **(c) Runtime Analysis**
  - The algorithm splits the problem into 3 subproblems of size `n/2`.
  - The splitting and combining steps take `O(n)` time (linear in the number of bits).
  - The recurrence relation is `T(n) = 3T(n/2) + O(n)`.
  - Using the Master Theorem with `a=3`, `b=2`, `d=1`, we find `log_2(3) ≈ 1.585`.
  - Since `log_2(3) > 1`, the work at the leaves dominates.
  - Total runtime is **O(n^(log_2 3))** or approximately **O(n^1.585)**.
