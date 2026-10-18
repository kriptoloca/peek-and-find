import { describe, expect, it } from 'vitest';
import { KITCHEN } from '../src/data/themes';
import { dist2 } from '../src/gen/geometry';
import { sceneSeed } from '../src/gen/rng';
import { generateScene } from '../src/gen/scene-gen';
import {
  MEMORY_FROM_LEVEL,
  SHUFFLE_FROM_LEVEL,
  SHUFFLE_LAYOUTS,
  SHUFFLE_MIN_MOVED_SHARE,
  TWIST_CHANCE_FULL,
  TWIST_CHANCE_START,
  TWIST_FULL_LEVEL,
  pickTwist,
  twistChance,
  twistKinds,
} from '../src/gen/twist';
import type { Placed, Scene } from '../src/gen/types';
import { validateScene } from '../src/gen/validate';

function movedShare(a: readonly Placed[], b: readonly Placed[], spacing: number): number {
  let moved = 0;
  for (let i = 0; i < a.length; i++) {
    const p = a[i] as Placed;
    const q = b[i] as Placed;
    if (dist2(p.x, p.y, q.x, q.y) > (spacing / 2) ** 2) moved += 1;
  }
  return moved / a.length;
}

describe('twist picker', () => {
  it('is eligible by level and mode: shuffle from 30 (Find, Odd), memory from 45 (Find only)', () => {
    expect(twistKinds(29, 'find')).toEqual([]);
    expect(twistKinds(SHUFFLE_FROM_LEVEL, 'find')).toEqual(['shuffle']);
    expect(twistKinds(SHUFFLE_FROM_LEVEL, 'odd')).toEqual(['shuffle']);
    expect(twistKinds(MEMORY_FROM_LEVEL - 1, 'find')).toEqual(['shuffle']);
    expect(twistKinds(MEMORY_FROM_LEVEL, 'find')).toEqual(['shuffle', 'memory']);
    expect(twistKinds(201, 'odd')).toEqual(['shuffle']);
    expect(twistKinds(201, 'spot')).toEqual([]);
  });

  it('never twists a big scene', () => {
    expect(twistKinds(51, 'find')).toEqual(['shuffle', 'memory']);
    expect(twistKinds(50, 'find')).toEqual([]);
    expect(twistKinds(75, 'find')).toEqual([]);
    expect(twistKinds(100, 'odd')).toEqual([]);
    for (let seed = 0; seed < 200; seed++) expect(pickTwist(seed, 100, 'find')).toBeNull();
  });

  it('chance grows from 25 % at 30 to 50 % at 80, then stays flat', () => {
    expect(twistChance(1)).toBe(0);
    expect(twistChance(SHUFFLE_FROM_LEVEL)).toBeCloseTo(TWIST_CHANCE_START);
    expect(twistChance(55)).toBeCloseTo((TWIST_CHANCE_START + TWIST_CHANCE_FULL) / 2);
    expect(twistChance(TWIST_FULL_LEVEL)).toBeCloseTo(TWIST_CHANCE_FULL);
    expect(twistChance(500)).toBeCloseTo(TWIST_CHANCE_FULL);
    for (let l = 2; l < 200; l++) expect(twistChance(l)).toBeGreaterThanOrEqual(twistChance(l - 1));
  });

  it('is seeded: the same seed picks the same twist, and the share matches the chance', () => {
    let twisted = 0;
    const kinds = { shuffle: 0, memory: 0 };
    const N = 2000;
    for (let seed = 0; seed < N; seed++) {
      const a = pickTwist(seed, 90, 'find');
      expect(pickTwist(seed, 90, 'find')).toEqual(a);
      if (a) {
        twisted += 1;
        kinds[a.kind] += 1;
      }
    }
    expect(twisted / N).toBeGreaterThan(TWIST_CHANCE_FULL - 0.05);
    expect(twisted / N).toBeLessThan(TWIST_CHANCE_FULL + 0.05);
    expect(kinds.shuffle / twisted).toBeGreaterThan(0.4);
    expect(kinds.memory / twisted).toBeGreaterThan(0.4);
  });
});

