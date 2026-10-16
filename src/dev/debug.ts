/**
 * Dev-only hooks for the headless smoke test (never imported in production code paths that
 * survive tree-shaking: GameScene calls installDebug() inside `if (import.meta.env.DEV)`).
 */
import type { AudioDebug } from '../game/audio';

export interface DebugPoint {
  id: string;
  x: number;
  y: number;
}

export interface PeekDebug {
  /** Screen (CSS px) centers of the remaining targets. */
  targets: () => DebugPoint[];
  /** Screen centers of a few non-target objects. */
  wrong: () => DebugPoint[];
  /** Dev-only levers for the headless checks. */
  simulatePause: (paused: boolean) => void;
  tapHint: () => void;
  tapContinue: () => void;
  state: () => {
    level: number;
    /** Level of the scene being played (differs from `level` in the daily chain). */
    sceneLevel: number;
    mode: string;
    theme: string;
    bigScene: boolean;
    scenesPlayed: number;
    devMenuOpen: boolean;
    dailyIndex: number | null;
    platformId: string;
    interstitialSupported: boolean;
    rewardedSupported: boolean;
    adsShown: number;
    hintUses: number;
    continueUses: number;
    paused: boolean;
    adInProgress: boolean;
    streak: number;
    lastDailyDate: string | null;
    hearts: number;
    status: string;
    remaining: number;
    /** Phaser clock (ms) to compare with wall time in slow headless renderers. */
    now: number;
    /** HUD row sits inside the band the current layout reserves for it. */
    hudInBand: boolean;
    /** Loaded atlas texture keys (empty with runtime placeholders). */
    atlasKeys: string[];
    audio: AudioDebug;
  };
}

declare global {
  interface Window {
    __peekDebug?: PeekDebug;
  }
}

export function installDebug(d: PeekDebug): void {
  window.__peekDebug = d;
}
