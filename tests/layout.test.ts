import { describe, expect, it } from 'vitest';
import {
  DESIGN_LONG_MAX,
  DESIGN_SHORT,
  HUD_OVERLAY_H,
  SCENE_SIZE,
  SPOT_MIN_SCALE,
} from '../src/config';
import {
  computeLayout,
  designSize,
  layoutForViewport,
  rectsOverlap,
  type Layout,
  type Rect,
} from '../src/game/layout';

const inside = (r: Rect, w: number, h: number): boolean =>
  r.x >= 0 && r.y >= 0 && r.x + r.w <= w + 1 && r.y + r.h <= h + 1;

const PHONE_PORTRAIT = { w: 390, h: 844 }; // iPhone 12–15 CSS px
const PHONE_LANDSCAPE = { w: 844, h: 390 };
const SQUARE = { w: 600, h: 600 };
const DESKTOP = { w: 1920, h: 1080 };
const TABLET = { w: 1024, h: 1366 }; // 3:4

describe('designSize', () => {
  it('keeps the short side at 1080 and clamps the long side', () => {
    // 390×844 is 19.5:9 → long side 2337, inside the clamp
    expect(designSize(PHONE_PORTRAIT.w, PHONE_PORTRAIT.h)).toEqual({
      width: DESIGN_SHORT,
      height: 2337,
    });
    // taller than 20:9 → clamped
    expect(designSize(360, 900)).toEqual({ width: DESIGN_SHORT, height: DESIGN_LONG_MAX });
    expect(designSize(2600, 1000)).toEqual({ width: DESIGN_LONG_MAX, height: DESIGN_SHORT });
    expect(designSize(DESKTOP.w, DESKTOP.h)).toEqual({ width: 1920, height: 1080 });
    expect(designSize(SQUARE.w, SQUARE.h)).toEqual({ width: 1080, height: 1080 });
  });

  it('follows intermediate aspects without clamping', () => {
    expect(designSize(TABLET.w, TABLET.h)).toEqual({ width: 1080, height: 1441 });
    expect(designSize(800, 600)).toEqual({ width: 1440, height: 1080 });
  });

  it('never divides by zero', () => {
    expect(designSize(0, 0)).toEqual({ width: 1080, height: 1080 });
  });
});

function checkCommon(l: Layout): void {
  expect(l.scene.w).toBe(SCENE_SIZE);
  expect(l.scene.h).toBe(SCENE_SIZE);
  expect(inside(l.scene, l.width, l.height)).toBe(true);
  expect(inside(l.hud.primary, l.width, l.height)).toBe(true);
  expect(inside(l.hud.secondary, l.width, l.height)).toBe(true);
  if (l.hud.placement !== 'overlay') {
    expect(rectsOverlap(l.hud.primary, l.scene)).toBe(false);
    expect(rectsOverlap(l.hud.secondary, l.scene)).toBe(false);
  }
  expect(rectsOverlap(l.hud.primary, l.hud.secondary)).toBe(false);
}

describe('computeLayout', () => {
  it('9:16 → bands above/below, Spot stacked at full scale', () => {
    const l = layoutForViewport(PHONE_PORTRAIT.w, PHONE_PORTRAIT.h);
    checkCommon(l);
    expect(l.orientation).toBe('portrait');
    expect(l.hud.placement).toBe('bands');
    expect(l.hud.primary.y + l.hud.primary.h).toBe(l.scene.y);
    expect(l.hud.secondary.y).toBe(l.scene.y + SCENE_SIZE);
    expect(l.spot.canHost).toBe(true);
    expect(l.spot.arrangement).toBe('stacked');
    expect(l.spot.scale).toBe(1);
    expect(rectsOverlap(l.spot.a, l.spot.b)).toBe(false);
    expect(inside(l.spot.a, l.width, l.height)).toBe(true);
    expect(inside(l.spot.b, l.width, l.height)).toBe(true);
  });

  it('16:9 → columns left/right, Spot side by side above the minimum scale', () => {
    const l = layoutForViewport(DESKTOP.w, DESKTOP.h);
    checkCommon(l);
    expect(l.orientation).toBe('landscape');
    expect(l.hud.placement).toBe('columns');
    expect(l.hud.primary.x + l.hud.primary.w).toBe(l.scene.x);
    expect(l.hud.secondary.x).toBe(l.scene.x + SCENE_SIZE);
    expect(l.spot.canHost).toBe(true);
    expect(l.spot.arrangement).toBe('side');
    expect(l.spot.scale).toBeGreaterThanOrEqual(SPOT_MIN_SCALE);
    expect(rectsOverlap(l.spot.a, l.spot.b)).toBe(false);
    expect(inside(l.spot.a, l.width, l.height)).toBe(true);
    expect(inside(l.spot.b, l.width, l.height)).toBe(true);
  });

  it('phone landscape behaves like 16:9', () => {
    const l = layoutForViewport(PHONE_LANDSCAPE.w, PHONE_LANDSCAPE.h);
    checkCommon(l);
    expect(l.hud.placement).toBe('columns');
    expect(l.spot.canHost).toBe(true);
  });

  it('1:1 → HUD overlays the square, Spot is not hosted', () => {
    const l = layoutForViewport(SQUARE.w, SQUARE.h);
    checkCommon(l);
    expect(l.orientation).toBe('square');
    expect(l.hud.placement).toBe('overlay');
    expect(l.scene).toEqual({ x: 0, y: 0, w: SCENE_SIZE, h: SCENE_SIZE });
    expect(l.hud.primary.h).toBe(HUD_OVERLAY_H);
    expect(l.hud.secondary.y + l.hud.secondary.h).toBe(SCENE_SIZE);
    expect(l.spot.canHost).toBe(false);
    expect(l.spot.scale).toBeLessThan(SPOT_MIN_SCALE);
  });

  it('3:4 tablet → bands, Spot stacked but shrunk; still hosted if ≥ 0.8', () => {
    const l = layoutForViewport(TABLET.w, TABLET.h);
    checkCommon(l);
    expect(l.hud.placement).toBe('bands');
    expect(l.spot.arrangement).toBe('stacked');
    expect(l.spot.canHost).toBe(l.spot.scale >= SPOT_MIN_SCALE);
  });

  it('near-square portrait falls back to overlay instead of squeezing the bands', () => {
    const l = computeLayout(1080, 1200);
    checkCommon(l);
    expect(l.hud.placement).toBe('overlay');
  });

  it('is deterministic and symmetric for a sweep of aspects', () => {
    for (let h = 1080; h <= DESIGN_LONG_MAX; h += 60) {
      const a = computeLayout(1080, h);
      const b = computeLayout(1080, h);
      expect(a).toEqual(b);
      checkCommon(a);
      const left = a.scene.x;
      const right = a.width - (a.scene.x + a.scene.w);
      expect(Math.abs(left - right)).toBeLessThanOrEqual(1);
    }
    for (let w = 1080; w <= DESIGN_LONG_MAX; w += 60) {
      const a = computeLayout(w, 1080);
      checkCommon(a);
      const top = a.scene.y;
      const bottom = a.height - (a.scene.y + a.scene.h);
      expect(Math.abs(top - bottom)).toBeLessThanOrEqual(1);
    }
  });
});
