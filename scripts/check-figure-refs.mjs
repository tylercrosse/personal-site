// Source guard: every [fig:label] reference must resolve to a <Figure
// id="label"> in the same post, and a referenced id must be unique. The
// remarkFigureRefs plugin enforces this at build time, but drafts are excluded
// from the production build and so are never compiled — this check reads the
// source of every post, drafts included. Exits 1 with a report if anything
// dangles.
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
// [fig:label] or [fig:label|modifier]; capture the label only.
const REF_PATTERN = /\[fig:([^\]\s|]+)(?:\|[^\]\s]+)?\]/g;

const problems = [];
let postCount = 0;
let refCount = 0;

for (const file of walkMdx(CONTENT)) {
  const source = readFileSync(file, "utf8");
  const ids = [...source.matchAll(ID_PATTERN)].map((match) => match[1]);
  const refs = [...source.matchAll(REF_PATTERN)].map((match) => match[1]);
  if (refs.length === 0) continue;

  postCount += 1;
  refCount += refs.length;

  for (const label of new Set(refs)) {
    const matches = ids.filter((id) => id === label).length;
    if (matches === 0) {
      problems.push(`${file}: [fig:${label}] has no matching <Figure id="${label}">`);
    } else if (matches > 1) {
      problems.push(`${file}: [fig:${label}] is ambiguous — ${matches} elements use id="${label}"`);
    }
  }
}

if (problems.length) {
  console.error("check-figure-refs: unresolved figure references\n");
  for (const problem of problems) console.error(`  ✗ ${problem}`);
  console.error(`\n${problems.length} problem(s).`);
  process.exit(1);
}

console.log(
  `check-figure-refs: ${refCount} reference(s) across ${postCount} post(s) all resolve.`,
);
