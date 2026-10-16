import {
  DESIGN_LONG_MAX,
  DESIGN_SHORT,
  HUD_BAND_BOTTOM_MAX,
  HUD_BAND_MIN,
  HUD_BAND_TOP_MAX,
  HUD_COLUMN_MAX,
  HUD_COLUMN_MIN,
  HUD_OVERLAY_H,
  SCENE_SIZE,
  SPOT_BAND,
  SPOT_GAP,
  SPOT_H,
  SPOT_MIN_SCALE,
  SPOT_SIDE_MARGIN,
  SPOT_W,
} from '../config';

/** Axis-aligned rectangle in design px. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Size {
  width: number;
  height: number;
}

export type Orientation = 'portrait' | 'square' | 'landscape';

/**
 * Where the HUD lives relative to the scene square:
 * - bands: above (primary) and below (secondary) the square (portrait).
 * - columns: left (primary) and right (secondary) of the square (landscape).
 * - overlay: thin bars inside the square's top (primary) and bottom (secondary) edges (1:1).
 */
export type HudPlacement = 'bands' | 'columns' | 'overlay';

export interface HudLayout {
  placement: HudPlacement;
  /** Prompt bar, hearts, level. */
  primary: Rect;
  /** Hint button and secondary controls. */
  secondary: Rect;
}

export type SpotArrangement = 'stacked' | 'side';

export interface SpotLayout {
  /** False when the images would have to shrink below SPOT_MIN_SCALE (then Spot is not scheduled). */
  canHost: boolean;
  scale: number;
  arrangement: SpotArrangement;
  a: Rect;
  b: Rect;
  hudTop: Rect;
  hudBottom: Rect;
}

