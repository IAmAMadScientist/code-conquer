// Generic scoring formula for Code & Conquer minigames.
// Points depend on difficulty, completion time, and number of errors.

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

const DIFF = {
  EASY: { base: 120, targetSec: 60, minTimeFactor: 0.55, maxTimeFactor: 1.45 },
  MEDIUM: { base: 220, targetSec: 90, minTimeFactor: 0.55, maxTimeFactor: 1.45 },
  HARD: { base: 340, targetSec: 120, minTimeFactor: 0.55, maxTimeFactor: 1.45 },
};

export function normalizeDifficulty(d) {
  const x = String(d || "EASY").toUpperCase();
  if (x === "MED" || x === "M") return "MEDIUM";
  if (x === "H") return "HARD";
  if (x === "E") return "EASY";
  return x;
}

/**
 * Compute points.
 * @param {Object} args
 * @param {string} args.difficulty - EASY|MEDIUM|HARD
 * @param {number} args.timeMs
 * @param {number} args.errors
 * @param {boolean} args.won
 */
export function computePoints({ difficulty, timeMs, errors, won }) {
  const diff = normalizeDifficulty(difficulty);
  const cfg = DIFF[diff] || DIFF.EASY;
  const secs = Math.max(1, Math.round((timeMs || 0) / 1000));
  const base = cfg.base;

  if (!won) return 0;

  // Time factor: reward being faster than target, but cap extremes.
  // target/actual => >1 if faster, <1 if slower
  const rawTimeFactor = cfg.targetSec / secs;
  const timeFactor = clamp(rawTimeFactor, cfg.minTimeFactor, cfg.maxTimeFactor);

  // Error penalty: each error reduces a percentage of the base.
  const err = Math.max(0, Number(errors || 0));
  const errorPenalty = Math.round(err * base * 0.08);

  const pts = Math.round(base * timeFactor - errorPenalty);
  return Math.max(0, pts);
}

export function formatTime(timeMs) {
  const s = Math.max(0, Math.floor((timeMs || 0) / 1000));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}
