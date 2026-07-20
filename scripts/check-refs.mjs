// Source guard for cross-references. Every `[fig:]` / `[tbl:]` / `[eq:]`
// reference must resolve to a definition in the same post — an `id="…"` for a
// figure/table, a `\label{…}` for an equation — and a referenced definition
// must be unique. The remarkCrossRefs plugin enforces this at build time, but
// drafts are excluded from the production build and so are never compiled;
// this check reads the source of every post, drafts included. Exits 1 with a
// report if anything dangles.
import { readdirSync, readFileSync } from "node:fs";
import { join, extname } from "node:path";

const CONTENT = new URL("../src/content/ideas", import.meta.url).pathname;

function* walkMdx(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walkMdx(path);
    else if (extname(path) === ".mdx") yield path;
  }
}

const ID_PATTERN = /\bid="([^"]+)"/g;
const LABEL_PATTERN = /\\label\s*\{([^}]+)\}/g;
// [fig:label] / [tbl:label] / [eq:label], optionally with a |modifier.
const REF_PATTERN = /\[(fig|tbl|eq):([^\]\s|]+)(?:\|[^\]\s]+)?\]/g;

const problems = [];
let postCount = 0;
let refCount = 0;

for (const file of walkMdx(CONTENT)) {
  const source = readFileSync(file, "utf8");
  const ids = [...source.matchAll(ID_PATTERN)].map((m) => m[1]);
  const labels = [...source.matchAll(LABEL_PATTERN)].map((m) => m[1].trim());
  const refs = [...source.matchAll(REF_PATTERN)].map((m) => ({
    sigil: m[1],
    label: m[2],
  }));
  if (refs.length === 0) continue;

  postCount += 1;
  refCount += refs.length;

  const seen = new Set();
  for (const { sigil, label } of refs) {
    const key = `${sigil}:${label}`;
    if (seen.has(key)) continue;
    seen.add(key);

    // Figures/tables resolve to an id="…"; equations resolve to a \label{…}.
    const pool = sigil === "eq" ? labels : ids;
    const definition = sigil === "eq" ? `\\label{${label}}` : `id="${label}"`;
    const matches = pool.filter((value) => value === label).length;

    if (matches === 0) {
      problems.push(`${file}: [${key}] has no matching ${definition}`);
    } else if (matches > 1) {
      problems.push(`${file}: [${key}] is ambiguous — ${matches}× ${definition}`);
    }
  }
}

if (problems.length) {
  console.error("check-refs: unresolved cross-references\n");
  for (const problem of problems) console.error(`  ✗ ${problem}`);
  console.error(`\n${problems.length} problem(s).`);
  process.exit(1);
}

console.log(
  `check-refs: ${refCount} reference(s) across ${postCount} post(s) all resolve.`,
);
