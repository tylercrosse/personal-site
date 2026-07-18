import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const contentRoot = path.resolve("src/content/ideas");
const citationGroupPattern = /\[[^\]\n]*@[^\]\n]+\]/g;
const citationKeyPattern = /@([A-Za-z0-9_.:+-]+)/g;
const bibKeyPattern = /^@\w+\s*\{\s*([^,\s]+)/gm;

function articleFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return articleFiles(fullPath);
    return /^index\.mdx?$/.test(entry.name) ? [fullPath] : [];
  });
}

function citationKeys(markdown) {
  return [...markdown.matchAll(citationGroupPattern)].flatMap((group) =>
    [...group[0].matchAll(citationKeyPattern)].map((match) => match[1]),
  );
}

function bibliographyKeys(bibtex) {
  return [...bibtex.matchAll(bibKeyPattern)].map((match) => match[1]);
}

const errors = [];
const warnings = [];
let citedArticles = 0;
let citationCount = 0;
let referenceCount = 0;

for (const articlePath of articleFiles(contentRoot)) {
  const markdown = readFileSync(articlePath, "utf8");
  const citations = citationKeys(markdown);
  const bibliographyPath = path.join(path.dirname(articlePath), "references.bib");

  if (!citations.length) {
    if (existsSync(bibliographyPath)) {
      warnings.push(`${path.relative(process.cwd(), bibliographyPath)} is unused`);
    }
    continue;
  }

  citedArticles += 1;
  citationCount += citations.length;

  if (!existsSync(bibliographyPath)) {
    errors.push(
      `${path.relative(process.cwd(), articlePath)} cites references but has no sibling references.bib`,
    );
    continue;
  }

  const bibliography = bibliographyKeys(readFileSync(bibliographyPath, "utf8"));
  const available = new Set(bibliography);
  const used = new Set(citations);
  referenceCount += bibliography.length;

  for (const key of used) {
    if (!available.has(key)) {
      errors.push(
        `${path.relative(process.cwd(), articlePath)} cites missing key ${key}`,
      );
    }
  }

  const duplicateKeys = bibliography.filter(
    (key, index) => bibliography.indexOf(key) !== index,
  );
  for (const key of new Set(duplicateKeys)) {
    errors.push(
      `${path.relative(process.cwd(), bibliographyPath)} defines ${key} more than once`,
    );
  }

  const unused = bibliography.filter((key) => !used.has(key));
  if (unused.length) {
    warnings.push(
      `${path.relative(process.cwd(), bibliographyPath)} has unused entries: ${unused.join(", ")}`,
    );
  }
}

for (const warning of warnings) console.warn(`Reference warning: ${warning}`);

if (errors.length) {
  for (const error of errors) console.error(`Reference error: ${error}`);
  process.exitCode = 1;
} else {
  console.log(
    `References OK: ${citationCount} citations and ${referenceCount} entries across ${citedArticles} articles.`,
  );
}
