import { THEME_COUNT, themeIndex, unlockedThemes } from '../gen/difficulty';
import type { Family, Theme } from '../gen/types';

/**
 * Theme data for the five launch themes (ASSETS.md). Family names, tags and base sizes are the
 * real ones so the atlas can drop in later; previewColor only drives the runtime placeholders.
 * Frame names: `${theme}_${family}_${variant}` plus `_c1`/`_c2` for baked color variants.
 */
type FamilySpec = readonly [id: string, baseSize: number, tags: readonly string[]];

const PALETTE = [
  0xe76f51, 0x264653, 0xa8a8a8, 0xd62828, 0xf4f1de, 0xc98a3d, 0xf2c14e, 0x2a9d8f, 0x8ecae6,
  0x5aa469, 0x6d597a, 0xb5b5b5, 0x9c6644, 0x3a86ff, 0x52b788, 0xffb703,
] as const;

function makeTheme(
  id: string,
  families: readonly FamilySpec[],
  singletons: readonly FamilySpec[],
  paletteShift: number,
): Theme {
  const fam = (spec: FamilySpec, i: number, variants: string[], colors: number): Family => ({
    id: spec[0],
    variants: variants.map((v) => `${id}_${spec[0]}_${v}`),
    colors,
    tags: [...spec[2]],
    baseSize: spec[1],
    previewColor: PALETTE[(i + paletteShift) % PALETTE.length] as number,
  });
  return {
    id,
    background: `${id}_bg`,
    props: [`${id}_prop_a`, `${id}_prop_b`],
    families: [
      ...families.map((s, i) => fam(s, i, ['a', 'b', 'c'], 2)),
      ...singletons.map((s, i) => fam(s, families.length + i, ['a'], 0)),
    ],
  };
}

const F = 'flippable';
const R = 'round';
const A = 'animal';
const T = 'tall';

export const KITCHEN: Theme = makeTheme(
  'kitchen',
  [
    ['mug', 110, [F]],
    ['pan', 170, [F, R]],
    ['spoon', 140, [T, F]],
    ['apple', 100, [R]],
    ['egg', 90, [R]],
    ['bread', 150, [F]],
    ['cheese', 120, [F]],
    ['teapot', 160, [T, F]],
    ['cup', 100, [F]],
    ['bottle', 160, [T]],
    ['bowl', 150, [R]],
    ['knife', 150, [T, F]],
  ],
  [
    ['toaster', 170, [F]],
    ['kettle', 150, [T, F]],
    ['plant', 170, [T]],
    ['clock', 120, [R]],
  ],
  0,
);

export const BEACH: Theme = makeTheme(
  'beach',
  [
    ['crab', 140, [A, F]],
    ['shell', 110, [R]],
    ['starfish', 130, [R]],
    ['ball', 110, [R]],
    ['bucket', 150, [T, F]],
    ['fish', 140, [A, F]],
    ['icecream', 140, [T, F]],
    ['flipflop', 130, [F]],
    ['umbrella', 170, [T]],
    ['sunglasses', 140, [F]],
    ['coconut', 110, [R]],
    ['bottle', 160, [T]],
  ],
  [
    ['towel', 170, [F]],
    ['surfboard', 170, [T, F]],
    ['seagull', 140, [A, F]],
    ['sandcastle', 160, []],
  ],
  3,
);

export const CITY: Theme = makeTheme(
  'city',
  [
    ['car', 170, [F]],
    ['dog', 140, [A, F]],
    ['cat', 130, [A, F]],
    ['bike', 160, [F]],
    ['pigeon', 110, [A, F]],
    ['cone', 120, [T]],
    ['mailbox', 150, [T]],
    ['balloon', 120, [R, T]],
    ['hat', 120, [F]],
    ['bag', 130, [F]],
    ['lamp', 170, [T]],
    ['trashcan', 140, [T]],
  ],
  [
    ['bench', 170, [F]],
    ['hydrant', 140, [T]],
    ['scooter', 160, [F]],
    ['sign', 150, [T]],
  ],
  6,
);

export const FOREST: Theme = makeTheme(
  'forest',
  [
    ['mushroom', 120, [T]],
    ['acorn', 100, [R]],
    ['fox', 150, [A, F]],
    ['owl', 130, [A, F]],
    ['rabbit', 130, [A, F]],
    ['leaf', 120, [F]],
    ['berry', 90, [R]],
    ['log', 160, [F]],
    ['flower', 120, [T]],
    ['butterfly', 120, [A]],
    ['snail', 120, [A, F]],
    ['pinecone', 110, [R]],
  ],
  [
    ['tent', 170, []],
    ['campfire', 140, []],
    ['backpack', 150, [F]],
    ['stone', 120, [R]],
  ],
  9,
);

export const SPACE: Theme = makeTheme(
  'space',
  [
    ['planet', 140, [R]],
    ['star', 110, [R]],
    ['rocket', 160, [T, F]],
    ['alien', 130, [A, F]],
    ['satellite', 150, [F]],
    ['moon', 120, [R]],
    ['comet', 140, [F]],
    ['helmet', 120, [R]],
    ['robot', 150, [F]],
    ['crystal', 120, [T]],
    ['ufo', 150, []],
    ['asteroid', 120, [R]],
  ],
  [
    ['telescope', 160, [T, F]],
    ['flag', 140, [T, F]],
    ['capsule', 150, [T]],
    ['lander', 160, []],
  ],
  12,
);

/** Launch order = unlock order (GDD §5): a new theme every 10 levels. */
export const THEMES: readonly Theme[] = [KITCHEN, BEACH, CITY, FOREST, SPACE];

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
