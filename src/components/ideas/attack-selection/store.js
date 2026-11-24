import { useSyncExternalStore } from "react";
import { PRESETS } from "./model";

// Explorer settings shared across the post's widgets. Each MDX-embedded
// widget hydrates as its own Astro island, but islands on one page share
// ES-module instances, so this module-level store links them: RocPanel and
// DeploymentPanel follow whatever the SelectionExplorer is set to.

export const DEFAULTS = Object.freeze({
  preset: "paper",
  budget: 0.01, // audit budget = FPR on honest work
  keep: PRESETS.paper.keep, // share of attack opportunities the selector keeps
  noise: PRESETS.paper.noise, // sd of the selector's read of each score; Infinity = random
  sigma: PRESETS.paper.sigma, // honest score spread
  sideTaskSuccess: 0.7,
});

let state = DEFAULTS;
const listeners = new Set();

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setSettings(patch) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

export function applyPreset(id) {
  const { keep, noise, sigma } = PRESETS[id];
  setSettings({ preset: id, keep, noise, sigma });
}

/** Server render and first client render both see DEFAULTS. */
export function useSettings() {
  return useSyncExternalStore(subscribe, () => state, () => DEFAULTS);
}
