import { track } from "@vercel/analytics";

const siteEventNames = [
  "search_open",
  "search_result_click",
  "post_card_click",
  "outbound_link_click",
  "theme_toggle",
] as const;

const siteEventNameSet = new Set<string>(siteEventNames);

export type SiteEventName = (typeof siteEventNames)[number];

const propertyKeys = [
  "method",
  "path",
  "result_kind",
  "source",
  "target",
  "theme",
  "type",
  "variant",
] as const;

type PropertyKey = (typeof propertyKeys)[number];
type PropertyValue = string | number | boolean | null | undefined;

export type SiteEventProps = Partial<Record<PropertyKey, PropertyValue>>;

const propertyKeySet = new Set<string>(propertyKeys);

const maxStringLength: Record<PropertyKey, number> = {
  method: 24,
  path: 160,
  result_kind: 32,
  source: 48,
  target: 80,
  theme: 24,
  type: 32,
  variant: 32,
};

function cleanString(key: PropertyKey, value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const maxLength = maxStringLength[key];
  return trimmed
    .slice(0, maxLength)
    .replace(/[^A-Za-z0-9/_:.-]/g, "_");
}

function cleanProperties(props: SiteEventProps) {
  const cleaned: Record<string, string | number | boolean | null> = {};

  for (const [key, value] of Object.entries(props)) {
    if (!propertyKeySet.has(key) || value === undefined) continue;

    if (typeof value === "string") {
      const cleanedValue = cleanString(key as PropertyKey, value);
      if (cleanedValue) {
        cleaned[key] = cleanedValue;
      }
      continue;
    }

    if (
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

export function trackSiteEvent(name: SiteEventName, props: SiteEventProps = {}) {
  if (!siteEventNameSet.has(name)) return;

  try {
    track(name, cleanProperties(props));
  } catch {
    // Analytics must never affect navigation or UI behavior.
  }
}

export function pathnameFromHref(href: string | null | undefined) {
  if (!href) return undefined;

  try {
    return new URL(href, window.location.href).pathname;
  } catch {
    return undefined;
  }
}

export function externalTargetFromHref(href: string | null | undefined) {
  if (!href) return undefined;

  try {
    const url = new URL(href, window.location.href);
    if (!["http:", "https:"].includes(url.protocol)) return undefined;
    const targetHost = url.hostname.replace(/^www\./, "");
    const currentHost = window.location.hostname.replace(/^www\./, "");
    if (targetHost === currentHost) return undefined;
    return targetHost;
  } catch {
    return undefined;
  }
}
