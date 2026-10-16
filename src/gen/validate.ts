import { familyById, splitFrame } from '../data/themes';
import { FILLER_FAMILY_SHARE, FLIPPABLE_TAG } from './constants';
import { aabb, dist2, rectContainsPoint, rectInside, visibleFraction } from './geometry';
import type { Placed, Scene, Theme } from './types';

const EPS = 1e-6;

/** Invariant checks (GENERATOR.md §7). Returns a list of violations; empty means valid. */
export function validateScene(scene: Scene, theme: Theme): string[] {
  const errs: string[] = [];
  const p = scene.params;
  const sceneRect = { x: 0, y: 0, w: scene.width, h: scene.height };

  if (scene.theme !== theme.id) errs.push(`theme mismatch: ${scene.theme} vs ${theme.id}`);
  if (scene.objects.length !== p.objectCount) {
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

  // geometry: centers inside playable, boxes inside the scene, spacing ≥ 2 × hitRadius
  for (const o of scene.objects) {
    if (!rectContainsPoint(scene.playable, o.x, o.y)) errs.push(`${o.id}: center outside playable`);
    if (!rectInside(aabb(o), sceneRect, 0.5)) errs.push(`${o.id}: box outside scene`);
    if (o.hitRadius <= 0) errs.push(`${o.id}: hitRadius ${String(o.hitRadius)}`);
  }
  for (let i = 0; i < scene.objects.length; i++) {
    const a = scene.objects[i] as Placed;
    for (let j = i + 1; j < scene.objects.length; j++) {
      const b = scene.objects[j] as Placed;
      const need = 2 * Math.max(a.hitRadius, b.hitRadius);
      if (dist2(a.x, a.y, b.x, b.y) < need * need - EPS) {
        errs.push(`${a.id}/${b.id}: centers closer than ${String(need)}`);
      }
    }
  }

  if (scene.mode === 'find') validateFind(scene, theme, errs);
  return errs;
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
