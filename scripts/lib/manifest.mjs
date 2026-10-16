// What the pipeline expects to find for each theme and for the UI (ASSETS.md naming), derived
// from src/data/themes.json and src/data/ui-frames.json so game and pipeline never disagree.
import { readFileSync } from 'node:fs';

/** Variant letters of a regular family; singletons only have `a`. */
export const VARIANTS = ['a', 'b', 'c'];
/** Hue shift per color index: 0 = base, 1 = `_c1`, 2 = `_c2` (ASSETS.md recolor pipeline). */
export const HUE_SHIFT = [0, 25, -25];
/** Baked color variants per regular-family frame. */
export const FAMILY_COLORS = 2;

/**
 * @typedef {{ id: string, size: number, tags: string[] }} FamilyJson
 * @typedef {{ id: string, paletteShift: number, families: FamilyJson[], singletons: FamilyJson[] }} ThemeJson
 * @typedef {{
 *   theme: string, family: string, variant: string, base: string, file: string,
 *   colors: number, size: number, tags: string[], shapeIndex: number, singleton: boolean,
 * }} SpriteSpec
 */

/**
 * @param {URL | string} root repository root
 * @returns {ThemeJson[]}
 */
export function loadThemes(root) {
  const url = new URL('src/data/themes.json', root);
  return JSON.parse(readFileSync(url, 'utf8')).themes;
}

/**
 * @param {URL | string} root
 * @returns {string[]} UI frame names without the `ui_` prefix
 */
export function loadUiFrames(root) {
  const url = new URL('src/data/ui-frames.json', root);
  return JSON.parse(readFileSync(url, 'utf8')).frames;
}

/**
 * Every base sprite of a theme: 12 families × 3 variants + 4 singletons = 40 (ASSETS.md).
 * @param {ThemeJson} theme
 * @returns {SpriteSpec[]}
 */
export function spriteSpecs(theme) {
  /** @type {SpriteSpec[]} */
  const out = [];
  theme.families.forEach((f, i) => {
    for (const v of VARIANTS) {
      out.push({
        theme: theme.id,
        family: f.id,
        variant: v,
        base: `${theme.id}_${f.id}_${v}`,
        file: `${f.id}_${v}.svg`,
        colors: FAMILY_COLORS,
        size: f.size,
        tags: f.tags,
        shapeIndex: i,
        singleton: false,
      });
    }
  });
  theme.singletons.forEach((f, i) => {
    out.push({
      theme: theme.id,
      family: f.id,
      variant: 'a',
      base: `${theme.id}_${f.id}_a`,
      file: `${f.id}_a.svg`,
      colors: 0,
      size: f.size,
      tags: f.tags,
      shapeIndex: theme.families.length + i,
      singleton: true,
    });
  });
  return out;
}

/**
 * Frame names the atlas of a theme must contain (bases plus `_c1`/`_c2`).
 * @param {ThemeJson} theme
 * @returns {string[]}
 */
export function expectedFrames(theme) {
  const names = [];
  for (const s of spriteSpecs(theme)) {
    names.push(s.base);
    for (let c = 1; c <= s.colors; c++) names.push(`${s.base}_c${String(c)}`);
  }
  return names;
}

/**
 * @param {string[]} names from ui-frames.json
 */
export function uiSpecs(names) {
  return names.map((name) => ({ name, frame: `ui_${name}`, file: `${name}.svg` }));
}

/** Source file names accepted for a theme background, in priority order. */
export const BACKGROUND_FILES = ['background.svg', 'background.png'];
