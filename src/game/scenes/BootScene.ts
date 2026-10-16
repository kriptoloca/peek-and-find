import Phaser from 'phaser';
import { LocalStorageBackend, SaveStore } from '../../platform/storage';
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
    const store = new SaveStore(new LocalStorageBackend());
    attachSaveStore(store);
    void store.load().then((save) => {
      hydrateProgress(save);
      if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('reset') === '1') {
        resetProgress();
      }
      this.scene.start('Game');
    });
  }
}
