import type { GenRect, Point } from './types';
import type { Rng } from './rng';

/**
 * Bridson Poisson-disc sampling with a spatial grid (GENERATOR.md §4). Deterministic for a
 * given Rng. Candidates in the annulus [r, 2r] are produced by rejection sampling instead of
 * sin/cos so the result is identical on every JS engine.
 */
/** Uniform offset in the annulus [r, 2r] by rejection sampling (no sin/cos). */
function annulusOffset(rng: Rng, minDist: number, r2: number, r4: number): Point {
  for (;;) {
    const dx = rng.float(-2 * minDist, 2 * minDist);
    const dy = rng.float(-2 * minDist, 2 * minDist);
    const d2 = dx * dx + dy * dy;
    if (d2 >= r2 && d2 <= r4) return { x: dx, y: dy };
  }
}

export function poissonDisc(rng: Rng, rect: GenRect, minDist: number, k = 30): Point[] {
  if (minDist <= 0) throw new Error('poissonDisc: minDist must be > 0');
  const cell = minDist / Math.SQRT2;
  const gw = Math.max(1, Math.ceil(rect.w / cell));
  const gh = Math.max(1, Math.ceil(rect.h / cell));
  const grid = new Int32Array(gw * gh).fill(-1);
  const points: Point[] = [];
  const active: number[] = [];
  const r2 = minDist * minDist;
  const r4 = 4 * r2;

  const cellOf = (x: number, y: number): number => {
    const cx = Math.min(gw - 1, Math.floor((x - rect.x) / cell));
    const cy = Math.min(gh - 1, Math.floor((y - rect.y) / cell));
    return cy * gw + cx;
  };

  const farEnough = (x: number, y: number): boolean => {
    const cx = Math.min(gw - 1, Math.floor((x - rect.x) / cell));
    const cy = Math.min(gh - 1, Math.floor((y - rect.y) / cell));
    const x0 = Math.max(0, cx - 2);
    const x1 = Math.min(gw - 1, cx + 2);
    const y0 = Math.max(0, cy - 2);
    const y1 = Math.min(gh - 1, cy + 2);
    for (let yy = y0; yy <= y1; yy++) {
      for (let xx = x0; xx <= x1; xx++) {
        const idx = grid[yy * gw + xx] as number;
        if (idx < 0) continue;
        const p = points[idx] as Point;
        const dx = p.x - x;
        const dy = p.y - y;
        if (dx * dx + dy * dy < r2) return false;
      }
    }
    return true;
  };

  const add = (x: number, y: number): void => {
    const idx = points.length;
    points.push({ x, y });
    grid[cellOf(x, y)] = idx;
    active.push(idx);
  };

  add(rng.float(rect.x, rect.x + rect.w), rng.float(rect.y, rect.y + rect.h));

  while (active.length > 0) {
    const ai = rng.int(0, active.length - 1);
    const p = points[active[ai] as number] as Point;
    let found = false;
    for (let t = 0; t < k; t++) {
      const off = annulusOffset(rng, minDist, r2, r4);
      const x = p.x + off.x;
      const y = p.y + off.y;
      if (x < rect.x || y < rect.y || x >= rect.x + rect.w || y >= rect.y + rect.h) continue;
      if (farEnough(x, y)) {
        add(x, y);
        found = true;
        break;
      }
    }
    if (!found) {
      active[ai] = active[active.length - 1] as number;
      active.pop();
    }
  }
  return points;
}
