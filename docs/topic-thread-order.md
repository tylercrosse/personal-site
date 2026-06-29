# Topic page post order and thread logic

This document defines the intended post ordering for topic guide pages before
any Astro, HTML, or CSS changes are made.

## Ordering logic

- Topic membership stays tag-driven from `TOPIC_LANDING_PAGES`.
- Production topic pages exclude posts with `draft: true`. Local development may
  include drafts, matching the current `import.meta.env.DEV || !post.data.draft`
  behavior.
- A thread exists only when both the parent post and at least one child post
  match the topic.
- A thread renders as one sortable block. Its sort date is the newest date among
  the parent and all included children.
- A loose post renders as one sortable block. Its sort date is its own post
  date.
- Page order is all blocks sorted newest to oldest.
- If two blocks share the same sort date, thread blocks come before loose posts,
  then title is used for stable ordering.
- Children inside a thread sort oldest to newest to preserve the course or
  project sequence.
- A child whose parent is outside the topic remains a loose post, with a note
  that its parent did not qualify for that topic.

Under this model, it is expected and intentional for a page to have a loose post
above a thread, a loose post below a thread, or both. Freshness is handled at the
block level without flattening parent-child relationships.

## Current production-visible order

The order below is generated from current frontmatter with drafts excluded.

### Machine Learning

Topic tags: `machine-learning`

1. Post: `Same parts, different wiring: mechanistic interpretability of moral fine-tuning`
   - Slug: `2026/llm-morality-mech-interp`
   - Sort date: `2026-02-26`
2. Thread: `GPU Hardware and Software`
   - Parent slug: `2026/gpu-retro`
   - Sort date: `2026-02-25`
   - Children:
     1. `FlashAttention & LLM Inference on GPUs` (`2026/gpu-p6`)
3. Post: `Notes on Effective ML Research`
   - Slug: `2025/ml-research-notes`
   - Sort date: `2025-10-18`
4. Post: `BlueDot AI Safety Evals Paper Club Notes`
   - Slug: `2025/ai-safety-evals-paper-club-notes`
   - Sort date: `2025-09-09`
5. Post: `Hierarchical Reasoning Models`
   - Slug: `2025/hierarchical-reasoning-models`
   - Sort date: `2025-09-03`
6. Thread: `Machine Learning`
   - Parent slug: `2025/ml-retro`
   - Sort date: `2025-08-10`
   - Children:
     1. `A Practical Guide to Supervised Learning` (`2025/ml-a1`)
7. Post: `Reflections on ICML 2025`
   - Slug: `2025/icml`
   - Sort date: `2025-07-30`
8. Post: `Language Diffusion Survey`
   - Slug: `2025/language-diffusion-survey`
   - Sort date: `2025-05-28`
9. Post: `Semantic Search`
   - Slug: `2023/semantic-search`
   - Sort date: `2023-08-16`
10. Post: `Language Models`
    - Slug: `2023/language-models`
    - Sort date: `2023-05-21`

### Deep Learning

Topic tags: `deep-learning`, `NLP`, `large-language-models`,
`generative-models`

1. Post: `Same parts, different wiring: mechanistic interpretability of moral fine-tuning`
   - Slug: `2026/llm-morality-mech-interp`
   - Sort date: `2026-02-26`
2. Post: `FlashAttention & LLM Inference on GPUs`
   - Slug: `2026/gpu-p6`
   - Sort date: `2026-02-25`
   - Note: child of `2026/gpu-retro`; parent is outside this topic.
3. Post: `Hierarchical Reasoning Models`
   - Slug: `2025/hierarchical-reasoning-models`
   - Sort date: `2025-09-03`
4. Post: `Reflections on ICML 2025`
   - Slug: `2025/icml`
   - Sort date: `2025-07-30`
5. Post: `Language Diffusion Survey`
   - Slug: `2025/language-diffusion-survey`
   - Sort date: `2025-05-28`
6. Post: `Semantic Search`
   - Slug: `2023/semantic-search`
   - Sort date: `2023-08-16`
7. Post: `Language Models`
   - Slug: `2023/language-models`
   - Sort date: `2023-05-21`
8. Post: `Search Engine Fundamentals`
   - Slug: `2022/search-engine-fundamentals`
   - Sort date: `2022-11-20`

### GPU & Computer Architecture

Topic tags: `GPU`, `CUDA`, `computer-architecture`

