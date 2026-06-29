import type { ImageMetadata } from "astro";

import { SITE_DESCRIPTION, SITE_TITLE } from "../consts";

export type StructuredData = Record<string, unknown>;
export type StructuredDataInput = StructuredData | StructuredData[];

type SiteReference = URL | string | undefined;

type BlogPostingInput = {
  site: SiteReference;
  url: URL | string;
  title: string;
  description: string;
  image?: string | ImageMetadata;
  publishedAt?: Date;
  modifiedAt?: Date;
  tags?: string[];
  section?: string;
};

type CollectionPageInput = {
  site: SiteReference;
  url: URL | string;
  name: string;
  description: string;
  items: Array<{
    url: URL | string;
    name: string;
  }>;
};

const fallbackSite = "https://www.tylercrosse.com/";
const personPath = "#person";
const websitePath = "#website";

function siteRoot(site: SiteReference) {
  return new URL("/", site ?? fallbackSite);
}

function absoluteUrl(pathOrUrl: URL | string, site: SiteReference) {
  return new URL(pathOrUrl, siteRoot(site)).href;
}

function reference(site: SiteReference, path: string) {
  return absoluteUrl(path, site);
}

function dateValue(date: Date | undefined) {
  return date instanceof Date && !Number.isNaN(date.valueOf())
    ? date.toISOString()
    : undefined;
}

export function normalizeStructuredData(
  data: StructuredDataInput | undefined,
) {
  if (!data) return [];
  return Array.isArray(data) ? data : [data];
}

export function imageUrl(
  image: string | ImageMetadata | undefined,
  site: SiteReference,
  fallbackPath = "/blog-placeholder-2.jpg",
) {
  if (!image) return absoluteUrl(fallbackPath, site);

  if (typeof image === "string") {
    return absoluteUrl(image, site);
  }

  return absoluteUrl(image.src, site);
}

export function personId(site: SiteReference) {
  return reference(site, personPath);
}

export function websiteId(site: SiteReference) {
  return reference(site, websitePath);
}

export function getPersonStructuredData(site: SiteReference): StructuredData {
  const root = siteRoot(site).href;

  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": personId(site),
    name: SITE_TITLE,
    url: root,
    image: absoluteUrl("/img/headshot.jpeg", site),
    description:
      "Research engineer working on AI safety. MSCS Georgia Tech. Senior software engineer and team lead.",
    sameAs: [
      "https://github.com/tylercrosse",
      "https://linkedin.com/in/tylercrosse",
      "https://scholar.google.com/citations?user=RfFEQLMAAAAJ&hl=en&oi=ao",
    ],
    knowsAbout: [
      "AI safety",
      "Machine learning",
      "Mechanistic interpretability",
      "Software engineering",
      "Computer systems",
      "GPU architecture",
    ],
    affiliation: {
      "@type": "CollegeOrUniversity",
      name: "Georgia Institute of Technology",
    },
  };
}

export function getWebsiteStructuredData(site: SiteReference): StructuredData {
  const root = siteRoot(site).href;

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": websiteId(site),
    name: SITE_TITLE,
    url: root,
    description: SITE_DESCRIPTION,
    inLanguage: "en-US",
    author: { "@id": personId(site) },
    publisher: { "@id": personId(site) },
  };
}

export function getSiteStructuredData(site: SiteReference) {
  return [getPersonStructuredData(site), getWebsiteStructuredData(site)];
}

export function getBlogPostingStructuredData({
  site,
  url,
  title,
  description,
  image,
  publishedAt,
  modifiedAt,
  tags = [],
  section,
}: BlogPostingInput): StructuredData {
  const datePublished = dateValue(publishedAt);
  const dateModified = dateValue(modifiedAt) ?? datePublished;

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${absoluteUrl(url, site)}#blogposting`,
    headline: title,
    description,
    url: absoluteUrl(url, site),
    mainEntityOfPage: absoluteUrl(url, site),
    image: imageUrl(image, site),
    datePublished,
    dateModified,
    inLanguage: "en-US",
    author: { "@id": personId(site) },
    publisher: { "@id": personId(site) },
    isPartOf: { "@id": websiteId(site) },
    keywords: tags.length > 0 ? tags.join(", ") : undefined,
    articleSection: section,
  };
}

export function getCollectionPageStructuredData({
  site,
  url,
  name,
  description,
  items,
}: CollectionPageInput): StructuredData {
  const pageUrl = absoluteUrl(url, site);

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${pageUrl}#collectionpage`,
    name,
    description,
    url: pageUrl,
    inLanguage: "en-US",
    author: { "@id": personId(site) },
    publisher: { "@id": personId(site) },
    isPartOf: { "@id": websiteId(site) },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        url: absoluteUrl(item.url, site),
      })),
    },
  };
}
