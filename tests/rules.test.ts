import { describe, expect, it } from 'vitest';
import { KITCHEN } from '../src/data/themes';
import { sceneSeed } from '../src/gen/rng';
import { generateScene } from '../src/gen/scene-gen';
import type { Placed } from '../src/gen/types';
import {
  HEARTS_PER_SCENE,
  applyTap,
  continueRound,
  elapsedSeconds,
  hintTarget,
  newRound,
  promptCounts,
  remainingTargets,
  resolveTap,
  startRound,
  starsEarned,
} from '../src/game/rules';

function obj(id: string, x: number, y: number, isTarget: boolean, hitRadius = 40): Placed {
  return {
    id,
    family: 'mug',
    frame: 'kitchen_mug_a',
    x,
    y,
    size: 100,
    scale: 1,
    flipX: false,
    z: y,
    band: 1,
    isTarget,
    isDecoy: false,
    hitRadius,
  };
}

function scene(level: number, seed = 1) {
  return generateScene({
    seed: sceneSeed('find', level, seed, 1),
    level,
    mode: 'find',
    theme: KITCHEN,
  });
}

describe('resolveTap', () => {
  it('returns null outside every circle', () => {
    expect(resolveTap([obj('a', 100, 100, true)], 200, 200)).toBeNull();
    expect(resolveTap([obj('a', 100, 100, true)], 141, 100)).toBeNull();
  });

  it('accepts a tap on the circle edge and picks the nearest center when circles touch', () => {
    const a = obj('a', 100, 100, true);
    const b = obj('b', 180, 100, false);
    expect(resolveTap([a, b], 140, 100)).toBe(a); // exactly on both edges → tie → first nearest kept
    expect(resolveTap([a, b], 139, 100)).toBe(a);
    expect(resolveTap([a, b], 141, 100)).toBe(b);
    expect(resolveTap([a, b], 100, 139)).toBe(a);
  });
});

