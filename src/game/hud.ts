import type Phaser from 'phaser';
import type { Layout, Rect } from './layout';
import type { PromptCount } from './rules';
import { UI } from './textures/placeholders';

const ICON_MAX = 120;
const HEART_MAX = 72;
const ITEM_GAP = 24;
const BADGE_SIZE = 52;
const COLOR_BADGE_TEXT = '#1b1f2a';
const COLOR_LEVEL_TEXT = '#ffffff';

interface PromptItemView {
  icon: Phaser.GameObjects.Image;
  badge: Phaser.GameObjects.Image;
  count: Phaser.GameObjects.Text;
  key: string;
}

/**
 * Text-free HUD (GDD §3, §9): prompt bar with target icons and ×N badges, hearts, level number.
 * Positions follow the layout's HUD placement: bands/overlay → one row, columns → one column.
 */
export class Hud {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly hearts: Phaser.GameObjects.Image[] = [];
  private readonly level: Phaser.GameObjects.Text;
  private items: PromptItemView[] = [];
  private layoutCache: Layout | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(20);
    for (let i = 0; i < 3; i++) {
      const h = scene.add.image(0, 0, UI.heart);
      this.hearts.push(h);
      this.container.add(h);
    }
    this.level = scene.add
      .text(0, 0, '1', {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '56px',
        fontStyle: 'bold',
        color: COLOR_LEVEL_TEXT,
      })
      .setOrigin(0.5);
    this.container.add(this.level);
  }

  setLevel(level: number): void {
    this.level.setText(String(level));
  }

  setHearts(n: number): void {
    this.hearts.forEach((h, i) => h.setTexture(i < n ? UI.heart : UI.heartEmpty));
  }

  /** Brief scale bump on the heart that was just lost. */
  pulseHeart(index: number): void {
    const h = this.hearts[index];
    if (!h) return;
    this.scene.tweens.add({ targets: h, scale: h.scale * 1.4, yoyo: true, duration: 120 });
  }

  setPrompt(counts: PromptCount[]): void {
    const keys = counts.map((c) => c.icon).join('|');
    if (this.items.map((i) => i.key).join('|') !== keys) {
      for (const it of this.items) {
        it.icon.destroy();
        it.badge.destroy();
        it.count.destroy();
      }
      this.items = counts.map((c) => {
        const icon = this.scene.add.image(0, 0, c.icon);
        const badge = this.scene.add.image(0, 0, UI.badge);
        const count = this.scene.add
          .text(0, 0, '', {
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '34px',
            fontStyle: 'bold',
            color: COLOR_BADGE_TEXT,
          })
          .setOrigin(0.5);
        this.container.add([icon, badge, count]);
        return { icon, badge, count, key: c.icon };
      });
      if (this.layoutCache) this.apply(this.layoutCache);
    }
    counts.forEach((c, i) => {
      const it = this.items[i];
      if (!it) return;
      it.count.setText(`×${String(c.remaining)}`);
      const done = c.remaining === 0;
      // A "×1" badge is noise: the badge only appears when there is something to count.
      const showBadge = c.total > 1;
      it.icon.setAlpha(done ? 0.35 : 1);
      it.badge.setVisible(showBadge).setAlpha(done ? 0.35 : 1);
      it.count.setVisible(showBadge).setAlpha(done ? 0.35 : 1);
    });
  }

  /** Teaching levels: the prompt icon breathes a few times so the eye lands on "find this". */
  teachPulse(repeats = 2): void {
    for (const it of this.items) {
      this.scene.tweens.add({
        targets: [it.icon],
        scale: '*=1.18',
        yoyo: true,
        repeat: repeats,
        duration: 260,
        ease: 'Sine.easeInOut',
      });
    }
  }

  /** Pop the badge of the prompt item that just decremented. */
  pulsePrompt(icon: string): void {
    const it = this.items.find((i) => i.key === icon);
    if (!it) return;
    this.scene.tweens.add({
      targets: [it.icon, it.badge, it.count],
      scale: '*=1.2',
      yoyo: true,
      duration: 110,
    });
  }

  apply(l: Layout): void {
    this.layoutCache = l;
    const p = l.hud.primary;
    if (l.hud.placement === 'columns') this.applyColumn(p);
    else this.applyRow(p);
  }

  private applyRow(p: Rect): void {
    const icon = Math.min(ICON_MAX, p.h - 16);
    const heart = Math.min(HEART_MAX, p.h - 24);
    const cy = p.y + p.h / 2;
    this.level.setPosition(p.x + 70, cy).setFontSize(Math.min(56, p.h * 0.5));
    this.hearts.forEach((h, i) => {
      h.setDisplaySize(heart, heart).setPosition(p.x + p.w - 48 - i * (heart + 8), cy);
    });
    const n = this.items.length;
    const total = n * icon + (n - 1) * ITEM_GAP;
    let x = p.x + p.w / 2 - total / 2 + icon / 2;
    for (const it of this.items) {
      this.placeItem(it, x, cy, icon);
      x += icon + ITEM_GAP;
    }
  }

  private applyColumn(p: Rect): void {
    const cx = p.x + p.w / 2;
    const icon = Math.min(ICON_MAX, p.w - 40);
    this.level.setPosition(cx, p.y + 90).setFontSize(56);
    const heart = Math.min(HEART_MAX, (p.w - 40) / 3 - 8);
    const hy = p.y + p.h - 90;
    this.hearts.forEach((h, i) => {
      h.setDisplaySize(heart, heart).setPosition(cx + (i - 1) * (heart + 8), hy);
    });
    let y = p.y + 240;
    for (const it of this.items) {
      this.placeItem(it, cx, y, icon);
      y += icon + ITEM_GAP + 20;
    }
  }

  private placeItem(it: PromptItemView, x: number, y: number, icon: number): void {
    it.icon.setDisplaySize(icon, icon).setPosition(x, y).setScale(it.icon.scaleX, it.icon.scaleY);
    const bx = x + icon * 0.42;
    const by = y + icon * 0.38;
    it.badge.setDisplaySize(BADGE_SIZE, BADGE_SIZE).setPosition(bx, by);
    it.count.setPosition(bx, by + 1).setFontSize(Math.round(BADGE_SIZE * 0.6));
  }
}
