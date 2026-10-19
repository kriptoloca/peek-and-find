import Phaser from 'phaser';
import type { Layout, Rect } from './layout';
import type { PromptCount } from './rules';
import { addImage, fitImage, setImageFrame } from './assets';
import { ARRIVE_BOUNCE_MS, ARRIVE_BOUNCE_SCALE, HEART_BUMP_MS, HEART_BUMP_SCALE } from './feel';
import { UI } from './textures/placeholders';

const ICON_MAX = 120;
const HEART_MAX = 72;
const ITEM_GAP = 24;
const BADGE_SIZE = 52;
const HINT_SIZE = 110;
/** Shuffle marker next to the prompt: smaller than a prompt icon so it reads as a modifier. */
const TWIST_SIZE_MULT = 0.7;
/** Pause button (GDD v1.6, was the home button of v1.3): same size rule as the hint, opposite end of the secondary bar. */
const PAUSE_SIZE = 96;
/** 1:1 only: the HUD bars sit inside the square, over the scene; a dim strip separates them. */
const HUD_BACKING_ALPHA = 0.45;
const COLOR_BADGE_TEXT = '#1b1f2a';
const COLOR_LEVEL_TEXT = '#ffffff';

interface PromptItemView {
  icon: Phaser.GameObjects.Image;
  badge: Phaser.GameObjects.Image;
  count: Phaser.GameObjects.Text;
  key: string;
  /** What the HUD shows: it counts down when a found object lands (GDD v1.8 §3a). */
  remaining: number;
  total: number;
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
  private readonly pause: Phaser.GameObjects.Image;
  private onPauseTap: (() => void) | null = null;
  /** Shuffle twist marker (GDD v1.5 §5a): after the prompt items; pulses before each slide. */
  private readonly twist: Phaser.GameObjects.Image;
  /** Memory twist: prompt icons hide behind "?" until a peek. */
  private promptHiddenFlag = false;
  private peeking = false;
  private peekTimer: Phaser.Time.TimerEvent | null = null;
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
    this.pause = addImage(scene, 0, 0, UI.pause).setInteractive({ useHandCursor: true });
    this.pause.on(Phaser.Input.Events.POINTER_UP, () => {
      this.onPauseTap?.();
    });
    this.container.add(this.pause);
    this.twist = addImage(scene, 0, 0, UI.shuffle).setVisible(false);
    this.container.add(this.twist);
  }

  // ---- twists (GDD v1.5 §5a) ---------------------------------------------------------------

  /** Shows the shuffle marker next to the prompt; null hides it. */
  setTwist(kind: 'shuffle' | null): void {
    this.twist.setVisible(kind === 'shuffle').setAngle(0);
    this.reapply();
  }

  /** Canvas center of the shuffle marker, null while hidden (dev hooks). */
  twistCenter(): { x: number; y: number } | null {
    return this.twist.visible ? { x: this.twist.x, y: this.twist.y } : null;
  }

  /** Warning before a slide: the marker beats three times. */
  pulseTwist(): void {
    if (!this.twist.visible) return;
    this.scene.tweens.add({
      targets: this.twist,
      scale: this.twist.scale * 1.35,
      yoyo: true,
      repeat: 2,
      duration: 140,
      ease: 'Sine.easeInOut',
    });
  }

  /** The slide itself: one full turn of the marker. */
  spinTwist(ms: number): void {
    if (!this.twist.visible) return;
    this.scene.tweens.add({
      targets: this.twist,
      angle: '+=360',
      duration: ms,
      ease: 'Cubic.easeInOut',
    });
  }

  /** Memory twist: hides (or shows) the prompt icons behind "?"; cancels a running peek. */
  setPromptHidden(hidden: boolean): void {
    this.promptHiddenFlag = hidden;
    this.peeking = false;
    this.peekTimer?.remove();
    this.peekTimer = null;
    this.applyPromptFrames();
  }

  /** True while the prompt icons are hidden and no peek is showing them. */
  promptHidden(): boolean {
    return this.promptHiddenFlag && !this.peeking;
  }

  /** Shows the hidden icons for `ms`, then hides them again. No-op when they are not hidden. */
  peekPrompt(ms: number): void {
    if (!this.promptHiddenFlag) return;
    this.peeking = true;
    this.applyPromptFrames();
    this.peekTimer?.remove();
    this.peekTimer = this.scene.time.delayedCall(ms, () => {
      this.peekTimer = null;
      this.peeking = false;
      this.applyPromptFrames();
    });
  }

  /** Canvas centers of the prompt icons (dev hooks). */
  promptCenters(): { x: number; y: number }[] {
    return this.items.map((it) => ({ x: it.icon.x, y: it.icon.y }));
  }

  /** True when a canvas point lands on one of the prompt icons (a peek tap in memory scenes). */
  hitsPrompt(x: number, y: number): boolean {
    for (const it of this.items) {
      const r = it.icon.displayWidth / 2 + 12;
      if ((x - it.icon.x) ** 2 + (y - it.icon.y) ** 2 <= r * r) return true;
    }
    return false;
  }

  private applyPromptFrames(): void {
    const show = !this.promptHiddenFlag || this.peeking;
    for (const it of this.items) setImageFrame(it.icon, show ? it.key : UI.memory);
    this.reapply();
  }

  /** Pause button (GDD v1.6 §9): opens the in-game menu; the scene decides what that means. */
  setPause(onTap: (() => void) | null): void {
    this.onPauseTap = onTap;
  }

  /** True when a canvas point lands on the pause button (so the scene ignores it). */
  hitsPause(x: number, y: number): boolean {
    const r = this.pause.displayWidth / 2 + 10;
    return (x - this.pause.x) ** 2 + (y - this.pause.y) ** 2 <= r * r;
  }

  /** Canvas (design px) center of the pause button; dev hooks turn it into a screen point. */
  pauseCenter(): { x: number; y: number } {
    return { x: this.pause.x, y: this.pause.y };
  }

  private placePause(sec: Rect, placement: 'row' | 'column'): void {
    const size = Math.min(PAUSE_SIZE, Math.max(64, (placement === 'row' ? sec.h : sec.w) - 24));
    this.pause.setDisplaySize(size, size);
    if (placement === 'column') this.pause.setPosition(sec.x + sec.w / 2, sec.y + 90);
    else this.pause.setPosition(sec.x + size / 2 + 24, sec.y + sec.h / 2);
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

  /** Soft bump on the heart that was just lost (failure stays light, GDD v1.8 §3a). */
  pulseHeart(index: number): void {
    const h = this.hearts[index];
    if (!h) return;
    this.scene.tweens.add({
      targets: h,
      scale: h.scale * HEART_BUMP_SCALE,
      yoyo: true,
      duration: HEART_BUMP_MS,
    });
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
        return { icon, badge, count, key: c.icon, remaining: c.remaining, total: c.total };
      });
      if (this.promptHiddenFlag) this.applyPromptFrames();
      else this.reapply();
    }
    counts.forEach((c, i) => {
      const it = this.items[i];
      if (!it) return;
      it.remaining = c.remaining;
      it.total = c.total;
      this.renderCount(it);
    });
  }

  private renderCount(it: PromptItemView): void {
    it.count.setText(`×${String(it.remaining)}`);
    const done = it.remaining === 0;
    // A "×1" badge is noise: the badge only appears when there is something to count.
    const showBadge = it.total > 1;
    it.icon.setAlpha(done ? 0.35 : 1);
    it.badge.setVisible(showBadge).setAlpha(done ? 0.35 : 1);
    it.count.setVisible(showBadge).setAlpha(done ? 0.35 : 1);
  }

  /**
   * A found object landed in its prompt icon (collect to HUD, GDD v1.8 §3a): the shown count
   * goes down by one and the icon bounces. The rules already counted the find at the tap.
   */
  tickDown(icon: string): void {
    const it = this.items.find((i) => i.key === icon);
    if (!it) return;
    it.remaining = Math.max(0, it.remaining - 1);
    this.renderCount(it);
    const targets = [it.icon, it.badge, it.count];
    this.scene.tweens.killTweensOf(targets);
    this.reapply();
    this.scene.tweens.add({
      targets,
      scale: `*=${String(ARRIVE_BOUNCE_SCALE)}`,
      yoyo: true,
      duration: ARRIVE_BOUNCE_MS,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.reapply();
      },
    });
  }

  /** Canvas center and size of a prompt icon (the target of a collect flight), or null. */
  promptCenter(icon: string): { x: number; y: number; size: number } | null {
    const it = this.items.find((i) => i.key === icon);
    if (!it) return null;
    return { x: it.icon.x, y: it.icon.y, size: it.icon.displayWidth };
  }

  /** Sum of the counts the HUD shows right now (dev hooks: arrivals vs the rules). */
  displayedRemaining(): number {
    return this.items.reduce((sum, it) => sum + it.remaining, 0);
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
    this.placePause(l.hud.secondary, l.hud.placement === 'columns' ? 'column' : 'row');
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
    this.placePause(l.spot.hudBottom, 'row');
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
    const tw = this.twist.visible ? Math.round(icon * TWIST_SIZE_MULT) : 0;
    const total = n * icon + (n - 1) * ITEM_GAP + (tw > 0 ? ITEM_GAP + tw : 0);
    let x = p.x + p.w / 2 - total / 2 + icon / 2;
    for (const it of this.items) {
      this.placeItem(it, x, cy, icon);
      x += icon + ITEM_GAP;
    }
    if (tw > 0) this.twist.setDisplaySize(tw, tw).setPosition(x - icon / 2 + tw / 2, cy);
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
    if (this.twist.visible) {
      const tw = Math.round(icon * TWIST_SIZE_MULT);
      this.twist.setDisplaySize(tw, tw).setPosition(cx, y - (icon - tw) / 2);
    }
  }

  private placeItem(it: PromptItemView, x: number, y: number, icon: number): void {
    fitImage(it.icon, icon).setPosition(x, y);
    const bx = x + icon * 0.42;
    const by = y + icon * 0.38;
    it.badge.setDisplaySize(BADGE_SIZE, BADGE_SIZE).setPosition(bx, by);
    // The count is sized by its font: scale 1 is its rest, so a killed bounce never sticks.
    it.count
      .setScale(1)
      .setPosition(bx, by + 1)
      .setFontSize(Math.round(BADGE_SIZE * 0.6));
  }
}
