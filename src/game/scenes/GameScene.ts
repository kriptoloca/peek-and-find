import Phaser from 'phaser';
import { THEMES, backgroundKey, themeForLevel } from '../../data/themes';
import { THEME_ROTATE_EVERY, themeToPreload } from '../../gen/difficulty';
import { installDebug, uninstallDebug, type DebugPoint } from '../../dev/debug';
import { Rng, hashSeed, sceneSeed } from '../../gen/rng';
import { pickMode } from '../../gen/difficulty';
import { generateScene } from '../../gen/scene-gen';
import {
  MEMORY_PEEK_MS,
  MEMORY_SHOW_S,
  SHUFFLE_MOVE_MS,
  SHUFFLE_WARN_MS,
  shuffleCadenceMs,
} from '../../gen/twist';
import type { Mode, Placed, Scene as GenScene, Theme, TwistKind } from '../../gen/types';
import { AdGate, MIN_INTERVAL_MS } from '../../platform/ads';
import {
  getPlatform,
  regainFocus,
  sentPlatformMessages,
  type Platform,
} from '../../platform/bridge';
import { HEARTS_MAX, clampHearts, heartsForLevel } from '../hearts';
import { ResumeGrace } from '../resume-grace';
import { audio } from '../audio';
import { haptic, setHapticsEnabled } from '../../platform/haptics';
import { correctSfx, starSfx } from '../audio-keys';
import { clearFx, confetti, popCorrect, shakeWrong, sparkle } from '../fx';
import { TITLE_FRAME, frameColorFor, hexOf } from '../frame-color';
import { Hud } from '../hud';
import { computeLayout, type Layout, type Rect } from '../layout';
import { DAILY_CHAIN_LENGTH, completeDaily, dailyScene, todayKey } from '../daily';
import { modeForLevel } from '../progression';
import {
  advanceLayout,
  applyTap,
  continueRound,
  elapsedSeconds,
  hintTarget,
  hitTargets,
  newRound,
  pauseRound,
  promptCounts,
  remainingTargets,
  resumeRound,
  roundObjects,
  startRound,
  starsEarned,
  type HitTarget,
  type Round,
} from '../rules';
import { persistProgress, progress, resetProgress } from '../state';
import { UI } from '../textures/placeholders';
import {
  addImage,
  ensureThemes,
  fitImage,
  loadedAtlases,
  releaseThemes,
  setImageFrame,
} from '../assets';
import { DESIGN_LONG_MAX, SCENE_SIZE, SPOT_H, SPOT_W } from '../../config';

