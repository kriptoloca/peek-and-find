#!/usr/bin/env node
// Asset pipeline (ASSETS.md): SVG sources → hue-rotated color variants → trimmed frames →
// one atlas per theme + the UI atlas (≤ 2048², 2 px padding) + 1080² backgrounds with their
// 1080×840 Spot crops. Deterministic: the same sources give byte-identical output.
//
//   node scripts/assets.mjs            build everything into public/
//   node scripts/assets.mjs --check    report which sources exist, build nothing
//   node scripts/assets.mjs --strict   with --check: exit 1 when anything is missing
//   node scripts/assets.mjs --theme kitchen   build one theme (plus the UI atlas)
//
// A missing source is replaced by a generated placeholder (scripts/lib/placeholder-svg.mjs) so
// the game always has complete atlases; public/atlases/index.json records what is real.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import {
  BACKGROUND_FILES,
  HUE_SHIFT,
  loadThemes,
  loadUiFrames,
  spriteSpecs,
  uiSpecs,
} from './lib/manifest.mjs';
import {
  MIRROR_MIN_CHANGED,
  SPRITE_BG_MIN_CONTRAST,
  SPRITE_CONTRAST_MIN_SHARE,
  VARIANT_MIN_CHANGED,
  contrastShare,
  frameDifference,
  mirrorDifference,
  renderSvg,
  svgLongestSide,
} from './lib/frames.mjs';
import { packFrames } from './lib/packer.mjs';
import { placeholderBackground, placeholderSprite, placeholderUi } from './lib/placeholder-svg.mjs';
import { recolorSvg } from './lib/recolor.mjs';

const ROOT = new URL('../', import.meta.url);
const SRC = new URL('assets/svg/', ROOT);
const OUT_ATLAS = new URL('public/atlases/', ROOT);
const OUT_BG = new URL('public/backgrounds/', ROOT);

/** In-atlas longest side of a sprite frame; stepped down until the theme fits ATLAS_MAX. */
const FRAME_SIZE_START = 256;
const FRAME_SIZE_STEP = 16;
const FRAME_SIZE_MIN = 128;
const ATLAS_MAX = 2048;
const PADDING = 2;
const BG_SIZE = 1080;
const SPOT_W = 1080;
const SPOT_H = 840;
/** Budget checks (ASSETS.md "Budget"), reported, not enforced. */
const BG_BUDGET = 200 * 1024;

const args = new Set(process.argv.slice(2));
const themeArg = process.argv.includes('--theme')
  ? process.argv[process.argv.indexOf('--theme') + 1]
  : null;
const CHECK = args.has('--check');
const STRICT = args.has('--strict');

const PNG_OPTS = { compressionLevel: 9, adaptiveFiltering: false, palette: false };
const BG_PNG_OPTS = { compressionLevel: 9, palette: true, quality: 90, effort: 10, dither: 0 };

const p = (url) => fileURLToPath(url);

function sourcePath(theme, file) {
  const url = new URL(`${theme}/${file}`, SRC);
  return existsSync(url) ? url : null;
}

