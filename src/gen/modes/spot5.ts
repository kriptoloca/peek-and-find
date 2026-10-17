import { HIT_RADIUS_FIND, HIT_RADIUS_SPOT, SPOT_H, SPOT_W } from '../../config';
import { colorFrame, splitFrame } from '../../data/themes';
import { bandOf, roundPoints } from '../common';
import {
  BAND_MULT,
  FILLER_COLOR_WEIGHTS,
  FILLER_FAMILY_SHARE,
  FLIPPABLE_TAG,
  FLIP_CHANCE,
  JITTER_MAX,
  JITTER_MIN,
  MAX_REGENERATIONS,
  MAX_SPACING_RELAX,
  ROUNDING_CUSHION,
  SCENE_MARGIN,
  SPACING_RELAX_FACTOR,
} from '../constants';
import { params } from '../difficulty';
import { visibleFraction } from '../geometry';
import { poissonDisc } from '../poisson';
import { Rng } from '../rng';
import type {
  Difference,
  Family,
  GenRect,
  Placed,
  Point,
  Scene,
  SpotMutation,
  Theme,
} from '../types';

/** Spot 5 tuning (GENERATOR.md §6). */
export const SPOT_OBJECT_FACTOR = 0.5;
export const SPOT_MIN_OBJECTS = 8;
export const SPOT_SCALE_MULT = 1.3;
export const SPOT_DIFFERENCES = 5;
/** A mutation must change at least this visible area (40 × 40 design px) … */
export const SPOT_MIN_AREA = 1600;
/** … or shift/resize a side by at least this much. */
export const SPOT_MIN_SHIFT = 40;
export const SPOT_SCALE_FACTORS: readonly number[] = [1.3, 0.7];
/** Objects hidden more than this are never mutated (the player could not see the change). */
export const SPOT_MIN_VISIBLE = 0.5;
const MAX_PER_KIND = 2;
const KIND_WEIGHTS: Record<SpotMutation, number> = {
  remove: 15,
  add: 15,
  recolor: 25,
  flip: 15,
  scale: 15,
  swap: 15,
};

export function spotObjectCount(level: number): number {
  return Math.max(SPOT_MIN_OBJECTS, Math.round(params(level).objectCount * SPOT_OBJECT_FACTOR));
}

export function spotPlayable(): GenRect {
  return {
    x: SCENE_MARGIN,
    y: SCENE_MARGIN,
    w: SPOT_W - 2 * SCENE_MARGIN,
    h: SPOT_H - 2 * SCENE_MARGIN,
  };
}

function edgeCap(x: number, y: number): number {
  return 2 * Math.min(x, y, SPOT_W - x, SPOT_H - y);
}

interface Built {
  family: Family;
  frame: string;
  flipX: boolean;
}

function pickColor(rng: Rng, family: Family): number {
  if (family.colors <= 0) return 0;
  return rng.weighted(FILLER_COLOR_WEIGHTS.slice(0, family.colors + 1));
}

function fillerBuild(rng: Rng, theme: Theme, used: Map<string, number>, cap: number): Built {
  let open = theme.families.filter((f) => (used.get(f.id) ?? 0) < cap);
  if (open.length === 0) open = theme.families;
  const family = rng.pick(open);
  used.set(family.id, (used.get(family.id) ?? 0) + 1);
  return {
    family,
    frame: colorFrame(rng.pick(family.variants), pickColor(rng, family)),
    flipX: family.tags.includes(FLIPPABLE_TAG) && rng.chance(FLIP_CHANCE),
  };
}

function makePlaced(
  id: string,
  b: Built,
  pt: Point,
  jitter: number,
  playable: GenRect,
  hitRadius: number,
): Placed {
  const band = bandOf(pt.y, playable);
  const size = Math.min(
    edgeCap(pt.x, pt.y),
    b.family.baseSize * BAND_MULT[band] * jitter * SPOT_SCALE_MULT,
  );
  return {
    id,
    family: b.family.id,
    frame: b.frame,
    x: pt.x,
    y: pt.y,
    size,
    scale: size / b.family.baseSize,
    flipX: b.flipX,
    z: pt.y,
    band,
    isTarget: false,
    isDecoy: false,
    // Objects are not tappable in Spot (only the differences are), but the radius still follows
    // the sprite so the difference circle derived from it covers what the player sees.
    hitRadius: Math.max(hitRadius, size / 2),
  };
}

