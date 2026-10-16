import Phaser from 'phaser';
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
import { attachSaveStore, hydrateProgress, progress, resetProgress } from '../state';

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
  }

  create(): void {
    readAtlasIndex(this);
    void this.boot();
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
    this.scene.start(target.key, target.data);
  }
}
