/**
 * Feel constants and helpers (GDD v1.8 §3a, `pebblit-game-craft`). The right move is the
 * loudest moment; failure stays local and soft. Every value is a starting point tuned on a
 * phone, kept here so it can be changed without hunting through the scene. Pure, no Phaser.
 */

/** Dev hooks: one feel event of the scene (e2e checks the cascade order and the steps). */
export interface FeelEvent {
  kind: 'correct' | 'arrive' | 'wrong' | 'win';
  /** Scene clock (ms) when it happened. */
  t: number;
  level: number;
  step?: number;
  detune?: number;
  shake?: number;
  lost?: boolean;
}

/** Hit stop on a correct tap: tweens and the scene clock freeze this long (wall clock). */
export const HIT_STOP_MS = 45;

/** Screen kick on a correct tap: camera shake length and base intensity. */
export const CORRECT_SHAKE_MS = 80;
export const CORRECT_SHAKE_INTENSITY = 0.0025;
/** Each combo step adds this share of the base intensity. */
export const SHAKE_STEP_GAIN = 0.25;

/** Screen kick for the level win, after the win beat. */
export const WIN_SHAKE_MS = 120;
export const WIN_SHAKE_INTENSITY = 0.0045;

/** Finds in a row since the last wrong tap; the first find is step 0. */
export const COMBO_STEP_CAP = 3;
/** Pitch rise per combo step, in cents (100 cents = 1 semitone). */
export const DETUNE_PER_STEP = 200;

/** Collect to HUD: the found object pops, then flies into its prompt icon. */
export const COLLECT_POP_MS = 90;
export const COLLECT_POP_SCALE = 1.2;
export const COLLECT_FLY_MS = 380;
/**
 * A found object leaves the board, so its hit circle stops taking taps, except for this long
 * after the find: the flyer still covers the spot (hit stop, pop, the slow start of the ease-in
 * flight), so a double tap on it stays free instead of landing on whatever was under it.
 */
export const FOUND_TAP_GRACE_MS = 300;
/** The flyer lands at this share of the icon size, faded to this alpha. */
export const COLLECT_LAND_SIZE = 0.7;
export const COLLECT_LAND_ALPHA = 0.6;
/** White flash on the found object (a feedback flash, allowed tint). */
export const COLLECT_FLASH_MS = 60;
/** The HUD icon bounces when the object lands. */
export const ARRIVE_BOUNCE_SCALE = 1.25;
export const ARRIVE_BOUNCE_MS = 120;

/**
 * The last find lands first: the win sequence starts this long after the last flight lands
 * (scene clock), a beat of quiet under the tail of the arrival sound (0.27 s).
 */
export const WIN_BEAT_MS = 200;
/**
 * Safety net: if a flight never lands (its tween was killed), the win still starts this long
 * after the winning tap (scene clock), so a round can never hang between won and the overlay.
 */
export const WIN_FALLBACK_MS = 1500;

/** Wrong tap: the object wobbles on its own, the lost heart bumps softly. */
export const WRONG_WOBBLE_PX = 8;
export const WRONG_WOBBLE_CYCLES = 3;
export const WRONG_WOBBLE_MS = 40;
export const HEART_BUMP_SCALE = 1.25;
export const HEART_BUMP_MS = 100;

/**
 * Sound gains, relative to the SFX volume. The files differ in level (SFX_FILE_DB: the wrong-tap
 * and heart files are louder than the correct-tap file), so the gains carry the difference: as
 * played, the correct tap is the loudest sound of a tap (`playedDb`, unit-tested).
 */
export const GAIN = {
  correct: 1.4,
  arrive: 0.6,
  wrong: 0.5,
  lost: 0.45,
} as const;

/** The sound each feel gain is set for (src/game/audio-keys.ts plays these). */
export type FeelSound = keyof typeof GAIN;

/**
 * Mean level (RMS, dBFS) of the files the gains were set for: the synthesized placeholders,
 * measured 2026-10-19 with ffmpeg volumedetect on public/audio/*.ogg. tests/pipeline/audio.test.ts
 * re-measures them, so new sounds (Hasan's drop-in) fail the test until these are updated.
 */
export const SFX_FILE_DB: Record<FeelSound, number> = {
  correct: -17.9,
  arrive: -14.7,
  wrong: -15.3,
  lost: -13.8,
};

/** Level of a feel sound as played, in dB (file level plus gain; the SFX volume is common). */
export function playedDb(sound: FeelSound): number {
  return SFX_FILE_DB[sound] + 20 * Math.log10(GAIN[sound]);
}

/** Level of sounds played together (power sum), in dB. */
export function sumDb(levels: readonly number[]): number {
  return 10 * Math.log10(levels.reduce((sum, db) => sum + 10 ** (db / 10), 0));
}

/** Combo step for the n-th find in a row (n ≥ 1). */
export function comboStep(findsInRow: number): number {
  return Math.max(0, Math.min(COMBO_STEP_CAP, Math.floor(findsInRow) - 1));
}

/** Pitch of the correct-tap and arrival sounds for a combo step, in cents. */
export function comboDetune(step: number): number {
  return DETUNE_PER_STEP * Math.max(0, Math.min(COMBO_STEP_CAP, Math.floor(step)));
}

/** Camera shake intensity of a correct tap for a combo step. */
export function correctShakeIntensity(step: number): number {
  const s = Math.max(0, Math.min(COMBO_STEP_CAP, Math.floor(step)));
  return CORRECT_SHAKE_INTENSITY * (1 + SHAKE_STEP_GAIN * s);
}
