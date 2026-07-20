// LaTeX-style figure cross-references. Authors label a figure with
// `<Figure id="clt-arch" … />` and reference it in prose as `[fig:clt-arch]`;
// this pass rewrites the reference into a linked "Figure N" whose number is
// resolved from the figure's document-order position. Forward references work
// because the whole document is mapped before any reference is resolved.
//
// Numbering here mirrors Figure.astro's own counter (document order, skipping
// `numbered={false}`) so the caption number and the reference number always
// agree. The `[fig:…]` sigil deliberately differs from the `[@…]` citation
// syntax, so rehype-citation never touches it.
//
// `[fig:…]` may reach us either as a CommonMark shortcut `linkReference` (the
// usual case) or, defensively, as raw text — both shapes are handled.

const LABEL_PREFIX = "fig:";
const TEXT_REF = /\[fig:([^\]\s]+)\]/g;

function reportProblem(file, dev, message) {
  const where = file?.path ? ` (${file.path})` : "";
  const text = `[remark-figure-refs] ${message}${where}`;
  // In dev we surface a visible marker and keep going; a production build fails
  // hard, matching the other build-time audits.
  if (dev) console.warn(text);
  else throw new Error(text);
}

function isFigure(node) {
  return (
    (node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement") &&
    node.name === "Figure"
  );
}

function getStringAttr(node, name) {
  const attr = node.attributes?.find(
    (a) => a?.type === "mdxJsxAttribute" && a.name === name,
  );
  return typeof attr?.value === "string" ? attr.value : undefined;
}

// Figure.astro: `numbered` defaults true; only an explicit `numbered={false}`
// (or numbered="false") opts a figure out of the count.
function isNumberedFigure(node) {
  const attr = node.attributes?.find(
    (a) => a?.type === "mdxJsxAttribute" && a.name === "numbered",
  );
  if (!attr) return true;
  if (attr.value === null) return true; // bare `numbered`
  if (typeof attr.value === "string") return attr.value !== "false";
  return attr.value?.value?.trim() !== "false"; // `numbered={false}`
}

function buildFigureMap(tree, file, dev) {
  const numbers = new Map();
  const seen = new Set();
  let counter = 0;

  (function walk(node) {
    for (const child of node.children ?? []) {
      if (isFigure(child)) {
        const numbered = isNumberedFigure(child);
        if (numbered) counter += 1;
        const id = getStringAttr(child, "id");
        if (id) {
          if (!numbered) {
            reportProblem(
              file,
              dev,
              `Figure id="${id}" has numbered={false} and cannot be referenced.`,
            );
          } else if (seen.has(id)) {
            reportProblem(file, dev, `Duplicate figure id "${id}".`);
          } else {
            seen.add(id);
            numbers.set(id, counter);
          }
        }
      }
      walk(child);
    }
  })(tree);

  return numbers;
}

function referenceNode(label, numbers, file, dev) {
  const number = numbers.get(label);
  if (number == null) {
    reportProblem(
      file,
      dev,
      `Unknown figure label "${label}" — no <Figure id="${label}" …/> in this document.`,
    );
    return {
      type: "emphasis",
      data: { hProperties: { className: ["figure-ref-broken"] } },
      children: [{ type: "text", value: `⚠ fig:${label}?` }],
    };
  }
  return {
    type: "link",
    url: `#fig-${label}`,
    data: {
      hProperties: { className: ["figure-reference"], dataFigRef: label },
    },
    children: [{ type: "text", value: `Figure ${number}` }],
  };
}

function splitTextRefs(value, numbers, file, dev) {
  const out = [];
  let last = 0;
  TEXT_REF.lastIndex = 0;
  let match;
  while ((match = TEXT_REF.exec(value))) {
    if (match.index > last) {
      out.push({ type: "text", value: value.slice(last, match.index) });
    }
    out.push(referenceNode(match[1], numbers, file, dev));
    last = match.index + match[0].length;
  }
  if (last < value.length) out.push({ type: "text", value: value.slice(last) });
  return out;
}

function transformRefs(tree, numbers, file, dev) {
  (function walk(node) {
    if (!Array.isArray(node.children)) return;
    const out = [];
    for (const child of node.children) {
      const linkLabel =
        child.type === "linkReference" &&
        (child.label ?? child.identifier ?? "");
      if (linkLabel && linkLabel.startsWith(LABEL_PREFIX)) {
        out.push(
          referenceNode(linkLabel.slice(LABEL_PREFIX.length), numbers, file, dev),
        );
      } else if (child.type === "text" && child.value.includes("[fig:")) {
        out.push(...splitTextRefs(child.value, numbers, file, dev));
      } else {
        walk(child);
        out.push(child);
      }
    }
    node.children = out;
  })(tree);
}

/**
 * Remark plugin. Numbers figures by document order, then rewrites `[fig:label]`
 * references into linked "Figure N".
 *
 * @param {{ dev?: boolean }} [options] - `dev: true` turns broken references
 *   into a visible marker instead of failing the build.
 */
export default function remarkFigureRefs(options = {}) {
  const dev = Boolean(options.dev);
  return (tree, file) => {
    const numbers = buildFigureMap(tree, file, dev);
    transformRefs(tree, numbers, file, dev);
  };
}
