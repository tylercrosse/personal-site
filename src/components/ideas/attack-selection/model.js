// Toy model behind the attack-selection widgets, ported from the
// "Selection and the audit threshold" claude.ai artifact.
//
// Honest trajectory scores ~ Normal(0, σ); attack scores ~ Normal(2.3, 1.1).
// A trajectory's score is its max per-step suspicion, so both are
// distributions of per-trajectory maxima. The audit budget is the FPR on
// honest work and fixes the threshold τ; selection never moves τ, it changes
// which attacks τ is applied to.
//
// Pure functions only — no DOM — so every widget (and a quick node check)
// can share them.

export const ATTACK_MEAN = 2.3;
export const ATTACK_SD = 1.1;

// Score grid the attack distributions are discretized on.
export const X0 = -4;
export const X1 = 7.5;
const DX = 0.02;
export const GRID = Array.from(
  { length: Math.round((X1 - X0) / DX) + 1 },
  (_, i) => X0 + i * DX,
);

// Abramowitz–Stegun 7.1.26; plenty for plotting.
function erf(x) {
  const s = Math.sign(x);
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const poly =
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
    t;
  return s * (1 - poly * Math.exp(-ax * ax));
}

export const Phi = (z) => 0.5 * (1 + erf(z / Math.SQRT2));
export const pdf = (x, m, s) =>
  Math.exp(-0.5 * ((x - m) / s) ** 2) / (s * Math.sqrt(2 * Math.PI));

/** Probability mass of every attack on GRID (sums to ~1). */
export const ALL_ATTACKS = GRID.map((x) => pdf(x, ATTACK_MEAN, ATTACK_SD) * DX);

/** Honest probability mass on GRID for spread σ (for plotting). */
export const honestMass = (sigma) => GRID.map((x) => pdf(x, 0, sigma) * DX);

/** Threshold τ whose honest upper tail is `budget` (FPR). */
export function thresholdFor(budget, sigma) {
  if (budget >= 1) return X0;
  let lo = -6;
  let hi = 12;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (1 - Phi(mid / sigma) > budget) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Attacks a selector keeps. It sees each attack's score plus Gaussian noise
 * (sd = `noise`) and keeps the lowest `keep` share. Returns a normalized
 * mass on GRID. Pass `noise = Infinity` for random selection (the paper's
 * control): keeping a random share leaves the distribution's shape unchanged.
 * (A large finite noise still selects a little; the source artifact's random
 * preset used noise 6 and lost ~8 points of TPR at 1%.)
 */
export function keptAttacks(keep, noise) {
  if (keep >= 0.999 || !Number.isFinite(noise)) return ALL_ATTACKS.slice();
  const weights = (cut) => GRID.map((x) => Phi((cut - x) / noise));
  let lo = -30;
  let hi = 30;
  for (let i = 0; i < 60; i++) {
    const cut = (lo + hi) / 2;
    const k = weights(cut).reduce((s, w, j) => s + w * ALL_ATTACKS[j], 0);
    if (k < keep) lo = cut;
    else hi = cut;
  }
  const w = weights((lo + hi) / 2);
  const mass = ALL_ATTACKS.map((a, j) => a * w[j]);
  const z = mass.reduce((s, v) => s + v, 0);
  return mass.map((v) => v / z);
}

/** True-positive (caught) rate of an attack mass at threshold τ. */
// Each grid cell's mass covers [x − DX/2, x + DX/2]; the cell τ falls in
// contributes the fraction of it above τ, so TPR (and every curve built from
// it) moves continuously with τ instead of in DX-sized steps.
export const tprAt = (mass, tau) =>
  mass.reduce((s, v, j) => s + v * Math.min(1, Math.max(0, (GRID[j] + DX / 2 - tau) / DX)), 0);

/** safety = TPR / (TPR + (1 − TPR)·p), p = side-task success when uncaught. */
export function safetyFromTpr(tpr, sideTaskSuccess) {
  const d = tpr + (1 - tpr) * sideTaskSuccess;
  return d > 0 ? tpr / d : 1;
}

/** AUROC of an attack mass against honest Normal(0, σ). */
export const auroc = (mass, sigma) =>
  mass.reduce((s, v, j) => s + v * Phi(GRID[j] / sigma), 0);

/** Log-spaced budgets from 10^lo to 10^hi. */
export const logSpace = (lo, hi, n) =>
  Array.from({ length: n + 1 }, (_, i) => 10 ** (lo + ((hi - lo) * i) / n));

/** Everything the explorer and ROC panel read at one setting. */
export function explorerState({ budget, keep, sigma, noise, sideTaskSuccess }) {
  const kept = keptAttacks(keep, noise);
  const tau = thresholdFor(budget, sigma);
  const tprAll = tprAt(ALL_ATTACKS, tau);
  const tprKept = tprAt(kept, tau);
  return {
    kept,
    tau,
    tprAll,
    tprKept,
    safetyAll: safetyFromTpr(tprAll, sideTaskSuccess),
    safetyKept: safetyFromTpr(tprKept, sideTaskSuccess),
  };
}

/**
 * Smallest FPR ≥ budget at which the kept attacks' TPR recovers `target`
 * (geometric bisection; at FPR = 1 every attack is audited, so it exists).
 */
export function budgetToRecover(kept, sigma, budget, target) {
  const tprAtBudget = (f) => tprAt(kept, thresholdFor(f, sigma));
  if (tprAtBudget(budget) >= target) return budget;
  let lo = budget;
  let hi = 1;
  for (let i = 0; i < 40; i++) {
    const mid = Math.sqrt(lo * hi);
    if (tprAtBudget(mid) >= target) hi = mid;
    else lo = mid;
  }
  return hi;
}

/**
 * Deployment safety over N tasks (paper Appendix A, Eq. 4):
 *   S_N = g_cont^N + (1 − g_cont^N) · g_caught / (g_caught + g_uncaught)
 * `rate` = attack attempts per task.
 */
export function deployment(rate, tpr, sideTaskSuccess) {
  const caught = rate * tpr;
  const uncaught = rate * (1 - tpr) * sideTaskSuccess;
  const decisive = caught + uncaught;
  const ratio = decisive > 0 ? caught / decisive : 1;
  return {
    ratio,
    expectedAttempts: (n) => n * decisive,
    safety: (n) => {
      const noDecisive = Math.exp(n * Math.log1p(-decisive));
      return noDecisive + (1 - noDecisive) * ratio;
    },
  };
}

/**
 * Upfront auditing (paper Appendix Eqs. 2–3): humans audit the first aN
 * tasks; the attacker attacks each task with fixed probability r.
 */
export const upfrontRedWin = (r, auditShare, n) =>
  Math.exp(auditShare * n * Math.log1p(-r)) *
  (1 - Math.exp((1 - auditShare) * n * Math.log1p(-r)));

/** r* ≈ −ln(a) / ((1 − a)N), capped at 1. */
export const optimalRate = (auditShare, n) =>
  Math.min(-Math.log(auditShare) / ((1 - auditShare) * n), 1);

/** Scenario presets from the artifact (random fixed to truly random). */
export const PRESETS = {
  paper: { label: "Prompted selector", keep: 0.3, noise: 0.8, sigma: 1 },
  none: { label: "No selection", keep: 1, noise: 0.8, sigma: 1 },
  perfect: { label: "Near-perfect selector", keep: 0.15, noise: 0.15, sigma: 1 },
  random: { label: "Random (control)", keep: 0.3, noise: Infinity, sigma: 1 },
  ctrlz: { label: "Tighter honest scores", keep: 0.3, noise: 0.8, sigma: 0.6 },
};
