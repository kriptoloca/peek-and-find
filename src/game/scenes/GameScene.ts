import Phaser from 'phaser';
import { THEMES, backgroundKey, themeForLevel } from '../../data/themes';
import { themeToPreload } from '../../gen/difficulty';
import { installDebug } from '../../dev/debug';
import { Rng, hashSeed, sceneSeed } from '../../gen/rng';
import { pickMode } from '../../gen/difficulty';
import { generateScene } from '../../gen/scene-gen';
import type { Mode, Placed, Scene as GenScene, Theme } from '../../gen/types';
import { AdGate, MIN_INTERVAL_MS } from '../../platform/ads';
import { getPlatform, type Platform } from '../../platform/bridge';
import { audio } from '../audio';
import { correctSfx, starSfx } from '../audio-keys';
import { clearFx, confetti, popCorrect, shakeWrong, sparkle } from '../fx';
import { Hud } from '../hud';
import { computeLayout, type Layout, type Rect } from '../layout';
import { DAILY_CHAIN_LENGTH, completeDaily, dailyScene, todayKey } from '../daily';
import { modeForLevel } from '../progression';
import {
  applyTap,
  continueRound,
  hintTarget,
  hitTargets,
  newRound,
  promptCounts,
  remainingTargets,
  startRound,
  starsEarned,
  type HitTarget,
  type Round,
} from '../rules';
import { persistProgress, progress, resetProgress } from '../state';
import { UI } from '../textures/placeholders';
import { addImage, ensureThemes, fitImage, loadedAtlases } from '../assets';
import { SCENE_SIZE, SPOT_H, SPOT_W } from '../../config';

const COLOR_BG = 0x1b1f2a;
const COLOR_SCENE = 0x2e3650;
const COLOR_SPOT_RING = 0x80ed99;
const POP_IN_MS = 300;
const POP_IN_STAGGER_MAX_MS = 10;
const POP_IN_STAGGER_TOTAL_MS = 350;
const AUTO_ADVANCE_MS = 1200;
const DEPTH_WORLD = 10;
const DEPTH_FX = 15;
const DEPTH_OVERLAY = 30;
/** Prompt icon breathes at round start on these first levels (GDD §2 teaching). */
const TEACH_PULSE_UNTIL_LEVEL = 3;
/** Retry button: circle radius and vertical offset from the overlay center. */
const RETRY_RADIUS = 100;
const RETRY_OFFSET_Y = 40;
/** Fail overlay with Continue: buttons sit left/right of the center. */
const FAIL_BUTTON_DX = 160;
const HINT_GLOW_MS = 2000;
/** Star reveal timing on the win overlay; the star sounds follow the same schedule. */
const STAR_REVEAL_DELAY_MS = 120;
const STAR_REVEAL_STAGGER_MS = 140;
/** The lost-heart sound trails the wrong-tap sound. */
const HEART_LOSE_DELAY_MS = 150;
const DEPTH_PAUSE = 50;

/** Session-wide interstitial gate (wall clock, so pauses and slow frames do not shorten it). */
const adGate = new AdGate(
  // Dev builds: ?adfast=1 pretends the session started 120 s ago so the first interstitial can
  // be exercised right after three scenes.
  performance.now() -
    (import.meta.env.DEV && window.location.search.includes('adfast=1') ? MIN_INTERVAL_MS : 0),
);
/** Dev menu trigger: three taps in this top-left square within this many ms (dev builds). */
const DEV_TAP_ZONE = 160;
const DEV_TAP_WINDOW_MS = 700;

type SpriteMap = Map<string, Phaser.GameObjects.Image>;

/**
 * Gameplay scene for all three modes: generate → pop in → taps → hearts/stars → complete or
 * fail. Rules live in rules.ts; this scene renders and routes input. Spot 5 renders image A in
 * `world` and image B in `worldB`, both scaled by the layout.
 */
