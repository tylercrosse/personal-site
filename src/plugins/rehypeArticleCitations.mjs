import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import rehypeCitation, { Cite } from "rehype-citation";

const DEFAULT_BIBLIOGRAPHY = "references.bib";
const CITATION_ID_PREFIX = "citation--";
const URL_PATTERN = /https?:\/\/[^\s<]+/g;

function getFrontmatter(file) {
  return file.data?.astro?.frontmatter ?? file.data?.matter ?? {};
}

// `sources` frontmatter marks which bib entries this post is notes on. The role
// renders inside the References section (disclaimer + marker) rather than as a
// separate list in the footer. Legacy object-form entries are ignored here —
// PostCredits still renders those until they are migrated to keys.
function primarySourceKeys(file) {
  const sources = getFrontmatter(file).sources;
  if (!Array.isArray(sources)) return [];
  return sources.filter((source) => typeof source === "string");
}

// Credits that point at a bib entry render as a "Figures" note under the
// References list, citing the entry by number. Legacy credits (inline
// author/url) stay in the PostCredits footer until they are migrated.
function bibliographyCredits(file) {
  const credits = getFrontmatter(file).credits;
  if (!Array.isArray(credits)) return [];
  return credits.filter((credit) => typeof credit?.sourceKey === "string");
}

function findElementParent(node, predicate) {
  if (!node?.children) return null;

  for (let index = 0; index < node.children.length; index += 1) {
    const child = node.children[index];
    if (predicate(child)) return { parent: node, index, node: child };

    const nested = findElementParent(child, predicate);
    if (nested) return nested;
  }

  return null;
}

function collectCitationKeys(node, keys = new Set()) {
  if (node?.type === "element") {
    const id = node.properties?.id;
    if (typeof id === "string" && id.startsWith(CITATION_ID_PREFIX)) {
      const parts = id.slice(CITATION_ID_PREFIX.length).split("--");
      parts.pop();
      for (const key of parts) keys.add(key);
    }
  }

  for (const child of node?.children ?? []) collectCitationKeys(child, keys);
  return keys;
}

function personName(person) {
  if (person.literal) return person.literal;
  return [person.given, person.family].filter(Boolean).join(" ");
}

function referenceMetadata(entry) {
  const year = entry.issued?.["date-parts"]?.[0]?.[0];
  const people = entry.author?.length ? entry.author : entry.editor ?? [];

  return {
    id: entry.id,
    title: entry.title ?? "Untitled reference",
    authors: people.map(personName).filter(Boolean),
    year: year ? String(year) : undefined,
    containerTitle: entry["container-title"],
    publisher: entry.publisher,
    volume: entry.volume,
    issue: entry.issue,
    page: entry.page,
    DOI: entry.DOI,
    URL: entry.URL,
  };
}

function linkifyUrlText(textNode) {
  const replacements = [];
  let cursor = 0;

  for (const match of textNode.value.matchAll(URL_PATTERN)) {
    const matchIndex = match.index ?? 0;
    const rawUrl = match[0];
    const url = rawUrl.replace(/[.,;:!?]+$/, "");
    const trailingText = rawUrl.slice(url.length);

    if (matchIndex > cursor) {
      replacements.push({
        type: "text",
        value: textNode.value.slice(cursor, matchIndex),
      });
    }

    replacements.push({
      type: "element",
      tagName: "a",
      properties: {
        href: url,
        target: "_blank",
        rel: ["noopener", "noreferrer"],
      },
      children: [{ type: "text", value: url }],
    });

    if (trailingText) {
      replacements.push({ type: "text", value: trailingText });
    }
    cursor = matchIndex + rawUrl.length;
  }

  if (!replacements.length) return null;
  if (cursor < textNode.value.length) {
    replacements.push({ type: "text", value: textNode.value.slice(cursor) });
  }
  return replacements;
}

function linkifyReferenceUrls(node) {
  if (!node.children || node.tagName === "a") return;

  for (let index = 0; index < node.children.length; index += 1) {
    const child = node.children[index];
    if (child.type === "text") {
      const replacements = linkifyUrlText(child);
      if (replacements) {
        node.children.splice(index, 1, ...replacements);
        index += replacements.length - 1;
      }
    } else if (child.type === "element") {
      linkifyReferenceUrls(child);
    }
  }
}

// Build the "Figures: … — from [4] (changes)" note that replaces the footer
// image-credit list for bib-backed credits. `entryNumbers` maps bib keys to
// their 1-based position in the rendered References list.
function figuresNote(credits, entryNumbers) {
  const children = [{ type: "text", value: "Figures: " }];
  let rendered = 0;

  for (const credit of credits) {
    const number = entryNumbers.get(credit.sourceKey);
    // Unresolvable keys are audit-metadata errors; skip rather than render "[?]".
    if (!number) continue;

    if (rendered > 0) children.push({ type: "text", value: "; " });
    rendered += 1;

    if (credit.title) {
      children.push({ type: "text", value: `${credit.title} — from ` });
    } else {
      children.push({ type: "text", value: "from " });
    }
    children.push({
      type: "element",
      tagName: "a",
      properties: { href: `#bib-${credit.sourceKey}` },
      children: [{ type: "text", value: `[${number}]` }],
    });
    if (credit.license) {
      children.push({ type: "text", value: " — " });
      children.push(
        credit.licenseUrl
          ? {
              type: "element",
              tagName: "a",
              properties: {
                href: credit.licenseUrl,
                target: "_blank",
                rel: ["noopener", "noreferrer"],
              },
              children: [{ type: "text", value: credit.license }],
            }
          : { type: "text", value: credit.license },
      );
    }
    if (credit.changes) {
      children.push({ type: "text", value: ` (${credit.changes})` });
    }
  }

  if (!rendered) return null;
  children.push({ type: "text", value: "." });
  return {
    type: "element",
    tagName: "p",
    properties: { className: ["refs-note", "refs-figures"] },
    children,
  };
}

