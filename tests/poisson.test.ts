import { describe, expect, it } from 'vitest';
import { poissonDisc } from '../src/gen/poisson';
import { Rng } from '../src/gen/rng';

const RECT = { x: 100, y: 100, w: 880, h: 880 };

describe('poissonDisc', () => {
  it('keeps every point inside the rect and at least minDist apart', () => {
    for (const r of [150, 120, 95, 80]) {
      const pts = poissonDisc(new Rng(42 + r), RECT, r);
      for (const p of pts) {
        expect(p.x).toBeGreaterThanOrEqual(RECT.x);
        expect(p.y).toBeGreaterThanOrEqual(RECT.y);
        expect(p.x).toBeLessThan(RECT.x + RECT.w);
        expect(p.y).toBeLessThan(RECT.y + RECT.h);
      }
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i]!.x - pts[j]!.x;
          const dy = pts[i]!.y - pts[j]!.y;
          expect(dx * dx + dy * dy).toBeGreaterThanOrEqual(r * r - 1e-6);
        }
      }
    }
  });

  it('produces enough slots for every difficulty column', () => {
    // objectCount 12 / 24 / 42 / 60 and the big-scene cap 78 at spacing 80.
    expect(poissonDisc(new Rng(1), RECT, 150).length).toBeGreaterThanOrEqual(16);
    expect(poissonDisc(new Rng(1), RECT, 120).length).toBeGreaterThanOrEqual(30);
    expect(poissonDisc(new Rng(1), RECT, 95).length).toBeGreaterThanOrEqual(50);
    expect(poissonDisc(new Rng(1), RECT, 80).length).toBeGreaterThanOrEqual(72);
  });

  it('is deterministic for a seed', () => {
    const a = poissonDisc(new Rng(77), RECT, 100);
    const b = poissonDisc(new Rng(77), RECT, 100);
    expect(a).toEqual(b);
    expect(poissonDisc(new Rng(78), RECT, 100)).not.toEqual(a);
  });
});
