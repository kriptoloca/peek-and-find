import Phaser from 'phaser';
import { KITCHEN, familyById } from '../data/themes';
import { computeLayout, type Rect } from '../game/layout';
import { sceneSeed } from '../gen/rng';
import { generateScene } from '../gen/scene-gen';
import type { Mode, Placed, Scene } from '../gen/types';
import { validateScene } from '../gen/validate';

const COLOR_BG = 0x1b1f2a;
const COLOR_SCENE = 0x2e3650;
const COLOR_PLAYABLE = 0x47507a;
const COLOR_TARGET = 0xffffff;
const COLOR_DECOY = 0xff8c42;
const COLOR_HIT = 0x9bd3ff;
const BAND_ALPHA = [0.55, 0.75, 0.95] as const;

/**
 * Dev-only page (`#gen` in dev builds): renders a generated scene as colored rectangles.
 * Tap left third: level −1 · middle third: level +1 · right third: new seed.
 * Keyboard: ↑/↓ level, space new seed. Never shipped: main.ts gates it on import.meta.env.DEV.
 */
export class GenPreviewScene extends Phaser.Scene {
  private level = 1;
  private attempt = 0;
  private mode: Mode = 'find';
  private readonly salt = 1234;
  private gfx!: Phaser.GameObjects.Graphics;
  private info!: Phaser.GameObjects.Text;
  private current: Scene | null = null;
  private genMs = 0;
  private errors: string[] = [];

  constructor() {
    super('GenPreview');
  }

  create(): void {
    this.gfx = this.add.graphics();
    this.info = this.add
      .text(0, 0, '', {
        fontFamily: 'monospace',
        fontSize: '26px',
        color: '#ffffff',
        backgroundColor: '#000000aa',
        padding: { x: 10, y: 6 },
        wordWrap: { width: 1040 },
      })
      .setDepth(10);
    this.input.on(Phaser.Input.Events.POINTER_UP, (pointer: Phaser.Input.Pointer) => {
      const third = pointer.x / this.scale.gameSize.width;
      if (third < 1 / 3) this.level = Math.max(1, this.level - 1);
      else if (third < 2 / 3) this.level += 1;
      else this.attempt += 1;
      this.regen();
    });
    this.input.keyboard?.on('keydown-UP', () => {
      this.level += 1;
      this.regen();
    });
    this.input.keyboard?.on('keydown-DOWN', () => {
      this.level = Math.max(1, this.level - 1);
      this.regen();
    });
    this.input.keyboard?.on('keydown-SPACE', () => {
      this.attempt += 1;
      this.regen();
    });
    this.input.keyboard?.on('keydown-M', () => {
      this.mode = this.mode === 'find' ? 'odd' : 'find';
      this.regen();
    });
    const q = new URLSearchParams(window.location.search).get('mode');
    if (q === 'odd' || q === 'find') this.mode = q;
    this.scale.on(Phaser.Scale.Events.RESIZE, this.draw);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.draw);
    });
    this.regen();
  }

  private regen(): void {
    const seed = sceneSeed(this.mode, this.level, this.attempt, this.salt);
    const t0 = performance.now();
    try {
      this.current = generateScene({ seed, level: this.level, mode: this.mode, theme: KITCHEN });
      this.errors = validateScene(this.current, KITCHEN);
    } catch (e) {
      this.current = null;
      this.errors = [e instanceof Error ? e.message : String(e)];
    }
    this.genMs = performance.now() - t0;
    this.draw();
  }

  private readonly draw = (): void => {
    const { width, height } = this.scale.gameSize;
    this.cameras.main.setViewport(0, 0, width, height);
    const layout = computeLayout(width, height);
    const s = layout.scene;
    const g = this.gfx;
    g.clear();
    g.fillStyle(COLOR_BG, 1);
    g.fillRect(0, 0, width, height);
    g.fillStyle(COLOR_SCENE, 1);
    g.fillRect(s.x, s.y, s.w, s.h);

    const sc = this.current;
    if (sc) {
      g.lineStyle(2, COLOR_PLAYABLE, 1);
      g.strokeRect(s.x + sc.playable.x, s.y + sc.playable.y, sc.playable.w, sc.playable.h);
      const sorted = [...sc.objects].sort((a, b) => a.z - b.z);
      for (const o of sorted) this.drawObject(g, o, s);
    }
    this.info.setText(this.describe());
    this.info.setPosition(layout.hud.primary.x + 12, layout.hud.primary.y + 12);
  };

  private drawObject(g: Phaser.GameObjects.Graphics, o: Placed, s: Rect): void {
    const fam = familyById(KITCHEN, o.family);
    const x = s.x + o.x;
    const y = s.y + o.y;
    const half = o.size / 2;
    g.fillStyle(fam.previewColor, BAND_ALPHA[o.band]);
    g.fillRect(x - half, y - half, o.size, o.size);
    // flip marker: notch on the left edge when flipped, right edge otherwise
    g.fillStyle(0x000000, 0.35);
    g.fillRect(o.flipX ? x - half : x + half - 10, y - half, 10, o.size);
    if (o.isTarget) {
      g.lineStyle(6, COLOR_TARGET, 1);
      g.strokeRect(x - half, y - half, o.size, o.size);
    } else if (o.isDecoy) {
      g.lineStyle(4, COLOR_DECOY, 1);
      g.strokeRect(x - half, y - half, o.size, o.size);
    }
    g.lineStyle(1, COLOR_HIT, 0.6);
    g.strokeCircle(x, y, o.hitRadius);
  }

  private describe(): string {
    const sc = this.current;
    const head = `${this.mode} L${String(this.level)} attempt ${String(this.attempt)} · gen ${this.genMs.toFixed(1)} ms`;
    if (!sc) return `${head}\n${this.errors.join('\n')}`;
    const decoys = sc.objects.filter((o) => o.isDecoy).length;
    const prompt =
      sc.prompt.kind === 'find'
        ? sc.prompt.items.map((it) => `${it.icon}×${String(it.count)}`).join('  ')
        : sc.odd
          ? `odd by ${sc.odd.kind} (${sc.odd.baseFrame}, ${String(sc.odd.cols)}×${String(sc.odd.rows)})`
          : sc.prompt.kind;
    const lines = [
      head,
      `seed ${String(sc.seed)} regen ${String(sc.regenerations)} · n=${String(sc.objects.length)} targets=${String(sc.targets.length)} decoys=${String(decoys)}`,
      `spacing ${sc.spacing.toFixed(0)} targetSpacing ${sc.targetSpacing.toFixed(0)} occl≤${sc.params.maxOcclusion.toFixed(2)} tScale ${sc.params.targetScale.toFixed(2)}`,
      `prompt: ${prompt}`,
      'tap: left −level · middle +level · right new seed · key M: mode',
    ];
    if (this.errors.length > 0) lines.push(`INVALID: ${this.errors.slice(0, 3).join(' | ')}`);
    return lines.join('\n');
  }
}
