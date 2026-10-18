import Phaser from 'phaser';
import { t } from '../../data/strings';
import { dailyStatus, todayKey } from '../daily';
import { computeLayout } from '../layout';
import { getPlatform, sentPlatformMessages } from '../../platform/bridge';
import { progress } from '../state';
import { addImage, setImageFrame } from '../assets';
import { BRAND_STUDIO_KEY, BRAND_WORDMARK_KEY } from '../brand';
import { audio } from '../audio';
import { installTitleDebug, uninstallTitleDebug } from '../../dev/debug';
import { UI } from '../textures/placeholders';

const COLOR_BG = 0x1b1f2a;
/** Wordmark width on the Title (design px); the texture is 1200×360. */
const TITLE_WORDMARK_W = 760;
/** The studio mark at the foot of the square, below the toggles. */
const STUDIO_MARK_SIZE = 72;
const COLOR_PLAY = 0x3b7dd8;
const COLOR_DAILY = 0x2a9d8f;
const COLOR_DAILY_DONE = 0x4a4f63;
const PLAY_W = 520;
const PLAY_H = 170;
const DAILY_W = 520;
const DAILY_H = 130;
const TOGGLE = 96;
/** GameReady goes to the platform once per page load; a return from play is not a load. */
let readySent = false;

/**
 * Title (GDD §9 screen 2): logo, PLAY, DAILY with streak badge and check mark, sound/music
 * toggles. No settings screen. Text is limited to the title wordmark and the two button words.
 */
export class TitleScene extends Phaser.Scene {
  private root!: Phaser.GameObjects.Container;
  private paused = false;
  private dailyDone = false;
  private pauseDim: Phaser.GameObjects.Graphics | null = null;
  private unsubscribePause: (() => void) | null = null;
  /** Design-px centers of the tap targets (dev hooks expose them in screen px). */
  /** True when the Title shows the wordmark texture (dev hooks; false = text fallback). */
  private brandShown = false;
  private readonly spots = {
    play: { x: 0, y: 0 },
    daily: { x: 0, y: 0 },
    sound: { x: 0, y: 0 },
    music: { x: 0, y: 0 },
  };

  constructor() {
    super('Title');
  }

