# GPU Diagram Image Model Pilot v2 Prompts

These prompts used the original diagram as a visual reference and asked the
image model to preserve the technical content while redrawing the diagram in the
cleaner article style.

## CPU vs GPU

```text
Use case: scientific-educational
Asset type: blog article diagram replacement
Input images: Image 1 is the original diagram reference. Use it only to preserve the technical relationships, layout intent, and key visual distinctions. Do not copy its slide styling.
Primary request: Redraw the CPU vs GPU architecture comparison from Image 1 in a clean self-made diagram style.
Lesson to preserve: CPU has a few larger cores and a large cache; GPU has many smaller cores arranged in groups around a thinner shared cache. The visual contrast should immediately show latency-oriented CPU design versus throughput-oriented GPU design.
Required structure: two side-by-side panels. Left panel labeled "CPU" with exactly four large core blocks above one large cache bar. Right panel labeled "GPU" with a grid of many small core blocks split above and below one horizontal cache bar.
Style/medium: flat vector-like educational diagram, plain white background, thick black outlines, simple rounded rectangles, sparse pastel fills, minimal shadows.
Color palette: core blocks light blue; cache blocks muted purple; labels dark charcoal.
Text: use only "Core", "Cache", "CPU", and "GPU". Render text cleanly and sparingly.
Constraints: preserve the original layout relationship and relative scale differences; keep generous whitespace; no gradients, textures, decorative background, logos, watermarks, 3D effects, or course-slide styling.
```

## CUDA Thread Indexing

```text
Use case: scientific-educational
Asset type: blog article diagram replacement
Input images: Image 1 is the original diagram reference. Use it only to preserve the technical meaning, layout intent, and key visual distinctions. Do not copy its slide styling.
Primary request: Redraw the CUDA thread indexing print example from Image 1 in a clean self-made diagram style.
Lesson to preserve: one kernel program is executed by four CUDA threads; each thread reads its own `threadIdx.x`, so the printed output differs for thread 1, thread 2, thread 3, and thread 4.
Required structure: wide two-part diagram. Left side: a rounded rectangle labeled "program" containing a compact code-like block that shows `print_kernel()` and `threadIdx.x`. Center: one arrow from the program to the threads, with the label "executed by 4 threads". Right side: four small parallel thread markers above four staggered output bars, one per thread, showing outputs for 1, 2, 3, and 4.
Style/medium: flat vector-like educational diagram, plain white background, thick black outlines and arrows, sparse pastel fills, clean sans-serif labels.
Color palette: code box very light blue; output bars pale green or light gray with dark text; arrows and outlines dark charcoal.
Text: keep text minimal and readable. Use exactly these important labels if possible: "program", "print_kernel()", "threadIdx.x", "executed by 4 threads", "Thread 1", "Thread 2", "Thread 3", "Thread 4". Avoid long sentence output text if it would become illegible.
Constraints: preserve the original left-to-right flow and the one-program-to-four-threads idea; no decorative background, no gradients, no course-slide styling, no logos, no watermark.
```

## CUDA Memory Spaces

```text
Use case: scientific-educational
Asset type: blog article diagram replacement
Input images: Image 1 is the original diagram reference. Use it only to preserve the information architecture and row meanings. Do not copy its slide styling.
Primary request: Redraw the CUDA memory-space scope table from Image 1 as a clean self-made educational table.
Lesson to preserve: different CUDA memory spaces have different visibility scopes; shared memory is within one CUDA block, local memory is within one CUDA thread, and global/constant/texture memory are visible to all blocks in a kernel. Constant and texture memory are read-only graphics-oriented spaces.
Required structure: clean three-column table with headers "Memory", "Scope", and "Note". Rows: "Shared Memory" -> "Within one CUDA block"; "Global Memory" -> "All blocks in a kernel"; "Local Memory" -> "Within a CUDA thread"; "Constant Memory" -> "All blocks in a kernel" with note "Read only"; "Texture Memory" -> "All blocks in a kernel" with note "Read only". Add one short footer note: "Constant stores constant values; texture stores 2D texture data."
Style/medium: flat vector-like article diagram, plain white background, thick black outer border, thin internal grid lines, clean readable sans-serif text, no slide theme.
Color palette: dark charcoal header text on very light blue header fill; alternating very light gray and pale green rows; dark charcoal body text.
Text: render the table text exactly where possible; keep it large and readable; no extra words.
Constraints: preserve the original table layout and row order; no decorative background, no gradients, no texture, no logos, no watermark.
```

## GPU Pipeline

