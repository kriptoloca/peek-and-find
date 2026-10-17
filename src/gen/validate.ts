import { familyById, splitFrame } from '../data/themes';
import { FILLER_FAMILY_SHARE, FLIPPABLE_TAG } from './constants';
import { aabb, dist2, rectContainsPoint, rectInside, visibleFraction } from './geometry';
import { ODD_CORNER_FREE_UNTIL_LEVEL, ODD_SCALE_DELTA, oddCount } from './modes/odd-one-out';
import {
  SPOT_DIFFERENCES,
  differenceVisible,
  SPOT_MIN_SHIFT,
  spotObjectCount,
} from './modes/spot5';
import { HIT_RADIUS_SPOT, SPOT_H, SPOT_W } from '../config';
import { hitRadiusFor } from './difficulty';
import type { Placed, Scene, Theme } from './types';

const EPS = 1e-6;

/** Invariant checks (GENERATOR.md §7). Returns a list of violations; empty means valid. */
export function validateScene(scene: Scene, theme: Theme): string[] {
  const errs: string[] = [];
  const p = scene.params;
  const sceneRect = { x: 0, y: 0, w: scene.width, h: scene.height };

  if (scene.theme !== theme.id) errs.push(`theme mismatch: ${scene.theme} vs ${theme.id}`);
  // Find uses params.objectCount; Odd One Out has its own count (validated in validateOdd).
  if (scene.mode === 'find' && scene.objects.length !== p.objectCount) {
    errs.push(`objectCount ${String(scene.objects.length)} ≠ ${String(p.objectCount)}`);
  }

  // ids unique; targets list consistent with flags
  const ids = new Set<string>();
  for (const o of scene.objects) {
    if (ids.has(o.id)) errs.push(`duplicate id ${o.id}`);
    ids.add(o.id);
  }
  const flagged = scene.objects.filter((o) => o.isTarget);
  if (flagged.length !== scene.targets.length) {
    errs.push(`isTarget count ${String(flagged.length)} ≠ targets ${String(scene.targets.length)}`);
  }
  for (const t of scene.targets) {
    if (!scene.objects.includes(t)) errs.push(`target ${t.id} not in objects`);
    if (!t.isTarget || t.isDecoy) errs.push(`target ${t.id} has wrong flags`);
  }

  // frames exist in the theme
  for (const o of scene.objects) {
    let fam;
    try {
      fam = familyById(theme, o.family);
    } catch {
      errs.push(`${o.id}: unknown family ${o.family}`);
      continue;
    }
    const { base, color } = splitFrame(o.frame);
    if (!fam.variants.includes(base)) errs.push(`${o.id}: frame ${o.frame} not in ${fam.id}`);
    if (color > fam.colors) errs.push(`${o.id}: color ${String(color)} > ${String(fam.colors)}`);
    if (o.flipX && !fam.tags.includes(FLIPPABLE_TAG)) errs.push(`${o.id}: flipped non-flippable`);
    if (Math.abs(o.scale * fam.baseSize - o.size) > 1e-6) errs.push(`${o.id}: scale/size mismatch`);
  }

  // geometry: centers inside playable, boxes inside the scene, spacing ≥ 2 × base hit radius
  // (the tap circle itself grows with the sprite, so circles may overlap; nearest center wins)
  const baseRadius = hitRadiusFor(scene.mode === 'odd' ? 'odd' : 'find');
  for (const o of scene.objects) {
    if (!rectContainsPoint(scene.playable, o.x, o.y)) errs.push(`${o.id}: center outside playable`);
    if (!rectInside(aabb(o), sceneRect, 0.5)) errs.push(`${o.id}: box outside scene`);
    if (o.hitRadius < Math.max(baseRadius, o.size / 2) - EPS) {
      errs.push(`${o.id}: hit radius ${String(o.hitRadius)} smaller than the sprite`);
    }
  }
  const need = 2 * baseRadius;
  for (let i = 0; i < scene.objects.length; i++) {
    const a = scene.objects[i] as Placed;
    for (let j = i + 1; j < scene.objects.length; j++) {
      const b = scene.objects[j] as Placed;
      if (dist2(a.x, a.y, b.x, b.y) < need * need - EPS) {
        errs.push(`${a.id}/${b.id}: centers closer than ${String(need)}`);
      }
    }
  }

  if (scene.mode === 'find') validateFind(scene, theme, errs);
  if (scene.mode === 'odd') validateOdd(scene, errs);
  if (scene.mode === 'spot') validateSpot(scene, errs);
  return errs;
}

