// Brand marks of Peek & Find and Pebblit (docs/store/brand/philosophy.md, "Field & Signal"):
// a calm field of equal, muted forms and one signal that has been found. Everything is drawn
// as SVG and rendered with sharp; the wordmarks use the OFL fonts in assets/brand/fonts.
//
//   node scripts/brand.mjs            → docs/store/brand/*.png (+ .svg sources of the marks)
//
// Outputs: app icon 1024 (full bleed and rounded) + 512, wordmark (dark, transparent),
// Pebblit profile 1024 (square and circle-cropped) + wordmark, and a preview sheet with the
// marks at 256 / 128 / 64 px.
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

const ROOT = resolve('.');
const FONT_DIR = resolve(ROOT, 'assets/brand/fonts');
const OUT = resolve(ROOT, 'docs/store/brand');
mkdirSync(OUT, { recursive: true });

// fontconfig must see the repo fonts before sharp (librsvg) loads.
const FC = resolve(tmpdir(), 'peek-brand-fonts.conf');
writeFileSync(
  FC,
  `<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd"><fontconfig><dir>${FONT_DIR}</dir><cachedir>${resolve(tmpdir(), 'peek-brand-fc-cache')}</cachedir></fontconfig>`,
);
process.env.FONTCONFIG_FILE = FC;
const sharp = (await import('sharp')).default;

// ---- palette (Field & Signal) ---------------------------------------------------------------
const NIGHT = '#1b1f2a';
/** Ground of the icon and the profile: the game's scene blue, which keeps an edge on a black page. */
const GROUND = '#2e3650';
const SAND = '#f4f1de';
const ACCENT = '#ffc857';
const SIGNAL = '#30b5a4';
const SLATE = '#7d88a8';
/** Muted, equal-luminance field tones: stones in one stream bed, light enough to hold at 64 px. */
const FIELD = [
  '#6d7cab',
  '#7c91b3',
  '#8188c0',
  '#6f96a8',
  '#8d85b7',
  '#7d9aae',
  '#6f849f',
  '#8898ad',
];

const svgDoc = (w, h, body, bg = null) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
      (bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : '') +
      body +
      `</svg>`,
  );

// ---- forms -----------------------------------------------------------------------------------
const poly = (pts, fill, round) =>
  `<polygon points="${pts.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ')}" fill="${fill}" stroke="${fill}" stroke-width="${round}" stroke-linejoin="round"/>`;
const regular = (cx, cy, r, n, rot = -Math.PI / 2) =>
  Array.from({ length: n }, (_, i) => {
    const a = rot + (i * 2 * Math.PI) / n;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });
const forms = {
  hexagon: (cx, cy, s, fill) => poly(regular(cx, cy, s * 0.46, 6, 0), fill, s * 0.12),
  square: (cx, cy, s, fill) =>
    `<rect x="${cx - s * 0.42}" y="${cy - s * 0.42}" width="${s * 0.84}" height="${s * 0.84}" rx="${s * 0.2}" fill="${fill}"/>`,
  drop: (cx, cy, s, fill) =>
    `<path d="M${cx} ${cy - s * 0.5} C${cx + s * 0.42} ${cy - s * 0.02} ${cx + s * 0.42} ${cy + s * 0.46} ${cx} ${cy + s * 0.46} C${cx - s * 0.42} ${cy + s * 0.46} ${cx - s * 0.42} ${cy - s * 0.02} ${cx} ${cy - s * 0.5} Z" fill="${fill}"/>`,
  capsule: (cx, cy, s, fill) =>
    `<rect x="${cx - s * 0.5}" y="${cy - s * 0.26}" width="${s}" height="${s * 0.52}" rx="${s * 0.26}" fill="${fill}"/>`,
  circle: (cx, cy, s, fill) => `<circle cx="${cx}" cy="${cy}" r="${s * 0.45}" fill="${fill}"/>`,
  diamond: (cx, cy, s, fill) => poly(regular(cx, cy, s * 0.5, 4), fill, s * 0.16),
  triangle: (cx, cy, s, fill) => poly(regular(cx, cy + s * 0.06, s * 0.5, 3), fill, s * 0.16),
  semicircle: (cx, cy, s, fill) =>
    `<path d="M${cx - s * 0.48} ${cy + s * 0.2} A${s * 0.48} ${s * 0.48} 0 0 1 ${cx + s * 0.48} ${cy + s * 0.2} Z" fill="${fill}" stroke="${fill}" stroke-width="${s * 0.1}" stroke-linejoin="round"/>`,
};

