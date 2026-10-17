// Placeholder sound synthesis for the audio pipeline (scripts/audio.mjs): every SFX of
// ASSETS.md and a short music loop, rendered deterministically as mono 44.1 kHz float samples.
// Real CC0 files under assets/audio/ replace them one by one; this keeps the game audible first.

export const SAMPLE_RATE = 44100;
const TAU = Math.PI * 2;

/** SFX list from ASSETS.md "Audio"; kept in sync with src/data/audio-manifest.json by a test. */
export const SFX_NAMES = [
  'tap_correct_1',
  'tap_correct_2',
  'tap_correct_3',
  'tap_wrong',
  'pop',
  'sparkle',
  'scene_complete',
  'star_1',
  'star_2',
  'star_3',
  'heart_lose',
  'hint_reveal',
  'button',
  'confetti',
  'daily_complete',
];
export const MUSIC_NAME = 'music_loop';

/** mulberry32, same family as the game's Rng; deterministic noise. */
function prng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function wave(type, phase) {
  const p = phase % 1;
  switch (type) {
    case 'tri':
      return 1 - 4 * Math.abs(p - 0.5);
    case 'soft': // odd harmonics 1, 3, 5 with 1/n² amplitude: a rounded square
      return (Math.sin(TAU * p) + Math.sin(TAU * 3 * p) / 9 + Math.sin(TAU * 5 * p) / 25) / 1.15;
    case 'bell': // inharmonic partial typical of a struck bar
      return Math.sin(TAU * p) * 0.8 + Math.sin(TAU * 2.76 * p) * 0.25;
    default:
      return Math.sin(TAU * p);
  }
}

/**
 * One enveloped tone.
 * @param {{ freq: number, dur: number, type?: string, attack?: number, decay?: number,
 *   gain?: number, slide?: number, vibrato?: number }} o
 *   slide = frequency multiplier reached at the end (1 = none), vibrato = depth in semitone-ish
 */
export function tone(o) {
  const n = Math.round(o.dur * SAMPLE_RATE);
  const out = new Float32Array(n);
  const attack = o.attack ?? 0.004;
  const decay = o.decay ?? o.dur;
  const gain = o.gain ?? 0.5;
  const slide = o.slide ?? 1;
  const vib = o.vibrato ?? 0;
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const f = o.freq * Math.pow(slide, t / o.dur) * (1 + vib * 0.01 * Math.sin(TAU * 6 * t));
    phase += f / SAMPLE_RATE;
    const a = t < attack ? t / attack : 1;
    const d = Math.exp((-4.5 * Math.max(0, t - attack)) / decay);
    out[i] = wave(o.type ?? 'sine', phase) * a * d * gain;
  }
  return out;
}

/** White noise burst with exponential decay and a one-pole low-pass. */
export function noise({ dur, decay = dur, gain = 0.3, seed = 1, cutoff = 0.3 }) {
  const n = Math.round(dur * SAMPLE_RATE);
  const out = new Float32Array(n);
  const rnd = prng(seed);
  let y = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const x = rnd() * 2 - 1;
    y += cutoff * (x - y);
    out[i] = y * Math.exp((-4.5 * t) / decay) * gain;
  }
  return out;
}

/** Adds `src` into `dest` starting at `at` seconds (dest grows as needed). */
export function mix(dest, src, at = 0, gain = 1) {
  const off = Math.round(at * SAMPLE_RATE);
  const need = off + src.length;
  let out = dest;
  if (need > dest.length) {
    out = new Float32Array(need);
    out.set(dest);
  }
  for (let i = 0; i < src.length; i++) out[off + i] += src[i] * gain;
  return out;
}

export function normalize(buf, peak = 0.8) {
  let max = 0;
  for (const v of buf) max = Math.max(max, Math.abs(v));
  if (max === 0) return buf;
  const k = peak / max;
  for (let i = 0; i < buf.length; i++) buf[i] *= k;
  return buf;
}

/** Short fade at both ends so clips never click. */
function fadeEdges(buf, ms = 4) {
  const n = Math.min(buf.length >> 1, Math.round((ms / 1000) * SAMPLE_RATE));
  for (let i = 0; i < n; i++) {
    const k = i / n;
    buf[i] *= k;
    buf[buf.length - 1 - i] *= k;
  }
  return buf;
}

function arpeggio(freqs, gap, each, type = 'tri', gain = 0.4, decay = each) {
  let out = new Float32Array(0);
  freqs.forEach((f, i) => {
    out = mix(out, tone({ freq: f, dur: each, type, gain, decay }), i * gap);
  });
  return out;
}

/**
 * @param {string} name one of SFX_NAMES
 * @returns {Float32Array}
 */
