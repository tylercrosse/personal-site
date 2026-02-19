# Divide & Conquer Guidance

Rules:

- Submissions must be a Divide & Conquer approach to be eligible for points.
- When asked to describe your solution in words, you may not use code/pseudocode
- Each recurrence should be a smaller problem than before.
- You must beat the brute force solution

You may leverage known algorithms mentioned as part of your solution, such as **Binary Search**, **Merge Sort**, **Median of Medians (FastSelect)**, or **FastMultiply**. See [#183](https://edstem.org/us/courses/91623/discussion/threads/183) for further information and runtimes on these known algorithms.

You may also choose to modify a known algorithm (using the pattern and general logic, but adapting it to suit your needs). If you do so, you **must** (a) account for the run time impact of any modifications (b) justify why your approach, including the modifications, solve the problem.

## Required Parts of a D&C Solution

- **(a) Algorithm**.
    - Describe "how" to solve the problem in words (narrative/paragraph form)
    - Bulleted steps are fine, but pseudocode/code is not allowed
            - "Pseudocode" includes line-by-line restatement of code as words.
            - If you find yourself using a lot of nested bullets, you might be erring on the side of line-by-line conversion of code into words, which is not a narrative.
        - Must include all steps, including the final return
    - If you modify a known algorithm you must detail the modifications.

- **(b) Justification of Correctness**.
- Describe "why" your algorithm solves the problem, in words (narrative).
    - This is not a formal inductive proof; informal justification is ok.
    - If you modify a known algorithm you must include an explanation of why that modification is correct and effective.

- **(c) Runtime Analysis**.
    - Analyze all steps of the algorithm in **Big-O notation**.
    - Always, _always_ in this course - worst case Big-O.
    - Do not have to analyze O(1) steps
    - May assert known unmodified black-box runtimes without further justification
    - If a black box is modified, the runtime impact of those modifications must be justified, even if there is no impact.
    - Must provide an overall final runtime in (you guessed it) Big-O notation, fully simplified.

You should address each of the three components **separately**, and keep in mind that you are writing for an audience. The harder it is to find a required component the more likely you will be disappointed with your initial grade. There is no implicit justification of correctness within the algorithm steps; the correctness must be explicitly justified.

## Steps to developing a D&C solution:

- Figure out your pattern; it may (but does not have to) leverage a known algorithm
    - Sorted = Binary Search (usually)
    - Unsorted = Merge Sort or FastSelect (usually)
    - Polynomials, convolution, multiplication = FFT (usually)
- State the modification of the known algorithm **if needed**. You may also use a known algorithm as is.
- Which parts of the algorithm you are changing.
    - What are your inputs and outputs to the algorithm, if changed.
- State the steps of your algorithm in words
- Must include base case(s) **if needed**
- Always return what the problem asks for
- Prove Correctness
    - Explain why this algorithm solves the problem.
    - Not a formal/mathematical proof.
    - Examples of things you might cover:
        - Why use this black box? What qualities of the input allow you to take advantage of its use?
        - Why did you make a black box modification?
        - Why does the problem space get smaller on each round?
        - Why does the base case always hold true?
        - Why do we decide to branch left or right on each round?
- Analyze the runtime.