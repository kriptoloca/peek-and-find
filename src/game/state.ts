/**
 * In-memory progress (Epic 3). Epic 6 replaces this with the persisted save model from GDD §8
 * behind platform/storage.ts; until then a reload restarts at level 1 and every player shares
 * the same seedSalt.
 */
export interface Progress {
  level: number;
  /** Retry counter for the current level; feeds the scene seed. */
  attempt: number;
  seedSalt: number;
  totalStars: number;
  scenesPlayed: number;
}

export const progress: Progress = {
  level: 1,
  attempt: 0,
  seedSalt: 1234,
  totalStars: 0,
  scenesPlayed: 0,
};