describe('shuffle layouts (Find)', () => {
  const shuffled = (level: number, n: number): Scene[] => {
    const out: Scene[] = [];
    for (let i = 0; out.length < n && i < n * 4; i++) {
      const seed = sceneSeed('find', level, i, 11);
      const s = generateScene({ seed, level, mode: 'find', theme: KITCHEN, twist: 'shuffle' });
      out.push(s);
    }
    return out;
  };

  it('carries two validated layouts of the same items that move more than half of them', () => {
    for (const level of [30, 60, 80, 149]) {
      for (const s of shuffled(level, 15)) {
        expect(s.twist).toEqual({ kind: 'shuffle' });
        expect(s.shuffles).toHaveLength(SHUFFLE_LAYOUTS);
        expect(validateScene(s, KITCHEN)).toEqual([]);
        let prev = s.objects;
        for (const layout of s.shuffles ?? []) {
          expect(layout.map((o) => o.id)).toEqual(s.objects.map((o) => o.id));
          expect(layout.map((o) => o.frame)).toEqual(s.objects.map((o) => o.frame));
          expect(movedShare(prev, layout, s.spacing)).toBeGreaterThanOrEqual(
            SHUFFLE_MIN_MOVED_SHARE,
          );
          expect(layout.filter((o) => o.isTarget)).toHaveLength(s.params.targetCount);
          prev = layout;
        }
      }
    }
  });

  it('is deterministic and leaves the main layout of a seed untouched', () => {
    for (let i = 0; i < 60; i++) {
      const level = 30 + (i % 60);
      const seed = sceneSeed('find', level, i, 3);
      const a = generateScene({ seed, level, mode: 'find', theme: KITCHEN, twist: 'shuffle' });
      const b = generateScene({ seed, level, mode: 'find', theme: KITCHEN, twist: 'shuffle' });
      expect(a).toEqual(b);
      const plain = generateScene({ seed, level, mode: 'find', theme: KITCHEN, twist: 'none' });
      expect(plain.twist).toBeUndefined();
      expect(plain.shuffles).toBeUndefined();
      // Same seed → same objects; only a layout that could not be repaired moves to seed + 1.
      if (plain.seed === a.seed) expect(a.objects).toEqual(plain.objects);
    }
  });

  it('auto mode follows the picker; forced kinds respect the mode, not the level', () => {
    let twisted = 0;
    for (let i = 0; i < 80; i++) {
      const seed = sceneSeed('find', 20, i, 1);
      const s = generateScene({ seed, level: 20, mode: 'find', theme: KITCHEN });
      expect(s.twist).toBeUndefined();
      const forced = generateScene({
        seed,
        level: 20,
        mode: 'find',
        theme: KITCHEN,
        twist: 'memory',
      });
      expect(forced.twist).toEqual({ kind: 'memory' });
      expect(forced.shuffles).toBeUndefined();
      expect(validateScene(forced, KITCHEN)).toEqual([]);
      const s80 = generateScene({ seed, level: 80, mode: 'find', theme: KITCHEN });
      if (s80.twist) twisted += 1;
      expect(validateScene(s80, KITCHEN)).toEqual([]);
    }
    expect(twisted).toBeGreaterThan(20);
    expect(twisted).toBeLessThan(60);
    const spot = generateScene({
      seed: 5,
      level: 40,
      mode: 'spot',
      theme: KITCHEN,
      twist: 'shuffle',
    });
    expect(spot.twist).toBeUndefined();
    const oddMem = generateScene({
      seed: 5,
      level: 60,
      mode: 'odd',
      theme: KITCHEN,
      twist: 'memory',
    });
    expect(oddMem.twist).toBeUndefined();
  });

  it('level 80 with the shuffle twist still generates fast', () => {
    const t0 = performance.now();
    const n = 40;
    for (let i = 0; i < n; i++) {
      generateScene({ seed: i, level: 80, mode: 'find', theme: KITCHEN, twist: 'shuffle' });
    }
    expect((performance.now() - t0) / n).toBeLessThan(50);
  });
});

describe('shuffle layouts (Odd One Out)', () => {
  it('permutes the cells: items keep frame, size and flip; the odd one moves', () => {
    let oddMoved = 0;
    const N = 40;
    for (let i = 0; i < N; i++) {
      const level = 30 + i;
      const seed = sceneSeed('odd', level, i, 2);
      const s = generateScene({ seed, level, mode: 'odd', theme: KITCHEN, twist: 'shuffle' });
      expect(s.twist).toEqual({ kind: 'shuffle' });
      expect(validateScene(s, KITCHEN)).toEqual([]);
      const cells = new Set(s.objects.map((o) => `${String(o.x)},${String(o.y)}`));
      for (const layout of s.shuffles ?? []) {
        expect(new Set(layout.map((o) => `${String(o.x)},${String(o.y)}`))).toEqual(cells);
        layout.forEach((o, k) => {
          const m = s.objects[k] as Placed;
          expect([o.id, o.frame, o.size, o.flipX, o.isTarget]).toEqual([
            m.id,
            m.frame,
            m.size,
            m.flipX,
            m.isTarget,
          ]);
        });
      }
      const odd = s.objects.find((o) => o.isTarget) as Placed;
      const odd1 = (s.shuffles?.[0] ?? []).find((o) => o.isTarget) as Placed;
      if (odd.x !== odd1.x || odd.y !== odd1.y) oddMoved += 1;
    }
    expect(oddMoved).toBeGreaterThan(N * 0.8);
  });
});

describe('validator', () => {
  it('rejects layouts that are not the same items, barely move, or exist without the twist', () => {
    const seed = sceneSeed('find', 51, 0, 9);
    const s = generateScene({ seed, level: 51, mode: 'find', theme: KITCHEN, twist: 'shuffle' });
    const noTwist: Scene = { ...s };
    delete noTwist.twist;
    expect(validateScene(noTwist, KITCHEN).join()).toContain('without the shuffle twist');
    const still: Scene = { ...s, shuffles: [s.objects, s.objects] };
    expect(validateScene(still, KITCHEN).join()).toContain('items moved');
    const swapped = (s.shuffles?.[0] ?? []).map((o, i, arr) => ({
      ...o,
      id: (arr[(i + 1) % arr.length] as Placed).id,
    }));
    const wrongIds: Scene = { ...s, shuffles: [swapped, s.shuffles?.[1] ?? []] };
    expect(validateScene(wrongIds, KITCHEN).join()).toContain('not the same item');
    const spotTwist: Scene = {
      ...generateScene({ seed, level: 51, mode: 'spot', theme: KITCHEN }),
      twist: { kind: 'shuffle' },
    };
    expect(validateScene(spotTwist, KITCHEN).join()).toContain('cannot be hosted');
  });
});
