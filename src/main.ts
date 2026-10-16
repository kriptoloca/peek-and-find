import Phaser from 'phaser';
import { designSize } from './game/layout';
import { PlaygroundScene } from './game/scenes/PlaygroundScene';

/**
 * Scale strategy (GDD §10, CLAUDE.md rule 5): Scale.FIT with a design size that follows the
 * viewport aspect. The short side is always 1080 design px; the long side is clamped to
 * [1080, 2400]. On viewport changes we resize the game to the new design size and every scene
 * re-runs its layout() on the RESIZE event.
 */
function viewport(): { w: number; h: number } {
  const vv = window.visualViewport;
  return {
    w: Math.round(vv?.width ?? window.innerWidth),
    h: Math.round(vv?.height ?? window.innerHeight),
  };
}

const first = viewport();
let current = designSize(first.w, first.h);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#1b1f2a',
  banner: false,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: current.width,
    height: current.height,
  },
  render: { antialias: true, roundPixels: false },
  scene: [PlaygroundScene],
});

function onViewportChange(): void {
  const v = viewport();
  const next = designSize(v.w, v.h);
  if (next.width !== current.width || next.height !== current.height) {
    current = next;
    // setGameSize (not resize): only it updates the FIT aspect ratio of the display size.
    game.scale.setGameSize(next.width, next.height);
  } else {
    game.scale.refresh();
  }
}

window.addEventListener('resize', onViewportChange);
window.visualViewport?.addEventListener('resize', onViewportChange);
window.addEventListener('orientationchange', () => {
  // iOS reports the old size for a frame or two after rotation.
  window.setTimeout(onViewportChange, 60);
  window.setTimeout(onViewportChange, 300);
});
