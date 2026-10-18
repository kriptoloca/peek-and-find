/** Texture keys for UI frames. Phaser-free so rules.ts can name prompt icons. */
export const UI = {
  heart: 'ui_heart',
  heartEmpty: 'ui_heart_empty',
  star: 'ui_star',
  starEmpty: 'ui_star_empty',
  retry: 'ui_retry',
  spark: 'ui_spark',
  confetti: 'ui_confetti',
  badge: 'ui_badge',
  ring: 'ui_ring',
  /** "≠" prompt icon for Odd One Out. */
  odd: 'ui_odd',
  /** "⟷5" prompt icon for Spot 5 (Epic 5). */
  spot: 'ui_spot',
  /** Title screen (Epic 7). */
  play: 'ui_play',
  daily: 'ui_daily',
  flame: 'ui_flame',
  check: 'ui_check',
  soundOn: 'ui_sound_on',
  soundOff: 'ui_sound_off',
  musicOn: 'ui_music_on',
  musicOff: 'ui_music_off',
  home: 'ui_home',
  /** Rewarded hint button (Epic 8). */
  hint: 'ui_hint',
  /** Twists (GDD v1.5): HUD marker of a shuffle scene; "?" that hides the prompt in memory. */
  shuffle: 'ui_shuffle',
  memory: 'ui_memory',
} as const;