describe('round flow', () => {
  it('a tap during the pop-in starts the round and counts; startRound is idempotent', () => {
    const r = newRound(scene(1));
    const t = r.scene.targets[0]!;
    const res = applyTap(r, t.x, t.y, 1000);
    expect(res.kind).toBe('correct');
    expect(r.status).toBe('won');
    expect(r.startedAt).toBe(1000);
    const r2 = newRound(scene(1));
    startRound(r2, 1000);
    startRound(r2, 5000);
    expect(r2.startedAt).toBe(1000);
    expect(elapsedSeconds(r2, 3500)).toBe(2.5);
  });

  it('a tap anywhere on a big sprite counts (hit radius follows the sprite size)', () => {
    const r = newRound(scene(12));
    startRound(r, 0);
    const t = r.scene.targets[0]!;
    expect(t.hitRadius).toBeGreaterThanOrEqual(t.size / 2);
    expect(t.hitRadius).toBeGreaterThanOrEqual(40);
    const edge = applyTap(r, t.x + t.hitRadius * 0.98, t.y, 10);
    expect(edge.kind === 'correct' || edge.kind === 'wrong').toBe(true);
    if (edge.kind === 'wrong') {
      // only a nearer neighbour may claim the tap, never empty space
      expect(edge.object).not.toBeNull();
    }
  });

  it('finds targets, never penalises a repeat tap, and wins on the last one', () => {
    const r = newRound(scene(30, 3));
    startRound(r, 0);
    const targets = [...r.scene.targets];
    expect(remainingTargets(r)).toBe(targets.length);
    const first = applyTap(r, targets[0]!.x, targets[0]!.y, 100);
    expect(first).toMatchObject({ kind: 'correct', remaining: targets.length - 1, won: false });
    expect(applyTap(r, targets[0]!.x, targets[0]!.y, 200)).toMatchObject({ kind: 'already' });
    expect(r.hearts).toBe(HEARTS_PER_SCENE);
    for (let i = 1; i < targets.length - 1; i++) applyTap(r, targets[i]!.x, targets[i]!.y, 300);
    const last = targets[targets.length - 1]!;
    const res = applyTap(r, last.x, last.y, 5000);
    expect(res).toMatchObject({ kind: 'correct', remaining: 0, won: true });
    expect(r.status).toBe('won');
    expect(r.finishedAt).toBe(5000);
    expect(applyTap(r, last.x, last.y, 6000)).toEqual({ kind: 'ignored' });
  });

  it('wrong taps cost hearts and the third one loses the round', () => {
    const r = newRound(scene(30, 4));
    startRound(r, 0);
    const wrong = r.scene.objects.filter((o) => !o.isTarget);
    expect(wrong.length).toBeGreaterThanOrEqual(3);
    expect(applyTap(r, wrong[0]!.x, wrong[0]!.y, 1)).toMatchObject({
      kind: 'wrong',
      hearts: 2,
      lost: false,
    });
    expect(applyTap(r, wrong[1]!.x, wrong[1]!.y, 2)).toMatchObject({
      kind: 'wrong',
      hearts: 1,
      lost: false,
    });
    expect(applyTap(r, wrong[2]!.x, wrong[2]!.y, 3)).toMatchObject({
      kind: 'wrong',
      hearts: 0,
      lost: true,
    });
    expect(r.status).toBe('lost');
    expect(r.wrongTaps).toBe(3);
    const t = r.scene.targets[0]!;
    expect(applyTap(r, t.x, t.y, 4)).toEqual({ kind: 'ignored' });
  });

  it('empty taps do nothing', () => {
    const r = newRound(scene(1));
    startRound(r, 0);
    // (0,0) is in the margin: no object center can be within 40 px of it.
    expect(applyTap(r, 0, 0, 1)).toEqual({ kind: 'none' });
    expect(r.hearts).toBe(HEARTS_PER_SCENE);
  });

  it('stars follow the level thresholds on the timer', () => {
    const r = newRound(scene(1));
    startRound(r, 0);
    const t = r.scene.targets[0]!;
    applyTap(r, t.x, t.y, 7000);
    expect(starsEarned(r, 99999)).toBe(3);
    const r2 = newRound(scene(1));
    startRound(r2, 0);
    applyTap(r2, t.x, t.y, 12000);
    expect(starsEarned(r2, 99999)).toBe(2);
    const r3 = newRound(scene(1));
    startRound(r3, 0);
    applyTap(r3, t.x, t.y, 20000);
    expect(starsEarned(r3, 99999)).toBe(1);
  });

  it('prompt counts track remaining per target frame', () => {
    const r = newRound(scene(40, 8));
    startRound(r, 0);
    const before = promptCounts(r);
    expect(before.reduce((s, c) => s + c.remaining, 0)).toBe(r.scene.targets.length);
    const t = r.scene.targets[0]!;
    applyTap(r, t.x, t.y, 1);
    const after = promptCounts(r);
    const item = after.find((c) => c.icon === t.frame)!;
    const was = before.find((c) => c.icon === t.frame)!;
    expect(item.remaining).toBe(was.remaining - 1);
  });
});

describe('rewarded helpers', () => {
  it('continueRound refills hearts only from the lost state', () => {
    const r = newRound(scene(30, 4));
    startRound(r, 0);
    expect(continueRound(r)).toBe(false);
    const wrong = r.scene.objects.filter((o) => !o.isTarget);
    for (let i = 0; i < 3; i++) applyTap(r, wrong[i]!.x, wrong[i]!.y, i);
    expect(r.status).toBe('lost');
    expect(continueRound(r)).toBe(true);
    expect(r.hearts).toBe(HEARTS_PER_SCENE);
    expect(r.status).toBe('playing');
    const t = r.scene.targets[0]!;
    expect(applyTap(r, t.x, t.y, 10).kind).toBe('correct');
  });

  it('hintTarget returns a remaining target and null when everything is found', () => {
    const r = newRound(scene(1));
    startRound(r, 0);
    const h = hintTarget(r)!;
    expect(h.isTarget).toBe(true);
    applyTap(r, h.x, h.y, 1);
    expect(hintTarget(r)).toBeNull();
  });
});
