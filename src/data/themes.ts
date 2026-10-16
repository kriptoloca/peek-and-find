import { THEME_COUNT, themeIndex, unlockedThemes } from '../gen/difficulty';
import type { Family, Theme } from '../gen/types';
import data from './themes.json';

/**
 * Theme data for the five launch themes (ASSETS.md). The family names, tags and base sizes live
 * in themes.json so the asset pipeline (scripts/assets.mjs) reads the same list; previewColor
 * only drives the runtime placeholders.
 * Frame names: `${theme}_${family}_${variant}` plus `_c1`/`_c2` for baked color variants.
 */
interface FamilyJson {
  id: string;
  size: number;
  tags: string[];
}

interface ThemeJson {
  id: string;
  paletteShift: number;
  families: FamilyJson[];
  singletons: FamilyJson[];
}

/** Preview palette shared with the pipeline placeholders (scripts/lib/placeholder-svg.mjs). */
export const PALETTE = [
  0xe76f51, 0x264653, 0xa8a8a8, 0xd62828, 0xf4f1de, 0xc98a3d, 0xf2c14e, 0x2a9d8f, 0x8ecae6,
  0x5aa469, 0x6d597a, 0xb5b5b5, 0x9c6644, 0x3a86ff, 0x52b788, 0xffb703,
] as const;

/** Variant letters of a regular family; singletons only have `a`. */
export const FAMILY_VARIANTS = ['a', 'b', 'c'] as const;
/** Baked color variants per regular-family frame (`_c1`, `_c2`). */
export const FAMILY_COLORS = 2;

function makeTheme(spec: ThemeJson): Theme {
  const fam = (f: FamilyJson, i: number, variants: readonly string[], colors: number): Family => ({
    id: f.id,
    variants: variants.map((v) => `${spec.id}_${f.id}_${v}`),
    colors,
    tags: [...f.tags],
    baseSize: f.size,
    previewColor: PALETTE[(i + spec.paletteShift) % PALETTE.length] as number,
  });
  return {
    id: spec.id,
    background: `${spec.id}_bg`,
    props: [`${spec.id}_prop_a`, `${spec.id}_prop_b`],
    families: [
      ...spec.families.map((f, i) => fam(f, i, FAMILY_VARIANTS, FAMILY_COLORS)),
      ...spec.singletons.map((f, i) => fam(f, spec.families.length + i, ['a'], 0)),
    ],
  };
}

const SPECS: readonly ThemeJson[] = (data as { themes: ThemeJson[] }).themes;

/** Launch order = unlock order (GDD §5): a new theme every 10 levels. */
export const THEMES: readonly Theme[] = SPECS.map(makeTheme);

function themeById(id: string): Theme {
  const t = THEMES.find((x) => x.id === id);
  if (!t) throw new Error(`themes.json: missing theme ${id}`);
  return t;
}

export const KITCHEN: Theme = themeById('kitchen');
export const BEACH: Theme = themeById('beach');
export const CITY: Theme = themeById('city');
export const FOREST: Theme = themeById('forest');
export const SPACE: Theme = themeById('space');

/** Theme for a level: rotates every 3 levels among the unlocked ones (GENERATOR.md §2). */
export function themeForLevel(level: number): Theme {
  return THEMES[themeIndex(level, THEME_COUNT)] as Theme;
}

/** Themes unlocked at a level, in order. */
export function unlockedThemeList(level: number): readonly Theme[] {
  return THEMES.slice(0, unlockedThemes(level, THEME_COUNT));
}

export function familyById(theme: Theme, id: string): Family {
  const f = theme.families.find((x) => x.id === id);
  if (!f) throw new Error(`theme ${theme.id}: unknown family ${id}`);
  return f;
}

/** Frame name for a base frame and a color index (0 = base color, 1..N = `_cN`). */
export function colorFrame(base: string, color: number): string {
  return color <= 0 ? base : `${base}_c${String(color)}`;
}

/** Splits "kitchen_mug_b_c1" into base "kitchen_mug_b" and color 1 (0 when no suffix). */
export function splitFrame(frame: string): { base: string; color: number } {
  const m = /^(.*)_c(\d+)$/.exec(frame);
  if (!m) return { base: frame, color: 0 };
  return { base: m[1] as string, color: Number(m[2]) };
}

/** Texture keys of a theme background: the 1080² square and the 1080×840 Spot crop. */
export function backgroundKey(theme: Theme, spot: boolean): string {
  return spot ? `${theme.background}_spot` : theme.background;
}
