import Phaser from 'phaser';
import { KITCHEN } from '../../data/themes';
import { installDebug } from '../../dev/debug';
import { sceneSeed } from '../../gen/rng';
import { generateScene } from '../../gen/scene-gen';
import type { Mode, Placed, Scene as GenScene } from '../../gen/types';
import { clearFx, confetti, popCorrect, shakeWrong, sparkle } from '../fx';
import { Hud } from '../hud';
import { computeLayout, type Layout } from '../layout';
import {
  applyTap,
  newRound,
  promptCounts,
  remainingTargets,
  startRound,
  starsEarned,
  type Round,
} from '../rules';
import { modeForLevel } from '../progression';
import { progress } from '../state';
import { UI, ensureThemeTextures, ensureUiTextures } from '../textures/placeholders';

const COLOR_BG = 0x1b1f2a;
const COLOR_SCENE = 0x2e3650;
const POP_IN_MS = 300;
const POP_IN_STAGGER_MAX_MS = 10;
const POP_IN_STAGGER_TOTAL_MS = 350;
const AUTO_ADVANCE_MS = 1200;
const DEPTH_WORLD = 10;
const DEPTH_FX = 15;
const DEPTH_OVERLAY = 30;
/** Prompt icon breathes at round start on these first levels (GDD §2 teaching). */
const TEACH_PULSE_UNTIL_LEVEL = 3;

/**
 * Find mode end to end (Epic 3): generate → pop in → taps → hearts/stars → complete or fail.
 * All rules live in rules.ts; this scene only renders and routes input.
 */
export class GameScene extends Phaser.Scene {
  private bg!: Phaser.GameObjects.Graphics;
  private hud!: Hud;
  private world!: Phaser.GameObjects.Container;
  private fx!: Phaser.GameObjects.Container;
  private overlay: Phaser.GameObjects.Container | null = null;
  private sprites = new Map<string, Phaser.GameObjects.Image>();
  private round: Round | null = null;
  private layoutNow!: Layout;
  private advanceTimer: Phaser.Time.TimerEvent | null = null;
  /** Dev builds only: ?mode=find|odd forces the mode. */
  private forcedMode: Mode | null = null;

  constructor() {
    super('Game');
  }

