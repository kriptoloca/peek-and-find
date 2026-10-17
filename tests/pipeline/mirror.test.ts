import { describe, expect, it } from 'vitest';
import {
  MIRROR_MIN_CHANGED,
  VARIANT_MIN_CHANGED,
  frameDifference,
  mirrorDifference,
  renderSvg,
} from '../../scripts/lib/frames.mjs';
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

  it('the three variants of every family differ (a Spot swap is a visible difference)', async () => {
    for (const t of loadThemes(ROOT)) {
      const byFamily = new Map<string, { file: string; svg: string }[]>();
      for (const s of spriteSpecs(t)) {
        const fam = s.base.replace(/_[a-z]$/, '');
        const list = byFamily.get(fam) ?? [];
        list.push({ file: s.file, svg: placeholderSprite(s, t.paletteShift) });
        byFamily.set(fam, list);
      }
      for (const members of byFamily.values()) {
        const frames = await Promise.all(members.map((m) => renderSvg(m.svg, 96, { trim: true })));
        for (let i = 0; i < frames.length; i++) {
          for (let j = i + 1; j < frames.length; j++) {
            expect(
              frameDifference(frames[i]!, frames[j]!),
              `${t.id}: ${members[i]!.file} vs ${members[j]!.file}`,
            ).toBeGreaterThanOrEqual(VARIANT_MIN_CHANGED);
          }
        }
      }
    }
  });

  it('a symmetric shape without the tag is below the floor (the gate measures something)', async () => {
    const svg = placeholderSprite({ shapeIndex: 0, variant: 'a', tags: [] }, 0);
    const frame = await renderSvg(svg, 96, { trim: true });
    expect(mirrorDifference(frame)).toBeLessThan(MIRROR_MIN_CHANGED);
  });
});
