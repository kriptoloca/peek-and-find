import Phaser from 'phaser';
import { colorFrame } from '../../data/themes';
import type { Family, Theme } from '../../gen/types';

/** Placeholder frames are square textures of this size; sprites are sized in design px later. */
export const TEX_SIZE = 256;
const PAD = 20;
const OUTLINE = 6;
/** Hue shift of the baked color variants (ASSETS.md recolor pipeline mirrors this). */
const COLOR_SHIFT_DEG = [0, 25, -25] as const;

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
} as const;

type Shape =
  | 'circle'
  | 'square'
  | 'triangle'
  | 'diamond'
  | 'tall'
  | 'wide'
  | 'hexagon'
  | 'star'
  | 'drop'
  | 'capsule'
  | 'cross'
  | 'ring'
  | 'pentagon'
  | 'semicircle'
  | 'arch'
  | 'bolt';

const SHAPES: readonly Shape[] = [
  'circle',
  'square',
  'triangle',
  'diamond',
  'tall',
  'wide',
  'hexagon',
  'star',
  'drop',
  'capsule',
  'cross',
  'ring',
  'pentagon',
  'semicircle',
  'arch',
  'bolt',
];

function shiftHue(color: number, degrees: number): number {
  const rgb = Phaser.Display.Color.IntegerToRGB(color);
  const hsv = Phaser.Display.Color.RGBToHSV(rgb.r, rgb.g, rgb.b);
  const h = (((hsv.h + degrees / 360) % 1) + 1) % 1;
  const out = Phaser.Display.Color.HSVToRGB(h, hsv.s, hsv.v) as Phaser.Types.Display.ColorObject;
  return Phaser.Display.Color.GetColor(out.r, out.g, out.b);
}

function darken(color: number, amount: number): number {
  const c = Phaser.Display.Color.IntegerToColor(color);
  c.darken(amount);
  return c.color;
}

function lighten(color: number, amount: number): number {
  const c = Phaser.Display.Color.IntegerToColor(color);
  c.lighten(amount);
  return c.color;
}

function regularPolygon(
  cx: number,
  cy: number,
  r: number,
  n: number,
  rot = -Math.PI / 2,
): Phaser.Math.Vector2[] {
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < n; i++) {
    const a = rot + (i * 2 * Math.PI) / n;
    pts.push(new Phaser.Math.Vector2(cx + r * Math.cos(a), cy + r * Math.sin(a)));
  }
  return pts;
}

function starPolygon(cx: number, cy: number, r: number, n = 5): Phaser.Math.Vector2[] {
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / n;
    const rr = i % 2 === 0 ? r : r * 0.48;
    pts.push(new Phaser.Math.Vector2(cx + rr * Math.cos(a), cy + rr * Math.sin(a)));
  }
  return pts;
}

/** Draws the silhouette with fill color; used twice (outline pass and fill pass). */
function drawShape(g: Phaser.GameObjects.Graphics, shape: Shape, inset: number): void {
  const s = TEX_SIZE;
  const c = s / 2;
  const r = c - PAD - inset;
  switch (shape) {
    case 'circle':
      g.fillCircle(c, c, r);
      break;
    case 'square':
      g.fillRoundedRect(c - r, c - r, 2 * r, 2 * r, 18);
      break;
    case 'triangle':
      g.fillPoints(regularPolygon(c, c + r * 0.15, r * 1.05, 3), true);
      break;
    case 'diamond':
      g.fillPoints(regularPolygon(c, c, r, 4), true);
      break;
    case 'tall':
      g.fillRoundedRect(c - r * 0.5, c - r, r, 2 * r, 22);
      break;
    case 'wide':
      g.fillRoundedRect(c - r, c - r * 0.5, 2 * r, r, 22);
      break;
    case 'hexagon':
      g.fillPoints(regularPolygon(c, c, r, 6, 0), true);
      break;
    case 'star':
      g.fillPoints(starPolygon(c, c, r), true);
      break;
    case 'drop':
      g.fillCircle(c, c + r * 0.25, r * 0.72);
      g.fillPoints(
        [
          new Phaser.Math.Vector2(c, c - r),
          new Phaser.Math.Vector2(c + r * 0.7, c + r * 0.1),
          new Phaser.Math.Vector2(c - r * 0.7, c + r * 0.1),
        ],
        true,
      );
      break;
    case 'capsule':
      g.fillRoundedRect(c - r, c - r * 0.45, 2 * r, r * 0.9, r * 0.45);
      break;
    case 'cross':
      g.fillRoundedRect(c - r * 0.3, c - r, r * 0.6, 2 * r, 14);
      g.fillRoundedRect(c - r, c - r * 0.3, 2 * r, r * 0.6, 14);
      break;
    case 'ring':
      g.fillCircle(c, c, r);
      break;
    case 'pentagon':
      g.fillPoints(regularPolygon(c, c, r, 5), true);
      break;
    case 'semicircle':
      g.slice(c, c + r * 0.4, r, Math.PI, 0, false);
      g.fillPath();
      break;
    case 'arch':
      g.fillRoundedRect(c - r * 0.8, c - r, r * 1.6, 2 * r, {
        tl: r * 0.8,
        tr: r * 0.8,
        bl: 10,
        br: 10,
      });
      break;
    case 'bolt':
      g.fillPoints(
        [
          new Phaser.Math.Vector2(c + r * 0.2, c - r),
          new Phaser.Math.Vector2(c - r * 0.6, c + r * 0.15),
          new Phaser.Math.Vector2(c - r * 0.05, c + r * 0.15),
          new Phaser.Math.Vector2(c - r * 0.3, c + r),
          new Phaser.Math.Vector2(c + r * 0.6, c - r * 0.2),
          new Phaser.Math.Vector2(c + r * 0.05, c - r * 0.2),
        ],
        true,
      );
      break;
  }
}

