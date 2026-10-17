import { describe, expect, it } from 'vitest';
import { THEMES } from '../src/data/themes';
import {
  FRAME_TEXT_MIN_CONTRAST,
  TITLE_FRAME,
  contrastRatio,
  frameColorFor,
  hexOf,
  intToRgb,
  relativeLuminance,
  rgbToHsl,
} from '../src/game/frame-color';

describe('frame color', () => {
  it('WCAG helpers: black on white is 21:1, equal colors 1:1', () => {
    expect(contrastRatio(0xffffff, 0x000000)).toBeCloseTo(21, 5);
    expect(contrastRatio(0x1b1f2a, 0x1b1f2a)).toBe(1);
    expect(relativeLuminance(0xffffff)).toBeCloseTo(1, 5);
    expect(hexOf(0x1b1f2a)).toBe('#1b1f2a');
  });

  it('every theme gets its own deep frame that keeps white HUD text readable', () => {
    const seen = new Set<number>();
    for (const t of THEMES) {
      const frame = frameColorFor(t.tone);
      seen.add(frame);
      // same hue as the theme tone (within rounding), darker than the title navy's lightness
      const hTone = rgbToHsl(intToRgb(t.tone)).h;
      const hFrame = rgbToHsl(intToRgb(frame)).h;
      const dh = Math.min(Math.abs(hTone - hFrame), 360 - Math.abs(hTone - hFrame));
      expect(dh, t.id).toBeLessThan(4);
      expect(relativeLuminance(frame), t.id).toBeLessThan(0.03);
      expect(contrastRatio(frame, 0xffffff), t.id).toBeGreaterThanOrEqual(FRAME_TEXT_MIN_CONTRAST);
      expect(frame).not.toBe(TITLE_FRAME);
    }
    expect(seen.size).toBe(THEMES.length);
    expect(contrastRatio(TITLE_FRAME, 0xffffff)).toBeGreaterThanOrEqual(FRAME_TEXT_MIN_CONTRAST);
  });

  it('is deterministic', () => {
    expect(frameColorFor(0xe76f51)).toBe(frameColorFor(0xe76f51));
  });
});