/** The accent ring that says "here": a knockout disc under it keeps the ground clean. */
const ring = (cx, cy, r, stroke, knockout) =>
  (knockout ? `<circle cx="${cx}" cy="${cy}" r="${r + stroke * 0.9}" fill="${knockout}"/>` : '') +
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${ACCENT}" stroke-width="${stroke}"/>`;

// ---- Peek & Find icon ------------------------------------------------------------------------
/** Field of eight handled forms on a loose grid, the signal on the right third. */
const ICON_FIELD = [
  ['hexagon', 252, 248, 228, 0],
  ['square', 512, 236, 195, 1],
  ['drop', 782, 246, 195, 2],
  ['capsule', 236, 520, 250, 3],
  ['circle', 462, 548, 182, 4],
  ['triangle', 284, 792, 208, 5],
  ['semicircle', 524, 804, 228, 6],
  ['circle', 792, 798, 150, 7],
];
const SIGNAL_AT = { x: 724, y: 536, s: 200 };
function iconSvg(size, rounded) {
  const k = size / 1024;
  const body =
    ICON_FIELD.map(([kind, x, y, s, c]) => forms[kind](x * k, y * k, s * k, FIELD[c])).join('') +
    ring(SIGNAL_AT.x * k, SIGNAL_AT.y * k, 170 * k, 30 * k, GROUND) +
    forms.diamond(SIGNAL_AT.x * k, SIGNAL_AT.y * k, SIGNAL_AT.s * k, SIGNAL);
  if (rounded) {
    const r = 180 * k;
    return svgDoc(
      size,
      size,
      `<defs><clipPath id="c"><rect width="${size}" height="${size}" rx="${r}"/></clipPath></defs><g clip-path="url(#c)"><rect width="${size}" height="${size}" fill="${GROUND}"/>${body}</g>`,
    );
  }
  return svgDoc(size, size, body, GROUND);
}

// ---- Pebblit mark: a cairn, two stones and a bit ---------------------------------------------
/** A handled stone: four anchors with uneven handles so no two edges match. */
const stone = (cx, cy, w, h, fill, lean = 0) => {
  const a = w / 2;
  const b = h / 2;
  const kx = 0.56;
  const ky = 0.52;
  return (
    `<path d="M${cx - a} ${cy + lean} ` +
    `C${cx - a} ${cy - b * ky} ${cx - a * kx} ${cy - b} ${cx + lean * 0.4} ${cy - b} ` +
    `C${cx + a * (kx + 0.08)} ${cy - b} ${cx + a} ${cy - b * (ky - 0.1)} ${cx + a} ${cy - lean * 0.3} ` +
    `C${cx + a} ${cy + b * (ky + 0.05)} ${cx + a * (kx - 0.04)} ${cy + b} ${cx - lean * 0.2} ${cy + b} ` +
    `C${cx - a * (kx + 0.1)} ${cy + b} ${cx - a} ${cy + b * ky} ${cx - a} ${cy + lean} Z" fill="${fill}"/>`
  );
};
function pebblitMarkBody(k, cx, cy) {
  return (
    stone(cx, cy + 200 * k, 600 * k, 250 * k, SLATE, 10 * k) +
    stone(cx + 6 * k, cy + 8 * k, 460 * k, 210 * k, SIGNAL, -8 * k) +
    `<rect x="${cx - 95 * k}" y="${cy - 226 * k}" width="${190 * k}" height="${165 * k}" rx="${48 * k}" fill="${ACCENT}"/>`
  );
}
function pebblitSvg(size, circle) {
  const k = size / 1024;
  const body = pebblitMarkBody(k, 512 * k, 505 * k);
  if (circle) {
    return svgDoc(
      size,
      size,
      `<defs><clipPath id="c"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}"/></clipPath></defs><g clip-path="url(#c)"><rect width="${size}" height="${size}" fill="${GROUND}"/>${body}</g>`,
    );
  }
  return svgDoc(size, size, body, GROUND);
}

