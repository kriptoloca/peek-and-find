import { DAILY_LEVELS } from '../gen/difficulty';
import { dailySeed, utcDateKey } from '../gen/rng';
import type { SaveData } from '../platform/storage';

/** Number of scenes in the daily chain (GDD §7). */
export const DAILY_CHAIN_LENGTH = DAILY_LEVELS.length;

export function todayKey(now: Date = new Date()): string {
  return utcDateKey(now);
}

/** "YYYYMMDD" shifted by `days` in UTC. */
export function addDays(key: string, days: number): string {
  const y = Number(key.slice(0, 4));
  const m = Number(key.slice(4, 6)) - 1;
  const d = Number(key.slice(6, 8));
  return utcDateKey(new Date(Date.UTC(y, m, d + days)));
}

export interface DailyStatus {
  /** Today's chain already completed. */
  done: boolean;
  /** Streak to display: current run, or 0 when a day was missed. */
  streak: number;
}

/** What the title screen shows for the daily button. */
export function dailyStatus(
  save: Pick<SaveData, 'lastDailyDate' | 'streak'>,
  today: string,
): DailyStatus {
  const last = save.lastDailyDate;
  if (last === today) return { done: true, streak: save.streak };
  if (last === addDays(today, -1)) return { done: false, streak: save.streak };
  return { done: false, streak: 0 };
}

/**
 * Applies a completed chain for `today` (GDD §7: +1 on consecutive days, reset after a gap,
 * no double counting on the same day). Pure: returns the changed fields.
 */
export function completeDaily(
  save: Pick<SaveData, 'lastDailyDate' | 'streak' | 'bestStreak'>,
  today: string,
): Pick<SaveData, 'lastDailyDate' | 'streak' | 'bestStreak' | 'dailyDone'> {
  if (save.lastDailyDate === today) {
    return {
      lastDailyDate: today,
      streak: save.streak,
      bestStreak: save.bestStreak,
      dailyDone: true,
    };
  }
  const streak = save.lastDailyDate === addDays(today, -1) ? save.streak + 1 : 1;
  return {
    lastDailyDate: today,
    streak,
    bestStreak: Math.max(save.bestStreak, streak),
    dailyDone: true,
  };
}

/** Level and seed of chain scene i (0-based). Same for every player (no salt). */
export function dailyScene(today: string, i: number): { level: number; seed: number } {
  if (i < 0 || i >= DAILY_CHAIN_LENGTH) throw new Error(`daily index ${String(i)} out of range`);
  return { level: DAILY_LEVELS[i] as number, seed: dailySeed(today, i) };
}
