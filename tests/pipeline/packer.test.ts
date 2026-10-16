import { describe, expect, it } from 'vitest';
import { ATLAS_SIZES, overlaps, packFrames } from '../../scripts/lib/packer.mjs';

function frames(n: number, seed = 7): { name: string; w: number; h: number }[] {
  const out = [];
  let s = seed;
  for (let i = 0; i < n; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const w = 40 + (s % 180);
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const h = 40 + (s % 180);
    out.push({ name: `f${String(i)}`, w, h });
  }
  return out;
}

describe('packFrames', () => {
  it('places every frame inside the atlas with the padding and no overlaps', () => {
    const input = frames(124);
    const pad = 2;
    const r = packFrames(input, { maxSize: 2048, padding: pad });
    expect(r).not.toBeNull();
    const placed = r!.placed;
    expect(placed).toHaveLength(input.length);
    for (const p of placed) {
      expect(p.x).toBeGreaterThanOrEqual(pad);
      expect(p.y).toBeGreaterThanOrEqual(pad);
      expect(p.x + p.w + pad).toBeLessThanOrEqual(r!.width);
      expect(p.y + p.h + pad).toBeLessThanOrEqual(r!.height);
      const src = input.find((f) => f.name === p.name)!;
      expect([p.w, p.h]).toEqual([src.w, src.h]);
    }
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const a = placed[i]!;
        const b = placed[j]!;
        // grow a by the padding: b must stay clear of it
        expect(
          overlaps({ x: a.x - pad, y: a.y - pad, w: a.w + 2 * pad, h: a.h + 2 * pad }, b),
        ).toBe(false);
      }
    }
  });

  it('is deterministic and independent of input order', () => {
    const input = frames(60, 3);
    const a = packFrames(input)!;
    const b = packFrames([...input].reverse())!;
    expect(a.width).toBe(b.width);
    expect(a.height).toBe(b.height);
    expect(a.placed).toEqual(b.placed);
  });

  it('picks the smallest candidate size that fits', () => {
    const small = packFrames([{ name: 'a', w: 100, h: 100 }])!;
    expect([small.width, small.height]).toEqual(ATLAS_SIZES[0]);
    const big = packFrames(frames(124))!;
    expect(big.width * big.height).toBeGreaterThan(small.width * small.height);
  });

  it('returns null when the frames cannot fit', () => {
    expect(packFrames([{ name: 'huge', w: 3000, h: 10 }])).toBeNull();
    const many = Array.from({ length: 200 }, (_, i) => ({ name: `m${String(i)}`, w: 256, h: 256 }));
    expect(packFrames(many, { maxSize: 2048 })).toBeNull();
  });
});
