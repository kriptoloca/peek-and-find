import type { GenRect, Placed } from './types';

export function dist2(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

/** Square AABB approximation of a sprite: side = size, centered. */
export function aabb(o: { x: number; y: number; size: number }): GenRect {
  const half = o.size / 2;
  return { x: o.x - half, y: o.y - half, w: o.size, h: o.size };
}

export function overlapArea(a: GenRect, b: GenRect): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

/**
 * Visible fraction of `o` given everything drawn on top of it (higher z). Pairwise overlap sum
 * capped at 1 (GENERATOR.md §4 step 7). Objects with equal z do not occlude each other.
 */
export function visibleFraction(
  o: { x: number; y: number; size: number; z: number },
  others: readonly Placed[],
  skipId?: string,
): number {
  const box = aabb(o);
  const area = box.w * box.h;
  if (area <= 0) return 1;
  let covered = 0;
  for (const p of others) {
    if (p.id === skipId) continue;
    if (p.z <= o.z) continue;
    covered += overlapArea(box, aabb(p));
    if (covered >= area) return 0;
  }
  return 1 - covered / area;
}

export function rectContainsPoint(r: GenRect, x: number, y: number): boolean {
  return x >= r.x && y >= r.y && x <= r.x + r.w && y <= r.y + r.h;
}

export function rectInside(inner: GenRect, outer: GenRect, tolerance = 0): boolean {
  return (
    inner.x >= outer.x - tolerance &&
    inner.y >= outer.y - tolerance &&
    inner.x + inner.w <= outer.x + outer.w + tolerance &&
    inner.y + inner.h <= outer.y + outer.h + tolerance
  );
}
