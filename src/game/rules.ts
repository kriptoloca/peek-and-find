import { starsFor } from '../gen/difficulty';
import { dist2 } from '../gen/geometry';
import type { Placed, Scene } from '../gen/types';
import { UI } from './ui-keys';

/** Hearts per scene (GDD §6). Reset every scene, no global lives. */
export const HEARTS_PER_SCENE = 3;

export type RoundStatus = 'intro' | 'playing' | 'won' | 'lost';

/** Mutable state of one scene being played. Pure data; the Phaser scene renders it. */
export interface Round {
  scene: Scene;
  hearts: number;
  found: Set<string>;
  wrongTaps: number;
  /** ms timestamp when the timer started (after pop-in); null during intro. */
  startedAt: number | null;
  /** ms timestamp when the last target was found. */
  finishedAt: number | null;
  status: RoundStatus;
  /** ms timestamp when the current freeze (platform pause or the in-game menu) began. */
  pausedAt: number | null;
  /** ms spent frozen so far; the star timer leaves it out. */
  pausedMs: number;
  /** Shuffle twist: 0 = the scene's main layout, i = `scene.shuffles[i - 1]`. */
  layout: number;
  /** True while the sprites slide to the next layout; taps are ignored meanwhile. */
  moving: boolean;
}

/** Something a tap can land on: an object (Find, Odd) or a difference circle (Spot). */
export interface HitTarget {
  id: string;
  x: number;
  y: number;
  hitRadius: number;
  isTarget: boolean;
}

export type TapResult =
  | { kind: 'none' }
  | { kind: 'ignored' }
  | { kind: 'already'; target: HitTarget }
  | { kind: 'correct'; target: HitTarget; remaining: number; won: boolean }
  /** `object` is null when a Spot tap missed every difference (still costs a heart). */
  | { kind: 'wrong'; object: HitTarget | null; hearts: number; lost: boolean };

/** Objects of layout `layout` (0 = main; a missing shuffle layout falls back to the main one). */
export function layoutObjects(scene: Scene, layout: number): readonly Placed[] {
  if (layout <= 0) return scene.objects;
  return scene.shuffles?.[layout - 1] ?? scene.objects;
}

export function layoutCount(scene: Scene): number {
  return 1 + (scene.shuffles?.length ?? 0);
}

export function hitTargets(scene: Scene, layout = 0): readonly HitTarget[] {
  if (scene.spot) {
    return scene.spot.differences.map((d) => ({
      id: d.id,
      x: d.x,
      y: d.y,
      hitRadius: d.hitRadius,
      isTarget: true,
    }));
  }
  return layoutObjects(scene, layout);
}

/** Objects as currently laid out in the round. */
export function roundObjects(r: Round): readonly Placed[] {
  return layoutObjects(r.scene, r.layout);
}

/**
 * Shuffle twist: steps to the next layout and returns it. The caller animates the sprites and
 * sets `moving` around the slide; the tap resolution reads the new layout from then on.
 */
export function advanceLayout(r: Round): readonly Placed[] {
  r.layout = (r.layout + 1) % layoutCount(r.scene);
  return roundObjects(r);
}

export function totalTargets(scene: Scene): number {
  return scene.spot ? scene.spot.differences.length : scene.targets.length;
}

export function newRound(scene: Scene): Round {
  return {
    scene,
    hearts: HEARTS_PER_SCENE,
    found: new Set(),
    wrongTaps: 0,
    startedAt: null,
    finishedAt: null,
    status: 'intro',
    pausedAt: null,
    pausedMs: 0,
    layout: 0,
    moving: false,
  };
}

/** Pop-in finished: input and the star timer start. */
export function startRound(r: Round, now: number): void {
  if (r.status !== 'intro') return;
  r.status = 'playing';
  r.startedAt = now;
  r.pausedAt = null;
  r.pausedMs = 0;
}

/** The game froze (platform pause or the in-game menu, GDD v1.6): the star timer stops. */
export function pauseRound(r: Round, now: number): void {
  if (r.startedAt === null || r.finishedAt !== null || r.pausedAt !== null) return;
  r.pausedAt = now;
}

/** The game runs again: the frozen time is left out of the star timer. */
export function resumeRound(r: Round, now: number): void {
  if (r.pausedAt === null) return;
  r.pausedMs += Math.max(0, now - r.pausedAt);
  r.pausedAt = null;
}