/** Composes placed frames into one PNG and the matching Phaser JSON-hash atlas data. */
async function writeAtlas(name, packed, rendered) {
  const byName = new Map(rendered.map((r) => [r.name, r]));
  const composite = packed.placed.map((pl) => {
    const r = byName.get(pl.name);
    return { input: r.data, raw: { width: r.w, height: r.h, channels: 4 }, left: pl.x, top: pl.y };
  });
  const png = await sharp({
    create: {
      width: packed.width,
      height: packed.height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composite)
    .png(PNG_OPTS)
    .toBuffer();
  const frames = {};
  for (const pl of [...packed.placed].sort((a, b) => (a.name < b.name ? -1 : 1))) {
    frames[pl.name] = {
      frame: { x: pl.x, y: pl.y, w: pl.w, h: pl.h },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: pl.w, h: pl.h },
      sourceSize: { w: pl.w, h: pl.h },
    };
  }
  const json = {
    frames,
    meta: {
      app: 'peek-and-find scripts/assets.mjs',
      version: '1',
      image: `${name}.png`,
      format: 'RGBA8888',
      size: { w: packed.width, h: packed.height },
      scale: '1',
    },
  };
  mkdirSync(p(OUT_ATLAS), { recursive: true });
  writeFileSync(p(new URL(`${name}.png`, OUT_ATLAS)), png);
  writeFileSync(p(new URL(`${name}.json`, OUT_ATLAS)), JSON.stringify(json));
  return png.length;
}

function sourceKind(present, total) {
  if (present === 0) return 'placeholder';
  if (present === total) return 'svg';
  return 'mixed';
}

async function buildTheme(theme) {
  const specs = spriteSpecs(theme);
  const missing = [];
  const warnings = [];
  const frameSvgs = [];
  for (const s of specs) {
    const src = sourcePath(theme.id, s.file);
    if (!src) missing.push(s.file);
    const svg = src ? readFileSync(src, 'utf8') : placeholderSprite(s, theme.paletteShift);
    frameSvgs.push({ name: s.base, svg });
    for (let c = 1; c <= s.colors; c++) {
      const rec = recolorSvg(svg, HUE_SHIFT[c]);
      if (src && rec.recolored === 0)
        warnings.push(`${s.file}: no recolorable fill (mode ${rec.mode})`);
      frameSvgs.push({ name: `${s.base}_c${String(c)}`, svg: rec.svg });
    }
  }
  const report = {
    sprites: specs.length,
    present: specs.length - missing.length,
    missing,
    warnings,
    source: sourceKind(specs.length - missing.length, specs.length),
  };
  if (CHECK) return report;

  let packed = null;
  let rendered = null;
  let frameSize = FRAME_SIZE_START;
  for (; frameSize >= FRAME_SIZE_MIN; frameSize -= FRAME_SIZE_STEP) {
    rendered = await Promise.all(
      frameSvgs.map(async (f) => ({
        name: f.name,
        ...(await renderSvg(f.svg, frameSize, { trim: true })),
      })),
    );
    packed = packFrames(rendered, { maxSize: ATLAS_MAX, padding: PADDING });
    if (packed) break;
  }
  if (!packed || !rendered)
    throw new Error(
      `${theme.id}: frames do not fit a ${String(ATLAS_MAX)}² atlas even at ${String(FRAME_SIZE_MIN)} px`,
    );
  // Every `_c1`/`_c2` must look different from its base, or a color decoy / Spot recolor would be
  // an invisible difference. Placeholders always pass (variantColor); a pack fails loudly here.
  const byName = new Map(rendered.map((r) => [r.name, r]));
  const invisible = [];
  for (const sp of specs) {
    const base = byName.get(sp.base);
    for (let c = 1; c <= sp.colors; c++) {
      const v = byName.get(`${sp.base}_c${String(c)}`);
      if (!base || !v) continue;
      const share = frameDifference(base, v);
      if (share < VARIANT_MIN_CHANGED) {
        invisible.push(`${sp.file} _c${String(c)} (${String(Math.round(share * 100))}% changed)`);
      }
    }
  }
  if (invisible.length > 0) {
    throw new Error(
      `${theme.id}: color variants not visible enough: ${invisible.join(', ')}. Mark the main fills with class="fill-main" (assets/README.md).`,
    );
  }
  // Mirror decoys (Find) and the Spot "flip" difference show the sprite mirrored; a symmetric
  // sprite makes that difference invisible, so every flippable family must read mirrored.
  const symmetric = [];
  let minMirror = 1;
  for (const sp of specs) {
    if (!sp.tags.includes('flippable')) continue;
    const base = byName.get(sp.base);
    if (!base) continue;
    const share = mirrorDifference(base);
    minMirror = Math.min(minMirror, share);
    if (share < MIRROR_MIN_CHANGED)
      symmetric.push(`${sp.file} (${String(Math.round(share * 100))}% changes when mirrored)`);
  }
  if (symmetric.length > 0) {
    throw new Error(
      `${theme.id}: flippable sprites look the same mirrored: ${symmetric.join(', ')}. Add an asymmetric detail or drop the flippable tag (assets/README.md).`,
    );
  }
  // A Spot "swap" shows another variant of the same family; variants that look alike make
  // that difference invisible, so every pair of variants must differ by VARIANT_MIN_CHANGED.
  const alike = [];
  const byFamily = new Map();
  for (const sp of specs) {
    const fam = sp.base.replace(/_[a-z]$/, '');
    if (!byFamily.has(fam)) byFamily.set(fam, []);
    byFamily.get(fam).push(sp);
  }
  for (const members of byFamily.values()) {
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const fa = byName.get(members[i].base);
        const fb = byName.get(members[j].base);
        if (!fa || !fb) continue;
        const share = frameDifference(fa, fb);
        if (share < VARIANT_MIN_CHANGED)
          alike.push(
            `${members[i].file} vs ${members[j].file} (${String(Math.round(share * 100))}% differ)`,
          );
      }
    }
  }
  if (alike.length > 0) {
    throw new Error(
      `${theme.id}: variants of one family look alike: ${alike.join(', ')}. Variants must be different objects, not copies (assets/README.md).`,
    );
  }
  // Every base sprite must stand out from the background by luminance, not only by hue
  // (a dark object on a dark background is found by color alone: slow search, unfair for
  // color-blind players). Placeholders pass by palette design; a pack fails loudly here.
  const bg = await buildBackground(theme);
  const lowContrast = [];
  let minShare = 1;
  for (const sp of specs) {
    const base = byName.get(sp.base);
    if (!base) continue;
    const share = contrastShare(base, bg.mean);
    minShare = Math.min(minShare, share);
    if (share < SPRITE_CONTRAST_MIN_SHARE)
      lowContrast.push(`${sp.file} (${String(Math.round(share * 100))}% of the area at 3:1)`);
  }
  if (lowContrast.length > 0) {
    throw new Error(
      `${theme.id}: sprites too close to the background in luminance (less than ${String(Math.round(SPRITE_CONTRAST_MIN_SHARE * 100))}% of the sprite reaches ${String(SPRITE_BG_MIN_CONTRAST)}:1): ${lowContrast.join(', ')}. Lighten the sprite body or darken the background (assets/README.md).`,
    );
  }
  const bytes = await writeAtlas(theme.id, packed, rendered);
  return {
    ...report,
    frames: frameSvgs.length,
    frameSize,
    atlasSize: [packed.width, packed.height],
    atlasBytes: bytes,
    minContrastShare: Math.round(minShare * 100) / 100,
    minMirrorShare: Math.round(minMirror * 100) / 100,
    backgroundSource: bg.backgroundSource,
    backgroundBytes: bg.backgroundBytes,
    backgroundSpotBytes: bg.backgroundSpotBytes,
    backgroundWarnings: bg.backgroundWarnings,
  };
}

