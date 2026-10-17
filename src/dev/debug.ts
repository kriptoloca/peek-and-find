/**
 * Dev-only hooks for the headless smoke test (never imported in production code paths that
 * survive tree-shaking: GameScene calls installDebug() inside `if (import.meta.env.DEV)`).
 */
import type { AudioDebug } from '../game/audio';

export interface DebugPoint {
  id: string;
  x: number;
  y: number;
  /** Screen px: sprite longest side and tap radius (objects only). */
  size?: number;
  r?: number;
  isTarget?: boolean;
}

/** One Spot difference with its center in both images (screen px) and its tap radius. */
export interface DebugDifference {
  id: string;
  kind: string;
  a: DebugPoint;
  b: DebugPoint;
  r: number;
}

export interface PeekDebug {
  /** Screen (CSS px) centers of the remaining targets. */
  targets: () => DebugPoint[];
  /** Screen centers of a few non-target objects. */
  wrong: () => DebugPoint[];
  /** Every object of the current scene (Find/Odd) with size and tap radius in screen px. */
  objects: () => DebugPoint[];
  /** The five Spot differences in both images; empty outside Spot. */
  differences: () => DebugDifference[];
  /** Screen center of the HUD home button (back to the Title). */
  home: () => DebugPoint;
  /** Screen center of the hint bulb, null while hidden (no rewarded ads). */
  hintCenter: () => DebugPoint | null;
  /** Screen centers of the fail overlay buttons, null unless the round is lost. */
  retryCenter: () => DebugPoint | null;
  continueCenter: () => DebugPoint | null;
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
    /** Stars the current round earns at this moment (1–3 while playing, final once won). */
    stars: number;
    /** Phaser clock (ms) to compare with wall time in slow headless renderers. */
    now: number;
    /** HUD row sits inside the band the current layout reserves for it. */
    hudInBand: boolean;
    /** Loaded atlas texture keys (empty with runtime placeholders). */
    atlasKeys: string[];
    audio: AudioDebug;
    /** Frame rate the game loop actually achieves (headless CI runs slowly). */
    fps: number;
    renderer: 'webgl' | 'canvas';
    /** Frame (canvas outside the scene) as #rrggbb; follows the theme. */
    frameColor: string;
  };
}

/** Title screen hooks (dev builds): tap targets in screen px, toggle state, audio state. */
export interface PeekTitleDebug {
  positions: () => Record<'play' | 'daily' | 'sound' | 'music', DebugPoint>;
  state: () => { sound: boolean; music: boolean; dailyDone: boolean; streak: number };
  audio: () => AudioDebug;
  /** Lifecycle messages sent to the platform so far, in order. */
  messages: () => string[];
}

declare global {
  interface Window {
    __peekDebug?: PeekDebug;
    __peekTitle?: PeekTitleDebug;
  }
}

export function installTitleDebug(d: PeekTitleDebug): void {
  window.__peekTitle = d;
}

/** Called on the Title's shutdown, so a stale hook never answers for a scene that is gone. */
export function uninstallTitleDebug(): void {
  delete window.__peekTitle;
}

export function installDebug(d: PeekDebug): void {
  window.__peekDebug = d;
}

export function uninstallDebug(): void {
  delete window.__peekDebug;
}
