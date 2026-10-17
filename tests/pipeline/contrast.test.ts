import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { PALETTE as GAME_PALETTE, THEMES } from '../../src/data/themes';
import {
  contrastRatio,
  intToHex,
  maxChannelDelta,
  parseColor,
  relativeLuminance,
} from '../../scripts/lib/color.mjs';
import { loadThemes } from '../../scripts/lib/manifest.mjs';
import { PALETTE, placeholderBackground } from '../../scripts/lib/placeholder-svg.mjs';

const ROOT = new URL('../../', import.meta.url);
/** Same floor as scripts/assets.mjs SPRITE_BG_MIN_CONTRAST (WCAG minimum for graphics). */
const MIN_CONTRAST = 3;

describe('sprite / background contrast (docs/visual-review.md)', () => {
  it('the game and the pipeline share one palette', () => {
    expect([...PALETTE]).toEqual([...GAME_PALETTE]);
    expect(THEMES.map((t) => t.tone)).toEqual(
      loadThemes(ROOT).map((t) => PALETTE[t.paletteShift % PALETTE.length]),
    );
  });

  it('every family color keeps ≥ 3:1 against its theme placeholder background', async () => {
    for (const t of loadThemes(ROOT)) {
      const svg = Buffer.from(placeholderBackground(t));
      const st = await sharp(svg).resize(64, 64).removeAlpha().stats();
      const [r, g, b] = st.channels.map((c) => c.mean) as [number, number, number];
      const bg = { r, g, b };
      const fams = [...t.families, ...t.singletons];
      fams.forEach((f, i) => {
        const hex = intToHex(PALETTE[(i + t.paletteShift) % PALETTE.length] as number);
        const ratio = contrastRatio(parseColor(hex)!, bg);
        expect(ratio, `${t.id}/${f.id} ${hex}`).toBeGreaterThanOrEqual(MIN_CONTRAST);
      });
    }
  });

  it('contrast helpers follow WCAG', () => {
    expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 5);
    expect(contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 })).toBeCloseTo(21, 5);
    // the lifted dark colors stay apart from their neighbours (a palette is 16 distinct fills)
    const rgb = (hex: string): { r: number; g: number; b: number } => {
      const c = parseColor(hex);
      if (!c) throw new Error(hex);
      return c;
    };
    const p = (k: number): string => intToHex(PALETTE[k] as number);
    expect(maxChannelDelta(rgb(p(3)), rgb(p(0)))).toBeGreaterThanOrEqual(40); // red vs orange
    expect(maxChannelDelta(rgb(p(1)), rgb(p(13)))).toBeGreaterThanOrEqual(40); // teal vs blue
  });
});