export class GameScene extends Phaser.Scene {
  private bg!: Phaser.GameObjects.Graphics;
  private hud!: Hud;
  private world!: Phaser.GameObjects.Container;
  /** Image B of Spot 5; hidden in the other modes. */
  private worldB!: Phaser.GameObjects.Container;
  private fx!: Phaser.GameObjects.Container;
  private overlay: Phaser.GameObjects.Container | null = null;
  private sprites: SpriteMap = new Map();
  private spritesB: SpriteMap = new Map();
  private round: Round | null = null;
  private layoutNow!: Layout;
  private advanceTimer: Phaser.Time.TimerEvent | null = null;
  /** Dev builds only: ?mode=find|odd|spot forces the mode. */
  private forcedMode: Mode | null = null;
  private theme!: Theme;
  /** Daily chain: null in the normal chain, else the current scene index 0..4. */
  private dailyIndex: number | null = null;
  private dailyKey = '';
  private platform!: Platform;
  private unsubscribePause: (() => void) | null = null;
  private pauseOverlay: Phaser.GameObjects.Container | null = null;
  private paused = false;
  private adInProgress = false;
  /** Incremented by every startLevel(); an awaited load belongs to the latest one only. */
  private levelGen = 0;
  private adsShown = 0;
  private hintUses = 0;
  private continueUses = 0;
  private devTaps: number[] = [];
  private devMenuOpen = false;

  constructor() {
    super('Game');
  }

  init(data: { daily?: boolean; today?: string } | undefined): void {
    this.dailyIndex = data?.daily ? 0 : null;
    this.dailyKey = data?.today ?? todayKey();
    this.forcedMode = null;
  }

