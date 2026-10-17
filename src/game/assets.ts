import Phaser from 'phaser';
import { backgroundKey, THEMES } from '../data/themes';
import type { Theme } from '../gen/types';
import { ensureThemeTextures, ensureUiTextures } from './textures/placeholders';

/**
 * Texture sources for the game (Epic 9). `scripts/assets.mjs` packs one atlas per theme plus the
 * UI atlas and writes `public/atlases/index.json`; Boot reads that index and loads the UI and the
 * current theme before the Title (CLAUDE.md rule 3), GameScene loads the next theme ahead of its
 * first level (GDD §5). A theme missing from the index falls back to the runtime placeholders,
 * so the game runs before any art exists.
 *
 * Frame names are the same in both worlds (`kitchen_mug_a_c1`, `ui_heart`); `textureRef` resolves
 * a name to either a standalone texture (placeholder) or an atlas key + frame.
 */
export interface AtlasThemeEntry {
  atlas: string;
  data: string;
  frames: number;
  frameSize: number;
  source: 'svg' | 'placeholder' | 'mixed';
  missing: number;
  background: string;
  backgroundSpot: string;
  backgroundSource: string;
}

export interface AtlasUiEntry {
  atlas: string;
  data: string;
  frames: number;
  source: 'svg' | 'placeholder' | 'mixed';
  missing: number;
}

export interface AtlasIndex {
  version: number;
  themes: Record<string, AtlasThemeEntry>;
  ui: AtlasUiEntry | null;
}

export const ATLAS_INDEX_KEY = 'atlas-index';
export const ATLAS_INDEX_URL = 'atlases/index.json';

let index: AtlasIndex | null = null;

function isIndex(raw: unknown): raw is AtlasIndex {
  if (typeof raw !== 'object' || raw === null) return false;
  const r = raw as Record<string, unknown>;
  return r.version === 1 && typeof r.themes === 'object' && r.themes !== null;
}

/** Reads the index Boot preloaded into the JSON cache. Absent or malformed → placeholders. */
export function readAtlasIndex(scene: Phaser.Scene): AtlasIndex | null {
  const raw: unknown = scene.cache.json.get(ATLAS_INDEX_KEY);
  index = isIndex(raw) ? raw : null;
  return index;
}

export function atlasIndex(): AtlasIndex | null {
  return index;
}

export function atlasKey(id: string): string {
  return `atlas_${id}`;
}

/** Runs one loader pass; resolves when every queued file finished (failures are logged). */
export function runLoader(
  scene: Phaser.Scene,
  enqueue: (loader: Phaser.Loader.LoaderPlugin) => void,
): Promise<void> {
  return new Promise((resolve) => {
    const loader = scene.load;
    const onError = (file: Phaser.Loader.File): void => {
      console.error(`asset load failed: ${file.key} (${file.url as string})`);
    };
    loader.on(Phaser.Loader.Events.FILE_LOAD_ERROR, onError);
    loader.once(Phaser.Loader.Events.COMPLETE, () => {
      loader.off(Phaser.Loader.Events.FILE_LOAD_ERROR, onError);
      resolve();
    });
    enqueue(loader);
    loader.start();
  });
}

/**
 * Makes the textures of these themes available: atlas + backgrounds from the index when packed,
 * runtime placeholders otherwise (also when a packed file fails to load).
 */
export async function ensureThemes(scene: Phaser.Scene, themes: readonly Theme[]): Promise<void> {
  const packed = themes.filter((t) => index?.themes[t.id] !== undefined);
  for (const t of themes) if (!packed.includes(t)) ensureThemeTextures(scene, t);
  const pending = packed.filter((t) => !scene.textures.exists(atlasKey(t.id)));
  if (pending.length === 0) return;
  await runLoader(scene, (loader) => {
    for (const t of pending) {
      const e = index?.themes[t.id];
      if (!e) continue;
      loader.atlas(atlasKey(t.id), e.atlas, e.data);
      const bg = backgroundKey(t, false);
      const spot = backgroundKey(t, true);
      if (!scene.textures.exists(bg)) loader.image(bg, e.background);
      if (!scene.textures.exists(spot)) loader.image(spot, e.backgroundSpot);
    }
  });
  for (const t of pending) {
    if (!scene.textures.exists(atlasKey(t.id))) {
      console.error(`atlas ${t.id} unavailable, using placeholders`);
      ensureThemeTextures(scene, t);
    }
  }
}

/**
 * Removes the atlas and backgrounds of every theme not in `keep`, so at most a few atlases sit
 * in GPU memory (five 2048² atlases with mipmaps are ≈ 110 MB). Returns the removed keys.
 */
export function releaseThemes(scene: Phaser.Scene, keep: readonly Theme[]): string[] {
  const keepIds = new Set(keep.map((t) => t.id));
  const removed: string[] = [];
  for (const t of THEMES) {
    if (keepIds.has(t.id)) continue;
    for (const key of [atlasKey(t.id), backgroundKey(t, false), backgroundKey(t, true)]) {
      if (scene.textures.exists(key)) {
        scene.textures.remove(key);
        removed.push(key);
      }
    }
  }
  return removed;
}

/** UI atlas when packed, runtime placeholders otherwise. */
export async function ensureUi(scene: Phaser.Scene): Promise<void> {
  const e = index?.ui;
  if (!e) {
    ensureUiTextures(scene);
    return;
  }
  if (scene.textures.exists(atlasKey('ui'))) return;
  await runLoader(scene, (loader) => {
    loader.atlas(atlasKey('ui'), e.atlas, e.data);
  });
  if (!scene.textures.exists(atlasKey('ui'))) {
    console.error('ui atlas unavailable, using placeholders');
    ensureUiTextures(scene);
  }
}

export interface TextureRef {
  key: string;
  frame?: string;
}

/**
 * Resolves a frame name: a standalone texture of that name (placeholders, backgrounds) wins,
 * else the atlas of its prefix (`kitchen_…` → `atlas_kitchen`, `ui_…` → `atlas_ui`).
 */
export function textureRef(scene: Phaser.Scene, frame: string): TextureRef {
  if (scene.textures.exists(frame)) return { key: frame };
  const key = atlasKey(frame.split('_')[0] ?? '');
  if (scene.textures.exists(key) && scene.textures.get(key).has(frame)) return { key, frame };
  throw new Error(`missing texture frame ${frame}`);
}

export function addImage(
  scene: Phaser.Scene,
  x: number,
  y: number,
  frame: string,
): Phaser.GameObjects.Image {
  const r = textureRef(scene, frame);
  return scene.add.image(x, y, r.key, r.frame);
}

export function setImageFrame(img: Phaser.GameObjects.Image, frame: string): void {
  const r = textureRef(img.scene, frame);
  img.setTexture(r.key, r.frame);
}

/** Uniform scale so the longest side is `size` design px (atlas frames are not square). */
export function fitImage<T extends Phaser.GameObjects.Image>(img: T, size: number): T {
  img.setScale(size / Math.max(img.width, img.height));
  return img;
}

/** Loaded atlas texture keys (dev smoke tests read this through the debug hooks). */
export function loadedAtlases(scene: Phaser.Scene): string[] {
  return scene.textures.getTextureKeys().filter((k) => k.startsWith('atlas_'));
}
