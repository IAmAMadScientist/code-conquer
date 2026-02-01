import { DIFFICULTY } from "./constants";

// Phase 2D: fixed base points per difficulty.
// (Easy 5 / Medium 10 / Hard 15). Time/errors are still tracked for analytics/UI,
// but they do not affect the score for now.

const DIFF = {
  [DIFFICULTY.EASY]: { base: 5 },
  [DIFFICULTY.MEDIUM]: { base: 10 },
  [DIFFICULTY.HARD]: { base: 15 },
};

export function normalizeDifficulty(d) {
  const x = String(d || DIFFICULTY.EASY).toUpperCase();
  if (x === "MED" || x === "M") return DIFFICULTY.MEDIUM;
  if (x === "H") return DIFFICULTY.HARD;
  if (x === "E") return DIFFICULTY.EASY;
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
  const cfg = DIFF[diff] || DIFF[DIFFICULTY.EASY];
  const base = cfg.base;

  if (!won) return 0;
  return Math.max(0, Math.round(base));
}

export function formatTime(timeMs) {
  const s = Math.max(0, Math.floor((timeMs || 0) / 1000));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}