function drawFrame(
  scene: Phaser.Scene,
  key: string,
  shape: Shape,
  color: number,
  variant: number,
  asymmetric: boolean,
): void {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const c = TEX_SIZE / 2;
  // outline
  g.fillStyle(darken(color, 45), 1);
  drawShape(g, shape, -OUTLINE);
  // main fill
  g.fillStyle(color, 1);
  drawShape(g, shape, 0);
  // bottom shade: clip-free approximation, a darker copy offset down, then the fill redrawn
  g.fillStyle(darken(color, 18), 1);
  drawShape(g, shape, 10);
  g.fillStyle(color, 1);
  g.save();
  g.translateCanvas(0, -10);
  drawShape(g, shape, 10);
  g.restore();
  if (shape === 'ring') {
    g.fillStyle(0x1b1f2a, 1);
    g.fillCircle(c, c, (c - PAD) * 0.45);
  }
  // highlight
  g.fillStyle(lighten(color, 35), 0.9);
  g.fillCircle(c - 36, c - 44, 16);
  // variant markers: a plain, b white dot, c dark stripe
  if (variant === 1) {
    g.fillStyle(0xffffff, 0.95);
    g.fillCircle(c + 10, c + 20, 22);
  } else if (variant === 2) {
    g.fillStyle(darken(color, 40), 1);
    g.fillRect(c - 70, c + 24, 140, 20);
  }
  // asymmetry marker so flipX is visible on placeholders
  if (asymmetric) {
    g.fillStyle(darken(color, 60), 1);
    g.fillCircle(c + 58, c - 4, 12);
  }
  g.generateTexture(key, TEX_SIZE, TEX_SIZE);
  g.destroy();
}

/** Creates one texture per frame of the theme (base + color variants). Idempotent. */
export function ensureThemeTextures(scene: Phaser.Scene, theme: Theme): void {
  theme.families.forEach((family: Family, fi: number) => {
    const shape = SHAPES[fi % SHAPES.length] as Shape;
    const asymmetric = family.tags.includes('flippable');
    family.variants.forEach((base, vi) => {
      for (let color = 0; color <= family.colors; color++) {
        const tint = shiftHue(family.previewColor, COLOR_SHIFT_DEG[color] ?? 0);
        drawFrame(scene, colorFrame(base, color), shape, tint, vi, asymmetric);
      }
    });
  });
}

function heart(g: Phaser.GameObjects.Graphics, color: number, s: number): void {
  const c = s / 2;
  g.fillStyle(color, 1);
  g.fillCircle(c - s * 0.2, c - s * 0.12, s * 0.24);
  g.fillCircle(c + s * 0.2, c - s * 0.12, s * 0.24);
  g.fillPoints(
    [
      new Phaser.Math.Vector2(c - s * 0.42, c - s * 0.02),
      new Phaser.Math.Vector2(c + s * 0.42, c - s * 0.02),
      new Phaser.Math.Vector2(c, c + s * 0.42),
    ],
    true,
  );
}

/** UI placeholders: hearts, stars, retry, spark, confetti, badge, ring. Idempotent. */
export function ensureUiTextures(scene: Phaser.Scene): void {
  const s = 128;
  const mk = (key: string, draw: (g: Phaser.GameObjects.Graphics) => void, size = s): void => {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    draw(g);
    g.generateTexture(key, size, size);
    g.destroy();
  };
  mk(UI.heart, (g) => {
    heart(g, 0xe63946, s);
  });
  mk(UI.heartEmpty, (g) => {
    heart(g, 0x4a4f63, s);
  });
  mk(UI.star, (g) => {
    g.fillStyle(0xffc857, 1);
    g.fillPoints(starPolygon(s / 2, s / 2, s * 0.46), true);
  });
  mk(UI.starEmpty, (g) => {
    g.fillStyle(0x4a4f63, 1);
    g.fillPoints(starPolygon(s / 2, s / 2, s * 0.46), true);
  });
  mk(UI.retry, (g) => {
    g.lineStyle(14, 0xffffff, 1);
    g.beginPath();
    g.arc(s / 2, s / 2, s * 0.32, -Math.PI * 0.4, Math.PI * 1.35, false);
    g.strokePath();
    g.fillStyle(0xffffff, 1);
    g.fillPoints(
      [
        new Phaser.Math.Vector2(s * 0.62, s * 0.08),
        new Phaser.Math.Vector2(s * 0.84, s * 0.3),
        new Phaser.Math.Vector2(s * 0.56, s * 0.38),
      ],
      true,
    );
  });
  mk(
    UI.spark,
    (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillCircle(16, 16, 14);
    },
    32,
  );
  mk(
    UI.confetti,
    (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillRect(0, 0, 24, 14);
    },
    24,
  );
  mk(UI.badge, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillCircle(s / 2, s / 2, s / 2);
  });
  mk(UI.ring, (g) => {
    g.lineStyle(10, 0xffffff, 1);
    g.strokeCircle(s / 2, s / 2, s / 2 - 6);
  });
}