async function buildBackground(theme) {
  let src = null;
  for (const f of BACKGROUND_FILES) {
    src = sourcePath(theme.id, f);
    if (src) break;
  }
  const input = src ? readFileSync(src) : Buffer.from(placeholderBackground(theme));
  const isSvg = !src || src.pathname.endsWith('.svg');
  const density = isSvg
    ? Math.max(1, (72 * BG_SIZE) / svgLongestSide(input.toString('utf8')))
    : undefined;
  const square = await sharp(input, density ? { density } : {})
    .resize(BG_SIZE, BG_SIZE, { fit: 'cover' })
    .png(BG_PNG_OPTS)
    .toBuffer();
  const spot = await sharp(square)
    .extract({ left: 0, top: Math.round((BG_SIZE - SPOT_H) / 2), width: SPOT_W, height: SPOT_H })
    .png(BG_PNG_OPTS)
    .toBuffer();
  mkdirSync(p(OUT_BG), { recursive: true });
  writeFileSync(p(new URL(`${theme.id}.png`, OUT_BG)), square);
  writeFileSync(p(new URL(`${theme.id}_spot.png`, OUT_BG)), spot);
  const warnings = [];
  if (square.length > BG_BUDGET)
    warnings.push(
      `background ${theme.id}.png is ${String(Math.round(square.length / 1024))} KB (> 200 KB budget)`,
    );
  const stats = await sharp(square).stats();
  const [mr, mg, mb] = stats.channels.map((c) => c.mean);
  return {
    backgroundSource: src ? 'file' : 'placeholder',
    mean: { r: mr, g: mg, b: mb },
    backgroundBytes: square.length,
    backgroundSpotBytes: spot.length,
    backgroundWarnings: warnings,
  };
}

async function buildUi(names) {
  const specs = uiSpecs(names);
  const missing = [];
  const frameSvgs = specs.map((s) => {
    const src = sourcePath('ui', s.file);
    if (!src) missing.push(s.file);
    return { name: s.frame, svg: src ? readFileSync(src, 'utf8') : placeholderUi(s.name) };
  });
  const report = {
    sprites: specs.length,
    present: specs.length - missing.length,
    missing,
    source: sourceKind(specs.length - missing.length, specs.length),
  };
  if (CHECK) return report;
  // UI icons render at their intrinsic size and keep their canvas (HUD code scales them).
  const rendered = await Promise.all(
    frameSvgs.map(async (f) => ({
      name: f.name,
      ...(await renderSvg(f.svg, svgLongestSide(f.svg), { trim: false })),
    })),
  );
  const packed = packFrames(rendered, { maxSize: ATLAS_MAX, padding: PADDING });
  if (!packed) throw new Error('ui: frames do not fit');
  const bytes = await writeAtlas('ui', packed, rendered);
  return {
    ...report,
    frames: rendered.length,
    atlasSize: [packed.width, packed.height],
    atlasBytes: bytes,
  };
}