  create(): void {
    this.root = this.add.container(0, 0);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.build);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.build);
    });
    this.build();
    if (import.meta.env.DEV) this.installDebugHooks();
    const platform = getPlatform();
    // CLAUDE.md rule 4: platform pause freezes the Title too (tweens, input, a dim overlay).
    this.unsubscribePause = platform.onPause((p) => {
      this.setPaused(p);
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribePause?.();
      this.unsubscribePause = null;
      if (import.meta.env.DEV) uninstallTitleDebug();
    });
    if (platform.isPaused()) this.setPaused(true);
    // CLAUDE.md rule 3: GameReady only when the player can interact (the title is up), once.
    if (!readySent) {
      readySent = true;
      platform.sendMessage('in_game_loading_stopped');
      platform.sendMessage('game_ready');
    }
  }

  private setPaused(paused: boolean): void {
    if (this.paused === paused) return;
    this.paused = paused;
    this.input.enabled = !paused;
    if (paused) {
      this.tweens.pauseAll();
      this.drawPauseDim();
    } else {
      this.tweens.resumeAll();
      this.pauseDim?.destroy();
      this.pauseDim = null;
    }
  }

  private drawPauseDim(): void {
    const { width, height } = this.scale.gameSize;
    this.pauseDim?.destroy();
    this.pauseDim = this.add.graphics().setDepth(50);
    this.pauseDim.fillStyle(0x000000, 0.55).fillRect(0, 0, width, height);
  }

  private readonly build = (): void => {
    const { width, height } = this.scale.gameSize;
    this.cameras.main.setViewport(0, 0, width, height);
    this.root.removeAll(true);
    const l = computeLayout(width, height);
    const s = l.scene;
    const cx = s.x + s.w / 2;
    const bg = this.add.graphics();
    bg.fillStyle(COLOR_BG, 1).fillRect(0, 0, width, height);
    this.root.add(bg);

    const strings = t();
    // The wordmark texture (brand, GDD v1.6 §9); plain text only when the texture failed.
    this.brandShown = this.textures.exists(BRAND_WORDMARK_KEY);
    if (this.brandShown) {
      const logo = this.add
        .image(cx, s.y + s.h * 0.2, BRAND_WORDMARK_KEY)
        .setDisplaySize(TITLE_WORDMARK_W, TITLE_WORDMARK_W * 0.3);
      this.root.add(logo);
    } else {
      const logo = this.add
        .text(cx, s.y + s.h * 0.2, strings.title, {
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '104px',
          fontStyle: 'bold',
          color: '#ffffff',
        })
        .setOrigin(0.5);
      this.root.add(logo);
    }
    // Studio signature at the foot of the square: the cairn alone, small and quiet.
    if (this.textures.exists(BRAND_STUDIO_KEY)) {
      const mark = this.add
        .image(cx, s.y + s.h - STUDIO_MARK_SIZE * 0.78, BRAND_STUDIO_KEY)
        .setDisplaySize(STUDIO_MARK_SIZE, STUDIO_MARK_SIZE)
        .setAlpha(0.8);
      this.root.add(mark);
    }

    // PLAY
    const playY = s.y + s.h * 0.48;
    this.spots.play = { x: cx, y: playY };
    this.button(cx, playY, PLAY_W, PLAY_H, COLOR_PLAY, UI.play, strings.play, '', () => {
      this.scene.start('Game', { daily: false });
    });

    // DAILY with streak badge / check
    // Dev builds: ?today=YYYYMMDD moves the calendar for the daily tests (same key as the Game).
    const devToday = import.meta.env.DEV
      ? new URLSearchParams(window.location.search).get('today')
      : null;
    const today = devToday && /^\d{8}$/.test(devToday) ? devToday : todayKey();
    const status = dailyStatus(progress, today);
    this.dailyDone = status.done;
    const dailyY = playY + PLAY_H / 2 + 50 + DAILY_H / 2;
    this.spots.daily = { x: cx, y: dailyY };
    const badge = status.done ? '' : status.streak > 0 ? String(status.streak) : '';
    this.button(
      cx,
      dailyY,
      DAILY_W,
      DAILY_H,
      status.done ? COLOR_DAILY_DONE : COLOR_DAILY,
      status.done ? UI.check : UI.daily,
      strings.daily,
      badge,
      () => {
        if (!status.done) this.scene.start('Game', { daily: true, today });
      },
    );
    if (status.done && status.streak > 0) {
      const flame = addImage(this, cx + DAILY_W / 2 - 40, dailyY, UI.flame).setDisplaySize(
        TOGGLE,
        TOGGLE,
      );
      const n = this.add
        .text(cx + DAILY_W / 2 - 40, dailyY + 4, String(status.streak), {
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '40px',
          fontStyle: 'bold',
          color: '#1b1f2a',
        })
        .setOrigin(0.5);
      this.root.add([flame, n]);
    }

    // toggles (audio arrives in epic 9; the flags are persisted now)
    const ty = s.y + s.h * 0.86;
    this.spots.sound = { x: cx - 80, y: ty };
    this.spots.music = { x: cx + 80, y: ty };
    this.toggle(cx - 80, ty, 'sound', UI.soundOn, UI.soundOff);
    this.toggle(cx + 80, ty, 'music', UI.musicOn, UI.musicOff);
    if (this.paused) this.drawPauseDim();
  };

  private installDebugHooks(): void {
    const toScreen = (p: { x: number; y: number }): { id: string; x: number; y: number } => {
      const rect = this.game.canvas.getBoundingClientRect();
      const k = rect.width / this.scale.gameSize.width;
      return { id: 'title', x: rect.left + p.x * k, y: rect.top + p.y * k };
    };
    installTitleDebug({
      positions: () => ({
        play: toScreen(this.spots.play),
        daily: toScreen(this.spots.daily),
        sound: toScreen(this.spots.sound),
        music: toScreen(this.spots.music),
      }),
      state: () => ({
        sound: progress.sound,
        music: progress.music,
        brand: this.brandShown,
        dailyDone: this.dailyDone,
        streak: progress.streak,
      }),
      audio: () => audio.debug(),
      messages: () => [...sentPlatformMessages()],
    });
  }

  private button(
    x: number,
    y: number,
    w: number,
    h: number,
    color: number,
    icon: string,
    label: string,
    badge: string,
    onTap: () => void,
  ): void {
    const bg = this.add.rectangle(x, y, w, h, color).setInteractive({ useHandCursor: true });
    const ic = addImage(this, x - w / 2 + 90, y, icon).setDisplaySize(h * 0.6, h * 0.6);
    const txt = this.add
      .text(x + 30, y, label, {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: `${String(Math.round(h * 0.42))}px`,
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5);
    this.root.add([bg, ic, txt]);
    if (badge) {
      const flame = addImage(this, x + w / 2 - 40, y, UI.flame).setDisplaySize(TOGGLE, TOGGLE);
      const n = this.add
        .text(x + w / 2 - 40, y + 4, badge, {
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '40px',
          fontStyle: 'bold',
          color: '#1b1f2a',
        })
        .setOrigin(0.5);
      this.root.add([flame, n]);
    }
    bg.on(Phaser.Input.Events.POINTER_UP, () => {
      // First user gesture (GDD §12): the music loop may start from here on.
      audio.startMusic();
      audio.play('button');
      this.tweens.add({
        targets: [bg, ic, txt],
        scale: '*=0.96',
        yoyo: true,
        duration: 70,
        onComplete: onTap,
      });
    });
  }

  private toggle(x: number, y: number, key: 'sound' | 'music', on: string, off: string): void {
    const img = addImage(this, x, y, progress[key] ? on : off)
      .setDisplaySize(TOGGLE, TOGGLE)
      .setInteractive({ useHandCursor: true });
    img.on(Phaser.Input.Events.POINTER_UP, () => {
      setImageFrame(img, audio.toggleSetting(key) ? on : off);
    });
    this.root.add(img);
  }
}
