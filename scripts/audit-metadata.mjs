// Attribution-metadata guard for the `sources` and `credits` frontmatter.
// Companion to audit-references.mjs (which covers inline [@key] citations). The
// article's references.bib is the single store of citation metadata: `sources`
// entries and credit `sourceKey`s are bib keys that must resolve there. Key-form
// sources and sourceKey credits render inside the References section
// (rehypeArticleCitations); only the legacy self-contained forms still render in
// the PostCredits footer — they are accepted during migration and flagged here
// so the remaining work stays visible.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import matter from "gray-matter";

const contentRoot = path.resolve("src/content/ideas");
const bibKeyPattern = /^@\w+\s*\{\s*([^,\s]+)/gm;
// A hand-written bibliography section competing with the `sources` footer.
// "Further reading" / "Further material" / "Related" are optional-reading
// headings and are intentionally not flagged here.
const competingHeadingPattern =
  /^#{2,6}\s+(references|bibliography|additional resources?|works cited)\b/im;

function articleFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return articleFiles(fullPath);
    return /^index\.mdx?$/.test(entry.name) ? [fullPath] : [];
  });
}

function bibliographyKeys(bibtex) {
  return [...bibtex.matchAll(bibKeyPattern)].map((match) => match[1]);
}

const errors = [];
const warnings = [];
let articlesWithSources = 0;
let sourceEntries = 0;
let articlesWithCredits = 0;
let creditEntries = 0;
let mappedAssets = 0;

for (const articlePath of articleFiles(contentRoot)) {
  const relArticle = path.relative(process.cwd(), articlePath);
  const raw = readFileSync(articlePath, "utf8");

  let data;
  let content;
  try {
    ({ data, content } = matter(raw));
  } catch (cause) {
    errors.push(`${relArticle} has unparseable frontmatter: ${cause.message}`);
    continue;
  }

  const sources = Array.isArray(data.sources) ? data.sources : [];
  const credits = Array.isArray(data.credits) ? data.credits : [];
  const articleDir = path.dirname(articlePath);

  const bibliographyPath = path.join(articleDir, "references.bib");
  const bibKeys = existsSync(bibliographyPath)
    ? new Set(bibliographyKeys(readFileSync(bibliographyPath, "utf8")))
    : null;

  function checkKey(where, key) {
    if (!bibKeys) {
      errors.push(`${where} references key ${key} but the article has no references.bib`);
    } else if (!bibKeys.has(key)) {
      errors.push(`${where} references key ${key} not found in references.bib`);
    }
  }

  // ---- sources ----------------------------------------------------------
  if (sources.length) {
    articlesWithSources += 1;
    sourceEntries += sources.length;

    const seenKeys = new Map();
    sources.forEach((source, index) => {
      const where = `${relArticle} source #${index + 1}`;
      if (typeof source === "string") {
        checkKey(where, source);
        seenKeys.set(source, (seenKeys.get(source) ?? 0) + 1);
      } else {
        warnings.push(`${where} uses the legacy object form; migrate it to a bib key`);
        if (!source?.title) errors.push(`${where} is missing a title`);
        if (!source?.url) errors.push(`${where} is missing a url`);
        if (!source?.authors) warnings.push(`${where} is missing an author`);
      }
    });
    for (const [key, count] of seenKeys) {
      if (count > 1) warnings.push(`${relArticle} lists source ${key} ${count} times`);
    }

    if (sources.length > 5) {
      warnings.push(
        `${relArticle} has ${sources.length} sources; more than five suggests inline citations or Further reading`,
      );
    }

    if (competingHeadingPattern.test(content)) {
      warnings.push(
        `${relArticle} has both a \`sources\` footer and a hand-written references heading`,
      );
    }
  }

  // ---- credits ----------------------------------------------------------
  if (credits.length) {
    articlesWithCredits += 1;
    creditEntries += credits.length;

    const assetOwners = new Map();
    credits.forEach((credit, index) => {
      const where = `${relArticle} credit #${index + 1}`;
      if (!credit?.title) warnings.push(`${where} is missing a media description (title)`);

      if (credit?.sourceKey) {
        checkKey(where, credit.sourceKey);
      } else {
        warnings.push(`${where} uses legacy author/url; migrate it to a sourceKey`);
        if (!credit?.author) warnings.push(`${where} is missing an author`);
        if (!credit?.url) warnings.push(`${where} is missing a url`);
      }

      if (credit?.license && !credit?.licenseUrl) {
        warnings.push(`${where} has a license but no licenseUrl`);
      }
      if (credit?.licenseUrl && !credit?.license) {
        warnings.push(`${where} has a licenseUrl but no license name`);
      }

      const assets = Array.isArray(credit?.assets) ? credit.assets : [];
      for (const asset of assets) {
        mappedAssets += 1;
        if (!existsSync(path.join(articleDir, asset))) {
          errors.push(`${where} maps to missing asset ${asset}`);
        }
        assetOwners.set(asset, (assetOwners.get(asset) ?? 0) + 1);
      }
    });
    for (const [asset, count] of assetOwners) {
      if (count > 1) {
        warnings.push(`${relArticle} asset ${asset} is claimed by ${count} credit entries`);
      }
    }
  }
}

for (const warning of warnings) console.warn(`Metadata warning: ${warning}`);

if (errors.length) {
  for (const error of errors) console.error(`Metadata error: ${error}`);
  process.exitCode = 1;
} else {
  console.log(
    `Metadata OK: ${sourceEntries} sources across ${articlesWithSources} articles, ` +
      `${creditEntries} credits (${mappedAssets} assets mapped) across ${articlesWithCredits} articles.`,
  );
}
