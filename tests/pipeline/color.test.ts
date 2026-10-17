import { describe, expect, it } from 'vitest';
import {
  hslToRgb,
  isMainColor,
  parseColor,
  rgbToHsl,
  rotateHue,
  scaleLightness,
  toHex,
  variantColor,
} from '../../scripts/lib/color.mjs';

describe('color', () => {
  it('parses hex and rgb() forms and rejects everything else', () => {
    expect(parseColor('#e76f51')).toEqual({ r: 0xe7, g: 0x6f, b: 0x51 });
    expect(parseColor('#E76F51')).toEqual({ r: 0xe7, g: 0x6f, b: 0x51 });
    expect(parseColor('#fa0')).toEqual({ r: 0xff, g: 0xaa, b: 0 });
    expect(parseColor('rgb(10, 20, 30)')).toEqual({ r: 10, g: 20, b: 30 });
    expect(parseColor('none')).toBeNull();
    expect(parseColor('url(#grad)')).toBeNull();
    expect(parseColor('currentColor')).toBeNull();
    expect(parseColor('rgba(1,2,3,0.5)')).toBeNull();
    expect(parseColor('rgb(300,0,0)')).toBeNull();
  });

  it('round-trips rgb ↔ hsl within rounding', () => {
    for (const hex of [
      '#e76f51',
      '#264653',
      '#f2c14e',
      '#2a9d8f',
      '#8ecae6',
      '#000000',
      '#ffffff',
    ]) {
      const rgb = parseColor(hex);
      expect(rgb).not.toBeNull();
      expect(toHex(hslToRgb(rgbToHsl(rgb!)))).toBe(hex);
    }
  });

  it('rotates hue by the given degrees and back', () => {
    const red = '#ff0000';
    expect(rotateHue(red, 120)).toBe('#00ff00');
    expect(rotateHue(red, 240)).toBe('#0000ff');
    expect(rotateHue(red, 360)).toBe(red);
    const once = rotateHue('#e76f51', 25);
    expect(once).not.toBe('#e76f51');
    const back = rotateHue(once!, -25);
    const a = parseColor(back!)!;
    const b = parseColor('#e76f51')!;
    expect(Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b)).toBeLessThanOrEqual(3);
  });

  it('keeps lightness and saturation when rotating', () => {
    const before = rgbToHsl(parseColor('#2a9d8f')!);
    const after = rgbToHsl(parseColor(rotateHue('#2a9d8f', -25)!)!);
    expect(after.l).toBeCloseTo(before.l, 1);
    expect(after.s).toBeCloseTo(before.s, 1);
    expect(((after.h - before.h + 360) % 360) - 335).toBeLessThan(2);
  });

  it('returns null for values that are not plain colors', () => {
    expect(rotateHue('none', 25)).toBeNull();
    expect(rotateHue('url(#g)', 25)).toBeNull();
  });

  it('isMainColor accepts saturated mid tones and rejects outlines and highlights', () => {
    expect(isMainColor(parseColor('#e76f51')!)).toBe(true);
    expect(isMainColor(parseColor('#2a9d8f')!)).toBe(true);
    expect(isMainColor(parseColor('#111111')!)).toBe(false); // outline-dark
    expect(isMainColor(parseColor('#f8f8f8')!)).toBe(false); // highlight-light
    expect(isMainColor(parseColor('#808080')!)).toBe(false); // gray shadow
  });

  it('scaleLightness darkens and lightens', () => {
    const base = rgbToHsl(parseColor('#e76f51')!);
    expect(rgbToHsl(parseColor(scaleLightness('#e76f51', 0.5))!).l).toBeLessThan(base.l);
    expect(rgbToHsl(parseColor(scaleLightness('#e76f51', 1.3))!).l).toBeGreaterThan(base.l);
  });

  it('variantColor always yields a visibly different color, greys included', () => {
    const far = (a: string, b: string): number => {
      const x = parseColor(a)!;
      const y = parseColor(b)!;
      return Math.max(Math.abs(x.r - y.r), Math.abs(x.g - y.g), Math.abs(x.b - y.b));
    };
    for (const hex of [
      '#a8a8a8',
      '#b5b5b5',
      '#f4f1de',
      '#264653',
      '#e76f51',
      '#2a9d8f',
      '#ffffff',
      '#101010',
    ]) {
      const c1 = variantColor(hex, 25)!;
      const c2 = variantColor(hex, -25)!;
      expect(far(hex, c1), `${hex} → ${c1}`).toBeGreaterThanOrEqual(48);
      expect(far(hex, c2), `${hex} → ${c2}`).toBeGreaterThanOrEqual(48);
      expect(far(c1, c2), `${c1} vs ${c2}`).toBeGreaterThanOrEqual(30);
    }
    expect(variantColor('#e76f51', 25)).toBe(rotateHue('#e76f51', 25)); // saturated: plain rotation
    expect(variantColor('#5aa469', -25)).not.toBe(rotateHue('#5aa469', -25)); // dull: pushed further
    expect(variantColor('none', 25)).toBeNull();
  });
});
