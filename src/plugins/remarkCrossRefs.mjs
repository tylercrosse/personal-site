// LaTeX-style cross-references for figures, tables, and equations.
//
// Figures and tables are components — `<Figure id="…">` / `<Table id="…">` —
// numbered in document order (skipping `numbered={false}`); the component
// renders its own number, caption, and `#fig-…` / `#tbl-…` anchor. Equations
// stay native `$$…$$`; an author adds `\label{name}` inside the display math,
// and this pass numbers the labeled ones, strips the `\label` before KaTeX sees
// it, and wraps the equation to render a right-aligned "(N)" with an `#eq-name`
// anchor.
//
// References are written `[fig:label]` / `[tbl:label]` / `[eq:label]` (plus a
// `|short` variant: "Fig. N" / "Tbl. N" / "Eq. N"). The whole document is
// mapped before any reference resolves, so forward references work. Each sigil
// is distinct from the `[@…]` citation syntax, so rehype-citation ignores them.
//
// A reference may reach us as a CommonMark shortcut `linkReference` (usual) or
// as raw text (defensive); both shapes are handled, in prose and in captions.

const TYPES = {
  fig: {
    kind: "component",
    component: "Figure",
    word: "Figure",
    short: "Fig.",
    refClass: "figure-reference",
    brokenClass: "figure-ref-broken",
    dataAttr: "dataFigRef",
  },
  tbl: {
    kind: "component",
    component: "Table",
    word: "Table",
    short: "Tbl.",
    refClass: "table-reference",
    brokenClass: "table-ref-broken",
    dataAttr: "dataTblRef",
  },
  eq: {
    kind: "math",
    word: "Equation",
    short: "Eq.",
    refClass: "equation-reference",
    brokenClass: "equation-ref-broken",
    dataAttr: "dataEqRef",
  },
};

const SIGILS = Object.keys(TYPES);
const REF_RE = new RegExp(`\\[(${SIGILS.join("|")}):([^\\]\\s]+)\\]`, "g");
const HAS_REF_RE = new RegExp(`\\[(${SIGILS.join("|")}):`);
const LABEL_RE = /\\label\s*\{([^}]+)\}/;

function reportProblem(file, dev, message) {
  const where = file?.path ? ` (${file.path})` : "";
  const text = `[remark-cross-refs] ${message}${where}`;
  // In dev we surface a visible marker and keep going; a production build fails
  // hard, matching the other build-time audits.
  if (dev) console.warn(text);
  else throw new Error(text);
}

// ---- shared attribute helpers (components) --------------------------------

