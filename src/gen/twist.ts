import { isBigScene } from './difficulty';
import { hashSeed, Rng } from './rng';
import type { Mode, Twist, TwistKind } from './types';

/**
 * Late-game twists (GDD v1.5 §5a). Pure: the pick is seeded from the scene seed through its own
 * stream so that adding a twist never changes the objects of an existing seed.
 *
 * Shuffle: every object slides to a new validated place every few seconds; the first slide
 * comes after SHUFFLE_FIRST_S, a HUD pulse warns SHUFFLE_WARN_MS before each one. A fast
 * player (3 stars) sees at most one; a slow one rescans a fresh board instead of staring.
 * Memory: the prompt icons show for MEMORY_SHOW_S after the pop-in, then hide behind "?";
 * a tap on the prompt, or a find, peeks for MEMORY_PEEK_MS. Never a penalty, only time.
 */
export const SHUFFLE_FROM_LEVEL = 30;
export const MEMORY_FROM_LEVEL = 45;
/** The twist chance grows from TWIST_CHANCE_START at the first eligible level to this level. */
export const TWIST_FULL_LEVEL = 80;
export const TWIST_CHANCE_START = 0.25;
export const TWIST_CHANCE_FULL = 0.5;

export const SHUFFLE_FIRST_S = 8;
export const SHUFFLE_EVERY_S = 8;
export const SHUFFLE_WARN_MS = 900;
export const SHUFFLE_MOVE_MS = 450;
/** Alternative layouts generated per shuffle scene; the round cycles through them. */
export const SHUFFLE_LAYOUTS = 2;
/** A shuffle layout must move at least this share of the objects by more than their spacing. */
export const SHUFFLE_MIN_MOVED_SHARE = 0.5;

export const MEMORY_SHOW_S = 3;
export const MEMORY_PEEK_MS = 1000;

/** Twist kinds a mode can host at all: Spot is a comparison task and stays plain; Odd has no
 * prompt to hide. */
export function twistKindsForMode(mode: Mode): TwistKind[] {
  if (mode === 'spot') return [];
  return mode === 'odd' ? ['shuffle'] : ['shuffle', 'memory'];
}

/** Twist kinds a scene of this level and mode may get. Big scenes stay plain. */
export function twistKinds(level: number, mode: Mode): TwistKind[] {
  if (isBigScene(level)) return [];
  return twistKindsForMode(mode).filter(
    (k) => level >= (k === 'shuffle' ? SHUFFLE_FROM_LEVEL : MEMORY_FROM_LEVEL),
  );
}

/** Probability that an eligible scene gets a twist: linear from L30 to L80, then flat. */
export function twistChance(level: number): number {
  if (level < SHUFFLE_FROM_LEVEL) return 0;
  if (level >= TWIST_FULL_LEVEL) return TWIST_CHANCE_FULL;
  const t = (level - SHUFFLE_FROM_LEVEL) / (TWIST_FULL_LEVEL - SHUFFLE_FROM_LEVEL);
  return TWIST_CHANCE_START + t * (TWIST_CHANCE_FULL - TWIST_CHANCE_START);
}

/** Seeded pick: null for a plain scene. Uses its own stream (`twist:<seed>`). */
export function pickTwist(seed: number, level: number, mode: Mode): Twist | null {
  const kinds = twistKinds(level, mode);
  if (kinds.length === 0) return null;
  const rng = new Rng(hashSeed(`twist:${String(seed >>> 0)}`));
  if (!rng.chance(twistChance(level))) return null;
  return { kind: rng.pick(kinds) };
}

/** Seed stream of shuffle layout `i` (1-based) of a scene. */
export function shuffleRng(seed: number, i: number): Rng {
  return new Rng(hashSeed(`shuffle:${String(seed >>> 0)}:${String(i)}`));
}
