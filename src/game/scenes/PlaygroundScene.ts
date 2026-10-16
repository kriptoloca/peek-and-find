import Phaser from 'phaser';
import { MIN_TAP_TARGET } from '../../config';
import { computeLayout, type Layout, type Rect } from '../layout';

const COLOR_CANVAS = 0x1b1f2a;
const COLOR_SCENE = 0x2e3650;
const COLOR_HUD_PRIMARY = 0x3b7dd8;
const COLOR_HUD_SECONDARY = 0xd8a23b;
const COLOR_SPOT = 0x6fc28a;
const COLOR_TAP = 0xffffff;

/**
 * Epic 1 placeholder: draws the scene square, HUD areas and (in dev builds) a label with the
 * current design size, orientation and whether Spot 5 can be hosted. Replaced by real scenes
 * from Epic 3 on.
 */
export class PlaygroundScene extends Phaser.Scene {
  private gfx!: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text | null = null;

  constructor() {
    super('Playground');
  }

  create(): void {
    this.gfx = this.add.graphics();
    if (import.meta.env.DEV) {
      this.label = this.add
        .text(0, 0, '', {
          fontFamily: 'monospace',
          fontSize: '30px',
          color: '#ffffff',
          backgroundColor: '#000000aa',
          padding: { x: 10, y: 6 },
        })
        .setDepth(10);
    }
    this.scale.on(Phaser.Scale.Events.RESIZE, this.relayout);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.relayout);
    });
    this.relayout();
  }

  /** Arrow property so it can be passed to the scale manager without binding. */
  private readonly relayout = (): void => {
    const { width, height } = this.scale.gameSize;
    this.cameras.main.setViewport(0, 0, width, height);
    this.draw(computeLayout(width, height));
  };

  private fill(r: Rect, color: number, alpha = 1): void {
    this.gfx.fillStyle(color, alpha);
    this.gfx.fillRect(r.x, r.y, r.w, r.h);
  }

  private stroke(r: Rect, color: number, alpha = 1): void {
    this.gfx.lineStyle(4, color, alpha);
    this.gfx.strokeRect(r.x, r.y, r.w, r.h);
  }

  private draw(l: Layout): void {
    const g = this.gfx;
    g.clear();
    this.fill({ x: 0, y: 0, w: l.width, h: l.height }, COLOR_CANVAS);
    this.fill(l.scene, COLOR_SCENE);
    this.fill(l.hud.primary, COLOR_HUD_PRIMARY, 0.45);
    this.fill(l.hud.secondary, COLOR_HUD_SECONDARY, 0.45);

    // Spot 5 preview outlines so the layout can be judged on a phone before Epic 5.
    if (l.spot.canHost) {
      this.stroke(l.spot.a, COLOR_SPOT, 0.9);
      this.stroke(l.spot.b, COLOR_SPOT, 0.9);
    }

    // Minimum tap target sample at the square's center (GDD §10: 72×72 design px).
    const cx = l.scene.x + l.scene.w / 2;
    const cy = l.scene.y + l.scene.h / 2;
    g.lineStyle(3, COLOR_TAP, 0.8);
    g.strokeCircle(cx, cy, MIN_TAP_TARGET / 2);
    g.lineBetween(cx - 20, cy, cx + 20, cy);
    g.lineBetween(cx, cy - 20, cx, cy + 20);

    if (this.label) {
      const spot = l.spot.canHost
        ? `spot ${l.spot.arrangement} ×${l.spot.scale.toFixed(2)}`
        : `spot off (×${l.spot.scale.toFixed(2)})`;
      this.label.setText(
        `${l.width}×${l.height} ${l.orientation} · hud ${l.hud.placement} · ${spot}`,
      );
      this.label.setPosition(l.scene.x + 12, l.scene.y + l.scene.h - this.label.height - 12);
    }
  }
}
