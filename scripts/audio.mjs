#!/usr/bin/env node
// Audio pipeline (ASSETS.md "Audio"): sources under assets/audio/ → mono OGG (Vorbis) + M4A
// (AAC, Safari) under public/audio/, plus public/audio/index.json for the game's loader.
// A missing source is synthesized (scripts/lib/synth.mjs) so every sound exists from day one.
//
//   node scripts/audio.mjs            encode everything (needs ffmpeg with libvorbis + aac)
//   node scripts/audio.mjs --check    report which sources exist, encode nothing
//   node scripts/audio.mjs --strict   with --check: exit 1 when anything is missing
//
// Encoding is deterministic for one ffmpeg build (bitexact flags, no metadata) but not across
// ffmpeg versions, so CI checks presence, not bytes (unlike the atlases).
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { MUSIC_NAME, SFX_NAMES, renderMusic, renderSfx, toWav } from './lib/synth.mjs';

const ROOT = new URL('../', import.meta.url);
const SRC = new URL('assets/audio/', ROOT);
const OUT = new URL('public/audio/', ROOT);
const SOURCE_EXT = ['wav', 'ogg', 'mp3', 'flac', 'm4a', 'aac'];
/** Budgets from ASSETS.md: music loop ≤ 150 KB, all audio ≤ 1 MB (per format). */
const MUSIC_BUDGET = 150 * 1024;
const TOTAL_BUDGET = 1024 * 1024;

const args = new Set(process.argv.slice(2));
const CHECK = args.has('--check');
const STRICT = args.has('--strict');
const p = (url) => fileURLToPath(url);

const manifest = JSON.parse(readFileSync(new URL('src/data/audio-manifest.json', ROOT), 'utf8'));
if (JSON.stringify(manifest.sfx) !== JSON.stringify(SFX_NAMES) || manifest.music !== MUSIC_NAME) {
  throw new Error('src/data/audio-manifest.json and scripts/lib/synth.mjs disagree');
}
const NAMES = [...SFX_NAMES, MUSIC_NAME];

function sourceFor(name) {
  for (const ext of SOURCE_EXT) {
    const url = new URL(`${name}.${ext}`, SRC);
    if (existsSync(url)) return url;
  }
  return null;
}

function ffmpeg(input, outPath, codecArgs) {
  const base = ['-hide_banner', '-loglevel', 'error', '-y', '-i', 'pipe:0', '-vn', '-ac', '1'];
  const tail = ['-map_metadata', '-1', '-fflags', '+bitexact', '-flags', '+bitexact', outPath];
  const r = spawnSync('ffmpeg', [...base, '-ar', '44100', ...codecArgs, ...tail], {
    input,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (r.error) {
    throw new Error(
      `ffmpeg not found: install ffmpeg (with libvorbis and aac) to run npm run audio`,
    );
  }
  if (r.status !== 0) throw new Error(`ffmpeg failed for ${outPath}: ${r.stderr.toString()}`);
  return statSync(outPath).size;
}

function main() {
  const rows = [];
  mkdirSync(p(OUT), { recursive: true });
  const index = { version: 1, sounds: {}, music: MUSIC_NAME };
  for (const name of NAMES) {
    const src = sourceFor(name);
    const isMusic = name === MUSIC_NAME;
    const row = { name, source: src ? 'file' : 'placeholder', ogg: 0, m4a: 0 };
    rows.push(row);
    if (CHECK) continue;
    const input = src ? readFileSync(src) : toWav(isMusic ? renderMusic() : renderSfx(name));
    const ogg = p(new URL(`${name}.ogg`, OUT));
    const m4a = p(new URL(`${name}.m4a`, OUT));
    row.ogg = ffmpeg(input, ogg, ['-c:a', 'libvorbis', '-q:a', isMusic ? '0' : '3']);
    row.m4a = ffmpeg(input, m4a, [
      '-c:a',
      'aac',
      '-b:a',
      isMusic ? '64k' : '48k',
      '-movflags',
      '+faststart',
    ]);
    index.sounds[name] = {
      ogg: `audio/${name}.ogg`,
      m4a: `audio/${name}.m4a`,
      source: row.source,
      music: isMusic,
    };
  }

  console.log(CHECK ? 'audio sources (assets/audio):' : 'audio encoded into public/audio/:');
  const pad = (s, n) => String(s).padEnd(n);
  console.log(pad('name', 18) + pad('source', 13) + (CHECK ? '' : pad('ogg', 10) + pad('m4a', 10)));
  for (const r of rows) {
    console.log(
      pad(r.name, 18) +
        pad(r.source, 13) +
        (CHECK
          ? ''
          : pad(`${String(Math.round(r.ogg / 1024))} KB`, 10) +
            pad(`${String(Math.round(r.m4a / 1024))} KB`, 10)),
    );
  }
  const missing = rows.filter((r) => r.source === 'placeholder').length;
  const warnings = [];
  if (!CHECK) {
    const totalOgg = rows.reduce((s, r) => s + r.ogg, 0);
    const totalM4a = rows.reduce((s, r) => s + r.m4a, 0);
    const music = rows.find((r) => r.name === MUSIC_NAME);
    if (music.ogg > MUSIC_BUDGET || music.m4a > MUSIC_BUDGET)
      warnings.push(`music loop over 150 KB`);
    if (totalOgg > TOTAL_BUDGET || totalM4a > TOTAL_BUDGET) warnings.push(`audio over 1 MB`);
    writeFileSync(p(new URL('index.json', OUT)), `${JSON.stringify(index, null, 2)}\n`);
    console.log(
      `total ogg ${String(Math.round(totalOgg / 1024))} KB · m4a ${String(Math.round(totalM4a / 1024))} KB · ${String(missing)} placeholder(s)`,
    );
  } else {
    console.log(`${String(missing)} source file(s) missing → placeholders`);
  }
  for (const w of warnings) console.log(`  warning: ${w}`);
  if (STRICT && (missing > 0 || warnings.length > 0)) {
    console.error('strict mode: audio sources incomplete');
    process.exit(1);
  }
}

try {
  main();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
