import Phaser from 'phaser';
import type { Layout, Rect } from './layout';
import type { PromptCount } from './rules';
import { addImage, fitImage, setImageFrame } from './assets';
import { UI } from './textures/placeholders';

const ICON_MAX = 120;
const HEART_MAX = 72;
const ITEM_GAP = 24;
const BADGE_SIZE = 52;
const HINT_SIZE = 110;
/** Home button (GDD v1.3): same size rule as the hint, opposite end of the secondary bar. */
const HOME_SIZE = 96;
/** 1:1 only: the HUD bars sit inside the square, over the scene; a dim strip separates them. */
const HUD_BACKING_ALPHA = 0.45;
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
  private readonly backing: Phaser.GameObjects.Graphics;
  private readonly hearts: Phaser.GameObjects.Image[] = [];
  private readonly level: Phaser.GameObjects.Text;
  private items: PromptItemView[] = [];
  private readonly hint: Phaser.GameObjects.Image;
  private onHintTap: (() => void) | null = null;
  private readonly home: Phaser.GameObjects.Image;
  private onHomeTap: (() => void) | null = null;
  private layoutCache: Layout | null = null;
  /** True while the Spot 5 bands are in use; re-applies must keep using them. */
  private spotMode = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(20);
    this.backing = scene.add.graphics();
    this.container.add(this.backing);
    for (let i = 0; i < 3; i++) {
      const h = addImage(scene, 0, 0, UI.heart);
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
    this.hint = addImage(scene, 0, 0, UI.hint)
      .setVisible(false)
      .setInteractive({ useHandCursor: true });
    this.hint.on(Phaser.Input.Events.POINTER_UP, () => {
      this.onHintTap?.();
    });
    this.container.add(this.hint);
    this.home = addImage(scene, 0, 0, UI.home).setInteractive({ useHandCursor: true });
    this.home.on(Phaser.Input.Events.POINTER_UP, () => {
      this.onHomeTap?.();
    });
    this.container.add(this.home);
  }

  /** Home button (GDD v1.3): back to the Title at any time; the scene decides what that means. */
  setHome(onTap: (() => void) | null): void {
    this.onHomeTap = onTap;
  }

  /** True when a canvas point lands on the home button (so the scene ignores it). */
  hitsHome(x: number, y: number): boolean {
    const r = this.home.displayWidth / 2 + 10;
    return (x - this.home.x) ** 2 + (y - this.home.y) ** 2 <= r * r;
  }

  /** Canvas (design px) center of the home button; dev hooks turn it into a screen point. */
  homeCenter(): { x: number; y: number } {
    return { x: this.home.x, y: this.home.y };
  }

  private placeHome(sec: Rect, placement: 'row' | 'column'): void {
    const size = Math.min(HOME_SIZE, Math.max(64, (placement === 'row' ? sec.h : sec.w) - 24));
    this.home.setDisplaySize(size, size);
    if (placement === 'column') this.home.setPosition(sec.x + sec.w / 2, sec.y + 90);
    else this.home.setPosition(sec.x + size / 2 + 24, sec.y + sec.h / 2);
  }

  /** Rewarded hint button (GDD §6): shown only when the platform supports rewarded ads. */
  setHint(visible: boolean, onTap: (() => void) | null): void {
    this.hint.setVisible(visible);
    this.onHintTap = onTap;
    this.reapply();
  }

  /** Canvas center of the hint button, null while it is hidden (dev hooks). */
  hintCenter(): { x: number; y: number } | null {
    return this.hint.visible ? { x: this.hint.x, y: this.hint.y } : null;
  }

  /** True when a canvas point lands on the visible hint button (so the scene ignores it). */
  hitsHint(x: number, y: number): boolean {
    if (!this.hint.visible) return false;
    const r = this.hint.displayWidth / 2 + 10;
    return (x - this.hint.x) ** 2 + (y - this.hint.y) ** 2 <= r * r;
  }

  private placeHint(sec: Rect, size = HINT_SIZE): void {
    this.hint
      .setDisplaySize(size, size)
      .setPosition(sec.x + sec.w - size / 2 - 24, sec.y + sec.h / 2);
  }

  setLevel(level: number): void {
    this.level.setText(String(level));
  }

  setHearts(n: number): void {
    this.hearts.forEach((h, i) => setImageFrame(h, i < n ? UI.heart : UI.heartEmpty));
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
        const icon = addImage(this.scene, 0, 0, c.icon);
        const badge = addImage(this.scene, 0, 0, UI.badge);
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
      this.reapply();
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

  /** Re-runs the last layout (square bands/columns or Spot bands) after items were rebuilt. */
  private reapply(): void {
    if (!this.layoutCache) return;
    if (this.spotMode) this.applySpot(this.layoutCache);
    else this.apply(this.layoutCache);
  }

  /** Canvas y of the HUD row (level number); used by the dev smoke test to check placement. */
  rowCenterY(): number {
    return this.level.y;
  }

  apply(l: Layout): void {
    this.layoutCache = l;
    this.spotMode = false;
    this.placeHint(l.hud.secondary, Math.min(HINT_SIZE, Math.max(72, l.hud.secondary.h - 16)));
    this.placeHome(l.hud.secondary, l.hud.placement === 'columns' ? 'column' : 'row');
    const p = l.hud.primary;
    if (l.hud.placement === 'columns') this.applyColumn(p);
    else this.applyRow(p);
    this.backing.clear();
    if (l.hud.placement === 'overlay') {
      const sec = l.hud.secondary;
      this.backing
        .fillStyle(0x000000, HUD_BACKING_ALPHA)
        .fillRect(p.x, p.y, p.w, p.h)
        .fillRect(sec.x, sec.y, sec.w, sec.h);
    }
  }

  /** Spot 5: thin bands above/below the two images, always a row. */
  applySpot(l: Layout): void {
    this.layoutCache = l;
    this.spotMode = true;
    this.backing.clear();
    this.applyRow(l.spot.hudTop);
    this.placeHint(l.spot.hudBottom, Math.min(HINT_SIZE, Math.max(72, l.spot.hudBottom.h - 16)));
    this.placeHome(l.spot.hudBottom, 'row');
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
    fitImage(it.icon, icon).setPosition(x, y);
    const bx = x + icon * 0.42;
    const by = y + icon * 0.38;
    it.badge.setDisplaySize(BADGE_SIZE, BADGE_SIZE).setPosition(bx, by);
    it.count.setPosition(bx, by + 1).setFontSize(Math.round(BADGE_SIZE * 0.6));
  }
}
