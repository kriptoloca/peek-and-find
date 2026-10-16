import { SCENE_SIZE } from '../config';
import { SCENE_MARGIN } from './constants';
import type { Band, GenRect, Point } from './types';

/** Playable rect for object centers (GENERATOR.md §4 step 1). */
export function playableRect(width = SCENE_SIZE, height = SCENE_SIZE): GenRect {
  return {
    x: SCENE_MARGIN,
    y: SCENE_MARGIN,
    w: width - 2 * SCENE_MARGIN,
    h: height - 2 * SCENE_MARGIN,
  };
}

/** Depth band by vertical position: 0 back (top), 1 mid, 2 front (bottom). */
export function bandOf(y: number, playable: GenRect): Band {
  const i = Math.floor(((y - playable.y) / playable.h) * 3);
  return (i < 0 ? 0 : i > 2 ? 2 : i) as Band;
}

/** Integer coordinates so every later distance check sees the final numbers. */
export function roundPoints(pts: readonly Point[]): Point[] {
  return pts.map((q) => ({ x: Math.round(q.x), y: Math.round(q.y) }));
}
