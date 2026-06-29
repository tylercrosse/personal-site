import { Circle, Diamond, Hexagon, Square, Triangle } from "lucide-astro";

const ICONS_BY_TOPIC = {
  "machine-learning": Circle,
  "deep-learning": Diamond,
  "gpu-computer-architecture": Hexagon,
  "operating-systems-distributed-systems": Square,
  "ai-safety-mechanistic-interpretability": Triangle,
} as const;

export type TopicSlug = keyof typeof ICONS_BY_TOPIC;

export function getIconForTopic(slug: string) {
  return ICONS_BY_TOPIC[slug as TopicSlug] ?? Circle;
}
