const EXTERNAL_REL = "noopener";
const NEW_TAB_HINT = "opens in a new tab";

// Links inside these containers are handled elsewhere and must not be
// re-marked: the auto-generated References list already sets target/rel and its
// own ↗ marker (see rehypeArticleCitations.mjs), and inline citation anchors are
// in-page (#) links that are never external anyway.
function isHandledContainer(node) {
  if (node.type !== "element") return false;
  const { id, className } = node.properties ?? {};
  const classes = Array.isArray(className)
    ? className
    : className
      ? [className]
      : [];
  return (
    id === "refs" ||
    classes.includes("csl-entry") ||
    classes.includes("csl-bib-body") ||
    classes.includes("citation-reference")
  );
}

// External = an absolute (or protocol-relative) http(s) link to another host.
// Relative and in-page hrefs resolve to the site host and count as internal;
// mailto:/tel: and other schemes are left untouched.
function isExternalHref(href, siteHost) {
  if (typeof href !== "string" || href === "") return false;
  let url;
  try {
    url = new URL(href, `https://${siteHost}/`);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  return url.host !== siteHost;
}

function markExternal(anchor) {
  const properties = anchor.properties ?? (anchor.properties = {});
  // Respect anchors already given a target (e.g. by rehypeArticleCitations).
  if (properties.target) return;

  properties.target = "_blank";
  // Keep the referrer (no "noreferrer") on purpose, so destinations still see
  // the traffic came from this site.
  const rel = new Set(
    String(properties.rel ?? "")
      .split(/\s+/)
      .filter(Boolean),
  );
  rel.add(EXTERNAL_REL);
  properties.rel = [...rel].join(" ");
  properties.dataExternal = "";

  anchor.children.push({
    type: "element",
    tagName: "span",
    properties: { className: ["sr-only"] },
    children: [{ type: "text", value: ` (${NEW_TAB_HINT})` }],
  });
}

function walk(node, siteHost, handled) {
  if (!Array.isArray(node.children)) return;
  for (const child of node.children) {
    if (child.type !== "element") continue;
    const childHandled = handled || isHandledContainer(child);
    if (
      child.tagName === "a" &&
      !childHandled &&
      isExternalHref(child.properties?.href, siteHost)
    ) {
      markExternal(child);
    }
    walk(child, siteHost, childHandled);
  }
}

/**
 * Rehype plugin: flag off-site links in post bodies. External anchors open in a
 * new tab (target="_blank" + rel="noopener", referrer preserved), gain a
 * data-external hook for the ↗ marker, and get a visually-hidden "opens in a new
 * tab" hint for screen readers. Internal and in-page (#) links keep their
 * single-click navigation, so the mobile tap experience is unaffected.
 *
 * @param {{ site?: string }} [options] - `site` is the canonical origin used to
 *   tell internal links from external ones.
 */
export default function rehypeExternalLinks(options = {}) {
  let siteHost = "";
  try {
    if (options.site) siteHost = new URL(options.site).host;
  } catch {
    siteHost = "";
  }
  return (tree) => {
    walk(tree, siteHost, false);
  };
}
