import { SCENE_SIZE } from '../../config';
import { colorFrame } from '../../data/themes';
import { bandOf, playableRect } from '../common';
import { FLIPPABLE_TAG, ROUNDING_CUSHION } from '../constants';
import { hitRadiusFor, params } from '../difficulty';
import { Rng } from '../rng';
import type { Family, OddInfo, OddKind, Placed, Scene, Theme } from '../types';

/** n = clamp(8 + level, 8, 36) instances (GENERATOR.md §6). */
export const ODD_MIN = 8;
export const ODD_MAX = 36;
/** Before this level the odd item never sits in one of the four grid corners. */
export const ODD_CORNER_FREE_UNTIL_LEVEL = 15;
/** Scale attribute: odd item is this × the regular size. */
export const ODD_SCALE_DELTA = 0.8;
/** Items fill this fraction of a grid cell. */
const CELL_FILL = 0.7;
/** Regular size never exceeds this × family.baseSize. */
const MAX_BASE_MULT = 1.25;
/** Jitter uses this fraction of the spacing budget so neighbours stay ≥ 2 × hitRadius apart. */
const JITTER_BUDGET = 0.5;

export function oddCount(level: number): number {
  return Math.min(ODD_MAX, Math.max(ODD_MIN, ODD_MIN + Math.floor(level)));
}

/** Attribute weights by level: subtler attributes (scale, odd frame) gain weight later. */
export function oddKindWeights(level: number): Record<OddKind, number> {
  if (level < 15) return { color: 60, flip: 25, scale: 15, odd: 0 };
  if (level < 40) return { color: 35, flip: 30, scale: 30, odd: 5 };
  return { color: 20, flip: 30, scale: 35, odd: 15 };
}

function pickKind(rng: Rng, level: number, family: Family): OddKind {
  const w = oddKindWeights(level);
  const kinds: OddKind[] = ['scale'];
  if (family.colors > 0) kinds.push('color');
  if (family.tags.includes(FLIPPABLE_TAG)) kinds.push('flip');
  if (family.odd) kinds.push('odd');
  const weights = kinds.map((k) => w[k]);
  if (weights.every((x) => x === 0)) return 'scale';
  return kinds[rng.weighted(weights)] as OddKind;
}

/** Deterministic Odd One Out scene. Always succeeds (grid layout never runs out of slots). */
export function generateOdd(seed: number, level: number, theme: Theme): Scene {
  const p = params(level);
  const rng = new Rng(seed);
  const hitRadius = hitRadiusFor('odd');
  const playable = playableRect();
  const n = oddCount(p.level);

  const pool = theme.families.filter((f) => f.variants.length > 0 && f.colors > 0);
  if (pool.length === 0) throw new Error(`theme ${theme.id}: no family for Odd One Out`);
  const family = rng.pick(pool);
  const variant = rng.pick(family.variants);
  const baseColor = rng.int(0, family.colors);
  const baseFrame = colorFrame(variant, baseColor);
  const kind = pickKind(rng, p.level, family);

  // Jittered grid: cols × rows ≥ n, cells centred in the playable rect, holes allowed.
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  const cell = Math.floor(Math.min(playable.w / cols, playable.h / rows));
  const gridW = cols * cell;
  const gridH = rows * cell;
  const x0 = playable.x + (playable.w - gridW) / 2;
  const y0 = playable.y + (playable.h - gridH) / 2;
  const size = Math.min(cell * CELL_FILL, family.baseSize * MAX_BASE_MULT);
  const minDist = 2 * hitRadius + ROUNDING_CUSHION;
  const maxJitter = Math.max(0, ((cell - minDist) / 2) * JITTER_BUDGET);

  const cells: { col: number; row: number }[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push({ col: c, row: r });
  rng.shuffle(cells);
  const used = cells.slice(0, n);

  const isCorner = (c: { col: number; row: number }): boolean =>
    (c.col === 0 || c.col === cols - 1) && (c.row === 0 || c.row === rows - 1);
  let candidates = used.map((c, i) => ({ c, i }));
  if (p.level < ODD_CORNER_FREE_UNTIL_LEVEL) {
    const inner = candidates.filter(({ c }) => !isCorner(c));
    if (inner.length > 0) candidates = inner;
  }
  const oddIndex = rng.pick(candidates).i;

  let oddFrame = baseFrame;
  if (kind === 'color') {
    const others: number[] = [];
    for (let c = 0; c <= family.colors; c++) if (c !== baseColor) others.push(c);
    oddFrame = colorFrame(variant, rng.pick(others));
  } else if (kind === 'odd' && family.odd) {
    oddFrame = family.odd;
  }

  const objects: Placed[] = used.map((c, i) => {
    const isOdd = i === oddIndex;
    const jx = rng.float(-maxJitter, maxJitter);
    const jy = rng.float(-maxJitter, maxJitter);
    const x = Math.round(x0 + c.col * cell + cell / 2 + jx);
    const y = Math.round(y0 + c.row * cell + cell / 2 + jy);
    const itemSize = isOdd && kind === 'scale' ? size * ODD_SCALE_DELTA : size;
    return {
      id: `o${String(i)}`,
      family: family.id,
      frame: isOdd ? oddFrame : baseFrame,
      x,
      y,
      size: itemSize,
      scale: itemSize / family.baseSize,
      flipX: isOdd && kind === 'flip',
      z: y,
      band: bandOf(y, playable),
      isTarget: isOdd,
      isDecoy: false,
      hitRadius: Math.max(hitRadius, itemSize / 2),
    };
  });

  const oddCell = used[oddIndex] as { col: number; row: number };
  const odd: OddInfo = { kind, cols, rows, col: oddCell.col, row: oddCell.row, baseFrame };
  const spacing = cell - 2 * maxJitter;
  return {
    seed,
    mode: 'odd',
    theme: theme.id,
    level: p.level,
    width: SCENE_SIZE,
    height: SCENE_SIZE,
    playable,
    spacing,
    targetSpacing: spacing,
    objects,
    targets: objects.filter((o) => o.isTarget),
    prompt: { kind: 'odd' },
    params: p,
    regenerations: 0,
    odd,
  };
}
