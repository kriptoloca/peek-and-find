import type { FeelSound } from './feel';

/** Audio keys (ASSETS.md "Audio"). Phaser-free so tests and the HUD can name sounds. */
export const SFX_NAMES = [
  'tap_correct_1',
  'tap_wrong',
  'pop',
  'sparkle',
  'scene_complete',
  'star_1',
  'star_2',
  'star_3',
  'heart_lose',
  'hint_reveal',
  'button',
  'confetti',
  'daily_complete',
] as const;

export type SfxName = (typeof SFX_NAMES)[number];

export const MUSIC_KEY = 'music_loop';

/**
 * Correct-tap sound (GDD v1.8 §3a): one file, its pitch rises with the combo step through
 * detune (feel.ts), so it can keep rising past three finds. The arrival tick in the HUD uses
 * `ARRIVE_SFX` at the same pitch.
 */
export const CORRECT_SFX: SfxName = 'tap_correct_1';
export const ARRIVE_SFX: SfxName = 'sparkle';
/** Wrong tap; the losing tap adds `LOST_SFX` (GDD v1.8 §3a). */
export const WRONG_SFX: SfxName = 'tap_wrong';
export const LOST_SFX: SfxName = 'heart_lose';

/** The file behind each feel gain (feel.ts `GAIN`, `SFX_FILE_DB`). */
export const FEEL_SFX = {
  correct: CORRECT_SFX,
  arrive: ARRIVE_SFX,
  wrong: WRONG_SFX,
  lost: LOST_SFX,
} as const satisfies Record<FeelSound, SfxName>;

/** Star reveal sound for star number 1..3. */
export function starSfx(star: 1 | 2 | 3): SfxName {
  return `star_${String(star)}` as SfxName;
}