function samePlaced(a: Placed, b: Placed): boolean {
  return (
    a.frame === b.frame &&
    a.x === b.x &&
    a.y === b.y &&
    Math.abs(a.size - b.size) < 1e-9 &&
    a.flipX === b.flipX &&
    a.family === b.family
  );
}

function validateSpot(scene: Scene, errs: string[]): void {
  const sp = scene.spot;
  if (!sp) {
    errs.push('spot: missing spot info');
    return;
  }
  if (scene.width !== SPOT_W || scene.height !== SPOT_H) errs.push('spot: wrong scene size');
  if (scene.prompt.kind !== 'spot') errs.push(`spot: prompt kind ${scene.prompt.kind}`);
  const n = spotObjectCount(scene.level);
  if (scene.objects.length !== n)
    errs.push(`spot: ${String(scene.objects.length)} objects ≠ ${String(n)}`);
  if (sp.differences.length !== SPOT_DIFFERENCES)
    errs.push(`spot: ${String(sp.differences.length)} differences`);
  const A = new Map(scene.objects.map((o) => [o.id, o]));
  const B = new Map(sp.b.map((o) => [o.id, o]));
  const touched = new Set<string>();
  const ids = new Set<string>();
  for (const d of sp.differences) {
    if (ids.has(d.id)) errs.push(`spot: duplicate difference id ${d.id}`);
    ids.add(d.id);
    if (touched.has(d.objectId)) errs.push(`spot: object ${d.objectId} mutated twice`);
    touched.add(d.objectId);
    const a = A.get(d.objectId);
    const b = B.get(d.objectId);
    const ref = d.kind === 'add' ? b : a;
    if (!ref) {
      errs.push(`spot ${d.id}: object ${d.objectId} missing`);
      continue;
    }
    if (d.x !== ref.x || d.y !== ref.y) errs.push(`spot ${d.id}: position differs from its object`);
    if (d.hitRadius < HIT_RADIUS_SPOT) errs.push(`spot ${d.id}: hit radius below the Spot minimum`);
    if (!differenceVisible(d, scene.objects, sp.b)) {
      errs.push(`spot ${d.id}: not visible enough in both images`);
    }
    switch (d.kind) {
      case 'remove':
        if (!a || b) errs.push(`spot ${d.id}: remove must exist in A and not in B`);
        break;
      case 'add':
        if (a || !b) errs.push(`spot ${d.id}: add must exist in B and not in A`);
        break;
      case 'recolor':
        if (!a || !b) break;
        if (splitFrame(a.frame).base !== splitFrame(b.frame).base)
          errs.push(`spot ${d.id}: recolor changed the base frame`);
        if (splitFrame(a.frame).color === splitFrame(b.frame).color)
          errs.push(`spot ${d.id}: recolor kept the color`);
        if (!samePlaced({ ...a, frame: b.frame }, b))
          errs.push(`spot ${d.id}: recolor changed more than the color`);
        break;
      case 'flip':
        if (!a || !b) break;
        if (a.flipX === b.flipX) errs.push(`spot ${d.id}: flip did not flip`);
        if (!samePlaced({ ...a, flipX: b.flipX }, b))
          errs.push(`spot ${d.id}: flip changed more than flipX`);
        break;
      case 'scale':
        if (!a || !b) break;
        if (Math.abs(a.size - b.size) < SPOT_MIN_SHIFT)
          errs.push(`spot ${d.id}: scale delta < ${String(SPOT_MIN_SHIFT)}`);
        if (!samePlaced({ ...a, size: b.size }, b))
          errs.push(`spot ${d.id}: scale changed more than size`);
        break;
      case 'swap':
        if (!a || !b) break;
        if (splitFrame(a.frame).base === splitFrame(b.frame).base)
          errs.push(`spot ${d.id}: swap kept the variant`);
        if (splitFrame(a.frame).color !== splitFrame(b.frame).color)
          errs.push(`spot ${d.id}: swap changed the color`);
        if (a.family !== b.family) errs.push(`spot ${d.id}: swap changed the family`);
        break;
    }
  }
  for (const [id, a] of A) {
    if (touched.has(id)) continue;
    const b = B.get(id);
    if (!b) errs.push(`spot: untouched ${id} missing in B`);
    else if (!samePlaced(a, b)) errs.push(`spot: untouched ${id} differs in B`);
  }
  for (const id of B.keys()) {
    if (!A.has(id) && !touched.has(id)) errs.push(`spot: ${id} appears in B without a difference`);
  }
  // Image B geometry: inside the rect and spaced like image A.
  const sceneRect = { x: 0, y: 0, w: scene.width, h: scene.height };
  for (const o of sp.b) {
    if (!rectContainsPoint(scene.playable, o.x, o.y))
      errs.push(`spot B ${o.id}: center outside playable`);
    if (!rectInside(aabb(o), sceneRect, 0.5)) errs.push(`spot B ${o.id}: box outside scene`);
  }
  for (let i = 0; i < sp.b.length; i++) {
    for (let j = i + 1; j < sp.b.length; j++) {
      const a = sp.b[i] as Placed;
      const b = sp.b[j] as Placed;
      const need = 2 * hitRadiusFor('find');
      if (dist2(a.x, a.y, b.x, b.y) < need * need - EPS)
        errs.push(`spot B ${a.id}/${b.id}: too close`);
    }
  }
}