  create(): void {
    ensureUiTextures(this);
    ensureThemeTextures(this, KITCHEN);
    this.bg = this.add.graphics().setDepth(0);
    this.world = this.add.container(0, 0).setDepth(DEPTH_WORLD);
    this.fx = this.add.container(0, 0).setDepth(DEPTH_FX);
    this.hud = new Hud(this);
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointer);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.relayout);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.relayout);
    });
    this.relayout();
    if (import.meta.env.DEV) this.applyDevParams();
    this.startLevel();
    if (import.meta.env.DEV) this.installDebugHooks();
  }

  // ---- layout -------------------------------------------------------------------------------

  private readonly relayout = (): void => {
    const { width, height } = this.scale.gameSize;
    this.cameras.main.setViewport(0, 0, width, height);
    this.layoutNow = computeLayout(width, height);
    const s = this.layoutNow.scene;
    this.bg.clear();
    this.bg.fillStyle(COLOR_BG, 1).fillRect(0, 0, width, height);
    this.bg.fillStyle(COLOR_SCENE, 1).fillRect(s.x, s.y, s.w, s.h);
    this.world.setPosition(s.x, s.y);
    this.hud.apply(this.layoutNow);
    if (this.overlay) this.overlay.setPosition(s.x + s.w / 2, s.y + s.h / 2);
  };

  // ---- level lifecycle ----------------------------------------------------------------------

  private startLevel(): void {
    this.clearOverlay();
    clearFx(this, this.fx);
    this.world.removeAll(true);
    this.sprites.clear();
    const level = progress.level;
    // Spot 5 is gated off until epic 5 lands; the layout gate takes over then.
    const mode: Mode = this.forcedMode ?? modeForLevel(level, progress.seedSalt, false);
    const seed = sceneSeed(mode, level, progress.attempt, progress.seedSalt);
    const gen: GenScene = generateScene({
      seed,
      level,
      mode,
      theme: KITCHEN,
      validate: import.meta.env.DEV,
    });
    this.round = newRound(gen);
    this.hud.setLevel(level);
    this.hud.setHearts(this.round.hearts);
    this.hud.setPrompt(promptCounts(this.round));

    const sorted = [...gen.objects].sort((a, b) => a.z - b.z);
    const stagger = Math.min(POP_IN_STAGGER_MAX_MS, POP_IN_STAGGER_TOTAL_MS / sorted.length);
    sorted.forEach((o, i) => {
      const img = this.add.image(o.x, o.y, o.frame).setFlipX(o.flipX);
      img.setDisplaySize(o.size, o.size);
      const sx = img.scaleX;
      const sy = img.scaleY;
      img.setScale(0);
      this.world.add(img);
      this.sprites.set(o.id, img);
      this.tweens.add({
        targets: img,
        scaleX: sx,
        scaleY: sy,
        duration: POP_IN_MS,
        delay: i * stagger,
        ease: 'Back.easeOut',
      });
    });
    const total = POP_IN_MS + stagger * sorted.length;
    this.time.delayedCall(total, () => {
      if (this.round?.scene !== gen) return;
      startRound(this.round, this.time.now);
      if (level <= TEACH_PULSE_UNTIL_LEVEL) this.hud.teachPulse();
    });
  }

  private nextLevel(): void {
    progress.level += 1;
    progress.attempt = 0;
    progress.scenesPlayed += 1;
    this.startLevel();
  }

  private retryLevel(): void {
    progress.attempt += 1;
    this.startLevel();
  }

  // ---- input --------------------------------------------------------------------------------

  private readonly onPointer = (pointer: Phaser.Input.Pointer): void => {
    if (this.overlay) {
      this.onOverlayTap(pointer);
      return;
    }
    const r = this.round;
    if (!r) return;
    const s = this.layoutNow.scene;
    const x = pointer.x - s.x;
    const y = pointer.y - s.y;
    if (x < 0 || y < 0 || x > s.w || y > s.h) return;
    const res = applyTap(r, x, y, this.time.now);
    switch (res.kind) {
      case 'correct':
        this.onCorrect(res.target);
        if (res.won) this.onWon();
        break;
      case 'wrong':
        this.onWrong(res.object, res.hearts);
        if (res.lost) this.onLost();
        break;
      default:
        break;
    }
  };

  private onCorrect(target: Placed): void {
    const img = this.sprites.get(target.id);
    if (img) {
      popCorrect(this, img, this.fx);
      sparkle(this, this.world.x + img.x, this.world.y + img.y, this.fx);
    }
    if (this.round) {
      this.hud.setPrompt(promptCounts(this.round));
      this.hud.pulsePrompt(target.frame);
    }
  }

  private onWrong(object: Placed, hearts: number): void {
    const img = this.sprites.get(object.id);
    if (img) shakeWrong(this, img);
    this.hud.setHearts(hearts);
    this.hud.pulseHeart(hearts);
    this.cameras.main.shake(90, 0.004);
  }

  // ---- overlays -----------------------------------------------------------------------------

  private onWon(): void {
    const r = this.round;
    if (!r) return;
    const stars = starsEarned(r, this.time.now);
    progress.totalStars += stars;
    const s = this.layoutNow.scene;
    confetti(this, s, this.fx);
    const ov = this.makeOverlay(0.35);
    for (let i = 0; i < 3; i++) {
      const star = this.add
        .image((i - 1) * 190, 0, i < stars ? UI.star : UI.starEmpty)
        .setDisplaySize(160, 160)
        .setScale(0);
      ov.add(star);
      this.tweens.add({
        targets: star,
        scale: 160 / 128,
        delay: 120 + i * 140,
        duration: 260,
        ease: 'Back.easeOut',
      });
    }
    this.advanceTimer = this.time.delayedCall(AUTO_ADVANCE_MS + 400, () => {
      this.nextLevel();
    });
  }

  private onLost(): void {
    const ov = this.makeOverlay(0.6);
    for (let i = 0; i < 3; i++) {
      ov.add(this.add.image((i - 1) * 110, -170, UI.heartEmpty).setDisplaySize(90, 90));
    }
    const btn = this.add.image(0, 40, UI.badge).setDisplaySize(200, 200).setTint(0x3b7dd8);
    const icon = this.add.image(0, 40, UI.retry).setDisplaySize(110, 110);
    btn.setName('retry');
    ov.add([btn, icon]);
    this.tweens.add({
      targets: [btn, icon],
      scale: '*=1.06',
      yoyo: true,
      repeat: -1,
      duration: 600,
    });
  }

  private makeOverlay(dimAlpha: number): Phaser.GameObjects.Container {
    this.clearOverlay();
    const s = this.layoutNow.scene;
    const { width, height } = this.scale.gameSize;
    const dim = this.add.graphics();
    dim.fillStyle(0x000000, dimAlpha).fillRect(-width, -height, width * 2, height * 2);
    const ov = this.add.container(s.x + s.w / 2, s.y + s.h / 2, [dim]).setDepth(DEPTH_OVERLAY);
    this.overlay = ov;
    return ov;
  }

  private clearOverlay(): void {
    if (this.advanceTimer) {
      this.advanceTimer.remove(false);
      this.advanceTimer = null;
    }
    if (this.overlay) {
      this.overlay.destroy(true);
      this.overlay = null;
    }
  }

  private onOverlayTap(pointer: Phaser.Input.Pointer): void {
    const r = this.round;
    if (!r) return;
    if (r.status === 'won') {
      // tap to skip the auto-advance
      this.nextLevel();
      return;
    }
    if (r.status === 'lost') {
      const s = this.layoutNow.scene;
      const dx = pointer.x - (s.x + s.w / 2);
      const dy = pointer.y - (s.y + s.h / 2 + 40);
      if (dx * dx + dy * dy <= 100 * 100) this.retryLevel();
    }
  }

  // ---- dev ----------------------------------------------------------------------------------

  /** Dev builds only: `?level=40` starts at that level, `?mode=odd` forces a mode. */
  private applyDevParams(): void {
    const q = new URLSearchParams(window.location.search);
    const level = Number(q.get('level'));
    if (Number.isFinite(level) && level >= 1) progress.level = Math.floor(level);
    const mode = q.get('mode');
    if (mode === 'find' || mode === 'odd') this.forcedMode = mode;
  }

  private installDebugHooks(): void {
    const toScreen = (o: Placed): { id: string; x: number; y: number } => {
      const rect = this.game.canvas.getBoundingClientRect();
      const k = rect.width / this.scale.gameSize.width;
      return {
        id: o.id,
        x: rect.left + (this.world.x + o.x) * k,
        y: rect.top + (this.world.y + o.y) * k,
      };
    };
    installDebug({
      targets: () =>
        this.round
          ? this.round.scene.targets.filter((t) => !this.round?.found.has(t.id)).map(toScreen)
          : [],
      wrong: () =>
        this.round
          ? this.round.scene.objects
              .filter((o) => !o.isTarget)
              .slice(0, 5)
              .map(toScreen)
          : [],
      state: () => ({
        level: progress.level,
        hearts: this.round?.hearts ?? 0,
        status: this.round?.status ?? 'none',
        remaining: this.round ? remainingTargets(this.round) : 0,
        now: this.time.now,
      }),
    });
  }
}
