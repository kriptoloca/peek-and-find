// Rendered sprite frames and the pixel metrics the asset gates use (scripts/assets.mjs,
// tests/pipeline). Pure functions over raw RGBA buffers plus one sharp render helper.
import sharp from 'sharp';
import { contrastRatio } from './color.mjs';

/** A color variant must change at least this share of the sprite's pixels noticeably. */
export const VARIANT_MIN_CHANGED = 0.08;
export const VARIANT_PIXEL_DELTA = 24;
/**
 * At least SPRITE_CONTRAST_MIN_SHARE of every base sprite's visible area must reach
 * SPRITE_BG_MIN_CONTRAST (WCAG ratio, 3:1 is the minimum for graphics) against the mean color
 * of its theme background, so no object hides by darkness alone and the search stays fair for
 * color-blind players (docs/visual-review.md). Outlines and shading may be darker; the body
 * must stand out.
 */
export const SPRITE_BG_MIN_CONTRAST = 3;
export const SPRITE_CONTRAST_MIN_SHARE = 0.35;
/**
 * A flippable sprite must change at least this share of its pixels when mirrored, or a mirror
 * decoy / Spot flip is an invisible difference (audit 2026-10-17).
 */
export const MIRROR_MIN_CHANGED = 0.08;

/** Longest side of the SVG's intrinsic box (viewBox first, then width/height). */
export function svgLongestSide(svg) {
  const vb = /viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)\s*["']/.exec(
    svg,
  );
  if (vb) return Math.max(Number(vb[1]), Number(vb[2]));
  const w = /\swidth\s*=\s*["']([\d.]+)/.exec(svg);
  const h = /\sheight\s*=\s*["']([\d.]+)/.exec(svg);
  if (w && h) return Math.max(Number(w[1]), Number(h[1]));
  return 256;
}

/**
 * Renders an SVG so its longest side is `size` px, then crops to the opaque bounding box.
 * @returns {Promise<{ w: number, h: number, data: Buffer }>} raw RGBA
 */
export async function renderSvg(svg, size, { trim }) {
  const density = Math.max(1, Math.min(2400, (72 * size) / svgLongestSide(svg)));
  const { data, info } = await sharp(Buffer.from(svg), { density })
    .resize(size, size, { fit: 'inside', withoutEnlargement: false })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (!trim) return { w: info.width, h: info.height, data };
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return { w: 1, h: 1, data: Buffer.alloc(4) };
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    const srcStart = ((y + minY) * info.width + minX) * 4;
    data.copy(out, y * w * 4, srcStart, srcStart + w * 4);
  }
  return { w, h, data: out };
}

/**
 * Alpha-weighted share of a rendered frame's visible pixels whose contrast against `bg` is at
 * least SPRITE_BG_MIN_CONTRAST.
 * @param {{ data: Buffer }} frame
 * @param {{ r: number, g: number, b: number }} bg
 * @returns {number} 0..1
 */
export function contrastShare(frame, bg) {
  let w = 0;
  let ok = 0;
  for (let i = 0; i < frame.data.length; i += 4) {
    const a = frame.data[i + 3] / 255;
    if (a === 0) continue;
    w += a;
    const px = { r: frame.data[i], g: frame.data[i + 1], b: frame.data[i + 2] };
    if (contrastRatio(px, bg) >= SPRITE_BG_MIN_CONTRAST) ok += a;
  }
  return w === 0 ? 0 : ok / w;
}

/**
 * Share of pixels (opaque in either frame) whose color differs noticeably. Frames of different
 * size count as fully different (the silhouette changed).
 * @returns {number} 0..1
 */
export function frameDifference(a, b) {
  if (a.w !== b.w || a.h !== b.h) return 1;
  let opaque = 0;
  let changed = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    if (a.data[i + 3] === 0 && b.data[i + 3] === 0) continue;
    opaque += 1;
    const d = Math.max(
      Math.abs(a.data[i] - b.data[i]),
      Math.abs(a.data[i + 1] - b.data[i + 1]),
      Math.abs(a.data[i + 2] - b.data[i + 2]),
      Math.abs(a.data[i + 3] - b.data[i + 3]),
    );
    if (d > VARIANT_PIXEL_DELTA) changed += 1;
  }
  return opaque === 0 ? 0 : changed / opaque;
}

/**
 * Share of pixels (opaque in the frame or its mirror image) that differ noticeably between the
 * frame and its horizontal mirror: 0 for a symmetric sprite.
 * @param {{ w: number, h: number, data: Buffer }} a
 * @returns {number} 0..1
 */
export function mirrorDifference(a) {
  let opaque = 0;
  let changed = 0;
  for (let y = 0; y < a.h; y++) {
    for (let x = 0; x < a.w; x++) {
      const i = (y * a.w + x) * 4;
      const j = (y * a.w + (a.w - 1 - x)) * 4;
      if (a.data[i + 3] === 0 && a.data[j + 3] === 0) continue;
      opaque += 1;
      const d = Math.max(
        Math.abs(a.data[i] - a.data[j]),
        Math.abs(a.data[i + 1] - a.data[j + 1]),
        Math.abs(a.data[i + 2] - a.data[j + 2]),
        Math.abs(a.data[i + 3] - a.data[j + 3]),
      );
      if (d > VARIANT_PIXEL_DELTA) changed += 1;
    }
  }
  return opaque === 0 ? 0 : changed / opaque;
}
