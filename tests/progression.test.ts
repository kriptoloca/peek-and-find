import { describe, expect, it } from 'vitest';
import { modeForLevel } from '../src/game/progression';

describe('modeForLevel', () => {
  it('is Find only for levels 1–5 and deterministic per level and salt', () => {
    for (let L = 1; L <= 5; L++) {
      for (let salt = 0; salt < 20; salt++) expect(modeForLevel(L, salt, true)).toBe('find');
    }
    expect(modeForLevel(30, 7, true)).toBe(modeForLevel(30, 7, true));
  });

  it('mixes Odd in from level 6 and never picks Spot when it cannot be hosted', () => {
    const counts = { find: 0, odd: 0, spot: 0 };
    for (let L = 6; L <= 10; L++) {
      for (let salt = 0; salt < 60; salt++) counts[modeForLevel(L, salt, true)] += 1;
    }
    expect(counts.odd).toBeGreaterThan(20);
    expect(counts.spot).toBe(0);
    for (let salt = 0; salt < 200; salt++) expect(modeForLevel(50, salt, false)).not.toBe('spot');
  });

  it('salt changes the sequence of modes between players', () => {
    const seqA = Array.from({ length: 40 }, (_, i) => modeForLevel(6 + i, 1, false)).join('');
    const seqB = Array.from({ length: 40 }, (_, i) => modeForLevel(6 + i, 2, false)).join('');
    expect(seqA).not.toBe(seqB);
  });
});

describe('modeForLevel with Spot hostable', () => {
  it('schedules Spot from level 11 when the layout can host it, never before', () => {
    const counts = { find: 0, odd: 0, spot: 0 };
    for (let L = 11; L <= 40; L++)
      for (let salt = 0; salt < 20; salt++) counts[modeForLevel(L, salt, true)] += 1;
    expect(counts.spot).toBeGreaterThan(60);
    for (let L = 1; L <= 10; L++)
      for (let salt = 0; salt < 20; salt++) expect(modeForLevel(L, salt, true)).not.toBe('spot');
  });
});
