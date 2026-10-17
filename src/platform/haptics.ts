/**
 * Haptic feedback through the Vibration API. Android Chrome and the Android WebView support it
 * (after a user gesture, which every call here follows); iOS WebKit has no Vibration API, so
 * iPhones silently get nothing, like desktops. Patterns are short so they never feel like an
 * alarm, and the game stays identical without them (GDD: no feature depends on haptics).
 */
export type HapticKind = 'correct' | 'wrong' | 'won' | 'lost';

/** Milliseconds on/off, per Vibration API. Keep every pattern ≤ 200 ms in total. */
export const HAPTIC_PATTERNS: Record<HapticKind, number[]> = {
  correct: [12],
  wrong: [40, 50, 40],
  won: [15, 40, 30],
  lost: [90],
};

type Vibrator = { vibrate?: (pattern: number | number[]) => boolean };

let enabled = true;

/** Platform pause / dev switch: haptics off while paused. */
export function setHapticsEnabled(on: boolean): void {
  enabled = on;
}

export function hapticsSupported(nav: Vibrator | undefined = globalThis.navigator): boolean {
  return nav !== undefined && typeof nav.vibrate === 'function';
}

/** Fires the pattern; returns whether the device accepted it. Never throws. */
export function haptic(
  kind: HapticKind,
  nav: Vibrator | undefined = globalThis.navigator,
): boolean {
  if (!enabled || !hapticsSupported(nav) || !nav?.vibrate) return false;
  try {
    return nav.vibrate(HAPTIC_PATTERNS[kind]) === true;
  } catch {
    return false;
  }
}
