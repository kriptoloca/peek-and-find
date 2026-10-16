import { SCENE_SIZE } from '../config';
import { colorFrame } from '../data/themes';
import {
  BAND_MULT,
  DECOY_KIND_WEIGHTS,
  FILLER_COLOR_WEIGHTS,
  FILLER_FAMILY_SHARE,
  FLIPPABLE_TAG,
  FLIP_CHANCE,
  JITTER_MAX,
  JITTER_MIN,
  MAX_OCCLUSION_PASSES,
  MAX_REGENERATIONS,
  MAX_SPACING_RELAX,
  MIRROR_DECOY_SCALE,
  ROUNDING_CUSHION,
  SCENE_MARGIN,
  SPACING_RELAX_FACTOR,
  TARGET_SPREAD_STEPS,
} from './constants';
import { hitRadiusFor, params } from './difficulty';
import { dist2, visibleFraction } from './geometry';
import { chooseFindTargets, type TargetPlanItem } from './modes/find';
import { poissonDisc } from './poisson';
import { Rng } from './rng';
import type {
  Band,
  DecoyKind,
  Family,
  GenRect,
  Mode,
  Params,
  Placed,
  Point,
  Scene,
  Theme,
} from './types';
import { assertValid } from './validate';

export interface GenerateOptions {
  seed: number;
  level: number;
  mode: Mode;
  theme: Theme;
  /** Run the invariant checks and throw on violation (dev builds and tests). */
  validate?: boolean;
}

const EPS = 1e-9;

/** Entry point. Deterministic: same options → deep-equal scene. */
export function generateScene(o: GenerateOptions): Scene {
  if (o.mode !== 'find') {
    const epic = o.mode === 'odd' ? 4 : 5;
    throw new Error(`generateScene: mode "${o.mode}" is implemented in epic ${String(epic)}`);
  }
  let seed = o.seed >>> 0;
  for (let regen = 0; regen < MAX_REGENERATIONS; regen++) {
    const scene = tryFind(seed, regen, o);
    if (scene) {
      if (o.validate) assertValid(scene, o.theme);
      return scene;
    }
    seed = (seed + 1) >>> 0;
  }
  throw new Error(
    `generateScene: no valid scene after ${String(MAX_REGENERATIONS)} regenerations ` +
      `(seed ${String(o.seed)}, level ${String(o.level)})`,
  );
}

export function playableRect(width = SCENE_SIZE, height = SCENE_SIZE): GenRect {
  return {
    x: SCENE_MARGIN,
    y: SCENE_MARGIN,
    w: width - 2 * SCENE_MARGIN,
    h: height - 2 * SCENE_MARGIN,
  };
}

export function bandOf(y: number, playable: GenRect): Band {
  const i = Math.floor(((y - playable.y) / playable.h) * 3);
  return (i < 0 ? 0 : i > 2 ? 2 : i) as Band;
}

function roundPoints(pts: readonly Point[]): Point[] {
  return pts.map((q) => ({ x: Math.round(q.x), y: Math.round(q.y) }));
}

interface Slots {
  targets: number[];
  spread: number;
}

/** Greedy pick of target slots with pairwise distance ≥ spread × spacing, relaxing step by step. */
function pickTargetSlots(pts: readonly Point[], n: number, spacing: number): Slots | null {
  for (const step of TARGET_SPREAD_STEPS) {
    const min2 = (step * spacing) ** 2;
    const chosen: number[] = [];
    for (let i = 0; i < pts.length && chosen.length < n; i++) {
      const p = pts[i] as Point;
      let ok = true;
      for (const c of chosen) {
        const q = pts[c] as Point;
        if (dist2(p.x, p.y, q.x, q.y) < min2) {
          ok = false;
          break;
        }
      }
      if (ok) chosen.push(i);
    }
    if (chosen.length === n) return { targets: chosen, spread: step * spacing };
  }
  return null;
}

interface Build {
  family: Family;
  frame: string;
  isTarget: boolean;
  isDecoy: boolean;
  decoyKind?: DecoyKind;
  flipX: boolean;
  extraScale: number;
}

function familiesSharingTag(theme: Theme, target: Family, exclude: Set<string>): Family[] {
  return theme.families.filter(
    (f) => !exclude.has(f.id) && f.tags.some((t) => target.tags.includes(t)),
  );
}

function pickColor(rng: Rng, family: Family, weights: readonly number[]): number {
  if (family.colors <= 0) return 0;
  const w = weights.slice(0, family.colors + 1);
  return rng.weighted(w);
}

