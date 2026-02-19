# Conceptual Approach to Recurrences

For students who don't like memorizing seemingly arbitrary formulas, here's a quick crash course on the conceptual approach to solving recurrences that are covered by the Master Theorem. I developed these concepts by solving several recurrences by hand until I noticed patterns, and since then have never had to look back at the Master Theorem--I truly don't know it. I personally strongly prefer this approach because I find conceptual understanding to be much more enduring and meaningful as a learner. Of course your learning style may lean towards memorizing formulae, and that's fine too!

The runtime of a recurrence conceptually comes from two places: work due to subproblem proliferation vs. work done to merge subproblem results. For example, in the recurrence $T(n)=4T(n/2)+O(n)$, the $4T(n/2)$ characterizes the work due to subproblem proliferation, and the $O(n)$ characterizes the work done to merge subproblem results. (Note that I use the term "merge" rather loosely here to describe whatever postprocessing work is performed on the subproblem results at each layer of recursion, such as the merge operation in mergesort.)

Part 1: Determining work due to subproblem proliferation. This is probably best illustrated with examples.

$T(n)=2T(n/2)$ - two subproblems, half the size, just as much work as before.

$T(n)=5T(n/5)$

$T(n)=8T(n/8)$

All of those are $O(n)$, since we made the subproblems smaller, but still had the same total amount of work.

Here are several problems with quadratic subproblem proliferation; the problems got smaller, but we ended up with more of them:

$T(n)=4T(n/2)$

$T(n)=9T(n/3)$

$T(n)=100T(n/10)$

Those are all $O(n^2)$ since the total amount of work to be done is growing quadratically.

$T(n)=8T(n/2)$

$T(n)=64T(n/4)$

$T(n)=125T(n/5)$

Those are all $O(n^3)$. The problems got smaller, but we ended up with way more of them. Etc.

It could be a non-integer exponent, and that's when we need logs. Consider the middle one below.

$T(n)=4T(n/2)→O(n^2)$

$T(n)=7T(n/2)$

$T(n)=8T(n/2)→O(n^3)$

We could estimate it to be $O(n^{2.8})$, which is pretty close. We could more accurately say it's $O(n^{\log_⁡2(7)})$, since that is, by definition, the exponent that turns 2 into 7. This even works if we get less subproblems than the linear case:

$T(n)=2T(n/3)→O(n^{\log_⁡3(​2)})≈O(n^{0.631})$

Of course, if we only end up with a single problem at each step, we'll shrink down to a single unit of work:

$T(n)=T(n/2)→O(1)$

The above is probably the hardest part of this. There are now three possibilities when you compare the work from subproblem proliferation with the work from merging (postprocessing) the results from the subproblems into the final answer:

The work due to subproblem proliferation dominates--the vast majority of the work occurs at the lowest level of recursion. Keep this dominant runtime as the overall runtime.

The work due to merging results dominates--the vast majority of the work occurs at the highest level of recursion. Keep this dominant runtime as the overall runtime.

The two tie--each level of $O(\log⁡n)$ levels of recursion is the same amount of work, so the work at each level is multiplied by $\log⁡n$ to get the overall result.*

Here are a few overall examples:

$T(n)=8T(n/2)+O(n^2)$

Well that's $O(n^3)$ from subproblem proliferation vs. $O(n^2)$ for merge, and the former dominates. It's $O(n^3)$ overall.

$T(n)=3T(n/4)+O(n)$

That's $O(n^{\log_⁡4(3)})≈O(n^{0.792})$ vs. $O(n)$, so $O(n)$ dominates.

$T(n)=25T(n/5)+O(n^2)$

This example has $O(n^2)$ work due to subproblem proliferation and $O(n^2)$ work due to merging subproblem results. Since it's a tie, this works out to $O(n^2\log⁡n)$.

Hope this conceptual crash course helps someone! Feel free, as always, to ask clarifying follow ups.

> [!aside]
> A few terms ago an astute student discovered a very niche edge case that falls into the "tie" category. From that conversation:  
  > 
> Ok after crunching it out by hand I do see that there's a unique edge case hidden in there that I'd never been aware of before, and I'd still need to work out some more examples to feel totally confident that I've grasped it. It's a bit awkward to squeeze into the intuitive framework, but what it comes down to is that $O(n^k)$ from subproblem proliferation and $O(n^k\log⁡n)$ from merge are close enough to tie, leading to $O(n^k\log⁡n\log⁡n)$ runtime based on the tie case described in the original post.


