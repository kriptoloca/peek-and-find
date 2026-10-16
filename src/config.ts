/**
 * Design-space constants. Everything here is in design px (GDD §10):
 * the short side of the canvas is always DESIGN_SHORT, the long side follows the window
 * aspect and is clamped to DESIGN_LONG_MAX.
 */
export const DESIGN_SHORT = 1080;
/** 20:9 covers today's tall phones; wider/taller viewports get letterboxed by Scale.FIT. */
export const DESIGN_LONG_MAX = 2400;

/** Find / Odd One Out scene square. */
export const SCENE_SIZE = 1080;

/** Spot 5 image size (GENERATOR.md §6). */
export const SPOT_W = 1080;
export const SPOT_H = 840;

/** HUD bands above/below the square in portrait. */
export const HUD_BAND_TOP_MAX = 260;
export const HUD_BAND_BOTTOM_MAX = 240;
/** Below this much free space per band the HUD overlays the square instead. */
export const HUD_BAND_MIN = 120;

/** HUD columns left/right of the square in landscape. */
export const HUD_COLUMN_MAX = 420;
export const HUD_COLUMN_MIN = 160;

/** Bar height when the HUD overlays the square (1:1 and near-square). */
export const HUD_OVERLAY_H = 110;

/** Spot 5: thin HUD band, gap between images, side margin in landscape. */
export const SPOT_BAND = 100;
export const SPOT_GAP = 16;
export const SPOT_SIDE_MARGIN = 16;
/** Spot 5 is not scheduled when both images cannot be shown at this scale (GDD §4). */
export const SPOT_MIN_SCALE = 0.8;

/** Hit circle radii (CLAUDE.md coding rules). */
export const HIT_RADIUS_FIND = 40;
export const HIT_RADIUS_SPOT = 60;

/** Minimum tap target (GDD §10). */
export const MIN_TAP_TARGET = 72;