function buildDecoy(
  rng: Rng,
  theme: Theme,
  item: TargetPlanItem,
  targetFamilies: Set<string>,
): Build {
  let kind: DecoyKind = (['color', 'tag', 'mirror'] as const)[
    rng.weighted(DECOY_KIND_WEIGHTS)
  ] as DecoyKind;
  const flippable = item.family.tags.includes(FLIPPABLE_TAG);
  if (kind === 'mirror' && !flippable) kind = 'color';
  if (kind === 'tag' && familiesSharingTag(theme, item.family, targetFamilies).length === 0) {
    kind = 'color';
  }
  if (kind === 'color' && item.family.colors <= 0) kind = flippable ? 'mirror' : 'tag';

  switch (kind) {
    case 'color': {
      const variant = rng.pick(item.family.variants);
      const color = rng.int(1, item.family.colors);
      return {
        family: item.family,
        frame: colorFrame(variant, color),
        isTarget: false,
        isDecoy: true,
        decoyKind: 'color',
        flipX: flippable && rng.chance(FLIP_CHANCE),
        extraScale: 1,
      };
    }
    case 'tag': {
      const fam = rng.pick(familiesSharingTag(theme, item.family, targetFamilies));
      const variant = rng.pick(fam.variants);
      return {
        family: fam,
        frame: colorFrame(variant, pickColor(rng, fam, FILLER_COLOR_WEIGHTS)),
        isTarget: false,
        isDecoy: true,
        decoyKind: 'tag',
        flipX: fam.tags.includes(FLIPPABLE_TAG) && rng.chance(FLIP_CHANCE),
        extraScale: 1,
      };
    }
    case 'mirror':
      return {
        family: item.family,
        frame: item.frame,
        isTarget: false,
        isDecoy: true,
        decoyKind: 'mirror',
        flipX: true,
        extraScale: MIRROR_DECOY_SCALE,
      };
  }
}

function buildFillers(
  rng: Rng,
  theme: Theme,
  count: number,
  targetFamilies: Set<string>,
  objectCount: number,
): Build[] {
  const cap = Math.max(1, Math.floor(FILLER_FAMILY_SHARE * objectCount));
  const used = new Map<string, number>();
  const pool = theme.families.filter((f) => !targetFamilies.has(f.id));
  if (pool.length === 0) throw new Error(`theme ${theme.id}: no filler family available`);
  const out: Build[] = [];
  for (let i = 0; i < count; i++) {
    const open = pool.filter((f) => (used.get(f.id) ?? 0) < cap);
    if (open.length === 0) {
      throw new Error(
        `theme ${theme.id}: cannot place ${String(count)} fillers under the ` +
          `${String(FILLER_FAMILY_SHARE * 100)}% family cap`,
      );
    }
    const fam = rng.pick(open);
    used.set(fam.id, (used.get(fam.id) ?? 0) + 1);
    const variant = rng.pick(fam.variants);
    out.push({
      family: fam,
      frame: colorFrame(variant, pickColor(rng, fam, FILLER_COLOR_WEIGHTS)),
      isTarget: false,
      isDecoy: false,
      flipX: fam.tags.includes(FLIPPABLE_TAG) && rng.chance(FLIP_CHANCE),
      extraScale: 1,
    });
  }
  return out;
}

function place(
  id: string,
  b: Build,
  pt: Point,
  jitter: number,
  p: Params,
  playable: GenRect,
  hitRadius: number,
): Placed {
  const band = bandOf(pt.y, playable);
  const x = pt.x;
  const y = pt.y;
  // Front-band sprites near the edge would poke out of the square; cap the size at twice the
  // distance to the nearest edge (≥ 2 × SCENE_MARGIN, so the cap bites only on the largest ones).
  const edgeCap = 2 * Math.min(x, y, SCENE_SIZE - x, SCENE_SIZE - y);
  const size = Math.min(
    edgeCap,
    b.family.baseSize * BAND_MULT[band] * jitter * (b.isTarget ? p.targetScale : 1) * b.extraScale,
  );
  const placed: Placed = {
    id,
    family: b.family.id,
    frame: b.frame,
    x,
    y,
    size,
    scale: size / b.family.baseSize,
    flipX: b.flipX,
    z: y,
    band,
    isTarget: b.isTarget,
    isDecoy: b.isDecoy,
    hitRadius,
  };
  if (b.decoyKind) placed.decoyKind = b.decoyKind;
  return placed;
}

