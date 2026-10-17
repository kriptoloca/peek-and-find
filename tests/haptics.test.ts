import { describe, expect, it } from 'vitest';
import {
  HAPTIC_PATTERNS,
  haptic,
  hapticsSupported,
  setHapticsEnabled,
} from '../src/platform/haptics';

describe('haptics', () => {
  it('patterns are short taps, never alarms', () => {
    for (const [kind, p] of Object.entries(HAPTIC_PATTERNS)) {
      const total = p.reduce((a, b) => a + b, 0);
      expect(total, kind).toBeLessThanOrEqual(200);
      expect(
        p.every((ms) => ms > 0 && ms <= 100),
        kind,
      ).toBe(true);
    }
  });

  it('detects support and fires the pattern of the kind', () => {
    const calls: (number | number[])[] = [];
    const nav = { vibrate: (p: number | number[]): boolean => (calls.push(p), true) };
    expect(hapticsSupported(nav)).toBe(true);
    expect(haptic('correct', nav)).toBe(true);
    expect(haptic('wrong', nav)).toBe(true);
    expect(calls).toEqual([HAPTIC_PATTERNS.correct, HAPTIC_PATTERNS.wrong]);
  });

  it('is a silent no-op without the API (iOS, desktop) and when the device refuses', () => {
    expect(hapticsSupported({})).toBe(false);
    expect(hapticsSupported(undefined)).toBe(false);
    expect(haptic('won', {})).toBe(false);
    expect(haptic('won', undefined)).toBe(false);
    expect(
      haptic('lost', {
        vibrate: () => {
          throw new Error('denied');
        },
      }),
    ).toBe(false);
    expect(haptic('lost', { vibrate: () => false })).toBe(false);
  });

  it('can be switched off (platform pause) and on again', () => {
    const nav = { vibrate: (): boolean => true };
    setHapticsEnabled(false);
    expect(haptic('correct', nav)).toBe(false);
    setHapticsEnabled(true);
    expect(haptic('correct', nav)).toBe(true);
  });
});