/** The cairn alone on a transparent ground (the Title's studio signature). */
function pebblitMarkOnlySvg(size) {
  const k = size / 1024;
  return svgDoc(size, size, pebblitMarkBody(k, 512 * k, 505 * k));
}

// ---- wordmarks -------------------------------------------------------------------------------
/** Connected components of the alpha channel: the i-dot is the smallest one. */
async function smallestBlob(png) {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const seen = new Uint8Array(W * H);
  const stack = [];
  let best = null;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (seen[i] || data[i * 4 + 3] < 128) continue;
      let area = 0;
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      stack.push(i);
      seen[i] = 1;
      while (stack.length) {
        const j = stack.pop();
        const jx = j % W;
        const jy = (j - jx) / W;
        area += 1;
        if (jx < minX) minX = jx;
        if (jx > maxX) maxX = jx;
        if (jy < minY) minY = jy;
        if (jy > maxY) maxY = jy;
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const nx = jx + dx;
          const ny = jy + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const n = ny * W + nx;
          if (!seen[n] && data[n * 4 + 3] >= 128) {
            seen[n] = 1;
            stack.push(n);
          }
        }
      }
      if (area > 8 && (!best || area < best.area)) {
        best = { area, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, r: (maxX - minX + 1) / 2 };
      }
    }
  }
  if (!best) throw new Error('no blob found in the wordmark');
  return best;
}

async function peekWordmark(dark, W = 1600, H = 480) {
  const f = W / 1600;
  const text = `<text x="${W / 2}" y="${H / 2 + 82 * f}" text-anchor="middle" font-family="Outfit" font-weight="700" font-size="${236 * f}" letter-spacing="${-4 * f}" fill="${SAND}">Peek &amp; Find</text>`;
  const textLayer = await sharp(svgDoc(W, H, text))
    .png()
    .toBuffer();
  const dot = await smallestBlob(textLayer);
  // the dot of the "i" becomes the signal: ring punched through the letter, dot in the accent
  const r = dot.r * 2.05;
  const stroke = dot.r * 0.78;
  const knock = svgDoc(
    W,
    H,
    `<circle cx="${dot.cx}" cy="${dot.cy}" r="${r + stroke * 0.95}" fill="#000"/>`,
  );
  const sig = svgDoc(
    W,
    H,
    `<circle cx="${dot.cx}" cy="${dot.cy}" r="${r}" fill="none" stroke="${ACCENT}" stroke-width="${stroke}"/><circle cx="${dot.cx}" cy="${dot.cy}" r="${dot.r * 1.02}" fill="${ACCENT}"/>`,
  );
  const letters = await sharp(textLayer)
    .composite([{ input: knock, blend: 'dest-out' }])
    .png()
    .toBuffer();
  const base = dark
    ? sharp({ create: { width: W, height: H, channels: 4, background: NIGHT } })
    : sharp({
        create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
      });
  return base
    .composite([{ input: letters }, { input: sig }])
    .png()
    .toBuffer();
}

/**
 * The Pebblit lockup (mark + word). The base layout is 1600×480; `fit` scales the lockup to
 * that share of the canvas width and centres it, so a 16:9 banner keeps the lockup inside the
 * central safe area (YouTube: 1235×338 of 2048×1152).
 */
async function pebblitWordmark(dark, W = 1600, H = 480, fit = null) {
  const k = 300 / 1024; // the mark at 300 px beside the word (base units)
  const mark = pebblitMarkBody(k, 230, 250);
  const text = `<text x="430" y="310" font-family="Bricolage Grotesque" font-weight="700" font-size="212" letter-spacing="-3" fill="${SAND}">Pebblit</text>`;
  // the lockup spans x 80..1340 of the base canvas (mark 80..380, word 430..1340)
  const LOCKUP_W = 1260;
  const LOCKUP_CX = 710;
  const f = fit === null ? W / 1600 : (W * fit) / LOCKUP_W;
  const tx = W / 2 - LOCKUP_CX * f;
  const ty = H / 2 - 240 * f;
  const body = `<g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${f.toFixed(4)})">${mark}${text}</g>`;
  return sharp(svgDoc(W, H, body, dark ? NIGHT : null))
    .png()
    .toBuffer();
}

// ---- render ----------------------------------------------------------------------------------
const written = [];
const out = async (name, buf) => {
  writeFileSync(resolve(OUT, name), buf);
  written.push(name);
};
const png = (svg) => sharp(svg).png().toBuffer();