/** Scale factor that changes a side by ≥ SPOT_MIN_SHIFT after the edge cap, or null. */
export function scaleFactorFor(o: Placed, rng: Rng): number | null {
  const order = rng.chance(0.5) ? [...SPOT_SCALE_FACTORS] : [...SPOT_SCALE_FACTORS].reverse();
  for (const f of order) {
    const next = Math.min(edgeCap(o.x, o.y), o.size * f);
    if (Math.abs(next - o.size) >= SPOT_MIN_SHIFT) return f;
  }
  return null;
}

function familyOf(theme: Theme, id: string): Family {
  const f = theme.families.find((x) => x.id === id);
  if (!f) throw new Error(`theme ${theme.id}: unknown family ${id}`);
  return f;
}

function visibleArea(o: Placed, others: readonly Placed[]): number {
  return visibleFraction(o, others, o.id) * o.size * o.size;
}

/** Deterministic Spot 5 scene: base image A, clone B with exactly five mutations. */
export function generateSpot(seed: number, level: number, theme: Theme): Scene {
  let s = seed >>> 0;
  for (let regen = 0; regen < MAX_REGENERATIONS; regen++) {
    const scene = trySpot(s, regen, level, theme);
    if (scene) return scene;
    s = (s + 1) >>> 0;
  }
  throw new Error(
    `generateSpot: no valid scene after ${String(MAX_REGENERATIONS)} regenerations ` +
      `(seed ${String(seed)}, level ${String(level)})`,
  );
}

