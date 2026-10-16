import { pickMode } from '../gen/difficulty';
import { Rng, hashSeed } from '../gen/rng';
import type { Mode } from '../gen/types';

/**
 * Mode for a level (GENERATOR.md §2 weights). Seeded by level and the player's salt only, so a
 * Retry keeps the mode while the scene seed (which includes the attempt) changes.
 */
export function modeForLevel(level: number, seedSalt: number, canHostSpot: boolean): Mode {
  const rng = new Rng(hashSeed(`mode:${String(level)}:${String(seedSalt)}`));
  return pickMode(rng, level, canHostSpot);
}
