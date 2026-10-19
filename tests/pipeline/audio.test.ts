import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import manifest from '../../src/data/audio-manifest.json';
import {
  ARRIVE_SFX,
  CORRECT_SFX,
  FEEL_SFX,
  MUSIC_KEY,
  SFX_NAMES,
  starSfx,
} from '../../src/game/audio-keys';
import { SFX_FILE_DB, type FeelSound } from '../../src/game/feel';
import {
  MUSIC_NAME,
  SAMPLE_RATE,
  SFX_NAMES as SYNTH_NAMES,
  renderMusic,
  renderSfx,
  toWav,
} from '../../scripts/lib/synth.mjs';

const ROOT = new URL('../../', import.meta.url);

describe('audio keys and manifest', () => {
  it('game keys, manifest and synth agree', () => {
    expect([...SFX_NAMES]).toEqual(manifest.sfx);
    expect(SYNTH_NAMES).toEqual(manifest.sfx);
    expect(MUSIC_KEY).toBe(manifest.music);
    expect(MUSIC_NAME).toBe(manifest.music);
    expect(SFX_NAMES).toHaveLength(13);
  });

  it('helper keys stay inside the list', () => {
    expect(SFX_NAMES).toContain(CORRECT_SFX);
    expect(SFX_NAMES).toContain(ARRIVE_SFX);
    expect(starSfx(2)).toBe('star_2');
  });
});

describe('placeholder synth', () => {
  it('renders every SFX deterministically, short and within the peak', () => {
    for (const name of SYNTH_NAMES) {
      const a = renderSfx(name);
      const b = renderSfx(name);
      expect(a.length, name).toBeGreaterThan(SAMPLE_RATE * 0.01);
      expect(a.length, name).toBeLessThan(SAMPLE_RATE * 1.6);
      expect(Buffer.from(a.buffer).equals(Buffer.from(b.buffer)), name).toBe(true);
      let peak = 0;
      for (const v of a) peak = Math.max(peak, Math.abs(v));
      expect(peak, name).toBeLessThanOrEqual(0.8001);
      expect(peak, name).toBeGreaterThan(0.5);
      expect(Math.abs(a[0]!), name).toBeLessThan(0.01); // faded edges
    }
  });

  it('music loop is exactly 16 s, below the SFX peaks and loud enough for a phone speaker', () => {
    const m = renderMusic();
    expect(m.length).toBe(16 * SAMPLE_RATE);
    let peak = 0;
    let sum = 0;
    for (const v of m) {
      peak = Math.max(peak, Math.abs(v));
      sum += v * v;
    }
    // Peak 0.85 under the SFX peak (0.8 pre-gain × 0.6 vs 0.85 × 0.5 in game); the first phone
    // test could not hear the loop at peak 0.5 (docs/audio-review.md).
    expect(peak).toBeLessThanOrEqual(0.8501);
    expect(peak).toBeGreaterThan(0.8);
    const rmsDb = 20 * Math.log10(Math.sqrt(sum / m.length));
    expect(rmsDb).toBeGreaterThan(-20); // ≈ −16 dBFS pre-gain
  });

  it('writes a valid 16-bit mono WAV', () => {
    const wav = toWav(renderSfx('button'));
    expect(wav.subarray(0, 4).toString()).toBe('RIFF');
    expect(wav.subarray(8, 12).toString()).toBe('WAVE');
    expect(wav.readUInt16LE(22)).toBe(1);
    expect(wav.readUInt32LE(24)).toBe(SAMPLE_RATE);
    expect(wav.readUInt32LE(40)).toBe(wav.length - 44);
  });
});

describe('committed audio', () => {
  it('public/audio holds every sound in both formats within budget', () => {
    const indexPath = new URL('public/audio/index.json', ROOT);
    expect(existsSync(indexPath)).toBe(true);
    const index = JSON.parse(readFileSync(indexPath, 'utf8')) as {
      sounds: Record<string, { ogg: string; m4a: string; music: boolean }>;
      music: string;
    };
    expect(new Set(Object.keys(index.sounds))).toEqual(new Set([...manifest.sfx, manifest.music]));
    let total = 0;
    for (const [key, e] of Object.entries(index.sounds)) {
      for (const f of [e.ogg, e.m4a]) {
        const url = new URL(`public/${f}`, ROOT);
        expect(existsSync(url), f).toBe(true);
        const size = statSync(url).size;
        expect(size, f).toBeGreaterThan(200);
        if (f.endsWith('.ogg')) total += size;
        if (key === manifest.music) expect(size, f).toBeLessThanOrEqual(150 * 1024);
      }
    }
    expect(total).toBeLessThanOrEqual(1024 * 1024);
  });
});

/** Same list as scripts/audio.mjs: a drop-in source replaces the placeholder. */
const SOURCE_EXT = ['wav', 'ogg', 'mp3', 'flac', 'm4a', 'aac'];

function hasDropIn(name: string): boolean {
  return SOURCE_EXT.some((ext) => existsSync(new URL(`assets/audio/${name}.${ext}`, ROOT)));
}

/** Mean level (dBFS) of the shipped OGG with ffmpeg, or null when ffmpeg is missing. */
function measureShipped(name: string): number | null {
  const file = fileURLToPath(new URL(`public/audio/${name}.ogg`, ROOT));
  const r = spawnSync('ffmpeg', [
    '-hide_banner',
    '-i',
    file,
    '-af',
    'volumedetect',
    '-f',
    'null',
    '-',
  ]);
  if (r.error) return null;
  const m = /mean_volume: (-?[\d.]+) dB/.exec(r.stderr.toString());
  return m ? Number(m[1]) : null;
}

function measureSynth(name: string): number {
  const a = renderSfx(name);
  let sum = 0;
  for (const v of a) sum += v * v;
  return 10 * Math.log10(sum / a.length);
}

describe('feel sound levels (GDD v1.8 §3a)', () => {
  it('SFX_FILE_DB matches the shipped files, so the success-over-failure test means something', () => {
    for (const sound of Object.keys(FEEL_SFX) as FeelSound[]) {
      const name = FEEL_SFX[sound];
      const shipped = measureShipped(name);
      if (shipped === null && hasDropIn(name)) {
        throw new Error(`${name} is a drop-in: install ffmpeg to measure it for SFX_FILE_DB`);
      }
      const measured = shipped ?? measureSynth(name);
      const hint = `${name}: measured ${measured.toFixed(1)} dB, SFX_FILE_DB.${sound} = ${String(SFX_FILE_DB[sound])}; update src/game/feel.ts`;
      expect(Math.abs(measured - SFX_FILE_DB[sound]), hint).toBeLessThanOrEqual(1);
    }
  });
});
