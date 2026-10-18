import { describe, expect, it } from 'vitest';
import { KITCHEN } from '../src/data/themes';
import { sceneSeed } from '../src/gen/rng';
import { generateScene } from '../src/gen/scene-gen';
import type { Placed } from '../src/gen/types';
import { HEARTS_MAX } from '../src/game/hearts';
import {
  advanceLayout,
  applyTap,
  continueRound,
  elapsedSeconds,
  hintTarget,
  hitTargets,
  layoutCount,
  newRound,
  pauseRound,
  promptCounts,
  remainingTargets,
  resolveTap,
  resumeRound,
  roundObjects,
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
    // the rim point that keeps the most distance from every other object's circle
    const others = r.scene.objects.filter((o) => o.id !== t.id);
    let best = { x: t.x, y: t.y, clearance: -Infinity };
    for (let a = 0; a < 360; a += 10) {
      const x = t.x + Math.cos((a * Math.PI) / 180) * t.hitRadius * 0.98;
      const y = t.y + Math.sin((a * Math.PI) / 180) * t.hitRadius * 0.98;
      const clearance = Math.min(...others.map((o) => Math.hypot(o.x - x, o.y - y) - o.hitRadius));
      if (clearance > best.clearance) best = { x, y, clearance };
    }
    expect(best.clearance).toBeGreaterThan(0);
    const edge = applyTap(r, best.x, best.y, 10);
    expect(edge.kind).toBe('correct');
  });

  it('finds targets, never penalises a repeat tap, and wins on the last one', () => {
    const r = newRound(scene(30, 3));
    startRound(r, 0);
    const targets = [...r.scene.targets];
    expect(remainingTargets(r)).toBe(targets.length);
    const first = applyTap(r, targets[0]!.x, targets[0]!.y, 100);
    expect(first).toMatchObject({ kind: 'correct', remaining: targets.length - 1, won: false });
    expect(applyTap(r, targets[0]!.x, targets[0]!.y, 200)).toMatchObject({ kind: 'already' });
    expect(r.hearts).toBe(HEARTS_MAX);
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

  it('a round starts with the hearts the player carries, clamped to one..three', () => {
    const r = newRound(scene(30, 4), 2);
    startRound(r, 0);
    const wrong = r.scene.objects.filter((o) => !o.isTarget);
    expect(r.hearts).toBe(2);
    applyTap(r, wrong[0]!.x, wrong[0]!.y, 1);
    expect(applyTap(r, wrong[1]!.x, wrong[1]!.y, 2)).toMatchObject({ hearts: 0, lost: true });
    expect(newRound(scene(1), 0).hearts).toBe(1);
    expect(newRound(scene(1), 9).hearts).toBe(HEARTS_MAX);
  });

  it('empty taps do nothing', () => {
    const r = newRound(scene(1));
    startRound(r, 0);
    // (0,0) is in the margin: no object center can be within 40 px of it.
    expect(applyTap(r, 0, 0, 1)).toEqual({ kind: 'none' });
    expect(r.hearts).toBe(HEARTS_MAX);
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
    expect(r.hearts).toBe(HEARTS_MAX);
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

describe('shuffle twist in the round (GDD v1.5 §5a)', () => {
  const shuffleScene = () => {
    const seed = sceneSeed('find', 40, 0, 7);
    return generateScene({ seed, level: 40, mode: 'find', theme: KITCHEN, twist: 'shuffle' });
  };

  it('cycles main → layout 1 → layout 2 → main and resolves taps against the current one', () => {
    const scene = shuffleScene();
    const r = newRound(scene);
    startRound(r, 0);
    expect(layoutCount(scene)).toBe(3);
    expect(r.layout).toBe(0);
    expect(roundObjects(r)).toBe(scene.objects);
    const t0 = scene.targets[0] as Placed;
    const next = advanceLayout(r);
    expect(r.layout).toBe(1);
    expect(next).toBe(scene.shuffles?.[0]);
    const t1 = next.find((o) => o.id === t0.id) as Placed;
    expect(t1.x !== t0.x || t1.y !== t0.y).toBe(true);
    // the old place of the target is now whatever sits there in the new layout
    const atOld = resolveTap(hitTargets(scene, r.layout), t0.x, t0.y);
    expect(atOld?.id === t0.id).toBe(false);
    // the new place counts
    const res = applyTap(r, t1.x, t1.y, 100);
    expect(res.kind).toBe('correct');
    expect(hintTarget(r)?.id).not.toBe(t0.id);
    advanceLayout(r);
    expect(r.layout).toBe(2);
    advanceLayout(r);
    expect(r.layout).toBe(0);
    expect(roundObjects(r)).toBe(scene.objects);
    // a found target stays found across layouts
    expect(applyTap(r, t0.x, t0.y, 200).kind).toBe('already');
  });

  it('ignores taps while the sprites move', () => {
    const scene = shuffleScene();
    const r = newRound(scene);
    startRound(r, 0);
    r.moving = true;
    const t = scene.targets[0] as Placed;
    expect(applyTap(r, t.x, t.y, 50)).toEqual({ kind: 'ignored' });
    expect(r.found.size).toBe(0);
    r.moving = false;
    expect(applyTap(r, t.x, t.y, 60).kind).toBe('correct');
  });

  it('a plain scene has one layout and advancing stays on it', () => {
    const seed = sceneSeed('find', 40, 0, 7);
    const scene = generateScene({ seed, level: 40, mode: 'find', theme: KITCHEN, twist: 'none' });
    const r = newRound(scene);
    expect(layoutCount(scene)).toBe(1);
    expect(advanceLayout(r)).toBe(scene.objects);
    expect(r.layout).toBe(0);
  });
});

describe('frozen time (platform pause, in-game menu; GDD v1.6)', () => {
  it('leaves the frozen time out of the star timer, also across two freezes and the finish', () => {
    const seed = sceneSeed('find', 20, 0, 7);
    const scene = generateScene({ seed, level: 20, mode: 'find', theme: KITCHEN, twist: 'none' });
    const r = newRound(scene);
    startRound(r, 1000);
    expect(elapsedSeconds(r, 3000)).toBe(2);
    pauseRound(r, 3000);
    expect(elapsedSeconds(r, 9000)).toBe(2); // frozen: still 2 s
    pauseRound(r, 5000); // a second pause call while paused changes nothing
    resumeRound(r, 9000);
    expect(elapsedSeconds(r, 10_000)).toBe(3);
    pauseRound(r, 10_000);
    resumeRound(r, 12_000);
    resumeRound(r, 13_000); // a resume without a pause changes nothing
    expect(elapsedSeconds(r, 13_000)).toBe(4);
    for (const target of scene.targets) applyTap(r, target.x, target.y, 14_000);
    expect(r.status).toBe('won');
    expect(elapsedSeconds(r, 99_000)).toBe(5);
    // a freeze after the finish changes nothing (the overlay can sit under a platform pause)
    pauseRound(r, 20_000);
    expect(r.pausedAt).toBeNull();
    resumeRound(r, 50_000);
    expect(elapsedSeconds(r, 99_000)).toBe(5);
    expect(starsEarned(r, 99_000)).toBe(starsEarned(r, 14_000));
  });

  it('a freeze before the pop-in ends is ignored and the round start clears the counters', () => {
    const seed = sceneSeed('find', 20, 1, 7);
    const scene = generateScene({ seed, level: 20, mode: 'find', theme: KITCHEN, twist: 'none' });
    const r = newRound(scene);
    pauseRound(r, 500);
    expect(r.pausedAt).toBeNull();
    resumeRound(r, 900);
    startRound(r, 1000);
    expect(r.pausedMs).toBe(0);
    expect(elapsedSeconds(r, 2000)).toBe(1);
  });
});
