import { describe, expect, it } from 'vitest';
import {
  MemoryBackend,
  SAVE_KEY,
  SAVE_VERSION,
  SaveStore,
  defaultSave,
  migrate,
  newSeedSalt,
  type StorageBackend,
} from '../src/platform/storage';

describe('migrate', () => {
  it('returns a valid default for garbage', () => {
    for (const raw of [null, undefined, 42, 'x', [], {}]) {
      const s = migrate(raw);
      expect(s.version).toBe(SAVE_VERSION);
      expect(s.level).toBe(1);
      expect(Number.isInteger(s.seedSalt)).toBe(true);
    }
  });

  it('keeps valid fields, repairs invalid ones, keeps the salt', () => {
    const s = migrate({
      version: 1,
      level: 37.9,
      totalStars: -5,
      streak: 'nope',
      lastDailyDate: '20261016',
      dailyDone: 1,
      sound: false,
      scenesPlayed: 120,
      seedSalt: 123456,
      junk: true,
    });
    expect(s).toEqual({
      version: 1,
      level: 37,
      totalStars: 0,
      bestStreak: 0,
      streak: 0,
      lastDailyDate: '20261016',
      dailyDone: false,
      sound: false,
      music: true,
      scenesPlayed: 120,
      seedSalt: 123456,
    });
  });

  it('starts fresh on an unknown version but keeps the salt', () => {
    const s = migrate({ version: 99, level: 50, seedSalt: 777 });
    expect(s.level).toBe(1);
    expect(s.seedSalt).toBe(777);
  });

  it('rejects malformed daily dates and level 0', () => {
    const s = migrate({ version: 1, level: 0, lastDailyDate: '2026-10-16', seedSalt: 1 });
    expect(s.level).toBe(1);
    expect(s.lastDailyDate).toBeNull();
  });
});

describe('SaveStore', () => {
  it('round-trips through a backend', async () => {
    const store = new SaveStore(new MemoryBackend());
    const data = { ...defaultSave(5), level: 12, totalStars: 30 };
    expect(await store.save(data)).toBe(true);
    expect(await store.load()).toEqual(data);
  });

  it('returns a default when nothing is stored or the JSON is broken', async () => {
    const backend = new MemoryBackend();
    const store = new SaveStore(backend);
    expect((await store.load()).level).toBe(1);
    await backend.set(SAVE_KEY, '{not json');
    expect((await store.load()).level).toBe(1);
  });

  it('never throws when the backend fails', async () => {
    const broken: StorageBackend = {
      get: () => Promise.reject(new Error('quota')),
      set: () => Promise.reject(new Error('quota')),
    };
    const store = new SaveStore(broken);
    expect((await store.load()).version).toBe(SAVE_VERSION);
    expect(await store.save(defaultSave(1))).toBe(false);
  });

  it('newSeedSalt is a 32-bit integer and varies', () => {
    const a = newSeedSalt();
    const b = newSeedSalt();
    expect(Number.isInteger(a)).toBe(true);
    expect(a).toBeLessThan(2 ** 32);
    expect(a === b && newSeedSalt() === a).toBe(false);
  });
});