1. Thread: `GPU Hardware and Software`
   - Parent slug: `2026/gpu-retro`
   - Sort date: `2026-02-25`
   - Children:
     1. `CUDA Fundamentals: Tiled Matrix Multiply & Bitonic Sort` (`2026/gpu-p1p2`)
     2. `GPU Simulation: Warp Scheduling & Compute/Tensor Cores` (`2026/gpu-p3p4`)
     3. `Static Analysis: Detecting Branch Divergence in GPU Code` (`2026/gpu-p5`)
     4. `FlashAttention & LLM Inference on GPUs` (`2026/gpu-p6`)
2. Post: `The Hack Virtual Machine`
   - Slug: `2022/nand2tetris-vm-translator`
   - Sort date: `2022-03-12`
3. Post: `From Boolean Logic Gates to an Assembler`
   - Slug: `2021/nand2tetris-part1`
   - Sort date: `2021-09-26`

### Operating Systems & Distributed Systems

Topic tags: `operating-systems`, `distributed-systems`, `multithreading`,
`IPC`, `socket-programming`

1. Post: `GPU Hardware and Software`
   - Slug: `2026/gpu-retro`
   - Sort date: `2026-02-25`
2. Post: `Concurrency and Parallelism`
   - Slug: `2025/parallelism-concurrency`
   - Sort date: `2025-07-29`
3. Thread: `Graduate Introduction to Operating Systems`
   - Parent slug: `2025/gios-retro`
   - Sort date: `2025-07-22`
   - Children:
     1. `Building a Scalable Multithreaded File Server in C` (`2025/gios-pr1`)
     2. `A Deep Dive into IPC with a Proxy-Cache Project` (`2025/gios-pr3`)
     3. `Building a Distributed File System: A Study in C++` (`2025/gios-pr4`)
4. Post: `Exponential Backoff and Jitter`
   - Slug: `2022/exponential-backoff`
   - Sort date: `2022-09-28`

### AI Safety & Mechanistic Interpretability

Topic tags: `AI-safety`, `mechanistic-interpretability`

1. Post: `Same parts, different wiring: mechanistic interpretability of moral fine-tuning`
   - Slug: `2026/llm-morality-mech-interp`
   - Sort date: `2026-02-26`
2. Post: `Notes on Effective ML Research`
   - Slug: `2025/ml-research-notes`
   - Sort date: `2025-10-18`
3. Post: `BlueDot AI Safety Evals Paper Club Notes`
   - Slug: `2025/ai-safety-evals-paper-club-notes`
   - Sort date: `2025-09-09`

## Dev-only draft notes

These posts have `draft: true`, so they may appear in local development but are
excluded from the production-visible order above.

### Machine Learning drafts

- `Reinforcement Learning and Decision Making` (`2025/rl-retro`)
- `High-Dimensional Data Analytics` (`2025/hdda-overview`)
- `Planning and Learning in Markov Decision Processes` (`2025/ml-a4`), child of
  `2025/ml-retro`
- `Unsupervised Learning and Linear Dimensionality Reduction` (`2025/ml-a3`),
  child of `2025/ml-retro`
- `Randomized Optimization on Discrete Landscapes and Neural Networks`
  (`2025/ml-a2`), child of `2025/ml-retro`

### Deep Learning drafts

- `Deep Learning` (`2025/dl-retro`)
- `Reinforcement Learning and Decision Making` (`2025/rl-retro`)
- `DL Final Project - Crosscoding Reasoning Upgrades`
  (`2025/dl-final-project`), child of `2025/dl-retro`
- `DL A4 - VAEs, GANs, and Diffusion on FashionMNIST` (`2025/dl-a4`), child of
  `2025/dl-retro`
- `DL A3 - Sequence Models, Attention, and Translation` (`2025/dl-a3`), child
  of `2025/dl-retro`
- `DL A2 - Practical CNNs and Imbalanced Data` (`2025/dl-a2`), child of
  `2025/dl-retro`
- `DL A1 - Backprop from Scratch` (`2025/dl-a1`), child of `2025/dl-retro`

### GPU & Computer Architecture drafts

- `High Performance Computer Architecture` (`2025/hpca-retro`)

### Operating Systems & Distributed Systems drafts

- `Advanced Operating Systems` (`2025/aos-retro`)

### AI Safety & Mechanistic Interpretability drafts

- `DL Final Project - Crosscoding Reasoning Upgrades`
  (`2025/dl-final-project`), child of `2025/dl-retro`