function printRow(cols) {
  console.log(cols.map((c, i) => String(c).padEnd(i === 0 ? 10 : 12)).join(''));
}

async function main() {
  const themes = loadThemes(ROOT).filter((t) => !themeArg || t.id === themeArg);
  if (themeArg && themes.length === 0) throw new Error(`unknown theme ${themeArg}`);
  const uiNames = loadUiFrames(ROOT);
  const results = {};
  for (const t of themes) results[t.id] = await buildTheme(t);
  const ui = await buildUi(uiNames);

  console.log(CHECK ? 'asset sources (assets/svg):' : 'assets built into public/:');
  printRow([
    'theme',
    'sprites',
    'present',
    'missing',
    'source',
    CHECK ? '' : 'frame px',
    CHECK ? '' : 'atlas',
  ]);
  for (const [id, r] of Object.entries(results)) {
    printRow([
      id,
      r.sprites,
      r.present,
      r.missing.length,
      r.source,
      CHECK ? '' : r.frameSize,
      CHECK ? '' : `${r.atlasSize.join('×')} ${String(Math.round(r.atlasBytes / 1024))} KB`,
    ]);
  }
  printRow([
    'ui',
    ui.sprites,
    ui.present,
    ui.missing.length,
    ui.source,
    '',
    CHECK ? '' : `${ui.atlasSize.join('×')} ${String(Math.round(ui.atlasBytes / 1024))} KB`,
  ]);
  let problems = 0;
  for (const [id, r] of Object.entries(results)) {
    // A partially supplied theme lists what is still missing; an untouched theme stays quiet.
    if (r.present > 0 && r.missing.length > 0) {
      problems += r.missing.length;
      console.log(`  ${id} missing: ${r.missing.join(', ')}`);
    }
    for (const w of r.warnings) console.log(`  warning ${id}: ${w}`);
    for (const w of r.backgroundWarnings ?? []) console.log(`  warning ${id}: ${w}`);
    if (r.minContrastShare !== undefined)
      console.log(
        `  ${id}: least contrasting sprite has ${String(Math.round(r.minContrastShare * 100))}% of its area at 3:1 against the background`,
      );
    if (r.minMirrorShare !== undefined)
      console.log(
        `  ${id}: least asymmetric flippable sprite changes ${String(Math.round(r.minMirrorShare * 100))}% of its pixels when mirrored`,
      );
    problems += r.warnings.length;
  }
  if (ui.present > 0 && ui.missing.length > 0)
    console.log(`  ui missing: ${ui.missing.join(', ')}`);
  const totalMissing =
    Object.values(results).reduce((s, r) => s + r.missing.length, 0) + ui.missing.length;

  if (!CHECK) {
    const index = {
      version: 1,
      themes: Object.fromEntries(
        Object.entries(results).map(([id, r]) => [
          id,
          {
            atlas: `atlases/${id}.png`,
            data: `atlases/${id}.json`,
            frames: r.frames,
            frameSize: r.frameSize,
            source: r.source,
            missing: r.missing.length,
            background: `backgrounds/${id}.png`,
            backgroundSpot: `backgrounds/${id}_spot.png`,
            backgroundSource: r.backgroundSource,
            minContrastShare: r.minContrastShare,
            minMirrorShare: r.minMirrorShare,
          },
        ]),
      ),
      ui: {
        atlas: 'atlases/ui.png',
        data: 'atlases/ui.json',
        frames: ui.frames,
        source: ui.source,
        missing: ui.missing.length,
      },
    };
    // A single-theme build keeps the other themes' entries from the previous index.
    const indexPath = p(new URL('index.json', OUT_ATLAS));
    if (themeArg && existsSync(indexPath)) {
      const prev = JSON.parse(readFileSync(indexPath, 'utf8'));
      index.themes = { ...prev.themes, ...index.themes };
    }
    writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);
    const total =
      Object.values(results).reduce(
        (s, r) => s + r.atlasBytes + r.backgroundBytes + r.backgroundSpotBytes,
        0,
      ) + ui.atlasBytes;
    console.log(
      `total ${String((total / 1024 / 1024).toFixed(2))} MB · ${String(totalMissing)} placeholder source(s)`,
    );
  } else {
    console.log(`${String(totalMissing)} source file(s) missing → placeholders`);
  }
  if (STRICT && (totalMissing > 0 || problems > 0)) {
    console.error('strict mode: sources incomplete');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