  create(): void {
    this.bg = this.add.graphics().setDepth(0);
    this.world = this.add.container(0, 0).setDepth(DEPTH_WORLD);
    this.worldB = this.add.container(0, 0).setDepth(DEPTH_WORLD).setVisible(false);
    this.fx = this.add.container(0, 0).setDepth(DEPTH_FX);
    this.hud = new Hud(this);
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointer);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.relayout);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.relayout);
    });
    this.platform = getPlatform();
    this.unsubscribePause = this.platform.onPause((p) => {
      this.setPaused(p);
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribePause?.();
      this.unsubscribePause = null;
    });
    this.hud.setHint(this.platform.rewardedSupported, () => {
      void this.onHint();
    });
    this.relayout();
    if (import.meta.env.DEV) this.applyDevParams();
    void this.startLevel();
    if (import.meta.env.DEV) this.installDebugHooks();
  }

  // ---- platform pause (CLAUDE.md rule 4) ---------------------------------------------------

  private setPaused(paused: boolean): void {
    if (this.paused === paused) return;
    this.paused = paused;
    audio.setPaused(paused);
    if (paused) {
      this.tweens.pauseAll();
      this.time.paused = true;
      const { width, height } = this.scale.gameSize;
      const dim = this.add.graphics();
      dim.fillStyle(0x000000, 0.55).fillRect(0, 0, width, height);
      this.pauseOverlay = this.add.container(0, 0, [dim]).setDepth(DEPTH_PAUSE);
    } else {
      this.pauseOverlay?.destroy(true);
      this.pauseOverlay = null;
      this.time.paused = false;
      this.tweens.resumeAll();
    }
  }

  // ---- layout -------------------------------------------------------------------------------

  private readonly relayout = (): void => {
    const { width, height } = this.scale.gameSize;
    this.cameras.main.setViewport(0, 0, width, height);
    this.layoutNow = computeLayout(width, height);
    const l = this.layoutNow;
    this.bg.clear();
    this.bg.fillStyle(COLOR_BG, 1).fillRect(0, 0, width, height);
    if (this.round?.scene.mode === 'spot') {
      const sp = l.spot;
      this.bg.fillStyle(COLOR_SCENE, 1).fillRect(sp.a.x, sp.a.y, sp.a.w, sp.a.h);
      this.bg.fillStyle(COLOR_SCENE, 1).fillRect(sp.b.x, sp.b.y, sp.b.w, sp.b.h);
      this.world.setPosition(sp.a.x, sp.a.y).setScale(sp.scale);
      this.worldB.setPosition(sp.b.x, sp.b.y).setScale(sp.scale).setVisible(true);
      this.hud.applySpot(l);
    } else {
      const s = l.scene;
      this.bg.fillStyle(COLOR_SCENE, 1).fillRect(s.x, s.y, s.w, s.h);
      this.world.setPosition(s.x, s.y).setScale(1);
      this.worldB.setVisible(false);
      this.hud.apply(l);
    }
    if (this.overlay) {
      const c = this.overlayCenter();
      this.overlay.setPosition(c.x, c.y);
    }
  };

  /** Rect of the main image: the scene square, or Spot image A. */
  private mainRect(): Rect {
    return this.round?.scene.mode === 'spot' ? this.layoutNow.spot.a : this.layoutNow.scene;
  }

  private overlayCenter(): { x: number; y: number } {
    if (this.round?.scene.mode === 'spot') {
      const { width, height } = this.scale.gameSize;
      return { x: width / 2, y: height / 2 };
    }
    const s = this.layoutNow.scene;
    return { x: s.x + s.w / 2, y: s.y + s.h / 2 };
  }

  /** Canvas (design px) position of a scene-coordinate point in image A or B. */
  private toCanvas(x: number, y: number, image: 'a' | 'b' = 'a'): { x: number; y: number } {
    const w = image === 'b' ? this.worldB : this.world;
    return { x: w.x + x * w.scaleX, y: w.y + y * w.scaleY };
  }

  /** Pointer (design px) → scene coordinates of the square or of either Spot image. */
  private toScene(px: number, py: number): { x: number; y: number } | null {
    const r = this.round;
    if (!r) return null;
    const inside = (rect: Rect): boolean =>
      px >= rect.x && py >= rect.y && px <= rect.x + rect.w && py <= rect.y + rect.h;
    if (r.scene.mode === 'spot') {
      const sp = this.layoutNow.spot;
      if (inside(sp.a)) return { x: (px - sp.a.x) / sp.scale, y: (py - sp.a.y) / sp.scale };
      if (inside(sp.b)) return { x: (px - sp.b.x) / sp.scale, y: (py - sp.b.y) / sp.scale };
      return null;
    }
    const s = this.layoutNow.scene;
    if (!inside(s)) return null;
    return { x: px - s.x, y: py - s.y };
  }

  // ---- level lifecycle ----------------------------------------------------------------------

  private async startLevel(): Promise<void> {
    this.clearOverlay();
    this.round = null;
    clearFx(this, this.fx);
    this.world.removeAll(true);
    this.worldB.removeAll(true);
    this.sprites.clear();
    this.spritesB.clear();

    const canHostSpot = this.layoutNow.spot.canHost;
    let level: number;
    let mode: Mode;
    let seed: number;
    if (this.dailyIndex !== null) {
      // GDD §7: fixed levels, date seed, no player salt; a Retry replays the same scene.
      const d = dailyScene(this.dailyKey, this.dailyIndex);
      level = d.level;
      const modeRng = new Rng(hashSeed(`daily-mode:${this.dailyKey}:${String(this.dailyIndex)}`));
      mode = pickMode(modeRng, level, canHostSpot);
      seed = d.seed;
    } else {
      level = progress.level;
      // Dev ?mode= never bypasses the Spot layout gate (GDD §4: 1:1 cannot host two images).
      const forced = this.forcedMode;
      if (forced === 'spot' && !canHostSpot && import.meta.env.DEV) {
        console.warn('peek: ?mode=spot refused, this aspect cannot host Spot; picking a mode');
      }
      mode =
        forced && (forced !== 'spot' || canHostSpot)
          ? forced
          : modeForLevel(level, progress.seedSalt, canHostSpot);
      seed = sceneSeed(mode, level, progress.attempt, progress.seedSalt);
    }
    this.theme = themeForLevel(level);
    // GDD §5: the theme that unlocks within three levels is loaded ahead so the chain never
    // stalls on a loader round trip. A newer startLevel() or a scene shutdown cancels this one.
    const pre = themeToPreload(level);
    const gen0 = ++this.levelGen;
    this.platform.sendMessage('in_game_loading_started');
    await ensureThemes(this, pre === null ? [this.theme] : [this.theme, THEMES[pre] as Theme]);
    if (gen0 !== this.levelGen || !this.sys.isActive()) return;
    const gen: GenScene = generateScene({
      seed,
      level,
      mode,
      theme: this.theme,
      validate: import.meta.env.DEV,
    });
    this.platform.sendMessage('in_game_loading_stopped');
    this.round = newRound(gen);
    this.addBackground(gen.mode);
    this.relayout();
    this.hud.setLevel(this.dailyIndex === null ? level : this.dailyIndex + 1);
    this.hud.setHearts(this.round.hearts);
    this.hud.setPrompt(promptCounts(this.round));

    const sorted = [...gen.objects].sort((a, b) => a.z - b.z);
    const stagger = Math.min(POP_IN_STAGGER_MAX_MS, POP_IN_STAGGER_TOTAL_MS / sorted.length);
    const popIn = (
      list: readonly Placed[],
      into: Phaser.GameObjects.Container,
      map: SpriteMap,
    ): void => {
      list.forEach((o, i) => {
        const img = fitImage(addImage(this, o.x, o.y, o.frame), o.size).setFlipX(o.flipX);
        const sx = img.scaleX;
        const sy = img.scaleY;
        img.setScale(0);
        into.add(img);
        map.set(o.id, img);
        this.tweens.add({
          targets: img,
          scaleX: sx,
          scaleY: sy,
          duration: POP_IN_MS,
          delay: i * stagger,
          ease: 'Back.easeOut',
        });
      });
    };
    audio.play('pop');
    popIn(sorted, this.world, this.sprites);
    if (gen.spot)
      popIn(
        [...gen.spot.b].sort((a, b) => a.z - b.z),
        this.worldB,
        this.spritesB,
      );

    const total = POP_IN_MS + stagger * sorted.length;
    this.time.delayedCall(total, () => {
      if (this.round?.scene !== gen) return;
      startRound(this.round, this.time.now);
      this.platform.sendMessage('level_started');
      this.platform.sendMessage('gameplay_started');
      if (level <= TEACH_PULSE_UNTIL_LEVEL) this.hud.teachPulse();
    });
  }

  /** Theme background inside the world containers; without an atlas the flat fill stays. */
  private addBackground(mode: Mode): void {
    const key = backgroundKey(this.theme, mode === 'spot');
    if (!this.textures.exists(key)) return;
    const w = mode === 'spot' ? SPOT_W : SCENE_SIZE;
    const h = mode === 'spot' ? SPOT_H : SCENE_SIZE;
    this.world.add(this.add.image(w / 2, h / 2, key).setDisplaySize(w, h));
    if (mode === 'spot') this.worldB.add(this.add.image(w / 2, h / 2, key).setDisplaySize(w, h));
  }

  /** Scene complete → maybe an interstitial (gate + platform support) → next level. */
  private advance(): void {
    if (this.adInProgress) return;
    const now = performance.now();
    if (this.platform.interstitialSupported && adGate.shouldShowInterstitial(now)) {
      adGate.markShown(now);
      this.adInProgress = true;
      this.adsShown += 1;
      void this.platform.showInterstitial().then(() => {
        this.adInProgress = false;
        this.nextLevel();
      });
      return;
    }
    this.nextLevel();
  }

  private nextLevel(): void {
    progress.scenesPlayed += 1;
    if (this.dailyIndex !== null) {
      if (this.dailyIndex + 1 < DAILY_CHAIN_LENGTH) {
        this.dailyIndex += 1;
        progress.attempt = 0;
        persistProgress();
        void this.startLevel();
      } else {
        Object.assign(progress, completeDaily(progress, this.dailyKey));
        persistProgress();
        this.showDailyComplete();
      }
      return;
    }
    progress.level += 1;
    progress.attempt = 0;
    persistProgress();
    void this.startLevel();
  }

  /** GDD §9 screen 6: badge, streak, back to title on tap. */
  private showDailyComplete(): void {
    audio.play('daily_complete');
    this.clearOverlay();
    clearFx(this, this.fx);
    const ov = this.makeOverlay(0.7);
    const badge = addImage(this, 0, -120, UI.daily).setDisplaySize(220, 220);
    const flame = addImage(this, -40, 90, UI.flame).setDisplaySize(140, 140);
    const n = this.add
      .text(60, 96, String(progress.streak), {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '96px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5);
    ov.add([badge, flame, n]);
    this.tweens.add({
      targets: badge,
      scale: badge.scale * 1.08,
      yoyo: true,
      repeat: -1,
      duration: 700,
    });
    if (this.round) this.round.status = 'won';
    this.dailyIndex = DAILY_CHAIN_LENGTH; // sentinel: chain finished, next tap → title
  }

  private retryLevel(): void {
    audio.play('button');
    progress.attempt += 1;
    progress.scenesPlayed += 1;
    persistProgress();
    void this.startLevel();
  }

  // ---- input --------------------------------------------------------------------------------

  private readonly onPointer = (pointer: Phaser.Input.Pointer): void => {
    if (this.devMenuOpen || this.paused || this.adInProgress) return;
    if (this.hud.hitsHint(pointer.x, pointer.y)) return;
    if (import.meta.env.DEV && this.checkDevTaps(pointer)) return;
    if (this.overlay) {
      this.onOverlayTap(pointer);
      return;
    }
    const r = this.round;
    if (!r) return;
    const local = this.toScene(pointer.x, pointer.y);
    if (!local) return;
    const res = applyTap(r, local.x, local.y, this.time.now);
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

  private onCorrect(target: HitTarget): void {
    const r = this.round;
    if (!r) return;
    audio.play(correctSfx(r.found.size - 1));
    if (r.scene.mode === 'spot') {
      // Ring the difference on both images; the object may be absent in one of them.
      for (const image of ['a', 'b'] as const) {
        const c = this.toCanvas(target.x, target.y, image);
        const d = target.hitRadius * 2 * this.world.scaleX;
        const ring = addImage(this, c.x, c.y, UI.ring)
          .setDisplaySize(d, d)
          .setTint(COLOR_SPOT_RING);
        this.fx.add(ring);
        sparkle(this, c.x, c.y, this.fx);
      }
    } else {
      const img = this.sprites.get(target.id);
      if (img) {
        popCorrect(this, img, this.fx);
        const c = this.toCanvas(img.x, img.y);
        sparkle(this, c.x, c.y, this.fx);
      }
    }
    const counts = promptCounts(r);
    this.hud.setPrompt(counts);
    const modeItem = counts.find((c) => c.family === 'spot' || c.family === 'odd');
    const icon = modeItem ? modeItem.icon : (this.sprites.get(target.id)?.texture.key ?? '');
    this.hud.pulsePrompt(icon);
  }

  private onWrong(object: HitTarget | null, hearts: number): void {
    audio.play('tap_wrong');
    this.time.delayedCall(HEART_LOSE_DELAY_MS, () => {
      audio.play('heart_lose');
    });
    if (object) {
      const img = this.sprites.get(object.id);
      if (img) shakeWrong(this, img);
    }
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
    adGate.onSceneCompleted();
    this.platform.sendMessage('level_completed');
    this.platform.sendMessage('gameplay_stopped');
    audio.play('scene_complete');
    audio.play('confetti');
    confetti(this, this.mainRect(), this.fx);
    if (r.scene.params.bigScene) confetti(this, this.mainRect(), this.fx); // GDD §5 bonus confetti
    const ov = this.makeOverlay(0.35);
    for (let i = 0; i < 3; i++) {
      const star = addImage(this, (i - 1) * 190, 0, i < stars ? UI.star : UI.starEmpty)
        .setDisplaySize(160, 160)
        .setScale(0);
      ov.add(star);
      const starDelay = STAR_REVEAL_DELAY_MS + i * STAR_REVEAL_STAGGER_MS;
      this.tweens.add({
        targets: star,
        scale: 160 / 128,
        delay: starDelay,
        duration: 260,
        ease: 'Back.easeOut',
      });
      if (i < stars) {
        const n = (i + 1) as 1 | 2 | 3;
        this.time.delayedCall(starDelay, () => {
          audio.play(starSfx(n));
        });
      }
    }
    this.advanceTimer = this.time.delayedCall(AUTO_ADVANCE_MS + 400, () => {
      this.advance();
    });
  }

  private onLost(): void {
    this.platform.sendMessage('level_failed');
    this.platform.sendMessage('gameplay_stopped');
    const ov = this.makeOverlay(0.6);
    for (let i = 0; i < 3; i++) {
      ov.add(addImage(this, (i - 1) * 110, -170, UI.heartEmpty).setDisplaySize(90, 90));
    }
    const withContinue = this.platform.rewardedSupported;
    const retryX = withContinue ? FAIL_BUTTON_DX : 0;
    const btn = addImage(this, retryX, RETRY_OFFSET_Y, UI.badge)
      .setDisplaySize(RETRY_RADIUS * 2, RETRY_RADIUS * 2)
      .setTint(0x3b7dd8);
    const icon = addImage(this, retryX, RETRY_OFFSET_Y, UI.retry).setDisplaySize(110, 110);
    ov.add([btn, icon]);
    this.tweens.add({
      targets: [btn, icon],
      scale: '*=1.06',
      yoyo: true,
      repeat: -1,
      duration: 600,
    });
    if (withContinue) {
      // Continue = rewarded ad → refill hearts, same scene (GDD §3). Heart + play icon, no text.
      const cbtn = addImage(this, -FAIL_BUTTON_DX, RETRY_OFFSET_Y, UI.badge)
        .setDisplaySize(RETRY_RADIUS * 2, RETRY_RADIUS * 2)
        .setTint(0x2a9d8f);
      const heart = addImage(this, -FAIL_BUTTON_DX - 28, RETRY_OFFSET_Y, UI.heart).setDisplaySize(
        70,
        70,
      );
      const play = addImage(this, -FAIL_BUTTON_DX + 34, RETRY_OFFSET_Y, UI.play).setDisplaySize(
        60,
        60,
      );
      ov.add([cbtn, heart, play]);
    }
  }

  /** Rewarded Continue: refill hearts and resume the same scene when the reward was earned. */
  private async onContinue(): Promise<void> {
    const r = this.round;
    if (!r || r.status !== 'lost' || this.adInProgress) return;
    audio.play('button');
    this.adInProgress = true;
    const earned = await this.platform.showRewarded('continue');
    this.adInProgress = false;
    if (this.round !== r) return;
    if (earned && continueRound(r)) {
      this.continueUses += 1;
      this.clearOverlay();
      this.hud.setHearts(r.hearts);
      this.platform.sendMessage('gameplay_started');
    }
  }

  /** Rewarded Hint: one remaining target glows for two seconds (GDD §6). */
  private async onHint(): Promise<void> {
    const r = this.round;
    if (!r || r.status !== 'playing' || this.adInProgress || this.paused) return;
    this.adInProgress = true;
    const earned = await this.platform.showRewarded('hint');
    this.adInProgress = false;
    if (!earned || this.round !== r || r.status !== 'playing') return;
    const t = hintTarget(r);
    if (!t) return;
    this.hintUses += 1;
    audio.play('hint_reveal');
    const images: ('a' | 'b')[] = r.scene.mode === 'spot' ? ['a', 'b'] : ['a'];
    for (const image of images) {
      const c = this.toCanvas(t.x, t.y, image);
      const d = Math.max(t.hitRadius * 2, 120) * this.world.scaleX;
      const ring = addImage(this, c.x, c.y, UI.ring).setDisplaySize(d, d).setTint(0xffc857);
      this.fx.add(ring);
      this.tweens.add({
        targets: ring,
        scale: ring.scale * 1.25,
        alpha: 0.2,
        yoyo: true,
        repeat: Math.floor(HINT_GLOW_MS / 500) - 1,
        duration: 250,
        onComplete: () => {
          ring.destroy();
        },
      });
    }
  }

  private makeOverlay(dimAlpha: number): Phaser.GameObjects.Container {
    this.clearOverlay();
    const { width, height } = this.scale.gameSize;
    const dim = this.add.graphics();
    dim.fillStyle(0x000000, dimAlpha).fillRect(-width, -height, width * 2, height * 2);
    const c = this.overlayCenter();
    const ov = this.add.container(c.x, c.y, [dim]).setDepth(DEPTH_OVERLAY);
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
    if (!r || !this.overlay) return;
    if (this.dailyIndex === DAILY_CHAIN_LENGTH) {
      this.scene.start('Title');
      return;
    }
    if (r.status === 'won') {
      // tap to skip the auto-advance
      this.advance();
      return;
    }
    if (r.status === 'lost' && this.overlay) {
      const withContinue = this.platform.rewardedSupported;
      const retryX = this.overlay.x + (withContinue ? FAIL_BUTTON_DX : 0);
      const dy = pointer.y - (this.overlay.y + RETRY_OFFSET_Y);
      const dxRetry = pointer.x - retryX;
      if (dxRetry * dxRetry + dy * dy <= RETRY_RADIUS * RETRY_RADIUS) {
        this.retryLevel();
        return;
      }
      if (withContinue) {
        const dxCont = pointer.x - (this.overlay.x - FAIL_BUTTON_DX);
        if (dxCont * dxCont + dy * dy <= RETRY_RADIUS * RETRY_RADIUS) void this.onContinue();
      }
    }
  }

  // ---- dev ----------------------------------------------------------------------------------

  /** Three quick taps in the top-left corner open the dev menu (dev builds only). */
  private checkDevTaps(pointer: Phaser.Input.Pointer): boolean {
    // The early return makes everything below unreachable in production, so the bundler drops
    // the dynamic import and no DevMenu chunk is emitted.
    if (!import.meta.env.DEV) return false;
    if (pointer.x > DEV_TAP_ZONE || pointer.y > DEV_TAP_ZONE) return false;
    const now = this.time.now;
    this.devTaps = this.devTaps.filter((t) => now - t < DEV_TAP_WINDOW_MS);
    this.devTaps.push(now);
    if (this.devTaps.length < 3) return true;
    this.devTaps = [];
    this.devMenuOpen = true;
    void import('../../dev/DevMenu').then(({ openDevMenu }) => {
      openDevMenu(
        this,
        { level: progress.level, mode: this.forcedMode ?? 'auto' },
        {
          onGo: (s) => {
            this.devMenuOpen = false;
            progress.level = s.level;
            progress.attempt = 0;
            this.forcedMode = s.mode === 'auto' ? null : s.mode;
            persistProgress();
            void this.startLevel();
          },
          onReset: () => {
            this.devMenuOpen = false;
            resetProgress();
            this.forcedMode = null;
            void this.startLevel();
          },
          onClose: () => {
            this.devMenuOpen = false;
          },
        },
      );
    });
    return true;
  }

  /** Dev builds only: `?level=40` starts at that level, `?mode=odd|spot|find` forces a mode. */
  private applyDevParams(): void {
    const q = new URLSearchParams(window.location.search);
    const level = Number(q.get('level'));
    if (Number.isFinite(level) && level >= 1) progress.level = Math.floor(level);
    const mode = q.get('mode');
    if (mode === 'find' || mode === 'odd' || mode === 'spot') this.forcedMode = mode;
    const today = q.get('today');
    if (today && /^\d{8}$/.test(today)) this.dailyKey = today;
    if (q.get('daily') === '1') this.dailyIndex = 0;
  }

  /** Dev check: the HUD row must be inside the band the current layout reserves for it. */
  private hudInBand(): boolean {
    const l = this.layoutNow;
    const band = this.round?.scene.mode === 'spot' ? l.spot.hudTop : l.hud.primary;
    const y = this.hud.rowCenterY();
    return y >= band.y && y <= band.y + band.h;
  }

  private installDebugHooks(): void {
    const toScreen = (o: {
      id: string;
      x: number;
      y: number;
    }): { id: string; x: number; y: number } => {
      const rect = this.game.canvas.getBoundingClientRect();
      const k = rect.width / this.scale.gameSize.width;
      const c = this.toCanvas(o.x, o.y, 'a');
      return { id: o.id, x: rect.left + c.x * k, y: rect.top + c.y * k };
    };
    const wrongPoints = (): { id: string; x: number; y: number }[] => {
      const r = this.round;
      if (!r) return [];
      if (r.scene.mode !== 'spot') return r.scene.objects.filter((o) => !o.isTarget).slice(0, 5);
      // Spot: grid points inside image A that are clear of every difference circle.
      const hits = hitTargets(r.scene);
      const out: { id: string; x: number; y: number }[] = [];
      for (let y = 140; y < r.scene.height - 100 && out.length < 5; y += 90) {
        for (let x = 140; x < r.scene.width - 100 && out.length < 5; x += 90) {
          if (hits.every((h) => (h.x - x) ** 2 + (h.y - y) ** 2 > (h.hitRadius + 12) ** 2)) {
            out.push({ id: `w${String(out.length)}`, x, y });
          }
        }
      }
      return out;
    };
    installDebug({
      targets: () =>
        this.round
          ? hitTargets(this.round.scene)
              .filter((t) => t.isTarget && !this.round?.found.has(t.id))
              .map(toScreen)
          : [],
      wrong: () => wrongPoints().map(toScreen),
      simulatePause: (p: boolean) => {
        this.setPaused(p);
      },
      tapHint: () => {
        void this.onHint();
      },
      tapContinue: () => {
        void this.onContinue();
      },
      state: () => ({
        level: progress.level,
        sceneLevel: this.round?.scene.level ?? 0,
        mode: this.round?.scene.mode ?? 'none',
        theme: this.round?.scene.theme ?? 'none',
        bigScene: this.round?.scene.params.bigScene ?? false,
        scenesPlayed: progress.scenesPlayed,
        devMenuOpen: this.devMenuOpen,
        dailyIndex: this.dailyIndex,
        platformId: this.platform.platformId,
        interstitialSupported: this.platform.interstitialSupported,
        rewardedSupported: this.platform.rewardedSupported,
        adsShown: this.adsShown,
        hintUses: this.hintUses,
        continueUses: this.continueUses,
        paused: this.paused,
        adInProgress: this.adInProgress,
        streak: progress.streak,
        lastDailyDate: progress.lastDailyDate,
        hearts: this.round?.hearts ?? 0,
        status: this.round?.status ?? 'none',
        remaining: this.round ? remainingTargets(this.round) : 0,
        now: this.time.now,
        atlasKeys: loadedAtlases(this),
        audio: audio.debug(),
        hudInBand: this.hudInBand(),
      }),
    });
  }
}
