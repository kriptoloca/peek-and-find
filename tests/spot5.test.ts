import { describe, expect, it } from 'vitest';
import { HIT_RADIUS_FIND, HIT_RADIUS_SPOT, SPOT_H, SPOT_W } from '../src/config';
import { KITCHEN } from '../src/data/themes';
import {
  SPOT_DIFFERENCES,
  SPOT_MIN_AREA,
  SPOT_MIN_SHIFT,
  generateSpot,
  spotObjectCount,
} from '../src/gen/modes/spot5';
import { sceneSeed } from '../src/gen/rng';
import { generateScene } from '../src/gen/scene-gen';
import type { SpotMutation } from '../src/gen/types';
import { validateScene } from '../src/gen/validate';
import { applyTap, hitTargets, newRound, promptCounts, startRound } from '../src/game/rules';

const LEVELS = [11, 25, 50, 80, 200];

describe('generateSpot', () => {
  it('is deterministic for 100 seeds and reachable through generateScene', () => {
    for (let i = 0; i < 100; i++) {
      const level = 11 + (i % 70);
      const seed = sceneSeed('spot', level, i, 3);
      const a = generateSpot(seed, level, KITCHEN);
      const b = generateScene({ seed, level, mode: 'spot', theme: KITCHEN });
      expect(a).toEqual(b);
    }
  });

  it.each(LEVELS)('satisfies every invariant at level %i for 15 seeds', (level) => {
    for (let s = 0; s < 15; s++) {
      const seed = sceneSeed('spot', level, s, 13);
      const scene = generateScene({ seed, level, mode: 'spot', theme: KITCHEN, validate: true });
      expect(validateScene(scene, KITCHEN)).toEqual([]);
      expect(scene.width).toBe(SPOT_W);
      expect(scene.height).toBe(SPOT_H);
      expect(scene.objects.length).toBe(spotObjectCount(level));
      expect(scene.spot!.differences.length).toBe(SPOT_DIFFERENCES);
      expect(scene.prompt).toEqual({ kind: 'spot', count: 5 });
    }
  });

  it('mutates five distinct objects, each above the visibility threshold', () => {
    for (let s = 0; s < 40; s++) {
      const scene = generateSpot(400 + s, 40, KITCHEN);
      const ids = new Set(scene.spot!.differences.map((d) => d.objectId));
      expect(ids.size).toBe(5);
      for (const d of scene.spot!.differences) {
        const list = d.kind === 'add' ? scene.spot!.b : scene.objects;
        const o = list.find((x) => x.id === d.objectId)!;
        expect(o.size * o.size).toBeGreaterThanOrEqual(SPOT_MIN_AREA);
        expect(d.hitRadius).toBeGreaterThanOrEqual(HIT_RADIUS_SPOT);
        if (d.kind === 'scale') {
          const a = scene.objects.find((x) => x.id === d.objectId)!;
          const b = scene.spot!.b.find((x) => x.id === d.objectId)!;
          expect(Math.abs(a.size - b.size)).toBeGreaterThanOrEqual(SPOT_MIN_SHIFT);
        }
      }
    }
  });

  it('uses a mix of mutation kinds across seeds and never more than two of a kind per scene', () => {
    const seen = new Set<SpotMutation>();
    for (let s = 0; s < 80; s++) {
      const scene = generateSpot(900 + s, 50, KITCHEN);
      const perKind = new Map<SpotMutation, number>();
      for (const d of scene.spot!.differences) {
        seen.add(d.kind);
        perKind.set(d.kind, (perKind.get(d.kind) ?? 0) + 1);
      }
      for (const n of perKind.values()) expect(n).toBeLessThanOrEqual(2);
    }
    expect(seen.size).toBeGreaterThanOrEqual(5);
  });

  it('keeps regeneration rare', () => {
    let regen = 0;
    const N = 60;
    for (let s = 0; s < N; s++) regen += generateSpot(2000 + s, 80, KITCHEN).regenerations;
    expect(regen / N).toBeLessThan(3);
  });

  it('spaces image B like image A (≥ 2 × object radius) and keeps it inside the 1080×840 rect', () => {
    for (const level of [11, 50, 200]) {
      const scene = generateSpot(77 + level, level, KITCHEN);
      const need = (2 * HIT_RADIUS_FIND) ** 2;
      const b = scene.spot!.b;
      for (let i = 0; i < b.length; i++) {
        expect(b[i]!.x - b[i]!.size / 2).toBeGreaterThanOrEqual(-0.5);
        expect(b[i]!.y + b[i]!.size / 2).toBeLessThanOrEqual(SPOT_H + 0.5);
        for (let j = i + 1; j < b.length; j++) {
          expect((b[i]!.x - b[j]!.x) ** 2 + (b[i]!.y - b[j]!.y) ** 2).toBeGreaterThanOrEqual(need);
        }
      }
    }
  });
});

describe('Spot taps', () => {
  it('resolves taps against the five difference circles, counts misses as wrong, wins on the fifth', () => {
    const scene = generateSpot(31337, 30, KITCHEN);
    const r = newRound(scene);
    startRound(r, 0);
    const hits = hitTargets(scene);
    expect(hits.length).toBe(5);
    expect(promptCounts(r)).toEqual([{ family: 'spot', icon: 'ui_spot', total: 5, remaining: 5 }]);
    // a point clear of every circle inside the image → wrong tap
    let miss: { x: number; y: number } | null = null;
    for (let y = 120; y < SPOT_H - 100 && !miss; y += 50) {
      for (let x = 120; x < SPOT_W - 100 && !miss; x += 50) {
        if (hits.every((h) => (h.x - x) ** 2 + (h.y - y) ** 2 > (h.hitRadius + 5) ** 2))
          miss = { x, y };
      }
    }
    expect(miss).not.toBeNull();
    expect(applyTap(r, miss!.x, miss!.y, 1)).toMatchObject({
      kind: 'wrong',
      object: null,
      hearts: 2,
    });
    for (let i = 0; i < 4; i++) {
      expect(applyTap(r, hits[i]!.x, hits[i]!.y, 2 + i)).toMatchObject({
        kind: 'correct',
        remaining: 4 - i,
        won: false,
      });
    }
    expect(applyTap(r, hits[0]!.x, hits[0]!.y, 9)).toMatchObject({ kind: 'already' });
    expect(applyTap(r, hits[4]!.x, hits[4]!.y, 10)).toMatchObject({
      kind: 'correct',
      remaining: 0,
      won: true,
    });
    expect(promptCounts(r)[0]!.remaining).toBe(0);
  });
});
