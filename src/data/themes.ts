import type { Family, Theme } from '../gen/types';

/**
 * Placeholder data for ONE theme (Epic 2). Frame names follow ASSETS.md so the real atlas can
 * drop in later: `${theme}_${family}_${variant}` plus `_c1`/`_c2` for baked color variants.
 * baseSize = longest side in design px at band scale 1.0. previewColor is dev-only.
 */
function fam(
  theme: string,
  id: string,
  baseSize: number,
  tags: string[],
  previewColor: number,
  variants: string[] = ['a', 'b', 'c'],
  colors = 2,
): Family {
  const family: Family = {
    id,
    variants: variants.map((v) => `${theme}_${id}_${v}`),
    colors,
    tags,
    baseSize,
    previewColor,
  };
  return family;
}

const T = 'kitchen';

export const KITCHEN: Theme = {
  id: T,
  background: `${T}_bg`,
  props: [`${T}_prop_table`, `${T}_prop_shelf`],
  families: [
    fam(T, 'mug', 110, ['flippable'], 0xe76f51),
    fam(T, 'pan', 170, ['flippable', 'round'], 0x264653),
    fam(T, 'spoon', 140, ['tall', 'flippable'], 0xa8a8a8),
    fam(T, 'apple', 100, ['round'], 0xd62828),
    fam(T, 'egg', 90, ['round'], 0xf4f1de),
    fam(T, 'bread', 150, ['flippable'], 0xc98a3d),
    fam(T, 'cheese', 120, ['flippable'], 0xf2c14e),
    fam(T, 'teapot', 160, ['tall', 'flippable'], 0x2a9d8f),
    fam(T, 'cup', 100, ['flippable'], 0x8ecae6),
    fam(T, 'bottle', 160, ['tall'], 0x5aa469),
    fam(T, 'bowl', 150, ['round'], 0x6d597a),
    fam(T, 'knife', 150, ['tall', 'flippable'], 0xb5b5b5),
    // singletons: one variant, no color variants
    fam(T, 'toaster', 170, ['flippable'], 0x9c6644, ['a'], 0),
    fam(T, 'kettle', 150, ['tall', 'flippable'], 0x3a86ff, ['a'], 0),
    fam(T, 'plant', 170, ['tall'], 0x52b788, ['a'], 0),
    fam(T, 'clock', 120, ['round'], 0xffb703, ['a'], 0),
  ],
};

export const THEMES: Theme[] = [KITCHEN];

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