function trySpot(seed: number, regen: number, level: number, theme: Theme): Scene | null {
  const p = params(level);
  const rng = new Rng(seed);
  // Objects are spaced like Find (only the five differences are tappable, with their own
  // ≥ 60 px circles resolved nearest-center), so Spot keeps the Find density.
  const hitRadius = HIT_RADIUS_FIND;
  const playable = spotPlayable();
  const n = spotObjectCount(p.level);

  const hardMin = 2 * hitRadius + ROUNDING_CUSHION;
  let spacing = Math.max(hardMin, p.minSpacing);
  let pts = roundPoints(poissonDisc(rng, playable, spacing));
  for (let i = 0; pts.length < n + 1 && i < MAX_SPACING_RELAX; i++) {
    spacing = Math.max(hardMin, spacing * SPACING_RELAX_FACTOR);
    pts = roundPoints(poissonDisc(rng, playable, spacing));
  }
  if (pts.length < n + 1) return null;
  rng.shuffle(pts);

  // Image A: fillers only, family share capped, no targets.
  const cap = Math.max(1, Math.floor(FILLER_FAMILY_SHARE * n));
  const used = new Map<string, number>();
  const a: Placed[] = [];
  for (let i = 0; i < n; i++) {
    const b = fillerBuild(rng, theme, used, cap);
    a.push(
      makePlaced(
        `o${String(i)}`,
        b,
        pts[i] as Point,
        rng.float(JITTER_MIN, JITTER_MAX),
        playable,
        hitRadius,
      ),
    );
  }
  const free = pts.slice(n);

  // Image B: clone and mutate five distinct objects.
  const b: Placed[] = a.map((o) => ({ ...o }));
  const diffs: Difference[] = [];
  const perKind: Record<SpotMutation, number> = {
    remove: 0,
    add: 0,
    recolor: 0,
    flip: 0,
    scale: 0,
    swap: 0,
  };
  const order = rng.shuffle(a.map((_, i) => i));
  let freeIdx = 0;

  for (const i of order) {
    if (diffs.length === SPOT_DIFFERENCES) break;
    const obj = a[i] as Placed;
    const fam = familyOf(theme, obj.family);
    const vf = visibleFraction(obj, a, obj.id);
    if (vf < SPOT_MIN_VISIBLE || vf * obj.size * obj.size < SPOT_MIN_AREA) continue;

    const kinds: SpotMutation[] = [];
    if (perKind.remove < MAX_PER_KIND) kinds.push('remove');
    if (perKind.add < MAX_PER_KIND && freeIdx < free.length) kinds.push('add');
    if (perKind.recolor < MAX_PER_KIND && fam.colors > 0) kinds.push('recolor');
    if (perKind.flip < MAX_PER_KIND && fam.tags.includes(FLIPPABLE_TAG)) kinds.push('flip');
    if (perKind.scale < MAX_PER_KIND && scaleFactorFor(obj, new Rng(seed ^ i)) !== null)
      kinds.push('scale');
    if (perKind.swap < MAX_PER_KIND && fam.variants.length > 1) kinds.push('swap');
    if (kinds.length === 0) continue;
    const kind = kinds[rng.weighted(kinds.map((k) => KIND_WEIGHTS[k]))] as SpotMutation;
    const bi = b.findIndex((o) => o.id === obj.id);
    const target = b[bi] as Placed;

    switch (kind) {
      case 'remove': {
        b.splice(bi, 1);
        diffs.push(diff(diffs.length, kind, obj));
        break;
      }
      case 'add': {
        const pt = free[freeIdx++] as Point;
        const built = fillerBuild(rng, theme, used, cap);
        const added = makePlaced(
          `n${String(diffs.length)}`,
          built,
          pt,
          rng.float(JITTER_MIN, JITTER_MAX),
          playable,
          hitRadius,
        );
        if (visibleArea(added, b) < SPOT_MIN_AREA) continue;
        b.push(added);
        diffs.push(diff(diffs.length, kind, added));
        break;
      }
      case 'recolor': {
        const { base, color } = splitFrame(obj.frame);
        const others: number[] = [];
        for (let c = 0; c <= fam.colors; c++) if (c !== color) others.push(c);
        target.frame = colorFrame(base, rng.pick(others));
        diffs.push(diff(diffs.length, kind, obj));
        break;
      }
      case 'flip': {
        target.flipX = !obj.flipX;
        diffs.push(diff(diffs.length, kind, obj));
        break;
      }
      case 'scale': {
        const f = scaleFactorFor(obj, rng);
        if (f === null) continue;
        const next = Math.min(edgeCap(obj.x, obj.y), obj.size * f);
        target.size = next;
        target.scale = next / fam.baseSize;
        target.hitRadius = Math.max(hitRadius, next / 2);
        diffs.push(diff(diffs.length, kind, obj));
        break;
      }
      case 'swap': {
        const { base, color } = splitFrame(obj.frame);
        const variants = fam.variants.filter((v) => v !== base);
        target.frame = colorFrame(rng.pick(variants), color);
        diffs.push(diff(diffs.length, kind, obj));
        break;
      }
    }
    perKind[kind] += 1;
  }
  if (diffs.length < SPOT_DIFFERENCES) return null;

  // Final visibility pass: a later mutation (an added or enlarged neighbour) may have covered an
  // earlier difference in image B. Every difference must stay visible in both images it exists in.
  for (const d of diffs) {
    if (!differenceVisible(d, a, b)) return null;
  }

  return {
    seed,
    mode: 'spot',
    theme: theme.id,
    level: p.level,
    width: SPOT_W,
    height: SPOT_H,
    playable,
    spacing,
    targetSpacing: spacing,
    objects: a,
    targets: [],
    prompt: { kind: 'spot', count: SPOT_DIFFERENCES },
    params: p,
    regenerations: regen,
    spot: { b, differences: diffs },
  };
}

function diff(index: number, kind: SpotMutation, o: Placed): Difference {
  return {
    id: `d${String(index)}`,
    kind,
    objectId: o.id,
    x: o.x,
    y: o.y,
    hitRadius: Math.max(HIT_RADIUS_SPOT, o.size / 2),
  };
}

/** Visible area ≥ SPOT_MIN_AREA in image A (unless added) and in image B (unless removed). */
export function differenceVisible(
  d: Difference,
  a: readonly Placed[],
  b: readonly Placed[],
): boolean {
  if (d.kind !== 'add') {
    const o = a.find((x) => x.id === d.objectId);
    if (!o || visibleArea(o, a) < SPOT_MIN_AREA) return false;
  }
  if (d.kind !== 'remove') {
    const o = b.find((x) => x.id === d.objectId);
    if (!o || visibleArea(o, b) < SPOT_MIN_AREA) return false;
  }
  return true;
}
