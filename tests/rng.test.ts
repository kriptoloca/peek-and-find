import { describe, expect, it } from 'vitest';
import { Rng, dailySeed, hashSeed, sceneSeed, utcDateKey } from '../src/gen/rng';

describe('hashSeed', () => {
  it('is deterministic and 32-bit', () => {
    expect(hashSeed('find:1:0:42')).toBe(hashSeed('find:1:0:42'));
    const h = hashSeed('anything');
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(2 ** 32);
  });

  it('separates nearby strings', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) seen.add(hashSeed(`find:${String(i)}:0:1`));
    expect(seen.size).toBe(1000);
  });
});

describe('Rng (mulberry32)', () => {
  it('reproduces the same sequence for the same seed', () => {
    const a = new Rng(123456);
    const b = new Rng(123456);
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });

  it('matches golden values (guards against accidental algorithm changes)', () => {
    const r = new Rng(1);
    const got = [r.next(), r.next(), r.next()].map((v) => v.toFixed(10));
    // Values recorded from the reference mulberry32 implementation for seed 1.
    expect(got).toEqual(['0.6270739406', '0.0027357212', '0.5274470400']);
  });

  it('int is inclusive on both ends and covers the range', () => {
    const r = new Rng(7);
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const v = r.int(3, 6);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(6);
      seen.add(v);
    }
    expect([...seen].sort()).toEqual([3, 4, 5, 6]);
    expect(() => r.int(5, 4)).toThrow();
  });

  it('shuffle is a permutation and depends on the seed', () => {
    const base = Array.from({ length: 20 }, (_, i) => i);
    const a = new Rng(9).shuffle([...base]);
    const b = new Rng(9).shuffle([...base]);
    const c = new Rng(10).shuffle([...base]);
    expect([...a].sort((x, y) => x - y)).toEqual(base);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it('gauss has roughly the requested mean and sd', () => {
    const r = new Rng(3);
    let sum = 0;
    let sq = 0;
    const n = 20000;
    for (let i = 0; i < n; i++) {
      const v = r.gauss(10, 2);
      sum += v;
      sq += v * v;
    }
    const mean = sum / n;
    const sd = Math.sqrt(sq / n - mean * mean);
    expect(Math.abs(mean - 10)).toBeLessThan(0.1);
    expect(Math.abs(sd - 2)).toBeLessThan(0.1);
  });

  it('weighted respects weights', () => {
    const r = new Rng(5);
    const counts = [0, 0, 0];
    for (let i = 0; i < 9000; i++) counts[r.weighted([50, 30, 20])]! += 1;
    expect(counts[0]).toBeGreaterThan(4200);
    expect(counts[2]).toBeLessThan(2200);
    expect(() => r.weighted([0, 0])).toThrow();
  });
});

describe('seeds', () => {
  it('scene seed changes with mode, level, attempt and salt', () => {
    const base = sceneSeed('find', 5, 0, 1);
    expect(sceneSeed('find', 5, 0, 1)).toBe(base);
    expect(sceneSeed('odd', 5, 0, 1)).not.toBe(base);
    expect(sceneSeed('find', 6, 0, 1)).not.toBe(base);
    expect(sceneSeed('find', 5, 1, 1)).not.toBe(base);
    expect(sceneSeed('find', 5, 0, 2)).not.toBe(base);
  });

  it('daily seed ignores the player and depends only on the UTC date and index', () => {
    expect(dailySeed('20261016', 0)).toBe(dailySeed('20261016', 0));
    expect(dailySeed('20261016', 1)).not.toBe(dailySeed('20261016', 0));
    expect(dailySeed('20261017', 0)).not.toBe(dailySeed('20261016', 0));
  });

  it('utcDateKey is stable across timezones', () => {
    // 23:30 in UTC−5 is 04:30 UTC the next day; the key must follow UTC.
    const d = new Date(Date.UTC(2026, 9, 17, 4, 30));
    expect(utcDateKey(d)).toBe('20261017');
    expect(utcDateKey(new Date(Date.UTC(2026, 0, 5, 0, 0)))).toBe('20260105');
  });
});