export interface Layout {
  width: number;
  height: number;
  orientation: Orientation;
  /** The 1080×1080 scene square for Find / Odd One Out. */
  scene: Rect;
  hud: HudLayout;
  spot: SpotLayout;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function rect(x: number, y: number, w: number, h: number): Rect {
  return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
}

/**
 * Design canvas size for a given viewport: short side DESIGN_SHORT, long side follows the
 * viewport aspect, clamped to [DESIGN_SHORT, DESIGN_LONG_MAX]. Wider than 16:9 or taller than
 * 9:16 viewports get letterboxed by Scale.FIT.
 */
export function designSize(viewW: number, viewH: number): Size {
  const w = Math.max(1, viewW);
  const h = Math.max(1, viewH);
  if (w >= h) {
    const long = clamp(Math.round(DESIGN_SHORT * (w / h)), DESIGN_SHORT, DESIGN_LONG_MAX);
    return { width: long, height: DESIGN_SHORT };
  }
  const long = clamp(Math.round(DESIGN_SHORT * (h / w)), DESIGN_SHORT, DESIGN_LONG_MAX);
  return { width: DESIGN_SHORT, height: long };
}

export function orientationOf(width: number, height: number): Orientation {
  if (width === height) return 'square';
  return width < height ? 'portrait' : 'landscape';
}

function overlayLayout(width: number, height: number): { scene: Rect; hud: HudLayout } {
  const scene = rect((width - SCENE_SIZE) / 2, (height - SCENE_SIZE) / 2, SCENE_SIZE, SCENE_SIZE);
  return {
    scene,
    hud: {
      placement: 'overlay',
      primary: rect(scene.x, scene.y, SCENE_SIZE, HUD_OVERLAY_H),
      secondary: rect(scene.x, scene.y + SCENE_SIZE - HUD_OVERLAY_H, SCENE_SIZE, HUD_OVERLAY_H),
    },
  };
}

function portraitLayout(width: number, height: number): { scene: Rect; hud: HudLayout } {
  const free = height - SCENE_SIZE;
  if (free < 2 * HUD_BAND_MIN) return overlayLayout(width, height);
  const top = Math.min(HUD_BAND_TOP_MAX, Math.floor(free / 2));
  const bottom = Math.min(HUD_BAND_BOTTOM_MAX, free - top);
  const stack = top + SCENE_SIZE + bottom;
  const offset = Math.floor((height - stack) / 2);
  const scene = rect((width - SCENE_SIZE) / 2, offset + top, SCENE_SIZE, SCENE_SIZE);
  return {
    scene,
    hud: {
      placement: 'bands',
      primary: rect(0, offset, width, top),
      secondary: rect(0, scene.y + SCENE_SIZE, width, bottom),
    },
  };
}

function landscapeLayout(width: number, height: number): { scene: Rect; hud: HudLayout } {
  const free = width - SCENE_SIZE;
  if (free < 2 * HUD_COLUMN_MIN) return overlayLayout(width, height);
  const left = Math.min(HUD_COLUMN_MAX, Math.floor(free / 2));
  const right = Math.min(HUD_COLUMN_MAX, free - left);
  const stack = left + SCENE_SIZE + right;
  const offset = Math.floor((width - stack) / 2);
  const scene = rect(offset + left, (height - SCENE_SIZE) / 2, SCENE_SIZE, SCENE_SIZE);
  return {
    scene,
    hud: {
      placement: 'columns',
      primary: rect(offset, 0, left, height),
      secondary: rect(scene.x + SCENE_SIZE, 0, right, height),
    },
  };
}

function spotStacked(width: number, height: number): SpotLayout {
  const availH = height - 2 * SPOT_BAND - SPOT_GAP;
  const scale = Math.min(1, availH / (2 * SPOT_H), width / SPOT_W);
  const w = SPOT_W * scale;
  const h = SPOT_H * scale;
  const total = 2 * h + SPOT_GAP;
  const y0 = (height - total) / 2;
  const x = (width - w) / 2;
  const a = rect(x, y0, w, h);
  const b = rect(x, y0 + h + SPOT_GAP, w, h);
  return {
    canHost: scale >= SPOT_MIN_SCALE,
    scale,
    arrangement: 'stacked',
    a,
    b,
    hudTop: rect(0, 0, width, a.y),
    hudBottom: rect(0, b.y + b.h, width, height - (b.y + b.h)),
  };
}

function spotSide(width: number, height: number): SpotLayout {
  const availW = width - 2 * SPOT_SIDE_MARGIN - SPOT_GAP;
  const availH = height - 2 * SPOT_BAND;
  const scale = Math.min(1, availW / (2 * SPOT_W), availH / SPOT_H);
  const w = SPOT_W * scale;
  const h = SPOT_H * scale;
  const total = 2 * w + SPOT_GAP;
  const x0 = (width - total) / 2;
  const y = (height - h) / 2;
  const a = rect(x0, y, w, h);
  const b = rect(x0 + w + SPOT_GAP, y, w, h);
  return {
    canHost: scale >= SPOT_MIN_SCALE,
    scale,
    arrangement: 'side',
    a,
    b,
    hudTop: rect(0, 0, width, a.y),
    hudBottom: rect(0, a.y + a.h, width, height - (a.y + a.h)),
  };
}

function spotLayout(width: number, height: number, orientation: Orientation): SpotLayout {
  if (orientation === 'portrait') return spotStacked(width, height);
  if (orientation === 'landscape') return spotSide(width, height);
  const stacked = spotStacked(width, height);
  const side = spotSide(width, height);
  return stacked.scale >= side.scale ? stacked : side;
}

/** Pure layout for a design canvas (GDD §10). Call with the values from designSize(). */
export function computeLayout(width: number, height: number): Layout {
  const orientation = orientationOf(width, height);
  const base =
    orientation === 'portrait'
      ? portraitLayout(width, height)
      : orientation === 'landscape'
        ? landscapeLayout(width, height)
        : overlayLayout(width, height);
  return {
    width,
    height,
    orientation,
    scene: base.scene,
    hud: base.hud,
    spot: spotLayout(width, height, orientation),
  };
}

/** Convenience: layout for a viewport in CSS px. */
export function layoutForViewport(viewW: number, viewH: number): Layout {
  const size = designSize(viewW, viewH);
  return computeLayout(size.width, size.height);
}

export function rectContains(r: Rect, x: number, y: number): boolean {
  return x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}
