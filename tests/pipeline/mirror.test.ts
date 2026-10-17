import { describe, expect, it } from 'vitest';
import { MIRROR_MIN_CHANGED, mirrorDifference, renderSvg } from '../../scripts/lib/frames.mjs';
import { loadThemes, spriteSpecs } from '../../scripts/lib/manifest.mjs';
import { placeholderSprite } from '../../scripts/lib/placeholder-svg.mjs';

const ROOT = new URL('../../', import.meta.url);

/**
 * Audit 2026-10-17: a mirror decoy or a Spot "flip" is invisible when the sprite is symmetric.
 * Every flippable placeholder must change ≥ 8 % of its pixels when mirrored; the pipeline holds
 * the real pack to the same rule (scripts/assets.mjs).
 */
describe('mirror difference of flippable sprites', () => {
  it('every flippable placeholder sprite reads mirrored', async () => {
    for (const t of loadThemes(ROOT)) {
      for (const s of spriteSpecs(t)) {
        if (!s.tags.includes('flippable')) continue;
        const frame = await renderSvg(placeholderSprite(s, t.paletteShift), 96, { trim: true });
        expect(mirrorDifference(frame), `${t.id}/${s.file}`).toBeGreaterThanOrEqual(
          MIRROR_MIN_CHANGED,
        );
      }
    }
  });

  it('a symmetric shape without the tag is below the floor (the gate measures something)', async () => {
    const svg = placeholderSprite({ shapeIndex: 0, variant: 'a', tags: [] }, 0);
    const frame = await renderSvg(svg, 96, { trim: true });
    expect(mirrorDifference(frame)).toBeLessThan(MIRROR_MIN_CHANGED);
  });
});
