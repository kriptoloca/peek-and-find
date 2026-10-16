// Deterministic MaxRects packer (best short side fit) for the texture atlases.
// Pure: no I/O, no randomness. Unit-tested from tests/pipeline/packer.test.ts.

/** @typedef {{ name: string, w: number, h: number }} Frame */
/** @typedef {{ x: number, y: number, w: number, h: number }} Rect */
/** @typedef {{ name: string, x: number, y: number, w: number, h: number }} Placed */

/** Atlas sizes tried in order (smallest first). Power-of-two keeps mipmaps available. */
export const ATLAS_SIZES = [
  [256, 256],
  [512, 256],
  [512, 512],
  [1024, 512],
  [1024, 1024],
  [2048, 1024],
  [2048, 2048],
];

/**
 * @param {Rect} a
 * @param {Rect} b
 */
export function overlaps(a, b) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

function contains(outer, inner) {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.w <= outer.x + outer.w &&
    inner.y + inner.h <= outer.y + outer.h
  );
}

/**
 * Largest side first, then area, then name: a stable order that packs well and never depends on
 * input order.
 * @param {Frame} a
 * @param {Frame} b
 */
function byPackOrder(a, b) {
  const da = Math.max(a.w, a.h) - Math.max(b.w, b.h);
  if (da !== 0) return -da;
  const area = a.w * a.h - b.w * b.h;
  if (area !== 0) return -area;
  return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
}

/**
 * Drops free rects contained in another one; identical duplicates keep their first occurrence.
 * @param {Rect[]} rects
 * @returns {Rect[]}
 */
function prune(rects) {
  /** @type {Rect[]} */
  const out = [];
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i];
    let drop = false;
    for (let j = 0; j < rects.length; j++) {
      if (i === j) continue;
      const o = rects[j];
      if (!contains(o, r)) continue;
      const same = o.x === r.x && o.y === r.y && o.w === r.w && o.h === r.h;
      if (!same || j < i) {
        drop = true;
        break;
      }
    }
    if (!drop) out.push(r);
  }
  return out;
}

/**
 * Tries to place every frame into a W×H bin with `pad` pixels between frames and to the edges.
 * @param {Frame[]} frames already sorted
 * @param {number} W
 * @param {number} H
 * @param {number} pad
 * @returns {Placed[] | null}
 */
function tryPack(frames, W, H, pad) {
  /** @type {Rect[]} */
  let free = [{ x: pad, y: pad, w: W - pad, h: H - pad }];
  /** @type {Placed[]} */
  const placed = [];
  for (const f of frames) {
    const w = f.w + pad;
    const h = f.h + pad;
    let best = null;
    for (const fr of free) {
      if (w > fr.w || h > fr.h) continue;
      const ss = Math.min(fr.w - w, fr.h - h);
      const ls = Math.max(fr.w - w, fr.h - h);
      if (
        !best ||
        ss < best.ss ||
        (ss === best.ss && ls < best.ls) ||
        (ss === best.ss &&
          ls === best.ls &&
          (fr.y < best.fr.y || (fr.y === best.fr.y && fr.x < best.fr.x)))
      ) {
        best = { fr, ss, ls };
      }
    }
    if (!best) return null;
    const node = { x: best.fr.x, y: best.fr.y, w, h };
    placed.push({ name: f.name, x: node.x, y: node.y, w: f.w, h: f.h });
    /** @type {Rect[]} */
    const next = [];
    for (const fr of free) {
      if (!overlaps(fr, node)) {
        next.push(fr);
        continue;
      }
      if (node.x > fr.x) next.push({ x: fr.x, y: fr.y, w: node.x - fr.x, h: fr.h });
      if (node.x + node.w < fr.x + fr.w) {
        next.push({ x: node.x + node.w, y: fr.y, w: fr.x + fr.w - (node.x + node.w), h: fr.h });
      }
      if (node.y > fr.y) next.push({ x: fr.x, y: fr.y, w: fr.w, h: node.y - fr.y });
      if (node.y + node.h < fr.y + fr.h) {
        next.push({ x: fr.x, y: node.y + node.h, w: fr.w, h: fr.y + fr.h - (node.y + node.h) });
      }
    }
    free = prune(next);
  }
  return placed;
}

/**
 * Packs frames into the smallest candidate atlas that fits.
 * @param {Frame[]} frames
 * @param {{ maxSize?: number, padding?: number, sizes?: number[][] }} [opts]
 * @returns {{ width: number, height: number, placed: Placed[] } | null}
 */
export function packFrames(frames, opts = {}) {
  const { maxSize = 2048, padding = 2, sizes = ATLAS_SIZES } = opts;
  const sorted = [...frames].sort(byPackOrder);
  const area = sorted.reduce((s, f) => s + (f.w + padding) * (f.h + padding), 0);
  for (const [w, h] of sizes) {
    if (w > maxSize || h > maxSize) continue;
    if (w * h < area) continue;
    const placed = tryPack(sorted, w, h, padding);
    if (placed) return { width: w, height: h, placed };
  }
  return null;
}
