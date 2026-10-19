import { describe, expect, it } from 'vitest';
import {
  COLLECT_FLY_MS,
  COLLECT_POP_MS,
  COMBO_STEP_CAP,
  CORRECT_SHAKE_INTENSITY,
  DETUNE_PER_STEP,
  HIT_STOP_MS,
  WIN_BEAT_MS,
  WIN_FALLBACK_MS,
  WIN_SHAKE_INTENSITY,
  comboDetune,
  comboStep,
  correctShakeIntensity,
  playedDb,
  sumDb,
} from '../src/game/feel';

/** GDD v1.8 §3a: the right move is the loudest moment; failure stays local and soft. */
describe('feel', () => {
  it('combo step: first find is 0, rises by one per find in a row, capped', () => {
    expect([1, 2, 3, 4, 5, 9].map(comboStep)).toEqual([0, 1, 2, 3, 3, 3]);
    expect(comboStep(0)).toBe(0);
  });

  it('pitch rises two semitones per step and stops at the cap', () => {
    expect([0, 1, 2, 3, 4].map(comboDetune)).toEqual([0, 200, 400, 600, 600]);
    expect(comboDetune(COMBO_STEP_CAP)).toBe(DETUNE_PER_STEP * COMBO_STEP_CAP);
    expect(comboDetune(-1)).toBe(0);
  });

  it('the screen kick grows with the combo, stays small, and the win kick tops it', () => {
    const steps = [0, 1, 2, 3, 4].map(correctShakeIntensity);
    expect(steps[0]).toBe(CORRECT_SHAKE_INTENSITY);
    for (let i = 1; i < 4; i++) expect(steps[i]).toBeGreaterThan(steps[i - 1] as number);
    expect(steps[4]).toBe(steps[3]);
    expect(steps[3]).toBeLessThanOrEqual(0.005);
    expect(WIN_SHAKE_INTENSITY).toBeGreaterThanOrEqual(steps[3] as number);
    expect(WIN_SHAKE_INTENSITY).toBeLessThanOrEqual(0.005);
  });

  it('as played, success is louder than failure, the losing tap included', () => {
    const correct = playedDb('correct');
    // The file levels are part of it: the wrong-tap and heart files are louder than the correct one.
    expect(correct).toBeGreaterThanOrEqual(playedDb('wrong') + 6);
    expect(correct).toBeGreaterThanOrEqual(playedDb('lost') + 3);
    // The losing tap plays both failure sounds; together they still stay under one correct tap.
    expect(sumDb([playedDb('wrong'), playedDb('lost')])).toBeLessThan(correct);
    // The arrival is the lighter second beat of the same find.
    expect(playedDb('arrive')).toBeLessThan(correct);
    expect(sumDb([-20, -20])).toBeCloseTo(-20 + 10 * Math.log10(2), 6);
  });

  it('timings: a short hit stop; the win a beat after the last landing, never long after', () => {
    expect(HIT_STOP_MS).toBeGreaterThan(0);
    expect(HIT_STOP_MS).toBeLessThanOrEqual(60);
    // The flight is 300-450 ms (juice.md, collect to HUD).
    expect(COLLECT_FLY_MS).toBeGreaterThanOrEqual(300);
    expect(COLLECT_FLY_MS).toBeLessThanOrEqual(450);
    // A felt beat after the landing, but the win comes within a second of the last tap.
    const tapToWin = HIT_STOP_MS + COLLECT_POP_MS + COLLECT_FLY_MS + WIN_BEAT_MS;
    expect(WIN_BEAT_MS).toBeGreaterThanOrEqual(100);
    expect(tapToWin).toBeLessThanOrEqual(1000);
    // The safety net never cuts a normal landing short.
    expect(WIN_FALLBACK_MS).toBeGreaterThan(tapToWin + 300);
  });
});
