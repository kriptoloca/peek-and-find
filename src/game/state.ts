import type { SaveStore } from '../platform/storage';
import { type SaveData, defaultSave } from '../platform/storage';

/**
 * In-memory mirror of the save (GDD §8) plus per-session fields. Hydrated once at boot by
 * BootScene, persisted after every scene. Epic 8 swaps the backend for Bridge storage.
 */
export interface Progress extends SaveData {
  /** Retry counter for the current level; feeds the scene seed. Not persisted. */
  attempt: number;
}

export const progress: Progress = { ...defaultSave(0), attempt: 0 };

let store: SaveStore | null = null;

export function attachSaveStore(s: SaveStore): void {
  store = s;
}

export function hydrateProgress(save: SaveData): void {
  Object.assign(progress, save, { attempt: 0 });
}

export function toSave(): SaveData {
  return {
    version: progress.version,
    level: progress.level,
    totalStars: progress.totalStars,
    bestStreak: progress.bestStreak,
    streak: progress.streak,
    lastDailyDate: progress.lastDailyDate,
    dailyDone: progress.dailyDone,
    sound: progress.sound,
    music: progress.music,
    scenesPlayed: progress.scenesPlayed,
    seedSalt: progress.seedSalt,
  };
}

/** Fire-and-forget save; gameplay never waits on it and never sees an error. */
export function persistProgress(): void {
  if (!store) return;
  void store.save(toSave());
}

/** Dev menu / ?reset=1: fresh save with a new salt, persisted. */
export function resetProgress(): void {
  hydrateProgress(defaultSave());
  persistProgress();
}
