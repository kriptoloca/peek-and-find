// Pure color helpers for the asset pipeline (hex/rgb() parsing, HSL rotation).
// No dependencies; unit-tested from tests/pipeline.

/** @typedef {{ r: number, g: number, b: number }} Rgb */
/** @typedef {{ h: number, s: number, l: number }} Hsl */

const HEX3 = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i;
const HEX6 = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;
const RGB = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i;

/**
 * Parses `#rgb`, `#rrggbb` and `rgb(r, g, b)`. Anything else (none, url(#id), currentColor,
 * named colors, rgba) returns null and is left untouched by the recolor pass.
 * @param {string} value
 * @returns {Rgb | null}
 */
export function parseColor(value) {
  const v = value.trim();
  let m = HEX6.exec(v);
  if (m) return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
  m = HEX3.exec(v);
  if (m) {
    return {
      r: parseInt(m[1] + m[1], 16),
      g: parseInt(m[2] + m[2], 16),
      b: parseInt(m[3] + m[3], 16),
    };
  }
  m = RGB.exec(v);
  if (m) {
    const c = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (c.some((x) => x > 255)) return null;
    return { r: c[0], g: c[1], b: c[2] };
  }
  return null;
}

/**
 * @param {Rgb} rgb
 * @returns {string} lowercase `#rrggbb`
 */
export function toHex(rgb) {
  const h = (n) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, '0');
  return `#${h(rgb.r)}${h(rgb.g)}${h(rgb.b)}`;
}

/**
 * @param {number} int 0xRRGGBB
 * @returns {string}
 */
export function intToHex(int) {
  return toHex({ r: (int >> 16) & 0xff, g: (int >> 8) & 0xff, b: int & 0xff });
}

/**
 * @param {Rgb} rgb
 * @returns {Hsl} h in degrees [0, 360), s and l in [0, 1]
 */
export function rgbToHsl({ r, g, b }) {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === rr) h = ((gg - bb) / d + (gg < bb ? 6 : 0)) * 60;
  else if (max === gg) h = ((bb - rr) / d + 2) * 60;
  else h = ((rr - gg) / d + 4) * 60;
  return { h: h % 360, s, l };
}

/**
 * @param {Hsl} hsl
 * @returns {Rgb} rounded to integers
 */
export function hslToRgb({ h, s, l }) {
  const hue = ((h % 360) + 360) % 360;
  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const hh = hue / 360;
  return {
    r: Math.round(f(hh + 1 / 3) * 255),
    g: Math.round(f(hh) * 255),
    b: Math.round(f(hh - 1 / 3) * 255),
  };
}

/**
 * Rotates the hue of a color by `degrees`, keeping saturation and lightness.
 * @param {string} value any value parseColor accepts
 * @param {number} degrees
 * @returns {string | null} `#rrggbb`, or null when the value is not a plain color
 */
export function rotateHue(value, degrees) {
  const rgb = parseColor(value);
  if (!rgb) return null;
  const hsl = rgbToHsl(rgb);
  return toHex(hslToRgb({ h: hsl.h + degrees, s: hsl.s, l: hsl.l }));
}

/**
 * Heuristic used when a pack has no `fill-main` classes (ASSETS.md recolor pipeline): a fill is
 * a "main" fill when it is clearly colored and neither an outline-dark nor a highlight-light.
 * Saturated shadows rotate with the main fill, which keeps the shading coherent.
 * @param {Rgb} rgb
 * @param {{ minSat?: number, minLight?: number, maxLight?: number }} [opts]
 */
export function isMainColor(rgb, opts = {}) {
  const { minSat = 0.2, minLight = 0.12, maxLight = 0.9 } = opts;
  const { s, l } = rgbToHsl(rgb);
  return s >= minSat && l >= minLight && l <= maxLight;
}

/**
 * Lightness scale helper for the placeholders (outline = darker, highlight = lighter).
 * @param {string} hex
 * @param {number} factor multiplies lightness (0.6 = darker, 1.3 = lighter)
 */
export function scaleLightness(hex, factor) {
  const rgb = parseColor(hex);
  if (!rgb) return hex;
  const hsl = rgbToHsl(rgb);
  return toHex(hslToRgb({ h: hsl.h, s: hsl.s, l: Math.max(0, Math.min(1, hsl.l * factor)) }));
}
