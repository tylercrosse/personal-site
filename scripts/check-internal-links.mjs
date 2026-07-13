// Post-build guard: every internal link in the built site must resolve to a
// file that was actually built. Catches links to draft posts (drafts are
// excluded from production builds), typo'd redirects, and stale hand-written
// paths. Run after `astro build`; exits 1 with a report if anything dangles.
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const DIST = new URL("../dist", import.meta.url).pathname;

if (!existsSync(DIST)) {
  console.error("check-internal-links: dist/ not found — run `astro build` first.");
  process.exit(1);
}

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else yield path;
  }
}

// A link target resolves if it maps to a built file (directory-format pages
// build to <path>/index.html).
function resolves(pathname) {
  const decoded = decodeURIComponent(pathname);
  const candidates = decoded.endsWith("/")
    ? [`${decoded}index.html`]
    : extname(decoded)
      ? [decoded]
      : [`${decoded}/index.html`, `${decoded}.html`, decoded];
  return candidates.some((candidate) => {
    const full = join(DIST, candidate);
    return existsSync(full) && statSync(full).isFile();
  });
}

const stripToPath = (href) => href.split("#")[0].split("?")[0];

const failures = new Map(); // source file -> Set of broken hrefs
const report = (source, href) => {
  if (!failures.has(source)) failures.set(source, new Set());
  failures.get(source).add(href);
};

let pagesChecked = 0;
let linksChecked = 0;

for (const file of walk(DIST)) {
  const rel = file.slice(DIST.length + 1);

  if (file.endsWith(".html")) {
    pagesChecked += 1;
    const html = readFileSync(file, "utf8");
    // Astro emits double-quoted attributes; entities like &amp; only matter in
    // query strings, which are stripped before resolution anyway.
    for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
      if (!href.startsWith("/") || href.startsWith("//")) continue;
      linksChecked += 1;
      const path = stripToPath(href);
      if (path && !resolves(path)) report(rel, href);
    }
  }

  // The RSS feed links with absolute URLs; validate their paths too — a draft
  // leaking here would hand feed readers a permanent 404.
  if (rel === "rss.xml") {
    const xml = readFileSync(file, "utf8");
    for (const [, url] of xml.matchAll(/<link>([^<]+)<\/link>/g)) {
      const path = stripToPath(url.replace(/^https?:\/\/[^/]+/, ""));
      if (!path) continue;
      linksChecked += 1;
      if (!resolves(path)) report(rel, url);
    }
  }
}

if (failures.size > 0) {
  console.error("\nBroken internal links found:\n");
  for (const [source, hrefs] of [...failures.entries()].sort()) {
    console.error(`  ${source}`);
    for (const href of hrefs) console.error(`    → ${href}`);
  }
  const total = [...failures.values()].reduce((n, s) => n + s.size, 0);
  console.error(
    `\n${total} broken link(s) across ${failures.size} file(s). ` +
      "If a target is a draft post, unpublish the link or publish the post.\n"
  );
  process.exit(1);
}

console.log(
  `check-internal-links: ${linksChecked} internal links across ${pagesChecked} pages — all resolve.`
);
