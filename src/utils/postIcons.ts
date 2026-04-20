import { PenTool, RotateCcw, Code, Lightbulb, Notebook, Youtube } from "lucide-astro";

const ICONS_BY_TYPE = {
  article: PenTool,
  retro: RotateCcw,
  project: Code,
  idea: Lightbulb,
  note: Notebook,
  talk: Youtube,
} as const;

export type PostType = keyof typeof ICONS_BY_TYPE;

export function getIconForType(type?: string) {
  if (!type) return null;
  return ICONS_BY_TYPE[type as PostType] ?? null;
}

export function capitalize(s?: string | null) {
  if (typeof s !== "string" || !s) return s ?? "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}
