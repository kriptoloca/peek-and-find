import type { Family, Theme } from '../types';
import type { Rng } from '../rng';

/** From this level Find may ask for two families at once (GENERATOR.md §6). */
export const TWO_FAMILY_FROM_LEVEL = 20;
const TWO_FAMILY_CHANCE = 0.5;

export interface TargetPlanItem {
  family: Family;
  /** Base-color frame used by every target of this family in the scene (and by the prompt). */
  frame: string;
  count: number;
}

/**
 * Chooses the target families, their frame and counts. Families without color variants
 * (singletons) are never targets so that color decoys are always possible.
 */
export function chooseFindTargets(
  rng: Rng,
  theme: Theme,
  level: number,
  targetCount: number,
): TargetPlanItem[] {
  const pool = theme.families.filter((f) => f.colors > 0 && f.variants.length > 0);
  if (pool.length === 0) throw new Error(`theme ${theme.id}: no family eligible as target`);
  const useTwo =
    level >= TWO_FAMILY_FROM_LEVEL &&
    targetCount >= 2 &&
    pool.length >= 2 &&
    rng.chance(TWO_FAMILY_CHANCE);
  const picked = rng.shuffle([...pool]).slice(0, useTwo ? 2 : 1);
  const first = Math.ceil(targetCount / (useTwo ? 2 : 1));
  return picked.map((family, i) => ({
    family,
    frame: rng.pick(family.variants),
    count: i === 0 ? first : targetCount - first,
  }));
}
