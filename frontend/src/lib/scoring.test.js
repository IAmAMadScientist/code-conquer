import { describe, it, expect } from 'vitest';
import { computePoints, normalizeDifficulty } from './scoring';
import { DIFFICULTY } from './constants';

describe('scoring', () => {
  describe('normalizeDifficulty', () => {
    it('defaults to EASY', () => {
      expect(normalizeDifficulty(null)).toBe(DIFFICULTY.EASY);
      expect(normalizeDifficulty('')).toBe(DIFFICULTY.EASY);
    });

    it('normalizes shorthands', () => {
      expect(normalizeDifficulty('M')).toBe(DIFFICULTY.MEDIUM);
      expect(normalizeDifficulty('MED')).toBe(DIFFICULTY.MEDIUM);
      expect(normalizeDifficulty('H')).toBe(DIFFICULTY.HARD);
      expect(normalizeDifficulty('E')).toBe(DIFFICULTY.EASY);
    });

    it('returns standard constants', () => {
      expect(normalizeDifficulty(DIFFICULTY.HARD)).toBe(DIFFICULTY.HARD);
      expect(normalizeDifficulty('HARD')).toBe(DIFFICULTY.HARD);
    });
  });

  describe('computePoints', () => {
    it('returns 0 if not won', () => {
      const points = computePoints({
        difficulty: DIFFICULTY.EASY,
        timeMs: 1000,
        errors: 0,
        won: false,
      });
      expect(points).toBe(0);
    });

    it('returns base points for EASY', () => {
      const points = computePoints({
        difficulty: DIFFICULTY.EASY,
        timeMs: 1000,
        errors: 0,
        won: true,
      });
      expect(points).toBe(5);
    });

    it('returns base points for MEDIUM', () => {
      const points = computePoints({
        difficulty: DIFFICULTY.MEDIUM,
        timeMs: 1000,
        errors: 0,
        won: true,
      });
      expect(points).toBe(10);
    });

    it('returns base points for HARD', () => {
      const points = computePoints({
        difficulty: DIFFICULTY.HARD,
        timeMs: 1000,
        errors: 0,
        won: true,
      });
      expect(points).toBe(15);
    });
  });
});