function validateOdd(scene: Scene, errs: string[]): void {
  const info = scene.odd;
  if (!info) {
    errs.push('odd: missing odd info');
    return;
  }
  if (scene.prompt.kind !== 'odd') errs.push(`odd: prompt kind ${scene.prompt.kind}`);
  const n = oddCount(scene.level);
  if (scene.objects.length !== n)
    errs.push(`odd: ${String(scene.objects.length)} items ≠ ${String(n)}`);
  const odds = scene.objects.filter((o) => o.isTarget);
  if (odds.length !== 1) errs.push(`odd: ${String(odds.length)} odd items`);
  const odd = odds[0];
  const regular = scene.objects.filter((o) => !o.isTarget);
  const ref = regular[0];
  if (!odd || !ref) return;
  for (const o of regular) {
    if (o.frame !== info.baseFrame)
      errs.push(`${o.id}: regular frame ${o.frame} ≠ ${info.baseFrame}`);
    if (o.flipX) errs.push(`${o.id}: regular item flipped`);
    if (Math.abs(o.size - ref.size) > 1e-6) errs.push(`${o.id}: regular size differs`);
    if (o.isDecoy) errs.push(`${o.id}: regular item flagged as decoy`);
  }
  const frameDiff = odd.frame !== info.baseFrame;
  const flipDiff = odd.flipX;
  const sizeDiff = Math.abs(odd.size - ref.size) > 1e-6;
  const diffs = [frameDiff, flipDiff, sizeDiff].filter(Boolean).length;
  if (diffs !== 1) errs.push(`odd: differs in ${String(diffs)} attributes (kind ${info.kind})`);
  switch (info.kind) {
    case 'color':
    case 'odd':
      if (!frameDiff) errs.push('odd: kind needs a different frame');
      break;
    case 'flip':
      if (!flipDiff) errs.push('odd: kind flip but not flipped');
      break;
    case 'scale':
      if (Math.abs(odd.size - ref.size * ODD_SCALE_DELTA) > 1e-6)
        errs.push('odd: scale delta wrong');
      break;
  }
  const corner =
    (info.col === 0 || info.col === info.cols - 1) &&
    (info.row === 0 || info.row === info.rows - 1);
  if (scene.level < ODD_CORNER_FREE_UNTIL_LEVEL && corner) errs.push('odd: in a corner before L15');
}

