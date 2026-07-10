import { PenTool, RotateCcw, Code, Lightbulb, Notebook, Youtube, FileText } from "lucide-astro";

const ICONS_BY_TYPE = {
  article: PenTool,
  retro: RotateCcw,
  project: Code,
  idea: Lightbulb,
  note: Notebook,
  talk: Youtube,
  paper: FileText,
} as const;

export type PostType = keyof typeof ICONS_BY_TYPE;

// Muted solarized accents; the type label text stays gray, only the icon tints.
const COLORS_BY_TYPE: Record<PostType, string> = {
  article: "var(--green)",
  retro: "var(--cyan)",
  project: "var(--blue)",
  idea: "var(--magenta)",
  note: "var(--yellow)",
  talk: "var(--orange)",
  paper: "var(--violet)",
};

export function getIconForType(type?: string) {
  if (!type) return null;
  return ICONS_BY_TYPE[type as PostType] ?? null;
}

export function getColorForType(type?: string) {
  if (!type) return undefined;
  return COLORS_BY_TYPE[type as PostType];
}

export function capitalize(s?: string | null) {
  if (typeof s !== "string" || !s) return s ?? "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}