await out(
  'peek-and-find-icon-1024.png',
  await sharp(iconSvg(1024, false)).removeAlpha().png().toBuffer(),
);
await out('peek-and-find-icon-1024-rounded.png', await png(iconSvg(1024, true)));
await out(
  'peek-and-find-icon-512.png',
  await sharp(iconSvg(512, false)).removeAlpha().png().toBuffer(),
);
await out('peek-and-find-icon.svg', iconSvg(1024, false));
await out('peek-and-find-wordmark-dark.png', await peekWordmark(true));
await out('peek-and-find-wordmark-transparent.png', await peekWordmark(false));
await out(
  'pebblit-profile-1024.png',
  await sharp(pebblitSvg(1024, false)).removeAlpha().png().toBuffer(),
);
await out('pebblit-profile-circle-1024.png', await png(pebblitSvg(1024, true)));
await out('pebblit-mark.svg', pebblitSvg(1024, false));
await out('pebblit-wordmark-dark.png', await pebblitWordmark(true));
await out('pebblit-wordmark-transparent.png', await pebblitWordmark(false));

// Pebblit banners (16:9, lockup inside the central safe area) and a 4× wordmark for print/crisp use
await out('pebblit-banner-2048x1152.png', await pebblitWordmark(true, 2048, 1152, 0.6));
await out('pebblit-banner-2560x1440.png', await pebblitWordmark(true, 2560, 1440, 0.6));
await out('pebblit-banner-4096x2304.png', await pebblitWordmark(true, 4096, 2304, 0.6));
await out('pebblit-wordmark-dark-4x.png', await pebblitWordmark(true, 6400, 1920));
await out('pebblit-wordmark-transparent-4x.png', await pebblitWordmark(false, 6400, 1920));

// in-game textures (public/brand, loaded by Boot before the first screen; counted as initial load)
const PUB = resolve(ROOT, 'public/brand');
mkdirSync(PUB, { recursive: true });
writeFileSync(resolve(PUB, 'wordmark.png'), await peekWordmark(false, 1200, 360));
writeFileSync(resolve(PUB, 'pebblit.png'), await sharp(pebblitMarkOnlySvg(256)).png().toBuffer());
written.push('public/brand/wordmark.png', 'public/brand/pebblit.png');

// preview sheet: the marks at 256 / 128 / 64 px, the profile in its circle, the wordmarks
const tile = async (file, size) => sharp(resolve(OUT, file)).resize(size, size).png().toBuffer();
const sheetW = 1600;
const sheetH = 1180;
const comp = [];
let x = 40;
for (const s of [256, 128, 64]) {
  comp.push({
    input: await tile('peek-and-find-icon-1024-rounded.png', s),
    left: x,
    top: 40 + (256 - s),
  });
  x += s + 40;
}
x = 40;
for (const s of [256, 128, 64]) {
  comp.push({
    input: await tile('pebblit-profile-circle-1024.png', s),
    left: x,
    top: 360 + (256 - s),
  });
  x += s + 40;
}
comp.push({
  input: await sharp(resolve(OUT, 'peek-and-find-wordmark-dark.png')).resize(760).png().toBuffer(),
  left: 800,
  top: 60,
});
comp.push({
  input: await sharp(resolve(OUT, 'pebblit-wordmark-dark.png')).resize(760).png().toBuffer(),
  left: 800,
  top: 380,
});
comp.push({
  input: await sharp(resolve(OUT, 'peek-and-find-wordmark-transparent.png'))
    .resize(760)
    .png()
    .toBuffer(),
  left: 40,
  top: 700,
});
comp.push({
  input: await sharp(resolve(OUT, 'pebblit-wordmark-transparent.png')).resize(760).png().toBuffer(),
  left: 800,
  top: 700,
});
comp.push({ input: await tile('peek-and-find-icon-1024.png', 200), left: 40, top: 950 });
comp.push({ input: await tile('pebblit-profile-1024.png', 200), left: 280, top: 950 });
await out(
  'brand-sheet.png',
  await sharp({ create: { width: sheetW, height: sheetH, channels: 4, background: '#3a3f4b' } })
    .composite(comp)
    .png()
    .toBuffer(),
);
console.log(`brand: ${written.join(', ')} → docs/store/brand/`);
