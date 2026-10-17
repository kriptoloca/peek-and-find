/**
 * Pure color math for the frame: the canvas outside the scene (HUD bands or columns). Each
 * theme tints it with its own hue, deep and quiet, so the whole screen changes mood with the
 * theme while the HUD keeps its place and contrast (docs/visual-review.md). No Phaser import:
 * unit-tested and shared with the dev state.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface Hsl {
  /** Degrees [0, 360). */
  h: number;
  s: number;
  l: number;
}

/** Title and boot frame: neutral navy, the only screens without a theme. */
export const TITLE_FRAME = 0x1b1f2a;
/** Frame tint: the theme hue at low saturation, darker than the placeholder background. */
export const FRAME_SAT = 0.22;
export const FRAME_LIGHT = 0.095;
/** HUD text is white; the frame must keep at least this contrast against it (WCAG AA large). */
export const FRAME_TEXT_MIN_CONTRAST = 7;

export function intToRgb(color: number): Rgb {
  return { r: (color >> 16) & 0xff, g: (color >> 8) & 0xff, b: color & 0xff };
}

export function rgbToInt({ r, g, b }: Rgb): number {
  return (r << 16) | (g << 8) | b;
}

export function hexOf(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rr) h = ((gg - bb) / d + (gg < bb ? 6 : 0)) * 60;
  else if (max === gg) h = ((bb - rr) / d + 2) * 60;
  else h = ((rr - gg) / d + 4) * 60;
  return { h: h % 360, s, l };
}

export function hslToRgb({ h, s, l }: Hsl): Rgb {
  const hue = ((h % 360) + 360) % 360;
  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t: number): number => {
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

/** WCAG relative luminance, 0 (black) .. 1 (white). */
export function relativeLuminance(color: number): number {
  const lin = (c: number): number => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const { r, g, b } = intToRgb(color);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast ratio, 1 (equal) .. 21 (black on white). */
export function contrastRatio(a: number, b: number): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Frame color of a theme from its palette tone: same hue, FRAME_SAT, FRAME_LIGHT. */
export function frameColorFor(tone: number): number {
  const { h } = rgbToHsl(intToRgb(tone));
  return rgbToInt(hslToRgb({ h, s: FRAME_SAT, l: FRAME_LIGHT }));
}
