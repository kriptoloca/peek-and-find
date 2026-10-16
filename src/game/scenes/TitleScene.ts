import Phaser from 'phaser';
import { t } from '../../data/strings';
import { dailyStatus, todayKey } from '../daily';
import { computeLayout } from '../layout';
import { persistProgress, progress } from '../state';
import { UI, ensureUiTextures } from '../textures/placeholders';

const COLOR_BG = 0x1b1f2a;
const COLOR_PLAY = 0x3b7dd8;
const COLOR_DAILY = 0x2a9d8f;
const COLOR_DAILY_DONE = 0x4a4f63;
const PLAY_W = 520;
const PLAY_H = 170;
const DAILY_W = 520;
const DAILY_H = 130;
const TOGGLE = 96;

/**
 * Title (GDD §9 screen 2): logo, PLAY, DAILY with streak badge and check mark, sound/music
 * toggles. No settings screen. Text is limited to the title wordmark and the two button words.
 */
export class TitleScene extends Phaser.Scene {
  private root!: Phaser.GameObjects.Container;

  constructor() {
    super('Title');
  }

  create(): void {
    ensureUiTextures(this);
    this.root = this.add.container(0, 0);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.build);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.build);
    });
    this.build();
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
    const logo = this.add
      .text(cx, s.y + s.h * 0.2, strings.title, {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '104px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5);
    this.root.add(logo);

    // PLAY
    const playY = s.y + s.h * 0.48;
    this.button(cx, playY, PLAY_W, PLAY_H, COLOR_PLAY, UI.play, strings.play, '', () => {
      this.scene.start('Game', { daily: false });
    });

    // DAILY with streak badge / check
    const status = dailyStatus(progress, todayKey());
    const dailyY = playY + PLAY_H / 2 + 50 + DAILY_H / 2;
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
        if (!status.done) this.scene.start('Game', { daily: true });
      },
    );
    if (status.done && status.streak > 0) {
      const flame = this.add
        .image(cx + DAILY_W / 2 - 40, dailyY, UI.flame)
        .setDisplaySize(TOGGLE, TOGGLE);
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
    this.toggle(
      cx - 80,
      ty,
      () => progress.sound,
      (v) => (progress.sound = v),
      UI.soundOn,
      UI.soundOff,
    );
    this.toggle(
      cx + 80,
      ty,
      () => progress.music,
      (v) => (progress.music = v),
      UI.musicOn,
      UI.musicOff,
    );
  };

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
    const ic = this.add.image(x - w / 2 + 90, y, icon).setDisplaySize(h * 0.6, h * 0.6);
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
      const flame = this.add.image(x + w / 2 - 40, y, UI.flame).setDisplaySize(TOGGLE, TOGGLE);
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
      this.tweens.add({
        targets: [bg, ic, txt],
        scale: '*=0.96',
        yoyo: true,
        duration: 70,
        onComplete: onTap,
      });
    });
  }

  private toggle(
    x: number,
    y: number,
    get: () => boolean,
    set: (v: boolean) => void,
    on: string,
    off: string,
  ): void {
    const img = this.add
      .image(x, y, get() ? on : off)
      .setDisplaySize(TOGGLE, TOGGLE)
      .setInteractive({ useHandCursor: true });
    img.on(Phaser.Input.Events.POINTER_UP, () => {
      set(!get());
      img.setTexture(get() ? on : off);
      persistProgress();
    });
    this.root.add(img);
  }
}
