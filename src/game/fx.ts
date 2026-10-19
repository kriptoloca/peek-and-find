import type Phaser from 'phaser';
import type { Rect } from './layout';
import { addImage } from './assets';
import {
  COLLECT_FLASH_MS,
  COLLECT_FLY_MS,
  COLLECT_LAND_ALPHA,
  COLLECT_LAND_SIZE,
  COLLECT_POP_MS,
  COLLECT_POP_SCALE,
  WRONG_WOBBLE_CYCLES,
  WRONG_WOBBLE_MS,
  WRONG_WOBBLE_PX,
} from './feel';
import { UI } from './textures/placeholders';

const SPARK_COUNT = 10;
const CONFETTI_COUNT = 48;
const CONFETTI_COLORS = [0xffc857, 0xe63946, 0x4cc9f0, 0x80ed99, 0xf72585, 0xffffff];

/** Correct tap: a ring bursts where the object stood (canvas space, the fx layer). */
export function burstRing(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  cx: number,
  cy: number,
  size: number,
): void {
  const ring = addImage(scene, cx, cy, UI.ring)
    .setDisplaySize(size * 0.9, size * 0.9)
    .setAlpha(0.9);
  layer.add(ring);
  scene.tweens.add({
    targets: ring,
    scale: ring.scale * 1.35,
    alpha: 0,
    duration: 360,
    ease: 'Quad.easeOut',
    onComplete: () => {
      ring.destroy();
    },
  });
}

/** Where a collect flight lands: a HUD icon's canvas center and size. */
export interface FlightDest {
  x: number;
  y: number;
  size: number;
}

/** A collect flight in the air; `finish` lands it at once (a relayout moved its icon). */
export interface Flight {
  finish(): void;
}

/**
 * Collect to HUD (GDD v1.8 §3a): `flyer` (already in the fx layer, at the object's canvas
 * position) flashes white, pops, then flies into the HUD icon `dest()` gives when the flight
 * starts, shrinking and fading. `tint` is the flyer's own tint, restored after the flash (the
 * Spot ring token is green). `slow` stretches the timings (dev builds, `?feelslow=`).
 * `onArrive` runs once, when it lands or when `finish` is called; a level change kills the
 * tweens first, so it never runs late.
 */
export function flyToHud(
  scene: Phaser.Scene,
  flyer: Phaser.GameObjects.Image,
  opts: { dest: () => FlightDest | null; tint?: number; slow?: number },
  onArrive: () => void,
): Flight {
  const k = opts.slow ?? 1;
  let done = false;
  const land = (): void => {
    if (done) return;
    done = true;
    flyer.destroy();
    onArrive();
  };
  flyer.setTintFill(0xffffff);
  scene.time.delayedCall(COLLECT_FLASH_MS * k, () => {
    if (!flyer.active) return;
    if (opts.tint === undefined) flyer.clearTint();
    else flyer.setTint(opts.tint);
  });
  const sx = flyer.scaleX;
  const sy = flyer.scaleY;
  const w0 = Math.max(flyer.displayWidth, 1);
  scene.tweens.add({
    targets: flyer,
    scaleX: sx * COLLECT_POP_SCALE,
    scaleY: sy * COLLECT_POP_SCALE,
    duration: COLLECT_POP_MS * k,
    ease: 'Quad.easeOut',
    onComplete: () => {
      // Read the icon now: a rotation during the pop may have moved it.
      const to = opts.dest();
      if (!to) {
        land();
        return;
      }
      const end = (to.size * COLLECT_LAND_SIZE) / w0;
      scene.tweens.add({
        targets: flyer,
        x: to.x,
        y: to.y,
        scaleX: sx * end,
        scaleY: sy * end,
        alpha: COLLECT_LAND_ALPHA,
        duration: COLLECT_FLY_MS * k,
        ease: 'Cubic.easeIn',
        onComplete: land,
      });
    },
  });
  return {
    finish: () => {
      if (done) return;
      scene.tweens.killTweensOf(flyer);
      land();
    },
  };
}

interface Wobble {
  tween: Phaser.Tweens.Tween;
  x0: number;
}
const WOBBLE_KEY = 'wobble';

/**
 * Wrong tap: the object wobbles ±WRONG_WOBBLE_PX on its own and comes back to rest; failure
 * stays local (GDD v1.8 §3a). A counter tween drives x, so the pop-in scale tween on the same
 * sprite runs on; a new wobble or a slide stops the running one first (`stopWobble`).
 */
export function shakeWrong(scene: Phaser.Scene, sprite: Phaser.GameObjects.Image): void {
  const x0 = stopWobble(sprite);
  const cycles = WRONG_WOBBLE_CYCLES;
  const tween = scene.tweens.addCounter({
    from: 0,
    to: 1,
    duration: WRONG_WOBBLE_MS * 2 * cycles,
    onUpdate: (tw) => {
      if (!sprite.active) return;
      const t = tw.getValue() ?? 0;
      sprite.setX(x0 + WRONG_WOBBLE_PX * Math.sin(t * cycles * 2 * Math.PI));
    },
    onComplete: () => {
      if (!sprite.active) return;
      sprite.setX(x0);
      sprite.setData(WOBBLE_KEY, undefined);
    },
  });
  sprite.setData(WOBBLE_KEY, { tween, x0 } satisfies Wobble);
}

/** Stops a running wobble and puts the sprite back at rest; returns the rest x. */
export function stopWobble(sprite: Phaser.GameObjects.Image): number {
  const w = sprite.getData(WOBBLE_KEY) as Wobble | undefined;
  if (!w) return sprite.x;
  w.tween.stop();
  sprite.setX(w.x0).setData(WOBBLE_KEY, undefined);
  return w.x0;
}

export function sparkle(
  scene: Phaser.Scene,
  x: number,
  y: number,
  layer: Phaser.GameObjects.Container,
): void {
  for (let i = 0; i < SPARK_COUNT; i++) {
    const a = (i / SPARK_COUNT) * Math.PI * 2;
    const d = 60 + (i % 3) * 25;
    const s = addImage(scene, x, y, UI.spark).setScale(0.6).setTint(0xffe9a0);
    layer.add(s);
    scene.tweens.add({
      targets: s,
      x: x + Math.cos(a) * d,
      y: y + Math.sin(a) * d,
      alpha: 0,
      scale: 0.1,
      duration: 420,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        s.destroy();
      },
    });
  }
}

/** Scene-complete confetti falling over a rect. */
export function confetti(
  scene: Phaser.Scene,
  area: Rect,
  layer: Phaser.GameObjects.Container,
): void {
  for (let i = 0; i < CONFETTI_COUNT; i++) {
    const x = area.x + ((i * 97) % area.w);
    const c = addImage(scene, x, area.y - 20 - (i % 6) * 30, UI.confetti)
      .setTint(CONFETTI_COLORS[i % CONFETTI_COLORS.length])
      .setAngle((i * 37) % 360);
    layer.add(c);
    scene.tweens.add({
      targets: c,
      y: area.y + area.h + 40,
      x: x + (i % 2 === 0 ? 1 : -1) * (30 + (i % 5) * 15),
      angle: c.angle + 360,
      duration: 1100 + (i % 7) * 90,
      ease: 'Sine.easeIn',
      onComplete: () => {
        c.destroy();
      },
    });
  }
}

/** Destroys every effect object and its tweens. Call when a new level starts. */
export function clearFx(scene: Phaser.Scene, layer: Phaser.GameObjects.Container): void {
  for (const child of layer.list) scene.tweens.killTweensOf(child);
  layer.removeAll(true);
}
