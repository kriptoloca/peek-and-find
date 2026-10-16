import { starsFor } from '../gen/difficulty';
import { dist2 } from '../gen/geometry';
import type { Placed, Scene } from '../gen/types';

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
}

export type TapResult =
  | { kind: 'none' }
  | { kind: 'ignored' }
  | { kind: 'already'; target: Placed }
  | { kind: 'correct'; target: Placed; remaining: number; won: boolean }
  | { kind: 'wrong'; object: Placed; hearts: number; lost: boolean };

export function newRound(scene: Scene): Round {
  return {
    scene,
    hearts: HEARTS_PER_SCENE,
    found: new Set(),
    wrongTaps: 0,
    startedAt: null,
    finishedAt: null,
    status: 'intro',
  };
}

/** Pop-in finished: input and the star timer start. */
export function startRound(r: Round, now: number): void {
  if (r.status !== 'intro') return;
  r.status = 'playing';
  r.startedAt = now;
}

/**
 * Tap resolution (CLAUDE.md coding rules): among the hit circles containing the point, the
 * nearest center wins. Null when the tap hits nothing.
 */
export function resolveTap(objects: readonly Placed[], x: number, y: number): Placed | null {
  let best: Placed | null = null;
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
  return r.scene.targets.length - r.found.size;
}

/** Applies a tap in scene coordinates. Mutates the round and reports what happened. */
export function applyTap(r: Round, x: number, y: number, now: number): TapResult {
  if (r.status !== 'playing') return { kind: 'ignored' };
  const hit = resolveTap(r.scene.objects, x, y);
  if (!hit) return { kind: 'none' };
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

/** Seconds on the star timer: from pop-in end to the last find (or to `now` while playing). */
export function elapsedSeconds(r: Round, now: number): number {
  if (r.startedAt === null) return 0;
  const end = r.finishedAt ?? now;
  return Math.max(0, (end - r.startedAt) / 1000);
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
  if (r.scene.prompt.kind !== 'find') return [];
  return r.scene.prompt.items.map((it) => {
    const foundHere = r.scene.targets.filter(
      (t) => t.family === it.family && t.frame === it.icon && r.found.has(t.id),
    ).length;
    return { family: it.family, icon: it.icon, total: it.count, remaining: it.count - foundHere };
  });
}