export function renderSfx(name) {
  let out;
  switch (name) {
    case 'tap_correct_1':
      out = tone({ freq: 659.25, dur: 0.16, type: 'tri', decay: 0.1, gain: 0.5 });
      out = mix(out, tone({ freq: 1318.5, dur: 0.1, decay: 0.05, gain: 0.12 }));
      break;
    case 'tap_correct_2':
      out = tone({ freq: 783.99, dur: 0.16, type: 'tri', decay: 0.1, gain: 0.5 });
      out = mix(out, tone({ freq: 1568, dur: 0.1, decay: 0.05, gain: 0.12 }));
      break;
    case 'tap_correct_3':
      out = tone({ freq: 987.77, dur: 0.16, type: 'tri', decay: 0.1, gain: 0.5 });
      out = mix(out, tone({ freq: 1975.5, dur: 0.1, decay: 0.05, gain: 0.12 }));
      break;
    case 'tap_wrong':
      out = tone({ freq: 170, dur: 0.22, type: 'soft', decay: 0.16, slide: 0.7, gain: 0.5 });
      out = mix(out, noise({ dur: 0.08, decay: 0.03, gain: 0.08, seed: 3, cutoff: 0.5 }));
      break;
    case 'pop':
      out = tone({ freq: 320, dur: 0.08, decay: 0.05, slide: 2.6, gain: 0.5 });
      break;
    case 'sparkle':
      out = arpeggio([1760, 2217.5, 2637], 0.045, 0.18, 'sine', 0.25, 0.12);
      break;
    case 'scene_complete':
      out = arpeggio([523.25, 659.25, 783.99, 1046.5], 0.09, 0.45, 'tri', 0.38, 0.35);
      out = mix(out, tone({ freq: 1046.5, dur: 0.6, type: 'bell', decay: 0.5, gain: 0.15 }), 0.27);
      break;
    case 'star_1':
      out = tone({ freq: 880, dur: 0.45, type: 'bell', decay: 0.35, gain: 0.45 });
      break;
    case 'star_2':
      out = tone({ freq: 1108.7, dur: 0.45, type: 'bell', decay: 0.35, gain: 0.45 });
      break;
    case 'star_3':
      out = tone({ freq: 1318.5, dur: 0.5, type: 'bell', decay: 0.4, gain: 0.45 });
      out = mix(out, tone({ freq: 2637, dur: 0.3, decay: 0.2, gain: 0.1 }), 0.05);
      break;
    case 'heart_lose':
      out = tone({ freq: 440, dur: 0.16, type: 'soft', decay: 0.14, gain: 0.4 });
      out = mix(out, tone({ freq: 330, dur: 0.26, type: 'soft', decay: 0.22, gain: 0.4 }), 0.13);
      break;
    case 'hint_reveal':
      out = tone({ freq: 600, dur: 0.35, decay: 0.3, slide: 2.5, gain: 0.35, vibrato: 2 });
      out = mix(out, tone({ freq: 2400, dur: 0.2, decay: 0.12, gain: 0.12 }), 0.22);
      break;
    case 'button':
      out = tone({ freq: 1200, dur: 0.05, decay: 0.03, gain: 0.35 });
      out = mix(out, noise({ dur: 0.02, decay: 0.008, gain: 0.15, seed: 7, cutoff: 0.6 }));
      break;
    case 'confetti': {
      out = noise({ dur: 0.35, decay: 0.25, gain: 0.18, seed: 11, cutoff: 0.35 });
      const rnd = prng(42);
      for (let i = 0; i < 9; i++) {
        const f = 900 + rnd() * 1800;
        out = mix(out, tone({ freq: f, dur: 0.05, decay: 0.03, gain: 0.18 }), rnd() * 0.28);
      }
      break;
    }
    case 'daily_complete':
      out = arpeggio([392, 493.88, 587.33, 783.99], 0.12, 0.6, 'tri', 0.34, 0.45);
      out = mix(out, tone({ freq: 783.99, dur: 1.0, type: 'bell', decay: 0.8, gain: 0.2 }), 0.36);
      out = mix(out, tone({ freq: 987.77, dur: 1.0, type: 'bell', decay: 0.8, gain: 0.16 }), 0.48);
      break;
    default:
      throw new Error(`no placeholder synth for ${name}`);
  }
  return fadeEdges(normalize(out, 0.8));
}

const CHORDS = [
  [261.63, 329.63, 392.0, 493.88], // Cmaj7
  [220.0, 261.63, 329.63, 392.0], // Am7
  [174.61, 220.0, 261.63, 329.63], // Fmaj7
  [196.0, 246.94, 293.66, 329.63], // G6
];
const BAR_SEC = 4;
const NOTE_SEC = 0.25;

/**
 * Mellow 16 s loop: four slow pad chords with a soft triangle arpeggio. Designed to loop
 * (every voice ends before the bar does), mono, quiet (peak −6 dBFS before the game's gain).
 * @returns {Float32Array}
 */
export function renderMusic() {
  let out = new Float32Array(Math.round(BAR_SEC * CHORDS.length * SAMPLE_RATE));
  CHORDS.forEach((chord, bar) => {
    const t0 = bar * BAR_SEC;
    for (const f of chord) {
      out = mix(
        out,
        tone({ freq: f / 2, dur: BAR_SEC - 0.05, attack: 0.9, decay: 6, gain: 0.07 }),
        t0,
      );
    }
    const pattern = [0, 1, 2, 3, 2, 1, 0, 2, 1, 3, 2, 0, 1, 2, 3, 1];
    pattern.forEach((idx, i) => {
      const f = chord[idx] * 2;
      out = mix(
        out,
        tone({ freq: f, dur: 0.45, type: 'tri', decay: 0.3, gain: 0.12 }),
        t0 + i * NOTE_SEC,
      );
    });
  });
  // trim to the exact loop length so the tail never spills past the bar
  const exact = out.subarray(0, Math.round(BAR_SEC * CHORDS.length * SAMPLE_RATE));
  // Peak 0.85: the first iPhone test could not hear the loop at peak 0.5 × gain 0.35 (≈ −30 dBFS
  // on the bus); phone speakers need the bed near −22 dBFS to read under the SFX.
  return fadeEdges(normalize(new Float32Array(exact), 0.85), 12);
}

/** 16-bit PCM mono WAV. */
export function toWav(samples, rate = SAMPLE_RATE) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    data.writeInt16LE(Math.round(v < 0 ? v * 32768 : v * 32767), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}
