/** Generator tuning constants (GENERATOR.md §4–§6). Design px unless stated. */

/**
 * Margin between the scene edge and object centers. The spec says 40 px, but front-band sprites
 * reach ~200 px, so 40 would let half a sprite hang off the edge. 100 keeps every AABB inside
 * the square (see docs/questions.md).
 */
export const SCENE_MARGIN = 100;

/** Depth bands top→bottom: back / mid / front scale multipliers. */
export const BAND_MULT: readonly [number, number, number] = [0.8, 1.0, 1.15];

export const JITTER_MIN = 0.9;
export const JITTER_MAX = 1.1;

/** Targets must be this × spacing apart; relaxed step by step when the scene is too dense. */
export const TARGET_SPREAD_STEPS: readonly number[] = [1.5, 1.25, 1.0];

/**
 * Slot coordinates are rounded to integers right after sampling, which can shorten a distance
 * by up to √2 px. The hard minimum spacing therefore carries this cushion above 2 × hitRadius.
 */
export const ROUNDING_CUSHION = 2;

/** Poisson spacing relaxation when too few slots were found. */
export const MAX_SPACING_RELAX = 3;
export const SPACING_RELAX_FACTOR = 0.9;

/** Occlusion repair passes before regenerating with seed+1. */
export const MAX_OCCLUSION_PASSES = 20;
/** Upper bound on seed+1 regenerations before giving up. */
export const MAX_REGENERATIONS = 50;

/** Mirror decoys are the target frame flipped and shrunk. */
export const MIRROR_DECOY_SCALE = 0.85;

/** No single filler family may exceed this share of objectCount. */
export const FILLER_FAMILY_SHARE = 0.25;

/** Decoy kind weights: color / tag / mirror (GENERATOR.md §5). */
export const DECOY_KIND_WEIGHTS: readonly [number, number, number] = [50, 30, 20];

/** Filler color choice: base / c1 / c2. */
export const FILLER_COLOR_WEIGHTS: readonly number[] = [60, 20, 20];

/** Probability of flipping a flippable non-target. */
export const FLIP_CHANCE = 0.5;

export const FLIPPABLE_TAG = 'flippable';
