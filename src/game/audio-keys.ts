/** Audio keys (ASSETS.md "Audio"). Phaser-free so tests and the HUD can name sounds. */
export const SFX_NAMES = [
  'tap_correct_1',
  'tap_correct_2',
  'tap_correct_3',
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

/** Correct-tap sound for the n-th find of a scene (pitch rises 1 → 2 → 3 and repeats). */
export function correctSfx(foundIndex: number): SfxName {
  const i = ((foundIndex % 3) + 3) % 3;
  return SFX_NAMES[i] as SfxName;
}

/** Star reveal sound for star number 1..3. */
export function starSfx(star: 1 | 2 | 3): SfxName {
  return `star_${String(star)}` as SfxName;
}
