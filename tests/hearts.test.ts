import { describe, expect, it } from 'vitest';
import {
  HEART_REGEN_EVERY_LEVELS,
  HEARTS_MAX,
  clampHearts,
  heartsForLevel,
} from '../src/game/hearts';

/** GDD v1.7 §6: hearts carry over; one comes back on every 20th level, never above three. */
describe('hearts', () => {
  it('a scene starts with one to three hearts', () => {
    expect(clampHearts(0)).toBe(1);
    expect(clampHearts(2.9)).toBe(2);
    expect(clampHearts(7)).toBe(HEARTS_MAX);
  });

  it('one heart comes back on every 20th level', () => {
    expect(heartsForLevel(20, 2)).toBe(3);
    expect(heartsForLevel(40, 1)).toBe(2);
    expect(heartsForLevel(60, 1)).toBe(2);
    expect(heartsForLevel(HEART_REGEN_EVERY_LEVELS * 7, 2)).toBe(3);
  });

  it('nothing comes back on the other levels, and never above the maximum', () => {
    expect(heartsForLevel(19, 1)).toBe(1);
    expect(heartsForLevel(21, 2)).toBe(2);
    expect(heartsForLevel(20, 3)).toBe(3);
    expect(heartsForLevel(1, 3)).toBe(3);
    expect(heartsForLevel(0, 2)).toBe(2);
  });
});
