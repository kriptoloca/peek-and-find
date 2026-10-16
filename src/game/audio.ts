import Phaser from 'phaser';
import type { Platform } from '../platform/bridge';
import { runLoader } from './assets';
import { MUSIC_KEY, type SfxName } from './audio-keys';
import { progress } from './state';

/**
 * Audio (GDD §12, CLAUDE.md rule 4). Files come from `public/audio/index.json` (written by
 * scripts/audio.mjs; OGG with an M4A fallback for Safari) and are loaded at Boot. Rules:
 *  - platform mute always wins: `platform.isAudioEnabled()` / `onAudio` gate everything,
 *    the in-game toggles (progress.sound / progress.music) only narrow further;
 *  - platform pause silences and pauses the music; resume restores it;
 *  - nothing plays before the first user gesture: SFX are dropped while the sound manager is
 *    locked and the music starts on the first PLAY/DAILY tap (`startMusic`).
 * Without an index (or when a file fails) every call is a no-op.
 */
export const AUDIO_INDEX_KEY = 'audio-index';
export const AUDIO_INDEX_URL = 'audio/index.json';
const SFX_VOLUME = 0.6;
const MUSIC_VOLUME = 0.35;
const DEBUG_HISTORY = 8;

export interface AudioIndex {
  version: number;
  sounds: Record<string, { ogg: string; m4a: string; source: string; music: boolean }>;
  music: string;
}

export interface AudioDebug {
  ready: boolean;
  locked: boolean;
  platformEnabled: boolean;
  paused: boolean;
  musicWanted: boolean;
  musicPlaying: boolean;
  /** Last SFX keys that were actually started. */
  played: string[];
  /** SFX requests dropped by a gate (mute, pause, lock, missing file). */
  dropped: number;
}

function isIndex(raw: unknown): raw is AudioIndex {
  if (typeof raw !== 'object' || raw === null) return false;
  const r = raw as Record<string, unknown>;
  return r.version === 1 && typeof r.sounds === 'object' && r.sounds !== null;
}

/** Loads every file of the index that is not in the audio cache yet. Boot calls this once. */
export async function loadAudio(scene: Phaser.Scene): Promise<void> {
  const raw: unknown = scene.cache.json.get(AUDIO_INDEX_KEY);
  if (!isIndex(raw)) return;
  const pending = Object.entries(raw.sounds).filter(([key]) => !scene.cache.audio.exists(key));
  if (pending.length === 0) return;
  await runLoader(scene, (loader) => {
    for (const [key, e] of pending) loader.audio(key, [e.ogg, e.m4a]);
  });
}

class AudioManager {
  private sound: Phaser.Sound.BaseSoundManager | null = null;
  private cache: Phaser.Cache.BaseCache | null = null;
  private music: Phaser.Sound.BaseSound | null = null;
  private platformEnabled = true;
  private paused = false;
  private musicWanted = false;
  private readonly played: string[] = [];
  private dropped = 0;
  private unsubscribe: (() => void) | null = null;

  /** Binds the game-wide sound manager and the platform's audio state. */
  attach(scene: Phaser.Scene, platform: Platform): void {
    this.sound = scene.sound;
    this.cache = scene.cache.audio;
    this.platformEnabled = platform.isAudioEnabled();
    this.unsubscribe?.();
    this.unsubscribe = platform.onAudio((enabled) => {
      this.platformEnabled = enabled;
      this.refresh();
    });
    this.sound.once(Phaser.Sound.Events.UNLOCKED, () => {
      this.refresh();
    });
    this.refresh();
  }

  private sfxAllowed(): boolean {
    return this.sound !== null && this.platformEnabled && !this.paused && progress.sound;
  }

  private musicAllowed(): boolean {
    return (
      this.sound !== null &&
      this.platformEnabled &&
      !this.paused &&
      progress.music &&
      this.musicWanted
    );
  }

  play(name: SfxName): void {
    if (!this.sound || !this.cache || !this.sfxAllowed() || this.sound.locked) {
      this.dropped += 1;
      return;
    }
    if (!this.cache.exists(name)) {
      this.dropped += 1;
      return;
    }
    if (this.sound.play(name, { volume: SFX_VOLUME })) {
      this.played.push(name);
      if (this.played.length > DEBUG_HISTORY) this.played.shift();
    }
  }

  /** The first user gesture happened (PLAY or DAILY): the loop may run from now on. */
  startMusic(): void {
    this.musicWanted = true;
    this.refresh();
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    this.refresh();
  }

  /** Re-evaluates platform state, pause and the player's toggles; the platform always wins. */
  refresh(): void {
    if (!this.sound || !this.cache) return;
    if (this.musicAllowed() && !this.sound.locked) {
      if (!this.music && this.cache.exists(MUSIC_KEY)) {
        this.music = this.sound.add(MUSIC_KEY, { loop: true, volume: MUSIC_VOLUME });
      }
      if (this.music && !this.music.isPlaying) {
        if (this.music.isPaused) this.music.resume();
        else this.music.play();
      }
    } else if (this.music?.isPlaying) {
      this.music.pause();
    }
  }

  debug(): AudioDebug {
    return {
      ready: this.sound !== null,
      locked: this.sound?.locked ?? true,
      platformEnabled: this.platformEnabled,
      paused: this.paused,
      musicWanted: this.musicWanted,
      musicPlaying: this.music?.isPlaying ?? false,
      played: [...this.played],
      dropped: this.dropped,
    };
  }
}

export const audio = new AudioManager();
