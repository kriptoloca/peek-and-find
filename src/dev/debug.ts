/**
 * Dev-only hooks for the headless smoke test (never imported in production code paths that
 * survive tree-shaking: GameScene calls installDebug() inside `if (import.meta.env.DEV)`).
 */
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
  state: () => {
    level: number;
    mode: string;
    hearts: number;
    status: string;
    remaining: number;
    /** Phaser clock (ms) to compare with wall time in slow headless renderers. */
    now: number;
    /** HUD row sits inside the band the current layout reserves for it. */
    hudInBand: boolean;
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
