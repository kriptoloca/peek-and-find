import type Phaser from 'phaser';
import type { Rect } from './layout';
import { UI } from './textures/placeholders';

const SPARK_COUNT = 10;
const CONFETTI_COUNT = 48;
const CONFETTI_COLORS = [0xffc857, 0xe63946, 0x4cc9f0, 0x80ed99, 0xf72585, 0xffffff];

/** Correct tap: quick scale pop, then the sprite settles dimmed with a ring. */
export function popCorrect(
  scene: Phaser.Scene,
  sprite: Phaser.GameObjects.Image,
  layer: Phaser.GameObjects.Container,
): void {
  const sx = sprite.scaleX;
  const sy = sprite.scaleY;
  scene.tweens.add({
    targets: sprite,
    scaleX: sx * 1.25,
    scaleY: sy * 1.25,
    duration: 110,
    yoyo: true,
    ease: 'Quad.easeOut',
    onComplete: () => {
      sprite.setScale(sx, sy).setAlpha(0.45);
    },
  });
  const ring = scene.add
    .image(sprite.x, sprite.y, UI.ring)
    .setDisplaySize(sprite.displayWidth * 0.9, sprite.displayWidth * 0.9)
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

/** Wrong tap: horizontal shake. */
export function shakeWrong(scene: Phaser.Scene, sprite: Phaser.GameObjects.Image): void {
  const x0 = sprite.x;
  scene.tweens.add({
    targets: sprite,
    x: x0 + 12,
    duration: 40,
    yoyo: true,
    repeat: 3,
    onComplete: () => {
      sprite.setX(x0);
    },
  });
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
    const s = scene.add.image(x, y, UI.spark).setScale(0.6).setTint(0xffe9a0);
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
    const c = scene.add
      .image(x, area.y - 20 - (i % 6) * 30, UI.confetti)
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