function isComponent(node, name) {
  return (
    (node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement") &&
    node.name === name
  );
}

function getStringAttr(node, name) {
  const attr = node.attributes?.find(
    (a) => a?.type === "mdxJsxAttribute" && a.name === name,
  );
  return typeof attr?.value === "string" ? attr.value : undefined;
}

// `numbered` defaults true; only an explicit `numbered={false}` (or
// numbered="false") opts a component out of the count.
function isNumbered(node) {
  const attr = node.attributes?.find(
    (a) => a?.type === "mdxJsxAttribute" && a.name === "numbered",
  );
  if (!attr) return true;
  if (attr.value === null) return true; // bare `numbered`
  if (typeof attr.value === "string") return attr.value !== "false";
  return attr.value?.value?.trim() !== "false"; // `numbered={false}`
}

// ---- equation \label handling ---------------------------------------------

function stripLabelFromText(node) {
  if (node.type === "text" && typeof node.value === "string") {
    node.value = node.value.replace(LABEL_RE, "").trimEnd();
    return;
  }
  for (const child of node.children ?? []) stripLabelFromText(child);
}

// Pull `\label{name}` out of the TeX and remove it so KaTeX never sees it.
// remark-math caches the rendered TeX in `data.hChildren` (nested inside a
// <code> element), which is what rehype-katex actually reads — so strip there
// too, not just from `.value`.
function stripLabel(mathNode) {
  const match = mathNode.value?.match(LABEL_RE);
  if (!match) return null;
  mathNode.value = mathNode.value.replace(LABEL_RE, "").trimEnd();
  for (const child of mathNode.data?.hChildren ?? []) stripLabelFromText(child);
  return match[1].trim();
}

// ---- pass 1: number everything, build label -> number maps ----------------

function buildMaps(tree, file, dev) {
  const counters = { fig: 0, tbl: 0, eq: 0 };
  const seen = { fig: new Set(), tbl: new Set(), eq: new Set() };
  const maps = { fig: new Map(), tbl: new Map(), eq: new Map() };

  function handleComponent(node, sigil) {
    const type = TYPES[sigil];
    const numbered = isNumbered(node);
    if (numbered) counters[sigil] += 1;
    const id = getStringAttr(node, "id");
    if (!id) return;
    if (!numbered) {
      reportProblem(
        file,
        dev,
        `${type.component} id="${id}" has numbered={false} and cannot be referenced.`,
      );
    } else if (seen[sigil].has(id)) {
      reportProblem(file, dev, `Duplicate ${sigil} id "${id}".`);
    } else {
      seen[sigil].add(id);
      maps[sigil].set(id, counters[sigil]);
    }
  }

  function handleMath(node) {
    const label = stripLabel(node);
    if (!label) return; // only labeled equations are numbered
    counters.eq += 1;
    if (seen.eq.has(label)) {
      reportProblem(file, dev, `Duplicate equation label "${label}".`);
    } else {
      seen.eq.add(label);
      maps.eq.set(label, counters.eq);
    }
    node.data = node.data ?? {};
    node.data.eqLabel = label;
    node.data.eqNumber = counters.eq;
  }

  (function walk(node) {
    for (const child of node.children ?? []) {
      if (isComponent(child, "Figure")) handleComponent(child, "fig");
      else if (isComponent(child, "Table")) handleComponent(child, "tbl");
      else if (child.type === "math") handleMath(child);
      walk(child);
    }
  })(tree);

  return maps;
}

// ---- pass 2: wrap labeled equations with a number + anchor ----------------

function wrapEquations(tree) {
  (function walk(node) {
    if (!Array.isArray(node.children)) return;
    const out = [];
    for (const child of node.children) {
      if (child.type === "math" && child.data?.eqLabel) {
        out.push({
          type: "equationBlock",
          data: {
            hName: "div",
            hProperties: {
              className: ["equation"],
              id: `eq-${child.data.eqLabel}`,
            },
          },
          children: [
            child,
            {
              type: "equationNumber",
              data: {
                hName: "span",
                hProperties: { className: ["equation-number"] },
              },
              children: [{ type: "text", value: `(${child.data.eqNumber})` }],
            },
          ],
        });
      } else {
        walk(child);
        out.push(child);
      }
    }
    node.children = out;
  })(tree);
}

// ---- shared reference resolution ------------------------------------------

function resolveRef(sigil, raw, maps, file, dev) {
  const type = TYPES[sigil];
  const [label, ...modifiers] = raw.split("|");
  const number = maps[sigil].get(label);
  if (number == null) {
    reportProblem(file, dev, `Unknown ${sigil} reference "${sigil}:${label}".`);
    return { label, number: null, text: `⚠ ${sigil}:${label}?` };
  }
  const text = modifiers.includes("short")
    ? `${type.short} ${number}`
    : `${type.word} ${number}`;
  return { label, number, text };
}

function referenceNode(sigil, raw, maps, file, dev) {
  const type = TYPES[sigil];
  const { label, number, text } = resolveRef(sigil, raw, maps, file, dev);
  if (number == null) {
    return {
      type: "emphasis",
      data: { hProperties: { className: [type.brokenClass] } },
      children: [{ type: "text", value: text }],
    };
  }
  return {
    type: "link",
    url: `#${sigil}-${label}`,
    data: {
      hProperties: { className: [type.refClass], [type.dataAttr]: label },
    },
    children: [{ type: "text", value: text }],
  };
}

// ---- pass 3: captions (component props render as plain text) ---------------

function rewriteCaptionText(value, maps, file, dev) {
  return value.replace(REF_RE, (_match, sigil, raw) =>
    resolveRef(sigil, raw, maps, file, dev).text,
  );
}

function resolveCaption(node, maps, file, dev) {
  const attr = node.attributes?.find(
    (a) => a?.type === "mdxJsxAttribute" && a.name === "caption",
  );
  if (!attr) return;

  if (typeof attr.value === "string") {
    if (HAS_REF_RE.test(attr.value)) {
      attr.value = rewriteCaptionText(attr.value, maps, file, dev);
    }
    return;
  }

  if (attr.value?.type === "mdxJsxAttributeValueExpression") {
    const expression = attr.value.data?.estree?.body?.[0]?.expression;
    if (
      expression?.type === "Literal" &&
      typeof expression.value === "string" &&
      HAS_REF_RE.test(expression.value)
    ) {
      // caption={"…"} downgrades to a plain string attribute once rewritten.
      attr.value = rewriteCaptionText(expression.value, maps, file, dev);
    }
  }
}

function resolveCaptions(tree, maps, file, dev) {
  (function walk(node) {
    for (const child of node.children ?? []) {
      if (isComponent(child, "Figure") || isComponent(child, "Table")) {
        resolveCaption(child, maps, file, dev);
      }
      walk(child);
    }
  })(tree);
}

// ---- pass 4: prose references ---------------------------------------------

function refSigil(rawLabel) {
  for (const sigil of SIGILS) {
    if (rawLabel.startsWith(`${sigil}:`)) return sigil;
  }
  return null;
}

function splitTextRefs(value, maps, file, dev) {
  const out = [];
  let last = 0;
  REF_RE.lastIndex = 0;
  let match;
  while ((match = REF_RE.exec(value))) {
    if (match.index > last) {
      out.push({ type: "text", value: value.slice(last, match.index) });
    }
    out.push(referenceNode(match[1], match[2], maps, file, dev));
    last = match.index + match[0].length;
  }
  if (last < value.length) out.push({ type: "text", value: value.slice(last) });
  return out;
}

function transformRefs(tree, maps, file, dev) {
  (function walk(node) {
    if (!Array.isArray(node.children)) return;
    const out = [];
    for (const child of node.children) {
      let handled = false;
      if (child.type === "linkReference") {
        const rawLabel = child.label ?? child.identifier ?? "";
        const sigil = refSigil(rawLabel);
        if (sigil) {
          out.push(
            referenceNode(sigil, rawLabel.slice(sigil.length + 1), maps, file, dev),
          );
          handled = true;
        }
      } else if (child.type === "text" && HAS_REF_RE.test(child.value)) {
        out.push(...splitTextRefs(child.value, maps, file, dev));
        handled = true;
      }
      if (!handled) {
        walk(child);
        out.push(child);
      }
    }
    node.children = out;
  })(tree);
}

/**
 * Remark plugin. Numbers figures/tables (components, document order) and
 * labeled equations (native `$$` + `\label`), then rewrites `[fig:]` / `[tbl:]`
 * / `[eq:]` references into linked "Figure N" / "Table N" / "Equation N".
 *
 * @param {{ dev?: boolean }} [options] - `dev: true` turns broken references
 *   into a visible marker instead of failing the build.
 */
export default function remarkCrossRefs(options = {}) {
  const dev = Boolean(options.dev);
  return (tree, file) => {
    const maps = buildMaps(tree, file, dev);
    wrapEquations(tree);
    resolveCaptions(tree, maps, file, dev);
    transformRefs(tree, maps, file, dev);
  };
}
