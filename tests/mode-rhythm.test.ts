import { describe, expect, it } from 'vitest';
import {
  BIG_SCENE_EVERY,
  MODE_CYCLE,
  ODD_FROM_LEVEL,
  RHYTHM_ANCHOR_LEVEL,
  SPOT_FROM_LEVEL,
  THEME_COUNT,
  isBigScene,
  scheduledMode,
  themeIndex,
  unlockedThemes,
} from '../src/gen/difficulty';
import type { Mode } from '../src/gen/types';

/**
 * GDD v1.9 §4: one mode rhythm for every player. Written out by hand (not from MODE_CYCLE) so a
 * change to the cycle cannot pass by changing the expectation with it: from level 11, every ten
 * levels go Spot, Find, Odd, Find, Find, Odd, Find, Spot, Find, Find; before 11 only level 6 is
 * Odd.
 */
function expected(level: number, canHostSpot: boolean): Mode {
  if (level < 11) return level === 6 ? 'odd' : 'find';
  const slot = (level - 11) % 10;
  if (slot === 0 || slot === 7) return canHostSpot ? 'spot' : 'find';
  if (slot === 2 || slot === 5) return 'odd';
  return 'find';
}

const LEVELS = Array.from({ length: 300 }, (_, i) => i + 1);

describe('scheduledMode (GDD v1.9 §4)', () => {
  it('follows the rhythm on every level 1–300, with and without Spot hostable', () => {
    for (const L of LEVELS) {
      expect(scheduledMode(L, true), `level ${String(L)}`).toBe(expected(L, true));
      expect(scheduledMode(L, false), `level ${String(L)} (no Spot)`).toBe(expected(L, false));
    }
  });

  it('starts as written: Find to 5, the first Odd at 6, the first Spot at 11', () => {
    const first = LEVELS.slice(0, 30).map((L) => scheduledMode(L, true)[0]);
    expect(first.join('')).toBe('fffffoffffsfoffofsffsfoffofsff');
    expect(LEVELS.find((L) => scheduledMode(L, true) === 'odd')).toBe(6);
    expect(LEVELS.find((L) => scheduledMode(L, true) === 'spot')).toBe(11);
  });

  it('pins the constants the rhythm is built from', () => {
    expect(MODE_CYCLE.join(',')).toBe('spot,find,odd,find,find,odd,find,spot,find,find');
    expect(RHYTHM_ANCHOR_LEVEL).toBe(11);
    expect(ODD_FROM_LEVEL).toBe(6);
    expect(SPOT_FROM_LEVEL).toBe(11);
  });

  it('every ten levels from 11 hold two Spots, two Odds and six Finds (20/20/60)', () => {
    for (let start = 11; start <= 291; start++) {
      const window = Array.from({ length: 10 }, (_, i) => scheduledMode(start + i, true));
      const count = (m: Mode): number => window.filter((w) => w === m).length;
      expect([count('spot'), count('odd'), count('find')], `from ${String(start)}`).toEqual([
        2, 2, 6,
      ]);
    }
  });

  it('the wait for the next Spot or Odd is 3 to 7 levels, never longer', () => {
    for (const mode of ['spot', 'odd'] as const) {
      const at = LEVELS.filter((L) => L >= 11 && scheduledMode(L, true) === mode);
      for (let i = 1; i < at.length; i++) {
        const gap = (at[i] as number) - (at[i - 1] as number);
        expect(gap, `${mode} after level ${String(at[i - 1])}`).toBeGreaterThanOrEqual(3);
        expect(gap, `${mode} after level ${String(at[i - 1])}`).toBeLessThanOrEqual(7);
      }
    }
  });

  it('Spot and Odd never follow each other, and no mode but Find repeats back to back', () => {
    for (const L of LEVELS.slice(0, -1)) {
      const a = scheduledMode(L, true);
      const b = scheduledMode(L + 1, true);
      if (a !== 'find') expect(b, `levels ${String(L)}–${String(L + 1)}`).toBe('find');
    }
  });

  it('the big scenes of the normal chain always fall on a Find', () => {
    for (let L = BIG_SCENE_EVERY; L <= 1000; L += BIG_SCENE_EVERY) {
      expect(isBigScene(L)).toBe(true);
      expect(scheduledMode(L, true), `level ${String(L)}`).toBe('find');
    }
  });

  it('every theme meets Spot and Odd: within any 30 levels from 40, and within 30 of its unlock', () => {
    // Themes rotate in 3-level blocks over five themes (a 15-level period); a 5-level mode cycle
    // locked every theme onto the same slots (audit 2026-10-19: forest never Odd, space never Spot).
    const has = (t: number, mode: Mode, from: number, to: number): boolean => {
      for (let L = from; L < to; L++) {
        if (themeIndex(L) === t && scheduledMode(L, true) === mode) return true;
      }
      return false;
    };
    for (let a = 40; a <= 600; a++) {
      for (let t = 0; t < THEME_COUNT; t++) {
        expect(has(t, 'spot', a, a + 30), `theme ${String(t)} Spot from ${String(a)}`).toBe(true);
        expect(has(t, 'odd', a, a + 30), `theme ${String(t)} Odd from ${String(a)}`).toBe(true);
      }
    }
    for (let t = 0; t < THEME_COUNT; t++) {
      const unlock = LEVELS.find((L) => unlockedThemes(L) > t) ?? 1;
      const from = Math.max(unlock, SPOT_FROM_LEVEL);
      expect(has(t, 'spot', from, from + 30), `theme ${String(t)} first Spot`).toBe(true);
      expect(has(t, 'odd', unlock, unlock + 30), `theme ${String(t)} first Odd`).toBe(true);
    }
  });

  it('when the layout cannot host Spot, only the Spot levels change, and they become Find', () => {
    for (const L of LEVELS) {
      const hosted = scheduledMode(L, true);
      const notHosted = scheduledMode(L, false);
      if (hosted === 'spot') expect(notHosted).toBe('find');
      else expect(notHosted).toBe(hosted);
    }
  });

  it('depends on the level and the layout only: no salt, the same for every player', () => {
    expect(scheduledMode.length).toBe(2);
  });

  it('floors fractional levels and counts levels below 1, or not a number, as level 1', () => {
    expect(scheduledMode(11.9, true)).toBe('spot');
    expect(scheduledMode(13.2, true)).toBe('odd');
    expect(scheduledMode(0, true)).toBe('find');
    expect(scheduledMode(-7, true)).toBe('find');
    expect(scheduledMode(Number.NaN, true)).toBe('find');
    expect(scheduledMode(Number.POSITIVE_INFINITY, true)).toBe('find');
  });
});
