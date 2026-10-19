import { describe, expect, it } from 'vitest';
import { THEMES, themeForLevel } from '../src/data/themes';
import {
  DAILY_CHAIN_LENGTH,
  addDays,
  completeDaily,
  dailyMode,
  dailyScene,
  dailyStatus,
  todayKey,
} from '../src/game/daily';
import { generateScene } from '../src/gen/scene-gen';
import { hashSeed } from '../src/gen/rng';
import { pickMode } from '../src/gen/difficulty';
import { Rng } from '../src/gen/rng';

const base = { lastDailyDate: null as string | null, streak: 0, bestStreak: 0 };

describe('date keys', () => {
  it('addDays crosses month and year boundaries in UTC', () => {
    expect(addDays('20261031', 1)).toBe('20261101');
    expect(addDays('20261231', 1)).toBe('20270101');
    expect(addDays('20260301', -1)).toBe('20260228');
    expect(addDays('20261016', -1)).toBe('20261015');
  });

  it('todayKey follows UTC, not the local clock', () => {
    expect(todayKey(new Date(Date.UTC(2026, 9, 16, 23, 59)))).toBe('20261016');
    expect(todayKey(new Date(Date.UTC(2026, 9, 17, 0, 0)))).toBe('20261017');
  });
});

describe('streak transitions', () => {
  it('first completion starts a streak of 1', () => {
    const r = completeDaily(base, '20261016');
    expect(r).toEqual({ lastDailyDate: '20261016', streak: 1, bestStreak: 1, dailyDone: true });
  });

  it('same day does not double count', () => {
    const a = completeDaily(base, '20261016');
    const b = completeDaily(a, '20261016');
    expect(b.streak).toBe(1);
    expect(b.bestStreak).toBe(1);
  });

  it('next day increments, skipped day resets, best is kept', () => {
    let s = completeDaily(base, '20261016');
    s = completeDaily(s, '20261017');
    s = completeDaily(s, '20261018');
    expect(s.streak).toBe(3);
    expect(s.bestStreak).toBe(3);
    s = completeDaily(s, '20261020'); // 19th missed
    expect(s.streak).toBe(1);
    expect(s.bestStreak).toBe(3);
  });

  it('dailyStatus shows done today, pending with streak yesterday, lapsed otherwise', () => {
    const s = completeDaily(base, '20261016');
    expect(dailyStatus(s, '20261016')).toEqual({ done: true, streak: 1 });
    expect(dailyStatus(s, '20261017')).toEqual({ done: false, streak: 1 });
    expect(dailyStatus(s, '20261018')).toEqual({ done: false, streak: 0 });
    expect(dailyStatus(base, '20261016')).toEqual({ done: false, streak: 0 });
  });
});

describe('daily chain', () => {
  it('has five scenes at fixed levels with seeds that ignore the player', () => {
    expect(DAILY_CHAIN_LENGTH).toBe(5);
    expect([0, 1, 2, 3, 4].map((i) => dailyScene('20261016', i).level)).toEqual([
      10, 20, 30, 40, 50,
    ]);
    expect(dailyScene('20261016', 2)).toEqual(dailyScene('20261016', 2));
    expect(dailyScene('20261016', 2).seed).not.toBe(dailyScene('20261017', 2).seed);
    expect(() => dailyScene('20261016', 5)).toThrow();
  });

  it('two players (any salt) generate identical daily scenes in every mode', () => {
    for (let i = 0; i < DAILY_CHAIN_LENGTH; i++) {
      const { level, seed } = dailyScene('20261016', i);
      const mode = dailyMode('20261016', i, true);
      const theme = themeForLevel(level);
      const a = generateScene({ seed, level, mode, theme });
      const b = generateScene({ seed, level, mode, theme });
      expect(a).toEqual(b);
      expect(THEMES).toContain(theme);
    }
  });
});

describe('dailyMode (GDD §7)', () => {
  const DATES = Array.from({ length: 365 }, (_, d) => addDays('20260101', d));

  it('is the date-seeded draw with the §4 shares, the same for every player', () => {
    for (const day of DATES.slice(0, 30)) {
      for (let i = 0; i < DAILY_CHAIN_LENGTH; i++) {
        const { level } = dailyScene(day, i);
        const drawn = pickMode(new Rng(hashSeed(`daily-mode:${day}:${String(i)}`)), level, true);
        expect(dailyMode(day, i, true)).toBe(drawn);
      }
    }
  });

  it('mixes the modes over a year (the fixed rhythm would make every daily level Find)', () => {
    const counts = { find: 0, odd: 0, spot: 0 };
    for (const day of DATES) {
      for (let i = 0; i < DAILY_CHAIN_LENGTH; i++) counts[dailyMode(day, i, true)] += 1;
    }
    const n = DATES.length * DAILY_CHAIN_LENGTH;
    expect(counts.find / n).toBeGreaterThan(0.5);
    expect(counts.odd / n).toBeGreaterThan(0.12);
    expect(counts.spot / n).toBeGreaterThan(0.08);
  });

  it('a layout that cannot host Spot changes only the Spot scenes, into Find', () => {
    let changed = 0;
    for (const day of DATES) {
      for (let i = 0; i < DAILY_CHAIN_LENGTH; i++) {
        const hosted = dailyMode(day, i, true);
        const notHosted = dailyMode(day, i, false);
        if (hosted === 'spot') {
          expect(notHosted).toBe('find');
          changed += 1;
        } else {
          expect(notHosted, `${day} #${String(i)}`).toBe(hosted);
        }
      }
    }
    expect(changed).toBeGreaterThan(0);
  });
});