```text
Use case: scientific-educational
Asset type: blog article diagram replacement
Input images: Image 1 is the original diagram reference. Use it only to preserve the pipeline stages, relative placement, and visual flow. Do not copy its slide styling.
Primary request: Redraw the GPU pipeline sketch from Image 1 as a clean self-made article diagram.
Lesson to preserve: instruction flow moves left to right through front-end, decode, register file, scheduling, execution, and write-back; the instruction cache feeds the front-end; memory/shared memory sits under the execution area.
Required structure: a single horizontal pipeline from left to right with labeled boxes: "Front-end", "Decode", "RF", "Schedule", "Execution", "Write-back". Add a smaller "I-cache" box above the left/front-end area. Add a vertical lower box under the execution area labeled "Memory" and "Shared Memory". Use narrow vertical separator bars between major stages.
Style/medium: flat vector-like educational diagram, plain white background, thick black outlines, crisp lines, simple typography, generous whitespace.
Color palette: white or very light gray stage boxes, muted orange separator bars, light yellow memory box, dark charcoal text.
Text: render labels exactly: "I-cache", "Front-end", "Decode", "RF", "Schedule", "Execution", "Write-back", "Memory", "Shared Memory".
Constraints: preserve the original compact left-to-right pipeline layout; no decorative background, no gradients, no 3D effects, no logos, no watermark.
```

## Shared Memory Bank Conflicts

```text
Use case: scientific-educational
Asset type: blog article diagram replacement
Input images: Image 1 is the original diagram reference. Use it only to preserve the technical comparison, layout intent, and key visual distinctions. Do not copy its slide styling.
Primary request: Redraw the shared-memory bank conflict diagram from Image 1 in a clean self-made article style.
Lesson to preserve: parallel thread accesses are mapped onto memory banks; when the layout is reduced to a 4-bank version, multiple requested values land on the same banks, creating a bank conflict and limiting how many values can be read at once.
Required structure: two-panel comparison. Left panel: a taller grid with thread groups labeled "Th1", "Th2", "Th3", "Th4", rows labeled "R1" through "R4", thin vertical bank lines, blue read markers and orange write markers above columns, staggered magenta access blocks, and a blue "BUS" arrow along the bottom. Right panel: smaller grid labeled "4 bank version" with the same thread labels across the top, fewer bank columns, a long magenta access band across one row, blue/orange bank markers, and a blue "BUS" arrow below. Add a short red callout near the right panel: "Bank conflict" and "Only two values from each bank".
Style/medium: flat vector-like technical diagram, plain white background, thick black outlines for panels, thin grid lines, clean sans-serif text, no decorative background.
Color palette: dark charcoal lines/text, blue read/bus lines, orange write lines, magenta access highlights, red warning callout.
Text: keep labels short and readable: "Bank Conflict", "4 bank version", "Th1", "Th2", "Th3", "Th4", "R1", "R2", "R3", "R4", "R", "W", "BUS", "Bank conflict", "Only two values from each bank".
Constraints: preserve the original two-part comparison and the conflict callout; no gradients, no 3D effects, no logos, no watermark, no extra explanatory paragraphs.
```

## Roofline Model

```text
Use case: scientific-educational
Asset type: blog article diagram replacement
Input images: Image 1 is the original diagram reference. Use it only to preserve the technical chart, layout intent, and key visual distinctions. Do not copy its slide styling or long bullet text.
Primary request: Redraw the Roofline Model diagram from Image 1 in a clean self-made article style.
Lesson to preserve: performance increases with arithmetic intensity until it reaches the hardware peak FLOPS ceiling. The left region is memory-bound, the right region is compute-bound, and the knee/ridge point separates the two. Example workload points move rightward as arithmetic intensity increases.
Required structure: a clean chart with vertical y-axis labeled "Performance" and horizontal x-axis labeled "Arithmetic intensity (FLOPS/byte)". Show a black roofline curve: one rising diagonal segment on the left and one flat horizontal segment on the right. Shade the left region light blue and label it "Memory bound". Shade the right region pale yellow and label it "Compute bound". Add an arrow callout to the flat segment labeled "Hardware peak FLOPS". Add two purple star or dot markers, one in the memory-bound area and one farther right near the ridge/compute side, connected by a subtle arrow.
Style/medium: flat vector-like educational chart, plain white background, thick black axis lines, clean sans-serif text, sparse pastel fills, generous whitespace.
Text: use only these labels: "Roofline Model", "Performance", "Arithmetic intensity (FLOPS/byte)", "Memory bound", "Compute bound", "Hardware peak FLOPS".
Constraints: preserve the original chart's meaning and left/right region contrast; do not include the long bullet list; no decorative background, no gradients, no 3D effects, no logos, no watermark.
```
