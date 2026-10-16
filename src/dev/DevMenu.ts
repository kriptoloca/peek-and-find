import Phaser from 'phaser';
import type { Mode } from '../gen/types';

export interface DevMenuState {
  level: number;
  mode: Mode | 'auto';
}

export interface DevMenuCallbacks {
  onGo: (s: DevMenuState) => void;
  onReset: () => void;
  onClose: () => void;
}

const MODES: readonly (Mode | 'auto')[] = ['auto', 'find', 'odd', 'spot'];
const DEPTH = 100;

/**
 * Dev-only overlay (triple-tap top-left in dev builds): jump to a level and force a mode.
 * Uses text buttons; it never ships (GameScene imports it dynamically inside import.meta.env.DEV).
 */
export function openDevMenu(
  scene: Phaser.Scene,
  initial: DevMenuState,
  cb: DevMenuCallbacks,
): void {
  const { width, height } = scene.scale.gameSize;
  const state: DevMenuState = { ...initial };
  const root = scene.add.container(0, 0).setDepth(DEPTH);
  const dim = scene.add.graphics();
  dim.fillStyle(0x000000, 0.8).fillRect(0, 0, width, height);
  root.add(dim);

  const cx = width / 2;
  const top = height / 2 - 320;
  const style = { fontFamily: 'monospace', fontSize: '44px', color: '#ffffff' };
  const title = scene.add.text(cx, top, 'DEV MENU', style).setOrigin(0.5);
  const levelText = scene.add.text(cx, top + 120, '', style).setOrigin(0.5);
  const modeText = scene.add.text(cx, top + 320, '', style).setOrigin(0.5);
  root.add([title, levelText, modeText]);

  const refresh = (): void => {
    levelText.setText(`LEVEL ${String(state.level)}`);
    modeText.setText(`MODE ${state.mode.toUpperCase()}`);
  };

  const button = (x: number, y: number, label: string, onTap: () => void): void => {
    const bg = scene.add.rectangle(x, y, 190, 90, 0x3b7dd8).setInteractive({ useHandCursor: true });
    const txt = scene.add.text(x, y, label, style).setOrigin(0.5);
    bg.on(Phaser.Input.Events.POINTER_UP, () => {
      onTap();
      refresh();
    });
    root.add([bg, txt]);
  };

  button(cx - 310, top + 220, '-10', () => (state.level = Math.max(1, state.level - 10)));
  button(cx - 105, top + 220, '-1', () => (state.level = Math.max(1, state.level - 1)));
  button(cx + 105, top + 220, '+1', () => (state.level += 1));
  button(cx + 310, top + 220, '+10', () => (state.level += 10));
  button(cx, top + 420, 'MODE', () => {
    state.mode = MODES[(MODES.indexOf(state.mode) + 1) % MODES.length] as Mode | 'auto';
  });
  button(cx - 210, top + 560, 'GO', () => {
    root.destroy(true);
    cb.onGo(state);
  });
  button(cx + 210, top + 560, 'RESET', () => {
    root.destroy(true);
    cb.onReset();
  });
  button(cx, top + 700, 'CLOSE', () => {
    root.destroy(true);
    cb.onClose();
  });
  refresh();
}
