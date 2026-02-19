# DP Recurrence Relations

https://edstem.org/us/courses/91623/discussion/7498826

## 1. Context:

Part 2, or the "_recurrence relation_", in a DP problem solution for this course
is providing a mathematical definition of the table entries for the solution. In
contrast, Part 1, or the "_subproblem definition_", is providing a short
explanation in English explaining the meaning of each table entry, and Part 3,
or the "I*mplementation Analysis*", is an assessment of building and using this
table defined in the "_recurrence relation_" to solve the original problem.

Think of it this way: the _recurrence relation_ is the mathematical
specification, and _implementation_ would be the step by step algorithm or code
that implements it.

## 2. What is a Recurrence Relation?

Dynamic Programming uses recurrence relations. _**Without a recurrence relation,
a solution is not a Dynamic Programming solution**_**.**

Key characteristics of a recurrence relation:

- A recurrence relation is an equation.
- The equation provides a general rule for the recurrence.
- The rule defines the next term as a function of the previous term(s).

To generate the sequence (or table) using the general rule, your general rule
may depend on values being pre-defined for some early elements in this sequence,
which are called **base cases**. Typically, separate equations are used for the
base case(s). For example, here is a recurrence relation and base cases for LCS
(DP1 lecture 24+):

```
Base cases:
L(i) = 0, 0 <= i <= n
L(0,j) = 0, 1 <= j <= n

Recurrence:

L(i,j) = max{L(i-1,j), L(i,j-1) }, if x_i != y_j
       = 1 + L(i-1, j-1), if x_i = y_j

where i,j: 1 <= i <= n, 1 <= j <= n
```

Note:

1. There are multiple base cases, and the bounds for the indices _i_ and _j_ are
   specified. If no indices are used (such as when there are only one or two
   individual base case table entries), bounds are not required. For example,
   T[1] = 1 does not have bounds because no variable is used.
2. The bounds for the indices in the base cases are different and specified
   separately from the bounds for recurrence relation. Frequently, the bounds
   will be slightly different between the base cases and the recurrence
   relation.
3. The bounds as provided convey directionality of your table fill. That is,
   when the range is 0 <= i <= n, we assume a fill order of left to right. If
   your approach depends on a right to left fill order (common for suffix-based
   approaches), then your bounds need to reflect this as well, such as n >=
   i >= 0.
4. Each unique table entry cannot be contradicted by setting it multiple times.
   In math, you cannot say "x=5" and "x=3" simultaneously. This should be
   reflected by comprehensive and mutually-exclusive conditions where
   `otherwise` can be used to specify "all other conditions".
5. Similarly, a table entry defined mathematically can only have one value. For
   example, in this example definition, L(0,7) is defined under the base cases,
   and L(1, 5) would be defined by one of the two options in the recurrence
   relation.
   - Exception: it is ok for the exact same table entry to be specified more
     than once in a recurrence relation, as long as it is set equal to the same
     value across all instances.

6. Table entries cannot be overwritten. While this would be acceptable in
   pseudocode where there is a sense of "before", "after", and "iterations",
   these concepts are not present in a mathematical definition. A table entry is
   not a temporary variable to store data in this context; it is a clearly,
   mathematically defined value. This point is similar to the previous bullet.
7. All table entries that are used to generate the value of any other table
   entry have a clearly defined value. In other words, there is no scenario
   where an undefined table entry is used to calculate the value of another
   table entry.

## 3. Examples

Example 1:

```
❌ Example 1: Incorrect version 1
Base Case:
T[i] = 0, 0 <= i <= n

Recurrence:
T[i] = T[i-1]+1, 1 <= i <=n
```

**What's wrong**: Multiple assignments to the same elements. All the entries
defined by the recurrence relation are overlapping with the base cases.

```
❌ Example 1: Incorrect version 2
Base Case:
T[0] = 0

Recurrence:
if i >= 1 T[i] = T[i-1]+1
```

**What's wrong**: Incomplete bounds for _i_ in the recurrence relation (needs to
have a ceiling because our tables are finite in size), and use of an if
statement construct (which is a pseudocode construct, and not a math construct).

```
❌ Example 1: Incorrect Version 3
Base Case:
for i = 0->n: T[i] = 0

Recurrence:
for i = 1->n: T[i] = T[i-1]+1
```

**What's wrong:** This is completely pseudocode. for loop constructs are used,
and the table entries are defined more than once. This is not a mathematical
definition for table entries.

```
✅ Example 1 (corrected):
Base Case:
T[0] = 0

Recurrence:
T[i] = T[i-1]+1, 1 <= i <= n
```

---

Example 2:

```
❌ Example 2: Incorrect version
Base Case:
T[0] = 0

Recurrence:
T[i] = max{T[i],T[i-1]+1}, 1 <= i <= n
```

**What's wrong:** T[i] is on both the left and the right sides of the equation.
The undefined T[i] is being used to define T[i]. With this incorrect version, it
looks like there is an attempt to use pseudocode, but the mathematical
definition for a recurrence relation is an equation and not a step-by-step
procedure. Each table entry can only be defined once, and there is no such thing
as "prior value."

```
✅ Example 2 (corrected):

Base Case:
T[0] = 0

Recurrence:
T[i] = max{T[j]+1}, 1 <= i <= n and 0 <= j < i
```

You can add helper indices if needed to access a range of previous table
entries, as long as the helper indices are clearly defined (bounded).

Other Notes:

Some ways you can write a range:

```
T[i] = 0, 0 <= i <= n
T[i] = 0 where 0 <= i <= n
T[i] = 0 s.t. 0 <= i <= n
```

## 4. FAQ:

1. Q: Should table entries use [] or ()?  
   A: Either is fine, just be consistent.

2. Q: Would you define an empty set/list/array as {}?  
   A: Yes, that's the standard notation. It can also be shown as the greek Phi
   ϕ, but do not use special symbols in Canvas submissions due to issues with
   porting format to the grading environment.

3. Q: Can a base case be a non-discrete value, such as T[i] = T[i-1, 0]+1,
   1<=i<=n as long as it's not the same as the recurrence function?  
   A: We are expecting base cases to be a terminating scenario that does not use
   recursion to produce an answer, such as a hard-coded value for those earlier
   elements of the table.

4. Q: Are we allowed to use "or", "and", "||", "&&", logical not (!x),
   "infinity" in our recurrence definition?  
   A: Yes.

5: Q: When is it ok to use "if" and not ok to use "if"?  
A: You can use "if" for conditions (frequently on the right side of a multiline
equation) to specify which right-hand side to use for an equation when defining
a value. You cannot use an if statement (control of flow construct).

6. Q. If we are using multiple tables, should each table have its own recurrence
   definition?  
   A: The recurrence section is made up of base case(s) and a general
   recurrence. Both tables need to fit into this singular structure. [NOTE:
   while using multiple tables can be a valid approach, it is almost always more
   complicated than necessary to solve a problem in our class.]
