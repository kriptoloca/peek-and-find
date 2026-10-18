import { HIT_RADIUS_FIND, HIT_RADIUS_SPOT } from '../config';
import type { Mode, Params } from './types';
import type { Rng } from './rng';

/**
 * Column levels of the difficulty table (GENERATOR.md §2). Values plateau at the last column.
 * The fifth column (GDD v1.5) is a gentle second ramp for players past level 80: a few more
 * objects, one more target and more look-alikes, never smaller sprites (0.6 is the legibility
 * floor); the late-game pressure comes from the twists (twist.ts), not from density alone.
 */
const COLS = [1, 10, 30, 80, 150] as const;
export const PLATEAU_LEVEL = 150;
/** Level 80 is the end of the first ramp: the table's values there are "medium" on a phone. */
export const FIRST_PLATEAU_LEVEL = 80;

const TABLE = {
  objectCount: [12, 24, 42, 60, 66],
  targetCount: [1, 2, 3, 5, 6],
  targetScale: [1.0, 0.9, 0.75, 0.6, 0.6],
  decoyRatio: [0, 0.15, 0.3, 0.5, 0.6],
  maxOcclusion: [0, 0.1, 0.3, 0.4, 0.45],
  minSpacing: [150, 120, 95, 80, 80],
  t3: [8, 12, 18, 25, 28],
  t2: [15, 22, 32, 45, 50],
} as const;

/** Big scene every 25th level: denser, 7 targets, double star time. */
export const BIG_SCENE_EVERY = 25;
const BIG_OBJECT_MULT = 1.3;
const BIG_OBJECT_CAP = 80;
const BIG_TARGETS = 7;
const BIG_TIME_MULT = 2;

/** Daily chain levels (GDD §7): fixed so every player gets identical scenes. */
export const DAILY_LEVELS = [10, 20, 30, 40, 50] as const;

/** Mode introduction levels (GDD §4). */
export const ODD_FROM_LEVEL = 6;
export const SPOT_FROM_LEVEL = 11;

export const THEME_COUNT = 5;
export const THEME_ROTATE_EVERY = 3;
export const THEME_UNLOCK_EVERY = 10;
/** The second theme arrives early (GDD v1.4): variety in the first session; the rest keep the cadence. */
export const THEME_SECOND_UNLOCK_LEVEL = 4;
export const THEME_PRELOAD_LOOKAHEAD = 3;

function lerpColumns(values: readonly number[], level: number): number {
  if (level <= COLS[0]) return values[0] as number;
  const last = COLS.length - 1;
  if (level >= (COLS[last] as number)) return values[last] as number;
  for (let i = 0; i < last; i++) {
    const a = COLS[i] as number;
    const b = COLS[i + 1] as number;
    if (level >= a && level <= b) {
      const t = (level - a) / (b - a);
      return (values[i] as number) + t * ((values[i + 1] as number) - (values[i] as number));
    }
  }
  return values[last] as number;
}

export function isBigScene(level: number): boolean {
  return level > 0 && level % BIG_SCENE_EVERY === 0;
}

/** Level → difficulty parameters. Piecewise-linear between columns, plateau at 150. */
export function params(level: number): Params {
  const L = Math.max(1, Math.floor(level));
  const big = isBigScene(L);
  let objectCount = Math.round(lerpColumns(TABLE.objectCount, L));
  let targetCount = Math.round(lerpColumns(TABLE.targetCount, L));
  let t3 = lerpColumns(TABLE.t3, L);
  let t2 = lerpColumns(TABLE.t2, L);
  if (big) {
    objectCount = Math.min(BIG_OBJECT_CAP, Math.round(objectCount * BIG_OBJECT_MULT));
    targetCount = BIG_TARGETS;
    t3 *= BIG_TIME_MULT;
    t2 *= BIG_TIME_MULT;
  }
  return {
    level: L,
    objectCount,
    targetCount,
    targetScale: lerpColumns(TABLE.targetScale, L),
    decoyRatio: lerpColumns(TABLE.decoyRatio, L),
    maxOcclusion: lerpColumns(TABLE.maxOcclusion, L),
    minSpacing: lerpColumns(TABLE.minSpacing, L),
    t3,
    t2,
    bigScene: big,
  };
}

export function hitRadiusFor(mode: Mode): number {
  return mode === 'spot' ? HIT_RADIUS_SPOT : HIT_RADIUS_FIND;
}

export interface ModeWeights {
  find: number;
  odd: number;
  spot: number;
}

/** Mode weights by level (GENERATOR.md §2). Spot's share moves to Find when it cannot be hosted. */
export function modeWeights(level: number, canHostSpot: boolean): ModeWeights {
  if (level < ODD_FROM_LEVEL) return { find: 1, odd: 0, spot: 0 };
  if (level < SPOT_FROM_LEVEL) return { find: 0.8, odd: 0.2, spot: 0 };
  if (!canHostSpot) return { find: 0.8, odd: 0.2, spot: 0 };
  return { find: 0.6, odd: 0.2, spot: 0.2 };
}

export function pickMode(rng: Rng, level: number, canHostSpot: boolean): Mode {
  const w = modeWeights(level, canHostSpot);
  const i = rng.weighted([w.find, w.odd, w.spot]);
  return i === 0 ? 'find' : i === 1 ? 'odd' : 'spot';
}

export function unlockedThemes(level: number, total = THEME_COUNT): number {
  const L = Math.max(0, level);
  const byCadence = 1 + Math.floor(L / THEME_UNLOCK_EVERY);
  const early = L >= THEME_SECOND_UNLOCK_LEVEL ? 2 : 1;
  return Math.min(total, Math.max(byCadence, early));
}

/** Theme index for a level (GENERATOR.md §2). */
export function themeIndex(level: number, total = THEME_COUNT): number {
  const L = Math.max(1, Math.floor(level));
  const block = Math.floor((L - 1) / THEME_ROTATE_EVERY);
  // The unlock count of the block's first level: a theme that unlocks mid-block waits for the
  // next block, so no block is cut into one-level islands (audit 2026-10-17).
  return block % unlockedThemes(block * THEME_ROTATE_EVERY + 1, total);
}

/** Index of a theme that unlocks within the lookahead window and is not unlocked yet, else null. */
export function themeToPreload(level: number, total = THEME_COUNT): number | null {
  const now = unlockedThemes(level, total);
  const soon = unlockedThemes(level + THEME_PRELOAD_LOOKAHEAD, total);
  return soon > now ? soon - 1 : null;
}

export function starsFor(seconds: number, p: Params): 1 | 2 | 3 {
  if (seconds <= p.t3) return 3;
  if (seconds <= p.t2) return 2;
  return 1;
}
