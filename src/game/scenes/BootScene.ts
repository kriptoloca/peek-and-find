import Phaser from 'phaser';
import { initPlatform } from '../../platform/bridge';
import { SaveStore } from '../../platform/storage';
import { attachSaveStore, hydrateProgress, resetProgress } from '../state';

/**
 * Boot (GDD §9 screen 1): loads the save, then starts the game. GameReady (epic 8) will be
 * raised only after the first interactive screen is up. Textures are generated per theme by
 * GameScene, so there is nothing to load here yet.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    // Bridge first (docs/bridge-notes.md): storage goes through the platform when there is one.
    void initPlatform()
      .then((platform) => {
        platform.sendMessage('in_game_loading_started');
        const store = new SaveStore(platform.storage);
        attachSaveStore(store);
        return store.load();
      })
      .then((save) => {
        hydrateProgress(save);
        if (import.meta.env.DEV) {
          const q = new URLSearchParams(window.location.search);
          if (q.get('reset') === '1') resetProgress();
          // Dev shortcuts skip the title: ?level=, ?mode=, ?daily=1
          if (q.has('level') || q.has('mode') || q.get('daily') === '1') {
            this.scene.start('Game', {
              daily: q.get('daily') === '1',
              today: q.get('today') ?? undefined,
            });
            return;
          }
        }
        this.scene.start('Title');
      });
  }
}