/**
 * Tap resolution (CLAUDE.md coding rules): among the hit circles containing the point, the
 * nearest center wins. Null when the tap hits nothing.
 */
export function resolveTap(objects: readonly HitTarget[], x: number, y: number): HitTarget | null {
  let best: HitTarget | null = null;
  let bestD = Infinity;
  for (const o of objects) {
    const d = dist2(o.x, o.y, x, y);
    if (d <= o.hitRadius * o.hitRadius && d < bestD) {
      best = o;
      bestD = d;
    }
  }
  return best;
}

export function remainingTargets(r: Round): number {
  return totalTargets(r.scene) - r.found.size;
}

/** Applies a tap in scene coordinates. Mutates the round and reports what happened. */
export function applyTap(r: Round, x: number, y: number, now: number): TapResult {
  // Fast players tap while sprites are still popping in: that tap starts the round and counts.
  if (r.status === 'intro') startRound(r, now);
  if (r.status !== 'playing' || r.moving) return { kind: 'ignored' };
  const hit = resolveTap(hitTargets(r.scene, r.layout), x, y);
  if (!hit) {
    // Spot 5: a tap inside an image that hits no difference is a wrong guess (GDD §3 hearts).
    if (r.scene.mode !== 'spot') return { kind: 'none' };
    r.wrongTaps += 1;
    r.hearts = Math.max(0, r.hearts - 1);
    const lost = r.hearts === 0;
    if (lost) r.status = 'lost';
    return { kind: 'wrong', object: null, hearts: r.hearts, lost };
  }
  if (hit.isTarget) {
    if (r.found.has(hit.id)) return { kind: 'already', target: hit };
    r.found.add(hit.id);
    const remaining = remainingTargets(r);
    const won = remaining === 0;
    if (won) {
      r.status = 'won';
      r.finishedAt = now;
    }
    return { kind: 'correct', target: hit, remaining, won };
  }
  r.wrongTaps += 1;
  r.hearts = Math.max(0, r.hearts - 1);
  const lost = r.hearts === 0;
  if (lost) r.status = 'lost';
  return { kind: 'wrong', object: hit, hearts: r.hearts, lost };
}

/**
 * Seconds on the star timer: from pop-in end to the last find (or to `now` while playing),
 * without the time the game was frozen.
 */
export function elapsedSeconds(r: Round, now: number): number {
  if (r.startedAt === null) return 0;
  const end = r.finishedAt ?? r.pausedAt ?? now;
  return Math.max(0, (end - r.startedAt - r.pausedMs) / 1000);
}

export function starsEarned(r: Round, now: number): 1 | 2 | 3 {
  return starsFor(elapsedSeconds(r, now), r.scene.params);
}

export interface PromptCount {
  family: string;
  icon: string;
  total: number;
  remaining: number;
}

/** Per prompt item: how many of that target frame are still to be found. */
export function promptCounts(r: Round): PromptCount[] {
  if (r.scene.prompt.kind === 'odd') {
    return [{ family: 'odd', icon: UI.odd, total: 1, remaining: r.found.size === 0 ? 1 : 0 }];
  }
  if (r.scene.prompt.kind === 'spot') {
    const total = r.scene.prompt.count;
    return [{ family: 'spot', icon: UI.spot, total, remaining: total - r.found.size }];
  }
  if (r.scene.prompt.kind !== 'find') return [];
  return r.scene.prompt.items.map((it) => {
    const foundHere = r.scene.targets.filter(
      (t) => t.family === it.family && t.frame === it.icon && r.found.has(t.id),
    ).length;
    return { family: it.family, icon: it.icon, total: it.count, remaining: it.count - foundHere };
  });
}

/** Rewarded Continue (GDD §3): refill hearts and resume the same scene. */
export function continueRound(r: Round): boolean {
  if (r.status !== 'lost') return false;
  r.hearts = HEARTS_PER_SCENE;
  r.status = 'playing';
  return true;
}

/** Rewarded Hint (GDD §6): the next target still to be found, or null. */
export function hintTarget(r: Round): HitTarget | null {
  return hitTargets(r.scene, r.layout).find((h) => h.isTarget && !r.found.has(h.id)) ?? null;
}
