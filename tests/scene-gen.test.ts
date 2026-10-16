import { describe, expect, it } from 'vitest';
import { KITCHEN } from '../src/data/themes';
import { SCENE_MARGIN } from '../src/gen/constants';
import { params } from '../src/gen/difficulty';
import { sceneSeed } from '../src/gen/rng';
import { bandOf, generateScene, playableRect } from '../src/gen/scene-gen';
import { validateScene } from '../src/gen/validate';

const LEVELS = [1, 5, 10, 25, 50, 80, 200];

describe('generateScene (find)', () => {
  it('is deterministic for 200 seeds', () => {
    for (let i = 0; i < 200; i++) {
      const level = 1 + (i % 90);
      const seed = sceneSeed('find', level, i, 99);
      const a = generateScene({ seed, level, mode: 'find', theme: KITCHEN });
      const b = generateScene({ seed, level, mode: 'find', theme: KITCHEN });
      expect(a).toEqual(b);
    }
  });

  it('different seeds give different scenes', () => {
    const a = generateScene({ seed: 1, level: 20, mode: 'find', theme: KITCHEN });
    const b = generateScene({ seed: 2, level: 20, mode: 'find', theme: KITCHEN });
    expect(a).not.toEqual(b);
  });

  it.each(LEVELS)('satisfies every invariant at level %i for 15 seeds', (level) => {
    for (let s = 0; s < 15; s++) {
      const seed = sceneSeed('find', level, s, 7);
      const scene = generateScene({ seed, level, mode: 'find', theme: KITCHEN, validate: true });
      expect(validateScene(scene, KITCHEN)).toEqual([]);
      expect(scene.objects.length).toBe(params(level).objectCount);
      expect(scene.targets.length).toBe(params(level).targetCount);
    }
  });

  it('level 1 is a single, big, front-band, unoccluded target with no decoys', () => {
    for (let s = 0; s < 20; s++) {
      const scene = generateScene({ seed: 1000 + s, level: 1, mode: 'find', theme: KITCHEN });
      expect(scene.targets.length).toBe(1);
      expect(scene.objects.filter((o) => o.isDecoy).length).toBe(0);
      expect(scene.params.maxOcclusion).toBe(0);
      const t = scene.targets[0]!;
      expect(t.band).toBe(2);
      // front band 1.15 × jitter ≥ 0.9 × teach boost 1.3, minus the edge cap on the largest families
      expect(t.scale).toBeGreaterThanOrEqual(1.15);
    }
  });

  it('teaching levels put targets in the front band; later levels use all bands', () => {
    for (let s = 0; s < 15; s++) {
      const scene = generateScene({ seed: 2000 + s, level: 5, mode: 'find', theme: KITCHEN });
      for (const t of scene.targets) expect(t.band).toBe(2);
    }
    const bands = new Set<number>();
    for (let s = 0; s < 30; s++) {
      const scene = generateScene({ seed: 3000 + s, level: 30, mode: 'find', theme: KITCHEN });
      for (const t of scene.targets) bands.add(t.band);
    }
    expect(bands.size).toBe(3);
  });

  it('rarely needs relaxation or regeneration', () => {
    let regen = 0;
    let relaxedSpread = 0;
    let relaxedSpacing = 0;
    const N = 100;
    for (let s = 0; s < N; s++) {
      const scene = generateScene({ seed: 5000 + s, level: 80, mode: 'find', theme: KITCHEN });
      regen += scene.regenerations;
      if (scene.targetSpacing < 1.5 * scene.spacing - 1e-9) relaxedSpread += 1;
      if (scene.spacing < Math.min(scene.params.minSpacing, 82) - 1e-9) relaxedSpacing += 1;
    }
    expect(regen / N).toBeLessThan(1);
    expect(relaxedSpread).toBeLessThan(N * 0.2);
    expect(relaxedSpacing).toBeLessThan(N * 0.2);
  });

  it('big scenes at the plateau regenerate only a few times on average', () => {
    let regen = 0;
    const N = 40;
    for (let s = 0; s < N; s++) {
      regen += generateScene({
        seed: 9000 + s,
        level: 100,
        mode: 'find',
        theme: KITCHEN,
      }).regenerations;
    }
    expect(regen / N).toBeLessThan(5);
  });

  it('generates level 80 in under 50 ms on average', () => {
    for (let s = 0; s < 5; s++) generateScene({ seed: s, level: 80, mode: 'find', theme: KITCHEN });
    const runs = 30;
    const t0 = performance.now();
    for (let s = 0; s < runs; s++) {
      generateScene({ seed: 100 + s, level: 80, mode: 'find', theme: KITCHEN });
    }
    const avg = (performance.now() - t0) / runs;
    expect(avg).toBeLessThan(50);
  });

  it('rejects modes that are not implemented yet', () => {
    expect(() => generateScene({ seed: 1, level: 20, mode: 'odd', theme: KITCHEN })).toThrow(
      /epic 4/,
    );
    expect(() => generateScene({ seed: 1, level: 20, mode: 'spot', theme: KITCHEN })).toThrow(
      /epic 5/,
    );
  });

  it('uses two target families only from level 20 on', () => {
    let two = 0;
    for (let s = 0; s < 40; s++) {
      const low = generateScene({ seed: s, level: 19, mode: 'find', theme: KITCHEN });
      expect(low.prompt.kind === 'find' && low.prompt.items.length).toBe(1);
      const high = generateScene({ seed: s, level: 40, mode: 'find', theme: KITCHEN });
      if (high.prompt.kind === 'find' && high.prompt.items.length === 2) two += 1;
    }
    expect(two).toBeGreaterThan(5);
    expect(two).toBeLessThan(35);
  });
});

describe('helpers', () => {
  it('playable rect uses the margin and bands split it in thirds', () => {
    const r = playableRect();
    expect(r).toEqual({
      x: SCENE_MARGIN,
      y: SCENE_MARGIN,
      w: 1080 - 2 * SCENE_MARGIN,
      h: 1080 - 2 * SCENE_MARGIN,
    });
    expect(bandOf(r.y, r)).toBe(0);
    expect(bandOf(r.y + r.h / 2, r)).toBe(1);
    expect(bandOf(r.y + r.h - 1, r)).toBe(2);
  });
});