const COLOR_SCENE = 0x2e3650;
const COLOR_SPOT_RING = 0x80ed99;
/** Fail overlay buttons (drawn discs, see onLost). */
const COLOR_RETRY = 0x3b7dd8;
const COLOR_CONTINUE = 0x2a9d8f;
const POP_IN_MS = 300;
const POP_IN_STAGGER_MAX_MS = 10;
const POP_IN_STAGGER_TOTAL_MS = 350;
const AUTO_ADVANCE_MS = 1200;
const DEPTH_WORLD = 10;
const DEPTH_FX = 15;
const DEPTH_OVERLAY = 30;
/** In-game menu (GDD v1.6 §9): above the win/fail overlays, below the platform pause dim. */
const DEPTH_MENU = 35;
const MENU_DIM_ALPHA = 0.6;
const COLOR_MENU_BUTTON = 0x3a4160;
/** Menu buttons in overlay coordinates: Resume on top, Sound / Music / Home in a row. */
const MENU_BUTTONS = {
  resume: { x: 0, y: -70, r: 100, icon: 110 },
  sound: { x: -200, y: 150, r: 72, icon: 78 },
  music: { x: 0, y: 150, r: 72, icon: 78 },
  home: { x: 200, y: 150, r: 72, icon: 78 },
} as const;
type MenuButton = keyof typeof MENU_BUTTONS;
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
  /** In-game menu (GDD v1.6): Resume, Sound, Music, Home; the scene is frozen while it is open. */
  private menu: Phaser.GameObjects.Container | null = null;
  private menuOpen = false;
  private menuSound: Phaser.GameObjects.Image | null = null;
  private menuMusic: Phaser.GameObjects.Image | null = null;
  /** Menu button under the finger at pointer-down; it acts on pointer-up over the same one. */
  private menuDownOn: MenuButton | null = null;
  /** A pause-spot tap that the win overlay took (skip): its pointer-up must not open the menu. */
  private pauseTapConsumed = false;
  private sprites: SpriteMap = new Map();
  private spritesB: SpriteMap = new Map();
  private round: Round | null = null;
  private layoutNow!: Layout;
  private advanceTimer: Phaser.Time.TimerEvent | null = null;
  /** Dev builds only: ?mode=find|odd|spot forces the mode. */
  private forcedMode: Mode | null = null;
  private theme!: Theme;
  /** Canvas outside the scene: the theme's hue, deep and quiet (frame-color.ts). */
  private frameColor = TITLE_FRAME;
  /** Daily chain: null in the normal chain, else the current scene index 0..4. */
  private dailyIndex: number | null = null;
  /** Hearts carried across the five daily scenes; every chain starts full (GDD v1.7 §6). */
  private dailyHearts = HEARTS_MAX;
  private dailyKey = '';
  private platform!: Platform;
  private unsubscribePause: (() => void) | null = null;
  private pauseOverlay: Phaser.GameObjects.Container | null = null;
  private paused = false;
  private adInProgress = false;
  /** Input gate: off under the platform pause and for the grace after it (resume-grace.ts). */
  private readonly grace = new ResumeGrace(this);
  /** Incremented by every startLevel(); an awaited load belongs to the latest one only. */
  private levelGen = 0;
  private levelFailedOnce = false;
  /** True between in_game_loading_started and _stopped, so the pair always matches. */
  private loadingOpen = false;
  private adsShown = 0;
  private hintUses = 0;
  private continueUses = 0;
  private devTaps: number[] = [];
  private devMenuOpen = false;
  /** Dev builds only: ?twist=shuffle|memory|none forces or removes the twist (GDD v1.5). */
  private forcedTwist: TwistKind | 'none' | null = null;
  /** Round whose twist is armed; arming is idempotent because two paths start a round. */
  private twistArmedFor: Round | null = null;
  /** Slides done in the current scene (dev state). */
  private shufflesDone = 0;
  /** Hint rings on screen with the target they mark; a slide carries them along. */
  private hintRings: { img: Phaser.GameObjects.Image; targetId: string }[] = [];

  constructor() {
    super('Game');
  }

  init(data: { daily?: boolean; today?: string } | undefined): void {
    this.dailyIndex = data?.daily ? 0 : null;
    this.dailyKey = data?.today ?? todayKey();
    this.dailyHearts = HEARTS_MAX;
    this.forcedMode = null;
    // Phaser reuses the scene instance: nothing from a previous run may leak into this one.
    this.paused = false;
    this.adInProgress = false;
    this.levelFailedOnce = false;
    this.loadingOpen = false;
    this.forcedTwist = null;
    this.twistArmedFor = null;
    this.shufflesDone = 0;
    this.menuOpen = false;
    this.menu = null;
    this.menuSound = null;
    this.menuMusic = null;
    this.menuDownOn = null;
    this.pauseTapConsumed = false;
  }

  create(): void {
    this.bg = this.add.graphics().setDepth(0);
    this.world = this.add.container(0, 0).setDepth(DEPTH_WORLD);
    this.worldB = this.add.container(0, 0).setDepth(DEPTH_WORLD).setVisible(false);
    this.fx = this.add.container(0, 0).setDepth(DEPTH_FX);
    this.hud = new Hud(this);
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointer);
    this.input.on(Phaser.Input.Events.POINTER_UP, this.onPointerUp);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.relayout);
    // Without the SDK (stub platform) nobody reports a hidden page; Phaser's own visibility
    // events freeze the scene the same way, and a visible page re-reads the platform's pause.
    const onHidden = (): void => {
      this.setPaused(true);
    };
    const onVisible = (): void => {
      this.setPaused(this.platform.isPaused());
    };
    this.game.events.on(Phaser.Core.Events.HIDDEN, onHidden);
    this.game.events.on(Phaser.Core.Events.VISIBLE, onVisible);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.relayout);
      this.game.events.off(Phaser.Core.Events.HIDDEN, onHidden);
      this.game.events.off(Phaser.Core.Events.VISIBLE, onVisible);
    });
    this.grace.reset();
    this.platform = getPlatform();
    this.unsubscribePause = this.platform.onPause((p) => {
      this.setPaused(p);
    });
    // A restarted scene keeps its tween/clock managers: make sure they run.
    this.tweens.resumeAll();
    this.time.paused = false;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.grace.dispose();
      this.unsubscribePause?.();
      this.unsubscribePause = null;
      if (import.meta.env.DEV) uninstallDebug();
    });
    this.hud.setHint(this.platform.rewardedSupported, () => {
      void this.onHint();
    });
    this.hud.setPause(() => {
      this.openMenu();
    });
    this.relayout();
    // Only after the first layout: the pause dim is placed from it (a host that holds its pause
    // while the scene starts, e.g. an ad in the parent page, used to crash create() here).
    if (this.platform.isPaused()) this.setPaused(true);
    if (import.meta.env.DEV) this.applyDevParams();
    void this.startLevel();
    if (import.meta.env.DEV) this.installDebugHooks();
  }

  // ---- platform pause (CLAUDE.md rule 4) ---------------------------------------------------

  private setPaused(paused: boolean): void {
    if (this.paused === paused) return;
    this.paused = paused;
    audio.setPaused(paused);
    setHapticsEnabled(!paused);
    this.applyFreeze();
    if (paused) {
      this.grace.pause();
      this.pauseOverlay = this.dimContainer(0.55, DEPTH_PAUSE);
    } else {
      this.pauseOverlay?.destroy(true);
      this.pauseOverlay = null;
      this.grace.resume();
    }
  }

  /**
   * Every ad flow ends here. The host may hold its pause until the game's window has focus
   * again (bridge.ts), so the game asks for it back; and a platform that no longer reports
   * paused must not leave the scene frozen behind a lost resume event.
   */
  private afterAd(): void {
    this.adInProgress = false;
    regainFocus();
    if (this.paused && !this.platform.isPaused() && document.visibilityState !== 'hidden') {
      this.setPaused(false);
    }
  }

  /**
   * Tweens and the scene clock (shuffle cadence, memory timers, auto-advance) stop while the
   * platform pause or the in-game menu holds; the round's star timer leaves the frozen time
   * out. A platform resume while the menu is open keeps the game frozen.
   */
  private applyFreeze(): void {
    const frozen = this.paused || this.menuOpen;
    if (frozen) {
      this.tweens.pauseAll();
      this.time.paused = true;
    } else {
      this.time.paused = false;
      this.tweens.resumeAll();
    }
    // The freeze stamps use the wall clock: a hidden page gets no frames, so the scene clock
    // would read the same value at pause and at resume and the whole pause would leak into the
    // star timer. RAF timestamps and performance.now() share one timeline.
    const r = this.round;
    if (!r) return;
    if (frozen) pauseRound(r, performance.now());
    else resumeRound(r, performance.now());
  }

  // ---- in-game menu (GDD v1.6 §9) -----------------------------------------------------------

  /**
   * Pause button: freezes the scene and shows Resume, Sound, Music and Home. Works over the
   * fail overlay too (Home stays reachable from a lost round, as in v1.3); not over the win
   * overlay (the scene advances in 1.6 s and Home there would replay a banked win), not under
   * the platform pause, during an ad or in the dev menu.
   */
  private openMenu(): void {
    if (this.pauseTapConsumed) {
      this.pauseTapConsumed = false;
      return;
    }
    if (this.menuOpen || this.paused || this.adInProgress || this.devMenuOpen) return;
    const r = this.round;
    if (!r || r.status === 'won') return;
    audio.play('button');
    this.menuOpen = true;
    if (r.status === 'playing') this.platform.sendMessage('gameplay_stopped');
    this.applyFreeze();
    const menu = this.dimContainer(MENU_DIM_ALPHA, DEPTH_MENU);
    const b = MENU_BUTTONS;
    menu.add([
      this.disc(b.resume.x, b.resume.y, COLOR_CONTINUE, b.resume.r),
      addImage(this, b.resume.x, b.resume.y, UI.play).setDisplaySize(b.resume.icon, b.resume.icon),
      this.disc(b.sound.x, b.sound.y, COLOR_MENU_BUTTON, b.sound.r),
      this.disc(b.music.x, b.music.y, COLOR_MENU_BUTTON, b.music.r),
      this.disc(b.home.x, b.home.y, COLOR_MENU_BUTTON, b.home.r),
      addImage(this, b.home.x, b.home.y, UI.home).setDisplaySize(b.home.icon, b.home.icon),
    ]);
    this.menuSound = addImage(
      this,
      b.sound.x,
      b.sound.y,
      progress.sound ? UI.soundOn : UI.soundOff,
    ).setDisplaySize(b.sound.icon, b.sound.icon);
    this.menuMusic = addImage(
      this,
      b.music.x,
      b.music.y,
      progress.music ? UI.musicOn : UI.musicOff,
    ).setDisplaySize(b.music.icon, b.music.icon);
    menu.add([this.menuSound, this.menuMusic]);
    this.menu = menu;
  }

  /** Closes the menu; `resume` continues the same round (hearts, finds and the timer kept). */
  private closeMenu(resume: boolean): void {
    if (!this.menuOpen) return;
    this.menuOpen = false;
    this.menu?.destroy(true);
    this.menu = null;
    this.menuSound = null;
    this.menuMusic = null;
    this.applyFreeze();
    const r = this.round;
    if (resume && r && r.status === 'playing') this.platform.sendMessage('gameplay_started');
  }

  private menuButtonAt(pointer: Phaser.Input.Pointer): MenuButton | null {
    if (!this.menu) return null;
    for (const key of Object.keys(MENU_BUTTONS) as MenuButton[]) {
      const b = MENU_BUTTONS[key];
      const dx = pointer.x - (this.menu.x + b.x);
      const dy = pointer.y - (this.menu.y + b.y);
      if (dx * dx + dy * dy <= b.r * b.r) return key;
    }
    return null;
  }

  /**
   * Menu buttons act on pointer-up over the button that took the pointer-down: Home changes
   * the scene, and a pointer-up arriving after `scene.start` would land on the Title's DAILY
   * button (its rect overlaps the Home spot in every aspect).
   */
  private onMenuTap(hit: MenuButton): void {
    switch (hit) {
      case 'resume':
        audio.play('button');
        this.closeMenu(true);
        break;
      case 'sound': {
        // The Title's toggle: the flag persists, the audio manager re-reads it.
        const on = audio.toggleSetting('sound');
        if (this.menuSound) setImageFrame(this.menuSound, on ? UI.soundOn : UI.soundOff);
        break;
      }
      case 'music': {
        const on = audio.toggleSetting('music');
        if (this.menuMusic) setImageFrame(this.menuMusic, on ? UI.musicOn : UI.musicOff);
        break;
      }
      case 'home':
        this.goHome();
        break;
    }
  }

  // ---- layout -------------------------------------------------------------------------------

  private readonly relayout = (): void => {
    const { width, height } = this.scale.gameSize;
    this.cameras.main.setViewport(0, 0, width, height);
    this.layoutNow = computeLayout(width, height);
    const l = this.layoutNow;
    this.bg.clear();
    this.bg.fillStyle(this.frameColor, 1).fillRect(0, 0, width, height);
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
    if (this.overlay || this.menu || this.pauseOverlay) {
      const c = this.overlayCenter();
      this.overlay?.setPosition(c.x, c.y);
      this.menu?.setPosition(c.x, c.y);
      this.pauseOverlay?.setPosition(c.x, c.y);
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

  /**
   * Starts the level; a thrown error (missing frame in a pack, generator invariant) never
   * freezes the game: the loading message is closed, the level is retried once with a new
   * attempt, and the Title is the last resort.
   */
  private async startLevel(): Promise<void> {
    try {
      await this.startLevelInner();
    } catch (e: unknown) {
      console.error('peek: level failed to start', e);
      this.sendLoading(false);
      if (!this.sys.isActive()) return;
      // The normal chain retries once with a new attempt; a daily scene is fixed, so it cannot.
      if (this.dailyIndex === null && !this.levelFailedOnce) {
        this.levelFailedOnce = true;
        progress.attempt += 1;
        persistProgress();
        void this.startLevel();
        return;
      }
      this.scene.start('Title');
    }
  }

  private async startLevelInner(): Promise<void> {
    this.closeMenu(false);
    this.clearOverlay();
    this.round = null;
    this.shufflesDone = 0;
    this.hintRings = [];
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
    this.frameColor = frameColorFor(this.theme.tone);
    // GDD §5: the theme that unlocks within three levels is loaded ahead so the chain never
    // stalls on a loader round trip. A newer startLevel() or a scene shutdown cancels this one.
    const pre = themeToPreload(level);
    // At most three atlases stay in GPU memory: this theme, the theme of the next scene or
    // rotation block, and the one that unlocks soon; everything else is released.
    const next =
      this.dailyIndex !== null
        ? this.dailyIndex + 1 < DAILY_CHAIN_LENGTH
          ? themeForLevel(dailyScene(this.dailyKey, this.dailyIndex + 1).level)
          : null
        : themeForLevel(level + THEME_ROTATE_EVERY);
    const needed: Theme[] = [this.theme];
    for (const t of [next, pre === null ? null : (THEMES[pre] as Theme)]) {
      if (t && !needed.includes(t)) needed.push(t);
    }
    const gen0 = ++this.levelGen;
    this.sendLoading(true);
    await ensureThemes(this, [this.theme]);
    if (gen0 !== this.levelGen || !this.sys.isActive()) return;
    const gen: GenScene = generateScene({
      seed,
      level,
      mode,
      theme: this.theme,
      validate: import.meta.env.DEV,
      // GDD v1.5 §5a: the daily chain stays plain (a level-5 player meets its level-30 scene).
      twist: this.dailyIndex !== null ? 'none' : (this.forcedTwist ?? 'auto'),
    });
    this.sendLoading(false);
    // GDD v1.7 §6: the scene starts with the hearts the player carries.
    this.round = newRound(gen, this.dailyIndex === null ? progress.hearts : this.dailyHearts);
    this.addBackground(gen.mode);
    this.relayout();
    this.hud.setLevel(this.dailyIndex === null ? level : this.dailyIndex + 1);
    this.hud.setHearts(this.round.hearts);
    this.hud.setPrompt(promptCounts(this.round));
    this.hud.setPromptHidden(false);
    this.hud.setTwist(gen.twist?.kind === 'shuffle' ? 'shuffle' : null);
    // The next themes load in the background while this scene is played (GDD §5: no stall);
    // once they are in, everything outside `needed` is released (GPU memory).
    void ensureThemes(this, needed).then(() => {
      if (this.levelGen === gen0 && this.sys.isActive()) releaseThemes(this, needed);
    });

    const sorted = [...gen.objects].sort((a, b) => a.z - b.z);
    const stagger = Math.min(POP_IN_STAGGER_MAX_MS, POP_IN_STAGGER_TOTAL_MS / sorted.length);
    const popIn = (
      list: readonly Placed[],
      into: Phaser.GameObjects.Container,
      map: SpriteMap,
    ): void => {
      list.forEach((o, i) => {
        const img = fitImage(addImage(this, o.x, o.y, o.frame), o.size)
          .setFlipX(o.flipX)
          .setRotation(o.rotation ?? 0);
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
      this.armTwist(this.round);
      this.platform.sendMessage('level_started');
      this.platform.sendMessage('gameplay_started');
      if (level <= TEACH_PULSE_UNTIL_LEVEL) this.hud.teachPulse();
    });
    this.levelFailedOnce = false;
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
        this.afterAd();
        this.nextLevel();
      });
      return;
    }
    this.nextLevel();
  }

  private nextLevel(): void {
    progress.scenesPlayed += 1;
    // Hearts left when the scene was won travel to the next one (GDD v1.7 §6).
    const carried = clampHearts(this.round?.hearts ?? HEARTS_MAX);
    if (this.dailyIndex !== null) {
      this.dailyHearts = carried;
      if (this.dailyIndex + 1 < DAILY_CHAIN_LENGTH) {
        this.dailyIndex += 1;
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
    progress.hearts = heartsForLevel(progress.level, carried);
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
    // Daily scenes ignore the attempt (Retry replays the same scene, GDD §7); the normal chain
    // reseeds so a stuck player gets a fresh layout.
    if (this.dailyIndex === null) progress.attempt += 1;
    progress.scenesPlayed += 1;
    // Hearts are a run resource (GDD v1.7 §6): the retry starts with what is left, one at the
    // least; they come back on every 20th level or with the rewarded Continue.
    persistProgress();
    void this.startLevel();
  }

  // ---- input --------------------------------------------------------------------------------

  private readonly onPointer = (pointer: Phaser.Input.Pointer): void => {
    if (this.devMenuOpen || this.paused || this.adInProgress) return;
    if (this.menuOpen) {
      this.menuDownOn = this.menuButtonAt(pointer);
      return;
    }
    // The HUD buttons act on their own pointer-up; over the win overlay the pause spot is
    // just part of the overlay (tap to skip the auto-advance).
    const onHudButton =
      this.hud.hitsHint(pointer.x, pointer.y) || this.hud.hitsPause(pointer.x, pointer.y);
    if (onHudButton && this.round?.status !== 'won') return;
    // The skip may start the next scene before this tap's pointer-up reaches the HUD button.
    if (onHudButton) this.pauseTapConsumed = true;
    if (this.overlay) {
      this.onOverlayTap(pointer);
      return;
    }
    const r = this.round;
    if (!r) return;
    if (
      r.scene.twist?.kind === 'memory' &&
      this.hud.promptHidden() &&
      this.hud.hitsPrompt(pointer.x, pointer.y)
    ) {
      // Memory twist: a tap on the hidden prompt peeks at it (GDD v1.5 §5a), never a penalty.
      audio.play('button');
      this.hud.peekPrompt(MEMORY_PEEK_MS);
      return;
    }
    const local = this.toScene(pointer.x, pointer.y);
    if (!local) return;
    const wasIntro = r.status === 'intro';
    const res = applyTap(r, local.x, local.y, this.time.now);
    if (wasIntro && r.status !== 'intro') this.armTwist(r);
    switch (res.kind) {
      case 'correct':
        this.onCorrect(res.target);
        if (res.won) this.onWon();
        break;
      case 'wrong':
        this.onWrong(res.object, res.hearts);
        if (res.lost) this.onLost();
        break;
      case 'none':
        // Dev menu: three quick taps on empty background in the top-left corner (dev builds),
        // so a tap that hits an object is never also a menu tap.
        if (import.meta.env.DEV) this.checkDevTaps(pointer);
        break;
      default:
        break;
    }
  };

  private readonly onPointerUp = (pointer: Phaser.Input.Pointer): void => {
    const down = this.menuDownOn;
    this.menuDownOn = null;
    if (!this.menuOpen || down === null || this.paused || this.adInProgress) return;
    if (this.menuButtonAt(pointer) === down) this.onMenuTap(down);
  };

  private onCorrect(target: HitTarget): void {
    const r = this.round;
    if (!r) return;
    audio.play(correctSfx(r.found.size - 1));
    haptic('correct');
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
        const c = this.toCanvas(img.x, img.y);
        popCorrect(this, img, this.fx, c.x, c.y);
        sparkle(this, c.x, c.y, this.fx);
      }
    }
    const counts = promptCounts(r);
    this.hud.setPrompt(counts);
    const modeItem = counts.find((c) => c.family === 'spot' || c.family === 'odd');
    const placed = r.scene.objects.find((o) => o.id === target.id);
    const icon = modeItem ? modeItem.icon : (placed?.frame ?? '');
    this.hud.pulsePrompt(icon);
    if (r.scene.twist?.kind === 'memory') this.hud.peekPrompt(MEMORY_PEEK_MS);
  }

  // ---- twists (GDD v1.5 §5a) ---------------------------------------------------------------

  /** Round start: arms the scene's twist once; both round-start paths call this. */
  private armTwist(r: Round): void {
    if (this.twistArmedFor === r) return;
    this.twistArmedFor = r;
    const kind = r.scene.twist?.kind;
    if (kind === 'shuffle') this.scheduleShuffle(r, shuffleCadenceMs(r.scene.params));
    if (kind === 'memory') {
      this.time.delayedCall(MEMORY_SHOW_S * 1000, () => {
        if (this.round === r && r.status === 'playing') this.hud.setPromptHidden(true);
      });
    }
  }

  /**
   * The HUD marker beats SHUFFLE_WARN_MS before the slide; the scene clock pauses with the
   * game. Under the fail overlay or during an ad the board waits a whole cadence, so a slide
   * never comes without its warning.
   */
  private scheduleShuffle(r: Round, delayMs: number): void {
    this.time.delayedCall(Math.max(0, delayMs - SHUFFLE_WARN_MS), () => {
      if (this.round !== r || r.status === 'won') return;
      if (r.status !== 'playing' || this.adInProgress) {
        this.scheduleShuffle(r, shuffleCadenceMs(r.scene.params));
        return;
      }
      this.hud.pulseTwist();
      this.time.delayedCall(SHUFFLE_WARN_MS, () => {
        this.doShuffle(r);
      });
    });
  }

  /**
   * Slides every sprite to the next validated layout (rules.advanceLayout). Taps are ignored
   * while the sprites move; found targets travel too (dimmed), and a hint ring follows the
   * target it marks. The next slide comes one cadence after this one started.
   */
  private doShuffle(r: Round): void {
    if (this.round !== r || r.status === 'won') return;
    if (r.status !== 'playing' || this.adInProgress || r.moving) {
      this.scheduleShuffle(r, shuffleCadenceMs(r.scene.params));
      return;
    }
    r.moving = true;
    const layout = advanceLayout(r);
    audio.play('pop');
    this.hud.spinTwist(SHUFFLE_MOVE_MS);
    for (const h of this.hintRings) {
      const o = layout.find((q) => q.id === h.targetId);
      if (!o || !h.img.active) continue;
      const c = this.toCanvas(o.x, o.y);
      this.tweens.add({
        targets: h.img,
        x: c.x,
        y: c.y,
        duration: SHUFFLE_MOVE_MS,
        ease: 'Cubic.easeInOut',
      });
    }
    for (const o of layout) {
      const img = this.sprites.get(o.id);
      if (!img) continue;
      img.setDepth(o.z);
      const k = o.size / Math.max(img.width, img.height);
      this.tweens.add({
        targets: img,
        x: o.x,
        y: o.y,
        scaleX: k,
        scaleY: k,
        rotation: o.rotation ?? 0,
        duration: SHUFFLE_MOVE_MS,
        ease: 'Cubic.easeInOut',
      });
    }
    this.time.delayedCall(SHUFFLE_MOVE_MS, () => {
      if (this.round !== r) return;
      this.world.sort('depth');
      r.moving = false;
      this.shufflesDone += 1;
      this.scheduleShuffle(r, shuffleCadenceMs(r.scene.params) - SHUFFLE_MOVE_MS);
    });
  }

  /**
   * Hearts are written on every change (GDD v1.7 §6), so Home mid-scene and a reload keep the
   * mistakes of the scene; a loss leaves one heart for the retry.
   */
  private carryHearts(hearts: number): void {
    const h = clampHearts(hearts);
    if (this.dailyIndex === null) {
      progress.hearts = h;
      persistProgress();
    } else {
      this.dailyHearts = h;
    }
  }

  private onWrong(object: HitTarget | null, hearts: number): void {
    this.carryHearts(hearts);
    audio.play('tap_wrong');
    haptic('wrong');
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
    haptic('won');
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
    haptic('lost');
    this.platform.sendMessage('level_failed');
    this.platform.sendMessage('gameplay_stopped');
    const ov = this.makeOverlay(0.6);
    for (let i = 0; i < 3; i++) {
      ov.add(addImage(this, (i - 1) * 110, -170, UI.heartEmpty).setDisplaySize(90, 90));
    }
    const withContinue = this.platform.rewardedSupported;
    const retryX = withContinue ? FAIL_BUTTON_DX : 0;
    // Button discs are drawn, not tinted images: the Canvas renderer (a device without WebGL)
    // ignores tint, which left a white disc with an invisible white icon.
    const btn = this.disc(retryX, RETRY_OFFSET_Y, COLOR_RETRY);
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
      const cbtn = this.disc(-FAIL_BUTTON_DX, RETRY_OFFSET_Y, COLOR_CONTINUE);
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
    this.afterAd();
    if (this.round !== r) return;
    if (earned && continueRound(r)) {
      this.continueUses += 1;
      this.carryHearts(r.hearts);
      this.clearOverlay();
      this.hud.setHearts(r.hearts);
      this.platform.sendMessage('gameplay_started');
    }
  }

  /** Rewarded Hint: one remaining target glows for two seconds (GDD §6). */
  private async onHint(): Promise<void> {
    const r = this.round;
    if (!r || r.status !== 'playing' || this.adInProgress || this.paused || this.menuOpen) return;
    this.adInProgress = true;
    this.platform.sendMessage('gameplay_stopped');
    const earned = await this.platform.showRewarded('hint');
    this.afterAd();
    if (this.round === r && r.status === 'playing') this.platform.sendMessage('gameplay_started');
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
      const entry = { img: ring, targetId: t.id };
      this.hintRings.push(entry);
      this.tweens.add({
        targets: ring,
        scale: ring.scale * 1.25,
        alpha: 0.2,
        yoyo: true,
        repeat: Math.floor(HINT_GLOW_MS / 500) - 1,
        duration: 250,
        onComplete: () => {
          this.hintRings = this.hintRings.filter((h) => h !== entry);
          ring.destroy();
        },
      });
    }
  }

  /** Filled circle centered on (x, y) of the overlay; scales around its center like an image. */
  private disc(
    x: number,
    y: number,
    color: number,
    radius = RETRY_RADIUS,
  ): Phaser.GameObjects.Graphics {
    return this.add.graphics({ x, y }).fillStyle(color, 1).fillCircle(0, 0, radius);
  }

  private makeOverlay(dimAlpha: number): Phaser.GameObjects.Container {
    this.clearOverlay();
    const ov = this.dimContainer(dimAlpha, DEPTH_OVERLAY);
    this.overlay = ov;
    return ov;
  }

  /**
   * A container at the overlay center with a dim that covers the canvas in every aspect the
   * layout can take (the long side is clamped to DESIGN_LONG_MAX), so a rotation while it is
   * open never leaves an undimmed strip.
   */
  private dimContainer(alpha: number, depth: number): Phaser.GameObjects.Container {
    const dim = this.add.graphics();
    const reach = DESIGN_LONG_MAX;
    dim.fillStyle(0x000000, alpha).fillRect(-reach, -reach, reach * 2, reach * 2);
    const c = this.overlayCenter();
    return this.add.container(c.x, c.y, [dim]).setDepth(depth);
  }

  private clearOverlay(): void {
    if (this.advanceTimer) {
      this.advanceTimer.remove(false);
      this.advanceTimer = null;
    }
    if (this.overlay) {
      // destroy() leaves looping tweens alive (Phaser 3.90); kill them with their targets.
      this.tweens.killTweensOf(this.overlay.getAll());
      this.overlay.destroy(true);
      this.overlay = null;
    }
  }

  /**
   * Home button (GDD v1.3): back to the Title from anywhere in play, no confirmation. The
   * abandoned scene keeps its seed (same attempt), so PLAY returns to the very same scene; a
   * daily chain restarts from its first scene. Ignored while paused or during an ad.
   */
  private goHome(): void {
    if (this.paused || this.adInProgress || this.devMenuOpen) return;
    // Reached from the menu only: `gameplay_stopped` already went out when it opened.
    audio.play('button');
    this.scene.start('Title');
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
    // The first two taps are ordinary game taps (a 1:1 layout has objects in this corner).
    if (this.devTaps.length < 3) return false;
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
    const hearts = Number(q.get('hearts'));
    if (Number.isFinite(hearts) && hearts >= 1) progress.hearts = clampHearts(hearts);
    const mode = q.get('mode');
    if (mode === 'find' || mode === 'odd' || mode === 'spot') this.forcedMode = mode;
    const twist = q.get('twist');
    if (twist === 'shuffle' || twist === 'memory' || twist === 'none') this.forcedTwist = twist;
    const today = q.get('today');
    if (today && /^\d{8}$/.test(today)) this.dailyKey = today;
    if (q.get('daily') === '1') this.dailyIndex = 0;
  }

  private sendLoading(open: boolean): void {
    if (this.loadingOpen === open) return;
    this.loadingOpen = open;
    this.platform.sendMessage(open ? 'in_game_loading_started' : 'in_game_loading_stopped');
  }

  /** Dev hooks: screen center of a fail-overlay button, null unless the round is lost. */
  private overlayButton(kind: 'retry' | 'continue'): DebugPoint | null {
    if (!this.overlay || this.round?.status !== 'lost') return null;
    const withContinue = this.platform.rewardedSupported;
    if (kind === 'continue' && !withContinue) return null;
    const dx = kind === 'retry' ? (withContinue ? FAIL_BUTTON_DX : 0) : -FAIL_BUTTON_DX;
    const rect = this.game.canvas.getBoundingClientRect();
    const k = rect.width / this.scale.gameSize.width;
    return {
      id: kind,
      x: rect.left + (this.overlay.x + dx) * k,
      y: rect.top + (this.overlay.y + RETRY_OFFSET_Y) * k,
    };
  }

  /** Dev check: the HUD row must be inside the band the current layout reserves for it. */
  private hudInBand(): boolean {
    const l = this.layoutNow;
    const band = this.round?.scene.mode === 'spot' ? l.spot.hudTop : l.hud.primary;
    const y = this.hud.rowCenterY();
    return y >= band.y && y <= band.y + band.h;
  }

  private installDebugHooks(): void {
    const screenScale = (): number =>
      this.game.canvas.getBoundingClientRect().width / this.scale.gameSize.width;
    const toScreenIn = (
      o: {
        id: string;
        x: number;
        y: number;
        size?: number;
        hitRadius?: number;
        isTarget?: boolean;
      },
      image: 'a' | 'b',
    ): DebugPoint => {
      const rect = this.game.canvas.getBoundingClientRect();
      const k = screenScale();
      const c = this.toCanvas(o.x, o.y, image);
      const world = this.world.scaleX * k;
      const p: DebugPoint = { id: o.id, x: rect.left + c.x * k, y: rect.top + c.y * k };
      if (o.size !== undefined) p.size = o.size * world;
      if (o.hitRadius !== undefined) p.r = o.hitRadius * world;
      if (o.isTarget !== undefined) p.isTarget = o.isTarget;
      return p;
    };
    const toScreen = (o: {
      id: string;
      x: number;
      y: number;
      size?: number;
      hitRadius?: number;
      isTarget?: boolean;
    }): DebugPoint => toScreenIn(o, 'a');
    const wrongPoints = (): { id: string; x: number; y: number }[] => {
      const r = this.round;
      if (!r) return [];
      if (r.scene.mode !== 'spot')
        return roundObjects(r)
          .filter((o) => !o.isTarget)
          .slice(0, 5);
      // Spot: grid points inside image A that are clear of every difference circle.
      const hits = hitTargets(r.scene, r.layout);
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
          ? hitTargets(this.round.scene, this.round.layout)
              .filter((t) => t.isTarget && !this.round?.found.has(t.id))
              .map(toScreen)
          : [],
      wrong: () => wrongPoints().map(toScreen),
      objects: () => (this.round ? roundObjects(this.round).map(toScreen) : []),
      differences: () =>
        this.round?.scene.spot
          ? this.round.scene.spot.differences.map((d) => ({
              id: d.id,
              kind: d.kind,
              a: toScreenIn(d, 'a'),
              b: toScreenIn(d, 'b'),
              r: d.hitRadius * this.world.scaleX * screenScale(),
            }))
          : [],
      pauseCenter: () => {
        const rect = this.game.canvas.getBoundingClientRect();
        const k = screenScale();
        const c = this.hud.pauseCenter();
        return { id: 'pause', x: rect.left + c.x * k, y: rect.top + c.y * k };
      },
      menu: () => {
        const m = this.menu;
        if (!m) return null;
        const rect = this.game.canvas.getBoundingClientRect();
        const k = screenScale();
        const pt = (id: MenuButton): DebugPoint => ({
          id,
          x: rect.left + (m.x + MENU_BUTTONS[id].x) * k,
          y: rect.top + (m.y + MENU_BUTTONS[id].y) * k,
        });
        return { resume: pt('resume'), sound: pt('sound'), music: pt('music'), home: pt('home') };
      },
      hintCenter: () => {
        const c = this.hud.hintCenter();
        if (!c) return null;
        const rect = this.game.canvas.getBoundingClientRect();
        const k = screenScale();
        return { id: 'hint', x: rect.left + c.x * k, y: rect.top + c.y * k };
      },
      retryCenter: () => this.overlayButton('retry'),
      continueCenter: () => this.overlayButton('continue'),
      sceneRect: () => {
        const rect = this.game.canvas.getBoundingClientRect();
        const k = screenScale();
        const m = this.mainRect();
        return { x: rect.left + m.x * k, y: rect.top + m.y * k, w: m.w * k, h: m.h * k };
      },
      twistCenter: () => {
        const c = this.hud.twistCenter();
        if (!c) return null;
        const rect = this.game.canvas.getBoundingClientRect();
        const k = screenScale();
        return { id: 'twist', x: rect.left + c.x * k, y: rect.top + c.y * k };
      },
      promptCenters: () => {
        const rect = this.game.canvas.getBoundingClientRect();
        const k = screenScale();
        return this.hud.promptCenters().map((c, i) => ({
          id: `prompt${String(i)}`,
          x: rect.left + c.x * k,
          y: rect.top + c.y * k,
        }));
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
        inputEnabled: this.input.enabled,
        adInProgress: this.adInProgress,
        streak: progress.streak,
        lastDailyDate: progress.lastDailyDate,
        hearts: this.round?.hearts ?? 0,
        status: this.round?.status ?? 'none',
        remaining: this.round ? remainingTargets(this.round) : 0,
        stars: this.round ? starsEarned(this.round, this.time.now) : 0,
        now: this.time.now,
        atlasKeys: loadedAtlases(this),
        audio: audio.debug(),
        fps: Math.round(this.game.loop.actualFps),
        renderer: this.game.renderer.type === Phaser.CANVAS ? 'canvas' : 'webgl',
        hudInBand: this.hudInBand(),
        twist: this.round?.scene.twist?.kind ?? null,
        layout: this.round?.layout ?? 0,
        moving: this.round?.moving ?? false,
        shufflesDone: this.shufflesDone,
        promptHidden: this.hud.promptHidden(),
        menuOpen: this.menuOpen,
        sound: progress.sound,
        music: progress.music,
        elapsed: this.round ? elapsedSeconds(this.round, this.time.now) : 0,
        messages: [...sentPlatformMessages()],
        frameColor: hexOf(this.frameColor),
      }),
    });
  }
}
