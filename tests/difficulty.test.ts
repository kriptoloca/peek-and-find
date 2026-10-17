import { describe, expect, it } from 'vitest';
import { HIT_RADIUS_FIND } from '../src/config';
import {
  DAILY_LEVELS,
  isBigScene,
  modeWeights,
  params,
  pickMode,
  starsFor,
  themeIndex,
  themeToPreload,
  unlockedThemes,
} from '../src/gen/difficulty';
import { Rng } from '../src/gen/rng';

describe('params', () => {
  it('matches the table columns exactly', () => {
    const l1 = params(1);
    expect(l1).toMatchObject({ objectCount: 12, targetCount: 1, targetScale: 1, decoyRatio: 0 });
    expect(l1).toMatchObject({ maxOcclusion: 0, minSpacing: 150, t3: 8, t2: 15 });
    expect(params(10)).toMatchObject({ objectCount: 24, targetCount: 2, minSpacing: 120, t3: 12 });
    expect(params(30)).toMatchObject({ objectCount: 42, targetCount: 3, minSpacing: 95, t3: 18 });
    expect(params(80)).toMatchObject({ objectCount: 60, targetCount: 5, minSpacing: 80, t3: 25 });
  });

  it('interpolates between columns and plateaus at 80', () => {
    const l5 = params(5);
    expect(l5.objectCount).toBeGreaterThan(12);
    expect(l5.objectCount).toBeLessThan(24);
    expect(params(200)).toEqual({
      ...params(80),
      level: 200,
      bigScene: true,
      targetCount: 7,
      objectCount: 78,
      t3: 50,
      t2: 90,
    });
    expect(params(81)).toEqual({ ...params(80), level: 81 });
  });

  it('is monotonic and keeps spacing ≥ 2 × hit radius', () => {
    let prev = params(1);
    for (let L = 2; L <= 120; L++) {
      const p = params(L);
      if (!p.bigScene && !prev.bigScene) {
        expect(p.objectCount).toBeGreaterThanOrEqual(prev.objectCount);
        expect(p.decoyRatio).toBeGreaterThanOrEqual(prev.decoyRatio);
        expect(p.targetScale).toBeLessThanOrEqual(prev.targetScale);
        expect(p.minSpacing).toBeLessThanOrEqual(prev.minSpacing);
      }
      expect(p.minSpacing).toBeGreaterThanOrEqual(2 * HIT_RADIUS_FIND);
      prev = p;
    }
  });

  it('big scene every 25th level: 7 targets, ×1.3 objects (cap 80), ×2 time', () => {
    expect(isBigScene(25)).toBe(true);
    expect(isBigScene(26)).toBe(false);
    const p = params(25);
    const base = params(24);
    expect(p.bigScene).toBe(true);
    expect(p.targetCount).toBe(7);
    expect(p.objectCount).toBeGreaterThan(base.objectCount);
    expect(p.objectCount).toBeLessThanOrEqual(80);
    expect(p.t3).toBeCloseTo(2 * (params(25).t3 / 2));
    expect(params(100).objectCount).toBe(78);
  });

  it('clamps nonsense levels to 1', () => {
    expect(params(0)).toEqual(params(1));
    expect(params(-5)).toEqual(params(1));
  });
});

describe('modes', () => {
  it('introduces Odd at 6 and Spot at 11, moving Spot to Find when not hostable', () => {
    expect(modeWeights(1, true)).toEqual({ find: 1, odd: 0, spot: 0 });
    expect(modeWeights(5, true)).toEqual({ find: 1, odd: 0, spot: 0 });
    expect(modeWeights(6, true)).toEqual({ find: 0.8, odd: 0.2, spot: 0 });
    expect(modeWeights(11, true)).toEqual({ find: 0.6, odd: 0.2, spot: 0.2 });
    expect(modeWeights(11, false)).toEqual({ find: 0.8, odd: 0.2, spot: 0 });
  });

  it('pickMode follows the weights and never picks Spot when it cannot be hosted', () => {
    const rng = new Rng(11);
    const counts = { find: 0, odd: 0, spot: 0 };
    for (let i = 0; i < 3000; i++) counts[pickMode(rng, 50, true)] += 1;
    expect(counts.find).toBeGreaterThan(1600);
    expect(counts.spot).toBeGreaterThan(450);
    for (let i = 0; i < 500; i++) expect(pickMode(rng, 50, false)).not.toBe('spot');
    for (let i = 0; i < 200; i++) expect(pickMode(rng, 3, true)).toBe('find');
  });
});

describe('themes and daily', () => {
  it('unlocks the second theme at level 4, then one every 10 levels up to 5', () => {
    expect(unlockedThemes(1)).toBe(1);
    expect(unlockedThemes(3)).toBe(1);
    expect(unlockedThemes(4)).toBe(2);
    expect(unlockedThemes(9)).toBe(2);
    expect(unlockedThemes(19)).toBe(2);
    expect(unlockedThemes(20)).toBe(3);
    expect(unlockedThemes(40)).toBe(5);
    expect(unlockedThemes(400)).toBe(5);
    for (let L = 1; L <= 3; L++) expect(themeIndex(L)).toBe(0);
    for (let L = 4; L <= 6; L++) expect(themeIndex(L)).toBe(1); // floor(3/3)=1, 1 % 2 = 1
    for (let L = 7; L <= 9; L++) expect(themeIndex(L)).toBe(0);
    expect(themeIndex(10)).toBe(1); // floor(9/3)=3, 3 % 2 = 1
    expect(themeIndex(13)).toBe(0);
    expect(themeIndex(40)).toBe(Math.floor(39 / 3) % 5);
  });

  it('preloads the next theme three levels ahead, once', () => {
    expect(themeToPreload(1)).toBe(1); // beach, three levels before level 4
    expect(themeToPreload(3)).toBe(1);
    expect(themeToPreload(4)).toBe(null);
    expect(themeToPreload(9)).toBe(null);
    expect(themeToPreload(17)).toBe(2); // city at 20
    expect(themeToPreload(20)).toBe(null);
    expect(themeToPreload(37)).toBe(4);
    expect(themeToPreload(47)).toBe(null);
  });

  it('daily chain levels are fixed', () => {
    expect([...DAILY_LEVELS]).toEqual([10, 20, 30, 40, 50]);
  });
});

describe('stars', () => {
  it('uses t3/t2 thresholds', () => {
    const p = params(1);
    expect(starsFor(7.9, p)).toBe(3);
    expect(starsFor(8, p)).toBe(3);
    expect(starsFor(12, p)).toBe(2);
    expect(starsFor(15.1, p)).toBe(1);
  });
});