function tryFind(seed: number, regen: number, o: GenerateOptions): Scene | null {
  const p = params(o.level);
  const rng = new Rng(seed);
  const hitRadius = hitRadiusFor('find');
  const playable = playableRect();

  // 1. Poisson slots, relaxing spacing (never below the hard minimum) when too few. Coordinates
  //    are rounded once here so every later distance check sees the final integers.
  const hardMin = 2 * hitRadius + ROUNDING_CUSHION;
  let spacing = Math.max(hardMin, p.minSpacing);
  let pts = roundPoints(poissonDisc(rng, playable, spacing));
  for (let i = 0; pts.length < p.objectCount && i < MAX_SPACING_RELAX; i++) {
    spacing = Math.max(hardMin, spacing * SPACING_RELAX_FACTOR);
    pts = roundPoints(poissonDisc(rng, playable, spacing));
  }
  if (pts.length < p.objectCount) return null;
  rng.shuffle(pts);

  // 2. Target plan and spread-out target slots.
  const plan = chooseFindTargets(rng, o.theme, o.level, p.targetCount);
  const slots = pickTargetSlots(pts, p.targetCount, spacing);
  if (!slots) return null;
  const targetFamilies = new Set(plan.map((it) => it.family.id));

  // 3. Builds: targets, decoys, fillers.
  const builds: Build[] = [];
  for (const it of plan) {
    for (let i = 0; i < it.count; i++) {
      builds.push({
        family: it.family,
        frame: it.frame,
        isTarget: true,
        isDecoy: false,
        flipX: false,
        extraScale: 1,
      });
    }
  }
  const decoyCount = Math.min(
    Math.round(p.decoyRatio * p.objectCount),
    p.objectCount - p.targetCount,
  );
  for (let i = 0; i < decoyCount; i++) {
    builds.push(buildDecoy(rng, o.theme, plan[i % plan.length] as TargetPlanItem, targetFamilies));
  }
  const fillerCount = p.objectCount - p.targetCount - decoyCount;
  builds.push(...buildFillers(rng, o.theme, fillerCount, targetFamilies, p.objectCount));

  // 4. Slot assignment: targets to their slots, the rest in shuffled order; leftovers are free.
  const targetSet = new Set(slots.targets);
  const otherSlots: number[] = [];
  for (let i = 0; i < pts.length && otherSlots.length < p.objectCount - p.targetCount; i++) {
    if (!targetSet.has(i)) otherSlots.push(i);
  }
  const usedSet = new Set([...slots.targets, ...otherSlots]);
  const free: Point[] = [];
  for (let i = 0; i < pts.length; i++) if (!usedSet.has(i)) free.push(pts[i] as Point);

  const objects: Placed[] = [];
  const jitters: number[] = [];
  for (let i = 0; i < builds.length; i++) {
    const b = builds[i] as Build;
    const slot =
      i < p.targetCount ? (slots.targets[i] as number) : (otherSlots[i - p.targetCount] as number);
    const jitter = rng.float(JITTER_MIN, JITTER_MAX);
    jitters.push(jitter);
    objects.push(place(`o${String(i)}`, b, pts[slot] as Point, jitter, p, playable, hitRadius));
  }
  const targets = objects.filter((ob) => ob.isTarget);

  // 5. Occlusion repair: move a hidden target to a free slot, else draw it on top.
  const threshold = 1 - p.maxOcclusion - EPS;
  const spread2 = slots.spread ** 2;
  let settled = false;
  for (let pass = 0; pass < MAX_OCCLUSION_PASSES && !settled; pass++) {
    settled = true;
    for (let ti = 0; ti < targets.length; ti++) {
      const t = targets[ti] as Placed;
      if (visibleFraction(t, objects, t.id) >= threshold) continue;
      settled = false;
      const idx = objects.indexOf(t);
      const jitter = jitters[idx] as number;
      const b = builds[idx] as Build;
      let moved = false;
      for (let fi = 0; fi < free.length; fi++) {
        const s = free[fi] as Point;
        let spreadOk = true;
        for (const other of targets) {
          if (other === t) continue;
          if (dist2(s.x, s.y, other.x, other.y) < spread2) {
            spreadOk = false;
            break;
          }
        }
        if (!spreadOk) continue;
        const cand = place(t.id, b, s, jitter, p, playable, hitRadius);
        if (visibleFraction(cand, objects, t.id) >= threshold) {
          free[fi] = { x: t.x, y: t.y };
          objects[idx] = cand;
          targets[ti] = cand;
          moved = true;
          break;
        }
      }
      if (!moved) {
        let maxZ = -Infinity;
        for (const ob of objects) if (ob.z > maxZ) maxZ = ob.z;
        t.z = maxZ + 1;
      }
    }
  }
  if (!settled) return null;

  return {
    seed,
    mode: 'find',
    theme: o.theme.id,
    level: p.level,
    width: SCENE_SIZE,
    height: SCENE_SIZE,
    playable,
    spacing,
    targetSpacing: slots.spread,
    objects,
    targets,
    prompt: {
      kind: 'find',
      items: plan.map((it) => ({ family: it.family.id, icon: it.frame, count: it.count })),
    },
    params: p,
    regenerations: regen,
  };
}
