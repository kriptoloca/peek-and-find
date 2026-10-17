import { describe, expect, it } from 'vitest';
import { HIT_RADIUS_FIND } from '../src/config';
import { KITCHEN } from '../src/data/themes';
import {
  ODD_CORNER_FREE_UNTIL_LEVEL,
  ODD_ROTATION_JITTER_DEG,
  ODD_SCALE_DELTA,
  generateOdd,
  oddCount,
  oddKindWeights,
} from '../src/gen/modes/odd-one-out';
import { sceneSeed } from '../src/gen/rng';
import { generateScene } from '../src/gen/scene-gen';
import type { OddKind } from '../src/gen/types';
import { validateScene } from '../src/gen/validate';

const LEVELS = [6, 10, 14, 15, 25, 50, 80, 200];

describe('oddCount', () => {
  it('is 8 + level clamped to [8, 36]', () => {
    expect(oddCount(1)).toBe(9);
    expect(oddCount(0)).toBe(8);
    expect(oddCount(6)).toBe(14);
    expect(oddCount(28)).toBe(36);
    expect(oddCount(200)).toBe(36);
  });
});

describe('generateOdd', () => {
  it('is deterministic for 100 seeds and reachable through generateScene', () => {
    for (let i = 0; i < 100; i++) {
      const level = 6 + (i % 80);
      const seed = sceneSeed('odd', level, i, 5);
      const a = generateOdd(seed, level, KITCHEN);
      const b = generateScene({ seed, level, mode: 'odd', theme: KITCHEN });
      expect(a).toEqual(b);
    }
  });

  it.each(LEVELS)('satisfies every invariant at level %i for 20 seeds', (level) => {
    for (let s = 0; s < 20; s++) {
      const seed = sceneSeed('odd', level, s, 11);
      const scene = generateScene({ seed, level, mode: 'odd', theme: KITCHEN, validate: true });
      expect(validateScene(scene, KITCHEN)).toEqual([]);
      expect(scene.objects.length).toBe(oddCount(level));
      expect(scene.targets.length).toBe(1);
      expect(scene.prompt.kind).toBe('odd');
    }
  });

  it('every cell turns by a seeded angle within the jitter; the odd one is not the only one', () => {
    const max = (ODD_ROTATION_JITTER_DEG * Math.PI) / 180;
    for (let s = 0; s < 30; s++) {
      const scene = generateOdd(900 + s, 20, KITCHEN);
      const rotations = scene.objects.map((o) => o.rotation ?? 0);
      expect(rotations.every((r) => Math.abs(r) <= max)).toBe(true);
      expect(new Set(rotations.map((r) => r.toFixed(4))).size).toBeGreaterThan(3);
      const odd = scene.targets[0]!;
      const regularTurned = scene.objects.filter((o) => !o.isTarget && (o.rotation ?? 0) !== 0);
      expect(regularTurned.length).toBeGreaterThan(0);
      expect(Math.abs(odd.rotation ?? 0)).toBeLessThanOrEqual(max);
    }
    expect(generateOdd(1234, 12, KITCHEN)).toEqual(generateOdd(1234, 12, KITCHEN));
  });

  it('exactly one item differs, in exactly one attribute, and all others are identical', () => {
    for (let s = 0; s < 60; s++) {
      const scene = generateOdd(700 + s, 30, KITCHEN);
      const odd = scene.targets[0]!;
      const regular = scene.objects.filter((o) => !o.isTarget);
      const ref = regular[0]!;
      for (const o of regular) {
        expect(o.frame).toBe(ref.frame);
        expect(o.flipX).toBe(false);
        expect(o.size).toBeCloseTo(ref.size, 6);
      }
      const diffs = [odd.frame !== ref.frame, odd.flipX, Math.abs(odd.size - ref.size) > 1e-6];
      expect(diffs.filter(Boolean).length).toBe(1);
      if (scene.odd!.kind === 'scale') expect(odd.size).toBeCloseTo(ref.size * ODD_SCALE_DELTA, 6);
    }
  });

  it('keeps every pair of centers at least 2 × hit radius apart (grid + jitter)', () => {
    for (const level of [6, 20, 36, 80]) {
      const scene = generateOdd(99 + level, level, KITCHEN);
      const need = (2 * HIT_RADIUS_FIND) ** 2;
      for (let i = 0; i < scene.objects.length; i++) {
        for (let j = i + 1; j < scene.objects.length; j++) {
          const a = scene.objects[i]!;
          const b = scene.objects[j]!;
          expect((a.x - b.x) ** 2 + (a.y - b.y) ** 2).toBeGreaterThanOrEqual(need);
        }
      }
    }
  });

  it('never puts the odd item in a corner before level 15, but does afterwards', () => {
    const isCorner = (s: ReturnType<typeof generateOdd>): boolean => {
      const o = s.odd!;
      return (o.col === 0 || o.col === o.cols - 1) && (o.row === 0 || o.row === o.rows - 1);
    };
    for (let s = 0; s < 80; s++) {
      expect(isCorner(generateOdd(5000 + s, ODD_CORNER_FREE_UNTIL_LEVEL - 1, KITCHEN))).toBe(false);
    }
    let corners = 0;
    for (let s = 0; s < 120; s++) if (isCorner(generateOdd(6000 + s, 40, KITCHEN))) corners += 1;
    expect(corners).toBeGreaterThan(0);
  });

  it('shifts the attribute mix toward subtler kinds at higher levels', () => {
    const tally = (level: number): Record<OddKind, number> => {
      const t: Record<OddKind, number> = { color: 0, flip: 0, scale: 0, odd: 0 };
      for (let s = 0; s < 300; s++) t[generateOdd(8000 + s, level, KITCHEN).odd!.kind] += 1;
      return t;
    };
    const low = tally(10);
    const high = tally(80);
    expect(low.color).toBeGreaterThan(high.color);
    expect(high.scale).toBeGreaterThan(low.scale);
    expect(low.odd).toBe(0); // placeholder theme has no `odd` frames and weight is 0 below 15
    expect(oddKindWeights(10).odd).toBe(0);
    expect(oddKindWeights(80).scale).toBeGreaterThan(oddKindWeights(10).scale);
  });

  it('regular items use one frame of one family; color-odd uses a different baked color', () => {
    for (let s = 0; s < 40; s++) {
      const scene = generateOdd(9000 + s, 12, KITCHEN);
      const families = new Set(scene.objects.map((o) => o.family));
      expect(families.size).toBe(1);
      if (scene.odd!.kind === 'color') {
        const odd = scene.targets[0]!;
        expect(odd.frame).not.toBe(scene.odd!.baseFrame);
        expect(odd.frame.replace(/_c\d+$/, '')).toBe(scene.odd!.baseFrame.replace(/_c\d+$/, ''));
      }
    }
  });
});
