import { describe, expect, it } from 'vitest';
import {
  THEMES,
  colorFrame,
  splitFrame,
  themeForLevel,
  unlockedThemeList,
} from '../src/data/themes';
import { KITCHEN } from '../src/data/themes';
import { generateScene } from '../src/gen/scene-gen';
import { validateScene } from '../src/gen/validate';

describe('themes', () => {
  it('ships five themes of 16 families each with unique frame names', () => {
    expect(THEMES.map((t) => t.id)).toEqual(['kitchen', 'beach', 'city', 'forest', 'space']);
    const frames = new Set<string>();
    for (const t of THEMES) {
      expect(t.families.length).toBe(16);
      expect(t.families.filter((f) => f.colors > 0).length).toBe(12);
      for (const f of t.families) {
        for (const v of f.variants) {
          expect(v.startsWith(`${t.id}_${f.id}_`)).toBe(true);
          expect(frames.has(v)).toBe(false);
          frames.add(v);
        }
      }
    }
  });

  it('rotates every 3 levels among unlocked themes; beach from level 4, then one every 10', () => {
    for (let L = 1; L <= 3; L++) expect(themeForLevel(L).id).toBe('kitchen');
    for (let L = 4; L <= 6; L++) expect(themeForLevel(L).id).toBe('beach');
    for (let L = 7; L <= 9; L++) expect(themeForLevel(L).id).toBe('kitchen');
    expect(unlockedThemeList(3).length).toBe(1);
    expect(unlockedThemeList(4).length).toBe(2);
    expect(unlockedThemeList(19).length).toBe(2);
    expect(unlockedThemeList(20).length).toBe(3);
    expect(themeForLevel(10).id).toBe('beach');
    expect(themeForLevel(13).id).toBe('kitchen');
    expect(unlockedThemeList(40).length).toBe(5);
    const seen = new Set<string>();
    for (let L = 40; L < 55; L++) seen.add(themeForLevel(L).id);
    expect(seen.size).toBe(5);
  });

  it('every theme generates valid scenes in all three modes', () => {
    for (const t of THEMES) {
      for (const [mode, level] of [
        ['find', 30],
        ['odd', 20],
        ['spot', 25],
      ] as const) {
        const scene = generateScene({ seed: 4242, level, mode, theme: t });
        expect(validateScene(scene, t)).toEqual([]);
      }
    }
  });

  it('every theme carries a palette tone (frame tint, placeholder background hue)', () => {
    for (const t of THEMES) {
      expect(t.tone).toBeGreaterThan(0);
      expect(t.tone).toBe(t.families[0]!.previewColor);
    }
  });

  it('frame helpers round-trip', () => {
    expect(colorFrame('kitchen_mug_a', 0)).toBe('kitchen_mug_a');
    expect(colorFrame('kitchen_mug_a', 2)).toBe('kitchen_mug_a_c2');
    expect(splitFrame('beach_crab_b_c1')).toEqual({ base: 'beach_crab_b', color: 1 });
    expect(splitFrame(KITCHEN.families[0]!.variants[0]!)).toEqual({
      base: 'kitchen_mug_a',
      color: 0,
    });
  });
});