function validateFind(scene: Scene, theme: Theme, errs: string[]): void {
  const p = scene.params;
  if (scene.targets.length !== p.targetCount) {
    errs.push(`targetCount ${String(scene.targets.length)} ≠ ${String(p.targetCount)}`);
  }
  if (scene.prompt.kind !== 'find') {
    errs.push(`prompt kind ${scene.prompt.kind}`);
    return;
  }
  const promptTotal = scene.prompt.items.reduce((s, it) => s + it.count, 0);
  if (promptTotal !== p.targetCount) errs.push(`prompt total ${String(promptTotal)}`);
  const targetFrames = new Set<string>();
  const targetFamilies = new Set<string>();
  for (const it of scene.prompt.items) {
    targetFrames.add(it.icon);
    targetFamilies.add(it.family);
    const n = scene.targets.filter((t) => t.family === it.family && t.frame === it.icon).length;
    if (n !== it.count)
      errs.push(`prompt ${it.family}: ${String(n)} targets ≠ ${String(it.count)}`);
  }

  // target spread and occlusion
  const spread2 = scene.targetSpacing ** 2;
  const threshold = 1 - p.maxOcclusion - EPS;
  for (let i = 0; i < scene.targets.length; i++) {
    const a = scene.targets[i] as Placed;
    if (a.flipX) errs.push(`target ${a.id} is flipped`);
    const vf = visibleFraction(a, scene.objects, a.id);
    if (vf < threshold)
      errs.push(`target ${a.id}: visible ${vf.toFixed(2)} < ${threshold.toFixed(2)}`);
    for (let j = i + 1; j < scene.targets.length; j++) {
      const b = scene.targets[j] as Placed;
      if (dist2(a.x, a.y, b.x, b.y) < spread2 - EPS) errs.push(`targets ${a.id}/${b.id} too close`);
    }
  }

  // decoys and fillers
  const fillerCount = new Map<string, number>();
  const cap = Math.max(1, Math.floor(FILLER_FAMILY_SHARE * p.objectCount));
  for (const o of scene.objects) {
    if (o.isTarget) continue;
    if (o.isDecoy) {
      switch (o.decoyKind) {
        case 'color':
          if (!targetFamilies.has(o.family)) errs.push(`${o.id}: color decoy of non-target family`);
          if (targetFrames.has(o.frame)) errs.push(`${o.id}: color decoy uses a target frame`);
          break;
        case 'tag': {
          if (targetFamilies.has(o.family)) errs.push(`${o.id}: tag decoy of target family`);
          const fam = familyById(theme, o.family);
          const shares = [...targetFamilies].some((tf) =>
            familyById(theme, tf).tags.some((t) => fam.tags.includes(t)),
          );
          if (!shares) errs.push(`${o.id}: tag decoy shares no tag`);
          break;
        }
        case 'mirror':
          if (!targetFrames.has(o.frame))
            errs.push(`${o.id}: mirror decoy frame not a target frame`);
          if (!o.flipX) errs.push(`${o.id}: mirror decoy not flipped`);
          break;
        default:
          errs.push(`${o.id}: decoy without kind`);
      }
      continue;
    }
    if (targetFamilies.has(o.family)) errs.push(`${o.id}: filler of target family ${o.family}`);
    if (targetFrames.has(o.frame)) errs.push(`${o.id}: filler uses a target frame`);
    fillerCount.set(o.family, (fillerCount.get(o.family) ?? 0) + 1);
  }
  for (const [fam, n] of fillerCount) {
    if (n > cap) errs.push(`filler family ${fam}: ${String(n)} > cap ${String(cap)}`);
  }
}

export function assertValid(scene: Scene, theme: Theme): void {
  const errs = validateScene(scene, theme);
  if (errs.length > 0) {
    throw new Error(
      `invalid scene (seed ${String(scene.seed)}, level ${String(scene.level)}):\n  ` +
        errs.join('\n  '),
    );
  }
}
