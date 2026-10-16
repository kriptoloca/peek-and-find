import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { THEMES } from '../../src/data/themes';
import uiFrames from '../../src/data/ui-frames.json';
import { UI } from '../../src/game/ui-keys';
import {
  expectedFrames,
  loadThemes,
  loadUiFrames,
  spriteSpecs,
  uiSpecs,
} from '../../scripts/lib/manifest.mjs';
import {
  SHAPES,
  placeholderBackground,
  placeholderSprite,
  placeholderUi,
} from '../../scripts/lib/placeholder-svg.mjs';
import { hasMainClass, recolorSvg } from '../../scripts/lib/recolor.mjs';

const ROOT = new URL('../../', import.meta.url);

describe('asset manifest', () => {
  it('themes.json drives both the game and the pipeline', () => {
    const json = loadThemes(ROOT);
    expect(json.map((t) => t.id)).toEqual(THEMES.map((t) => t.id));
    for (const t of json) {
      expect(t.families).toHaveLength(12);
      expect(t.singletons).toHaveLength(4);
      expect(spriteSpecs(t)).toHaveLength(40);
      expect(expectedFrames(t)).toHaveLength(12 * 3 * 3 + 4);
      const game = THEMES.find((x) => x.id === t.id)!;
      const gameFrames = game.families.flatMap((f) =>
        f.variants.flatMap((v) => [
          v,
          ...Array.from({ length: f.colors }, (_, i) => `${v}_c${String(i + 1)}`),
        ]),
      );
      expect(new Set(gameFrames)).toEqual(new Set(expectedFrames(t)));
    }
  });

  it('ui-frames.json matches the UI keys used by the game', () => {
    const fromJson = uiSpecs(loadUiFrames(ROOT)).map((s) => s.frame);
    expect(new Set(fromJson)).toEqual(new Set(Object.values(UI)));
    expect(uiFrames.frames).toHaveLength(Object.keys(UI).length);
  });

  it('placeholder sprites follow the input contract: fill-main class, recolorable, one per shape', () => {
    for (let i = 0; i < SHAPES.length; i++) {
      for (const variant of ['a', 'b', 'c']) {
        const svg = placeholderSprite({ shapeIndex: i, variant, tags: ['flippable'] }, 0);
        expect(svg.startsWith('<svg')).toBe(true);
        expect(hasMainClass(svg)).toBe(true);
        expect(recolorSvg(svg, 25).recolored).toBe(1);
        expect(svg).not.toMatch(/<text/);
      }
    }
    expect(placeholderBackground({ id: 'kitchen', paletteShift: 0 })).toContain(
      'viewBox="0 0 1080 1080"',
    );
    for (const name of uiFrames.frames) expect(placeholderUi(name)).toContain('<svg');
  });

  it('committed atlases are complete and match the frame lists', () => {
    const indexPath = new URL('public/atlases/index.json', ROOT);
    expect(existsSync(indexPath)).toBe(true);
    const index = JSON.parse(readFileSync(indexPath, 'utf8')) as {
      themes: Record<
        string,
        { data: string; atlas: string; background: string; backgroundSpot: string }
      >;
      ui: { data: string; atlas: string };
    };
    for (const t of loadThemes(ROOT)) {
      const entry = index.themes[t.id];
      expect(entry, `index entry for ${t.id}`).toBeDefined();
      const atlas = JSON.parse(readFileSync(new URL(`public/${entry!.data}`, ROOT), 'utf8')) as {
        frames: Record<string, unknown>;
      };
      expect(new Set(Object.keys(atlas.frames))).toEqual(new Set(expectedFrames(t)));
      for (const f of [entry!.atlas, entry!.background, entry!.backgroundSpot]) {
        expect(existsSync(new URL(`public/${f}`, ROOT)), f).toBe(true);
      }
    }
    const ui = JSON.parse(readFileSync(new URL(`public/${index.ui.data}`, ROOT), 'utf8')) as {
      frames: Record<string, unknown>;
    };
    expect(new Set(Object.keys(ui.frames))).toEqual(new Set(Object.values(UI)));
  });
});
