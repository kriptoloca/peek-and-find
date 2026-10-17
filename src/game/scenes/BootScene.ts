import Phaser from 'phaser';
import { t } from '../../data/strings';
import { THEMES, themeForLevel } from '../../data/themes';
import { themeToPreload } from '../../gen/difficulty';
import type { Theme } from '../../gen/types';
import { initPlatform } from '../../platform/bridge';
import { SaveStore } from '../../platform/storage';
import {
  ATLAS_INDEX_KEY,
  ATLAS_INDEX_URL,
  ensureThemes,
  ensureUi,
  readAtlasIndex,
} from '../assets';
import { AUDIO_INDEX_KEY, AUDIO_INDEX_URL, audio, loadAudio } from '../audio';
import { computeLayout } from '../layout';
import {
  attachSaveStore,
  hydrateProgress,
  progress,
  resetProgress,
  persistProgress,
} from '../state';

const BOOT_BAR_W = 360;
const BOOT_BAR_H = 10;
const COLOR_BAR_TRACK = 0x2e3650;
const COLOR_BAR_FILL = 0x3b7dd8;

/**
 * Boot (GDD §9 screen 1): Bridge, save, then the UI atlas and the player's current theme (plus
 * the one unlocking soon) before the Title, so GameReady is sent only when the first screen is
 * interactive with its assets in memory (CLAUDE.md rule 3). Other themes load from the bundle
 * ahead of their first level (src/game/assets.ts).
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    // Written by scripts/assets.mjs; when absent the game runs on runtime placeholders.
    this.load.json(ATLAS_INDEX_KEY, ATLAS_INDEX_URL);
    this.load.json(AUDIO_INDEX_KEY, AUDIO_INDEX_URL);
  }

  create(): void {
    readAtlasIndex(this);
    this.showLoading();
    this.boot().catch((e: unknown) => {
      // A failed boot still shows the Title with whatever loaded (placeholders fill the gaps).
      console.error('peek: boot failed', e);
      this.scene.start('Title');
    });
  }

  /** Our own boot screen (the Bridge loading logo is off): wordmark + a loader progress bar. */
  private showLoading(): void {
    const { width, height } = this.scale.gameSize;
    const s = computeLayout(width, height).scene;
    const cx = s.x + s.w / 2;
    const cy = s.y + s.h / 2;
    this.add
      .text(cx, cy - 40, t().title, {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '72px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5);
    this.add.rectangle(cx, cy + 50, BOOT_BAR_W, BOOT_BAR_H, COLOR_BAR_TRACK);
    const fill = this.add
      .rectangle(cx - BOOT_BAR_W / 2, cy + 50, 1, BOOT_BAR_H, COLOR_BAR_FILL)
      .setOrigin(0, 0.5);
    this.load.on(Phaser.Loader.Events.PROGRESS, (v: number) => {
      fill.width = Math.max(1, BOOT_BAR_W * v);
    });
  }

  private async boot(): Promise<void> {
    // Bridge first (docs/bridge-notes.md): storage goes through the platform when there is one.
    const platform = await initPlatform();
    platform.sendMessage('in_game_loading_started');
    const store = new SaveStore(platform.storage);
    attachSaveStore(store);
    hydrateProgress(await store.load());

    let target: { key: string; data?: { daily: boolean; today?: string } } = { key: 'Title' };
    if (import.meta.env.DEV) {
      const q = new URLSearchParams(window.location.search);
      if (q.get('reset') === '1') resetProgress();
      // ?salt=N pins the per-player seed salt so a scene can be reproduced in a test.
      const salt = q.get('salt');
      if (salt !== null && /^\d+$/.test(salt)) {
        progress.seedSalt = Number(salt) >>> 0;
        persistProgress();
      }
      // Dev shortcuts skip the title: ?level=, ?mode=, ?daily=1
      if (q.has('level') || q.has('mode') || q.get('daily') === '1') {
        target = {
          key: 'Game',
          data: { daily: q.get('daily') === '1', today: q.get('today') ?? undefined },
        };
      }
    }

    const level = progress.level;
    const pre = themeToPreload(level);
    const themes: Theme[] = [themeForLevel(level)];
    if (pre !== null) themes.push(THEMES[pre] as Theme);
    await ensureUi(this);
    await ensureThemes(this, themes);
    await loadAudio(this);
    audio.attach(this, platform);
    this.scene.start(target.key, target.data);
  }
}