function addReferencesHeading(tree, sourceKeys = [], credits = []) {
  const result = findElementParent(
    tree,
    (node) => node.type === "element" && node.properties?.id === "refs",
  );
  if (!result) return;

  const previous = result.parent.children[result.index - 1];
  const alreadyLabelled =
    previous?.type === "element" &&
    /^h[1-6]$/.test(previous.tagName) &&
    previous.children?.some(
      (child) =>
        child.type === "text" && /^references$/i.test(child.value.trim()),
    );

  if (alreadyLabelled) {
    previous.properties = { ...previous.properties, id: "references" };
  } else {
    result.parent.children.splice(result.index, 0, {
      type: "element",
      tagName: "h2",
      properties: { id: "references" },
      children: [{ type: "text", value: "References" }],
    });
    result.index += 1;
  }

  result.node.properties = {
    ...result.node.properties,
    ariaLabelledBy: "references",
  };

  result.node.tagName = "ol";
  const primaryIds = new Set(sourceKeys.map((key) => `bib-${key}`));
  const entryNumbers = new Map();
  let markedPrimaries = 0;
  for (const child of result.node.children ?? []) {
    const classNames = child.properties?.className;
    if (
      child.type === "element" &&
      Array.isArray(classNames) &&
      classNames.includes("csl-entry")
    ) {
      child.tagName = "li";
      linkifyReferenceUrls(child);

      const id = child.properties?.id;
      if (typeof id === "string" && id.startsWith("bib-")) {
        entryNumbers.set(id.slice("bib-".length), entryNumbers.size + 1);
      }

      if (primaryIds.has(id)) {
        markedPrimaries += 1;
        child.children.push({
          type: "element",
          tagName: "span",
          properties: {
            className: ["refs-primary"],
            title: "Primary source",
            ariaLabel: "Primary source",
          },
          children: [{ type: "text", value: " ★" }],
        });
      }
    }
  }

  // Figure attributions, directly after the References list.
  const figures = figuresNote(credits, entryNumbers);
  if (figures) {
    result.parent.children.splice(result.index + 1, 0, figures);
  }

  // The primary-source disclaimer, directly under the References heading.
  if (markedPrimaries > 0) {
    result.parent.children.splice(result.index, 0, {
      type: "element",
      tagName: "p",
      properties: { className: ["refs-note"] },
      children: [
        {
          type: "text",
          value: `${
            markedPrimaries > 1 ? "These are notes on the works" : "These are notes on the work"
          } marked ★ — cite the original rather than this page.`,
        },
      ],
    });
  }
}

function addReferenceData(tree, bibliographyText) {
  const citedKeys = collectCitationKeys(tree);
  if (!citedKeys.size) return;

  const bibliography = new Cite(bibliographyText, { generateGraph: false });
  const references = bibliography.data
    .filter((entry) => citedKeys.has(entry.id))
    .map(referenceMetadata);

  const json = JSON.stringify(references).replaceAll("<", "\\u003c");
  tree.children.push({
    type: "element",
    tagName: "script",
    properties: {
      type: "application/json",
      dataReferenceData: true,
    },
    children: [{ type: "text", value: json }],
  });
}

/**
 * Format citations from a bibliography stored beside an article. Articles
 * without a local bibliography pass through untouched.
 */
export default function rehypeArticleCitations(options = {}) {
  return async (tree, file) => {
    if (!file.path) return;

    const articleDirectory = path.dirname(String(file.path));
    const configuredBibliography = getFrontmatter(file).bibliography;
    const bibliography =
      typeof configuredBibliography === "string"
        ? configuredBibliography
        : DEFAULT_BIBLIOGRAPHY;
    const bibliographyPath = path.resolve(articleDirectory, bibliography);

    if (!existsSync(bibliographyPath)) {
      if (configuredBibliography) {
        throw new Error(
          `Cannot find bibliography ${bibliographyPath} for ${file.path}`,
        );
      }
      return;
    }

    const bibliographyText = readFileSync(bibliographyPath, "utf8");
    // Primary sources and credited works must appear in References, cited
    // inline or not. Passing their keys as `noCite` looks right but is broken
    // in rehype-citation <=2.3.2: explicit noCite keys are merged with only
    // the *last* inline citation's entries, dropping every other cited work.
    // The `@*` branch (render the whole bibliography) is safe, and matches
    // this site's convention anyway — audit-references.mjs warns about bib
    // entries that are neither cited nor referenced from frontmatter.
    const sourceKeys = primarySourceKeys(file);
    const figureCredits = bibliographyCredits(file);
    const transform = rehypeCitation({
      ...options,
      bibliography,
      path: articleDirectory,
      noCite:
        sourceKeys.length || figureCredits.length ? ["@*"] : options.noCite,
      inlineClass: ["citation-reference"],
      linkCitations: true,
      showTooltips: false,
    });

    await transform(tree, file);
    addReferencesHeading(tree, sourceKeys, figureCredits);
    addReferenceData(tree, bibliographyText);
  };
}
