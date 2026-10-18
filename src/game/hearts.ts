/**
 * Hearts (GDD v1.7 §6). The player carries them from scene to scene: a scene starts with the
 * hearts the last one ended with, and one comes back on every 20th level, never above the
 * maximum (a player who spent none gets nothing). A lost scene ends the run: Retry restarts
 * the level with the hearts left (one at the least), the rewarded Continue refills them in
 * place. Pure, no Phaser: the save model (src/platform/storage.ts) imports the cap from here.
 */
export const HEARTS_MAX = 3;
/** Levels 20, 40, 60 … each give one heart back on entry. */
export const HEART_REGEN_EVERY_LEVELS = 20;

/** A scene never starts with less than one heart or more than the maximum. */
export function clampHearts(hearts: number): number {
  return Math.min(HEARTS_MAX, Math.max(1, Math.floor(hearts)));
}

/** Hearts the player enters `level` with, given the hearts the previous scene ended with. */
export function heartsForLevel(level: number, hearts: number): number {
  const h = clampHearts(hearts);
  if (level >= HEART_REGEN_EVERY_LEVELS && level % HEART_REGEN_EVERY_LEVELS === 0) {
    return Math.min(HEARTS_MAX, h + 1);
  }
  return h;
}
