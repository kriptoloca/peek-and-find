// Store thumbnails from the brief (docs/store/thumbnail-brief.md): screenshots a real generated
// scene in the development build, circles one target and writes the 16:9, 1:1 and 512² icon
// drafts (variants A: plain ring, B: magnifier) plus the three Playgama cover images
// (cover-800x800, cover-1080x1920, cover-1920x1080: scene, wordmark, ring) to
// docs/store/thumbnails/ (git-ignored output).
// With placeholder art the result is a layout check; with the real pack it is the deliverable.
//
//   npm run build:test && npx vite preview --port 4173     (or any server of dist/)
//   node scripts/thumbnails.mjs [--level 9] [--salt 7 | --try 12] [--url http://127.0.0.1:4173/test/]
//
// Composition rules applied (brief): a kitchen scene at mid density (level 9 = 23 objects, two
// targets), the circled target near the right third, nothing else explained, the game's HUD
// left out (the circle is the prompt), safe area = central 80 %. `--try N` renders salts 1..N
// and keeps the one whose target lands nearest the right-third point.
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
};
const LEVEL = Number(opt('level', '9'));
const TRY = Number(opt('try', '0'));
const SALTS = TRY > 0 ? Array.from({ length: TRY }, (_, i) => i + 1) : [Number(opt('salt', '7'))];
const URL = opt('url', 'http://127.0.0.1:4173/test/');
const OUT = resolve('docs/store/thumbnails');
mkdirSync(OUT, { recursive: true });

const ACCENT = '#ffc857';
/** Ring stroke on the 1280-wide canvas (brief: 10–12 px). */
const STROKE = 12;
/** Ring radius = this × the sprite's longest side, never under RING_MIN px (on the scene crop). */
const RING_MULT = 0.62;
const RING_MIN = 96;
const ICON_MARGIN = 48;
/** Playgama "Cover Images": exact sizes the console asks for (seen 2026-10-18). */
const COVER_SQUARE = 800;
const COVER_PORTRAIT = { w: 1080, h: 1920 };
const COVER_LANDSCAPE = { w: 1920, h: 1080 };
/**
 * Where the circled target may sit on the 1080 scene so the ring stays clear of the wordmark
 * band (square cover), the fade into the frame (landscape cover) and the central 80 % safe area
 * of every cover. Salts whose targets all miss it score worse (`--try N`).
 */
const COVER_REGION = { x0: 300, x1: 860, y0: 450, y1: 900 };
const WORDMARK = resolve('docs/store/brand/peek-and-find-wordmark-transparent.png');
const STUDIO_MARK = resolve('public/brand/pebblit.png');
const inCoverRegion = (t, rect) => {
  const x = t.x - rect.x;
  const y = t.y - rect.y;
  return (
    x >= COVER_REGION.x0 && x <= COVER_REGION.x1 && y >= COVER_REGION.y0 && y <= COVER_REGION.y1
  );
};

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
try {
  // 1080 × 1920 CSS px: the design square renders at exactly 1080 px (device pixel ratio 1).
  const page = await browser.newPage({
    viewport: { width: 1080, height: 1920 },
    deviceScaleFactor: 1,
  });
  const capture = async (salt) => {
    await page.goto(
      `${URL}?level=${String(LEVEL)}&mode=find&reset=1&salt=${String(salt)}&renderer=canvas&fpsmin=1`,
      { waitUntil: 'load' },
    );
    const t0 = Date.now();
    for (;;) {
      const s = await page.evaluate(() => window.__peekDebug?.state());
      if (s && s.status === 'playing') break;
      if (Date.now() - t0 > 40_000) throw new Error('scene did not start');
      await page.waitForTimeout(100);
    }
    await page.waitForTimeout(700); // pop-in tweens settled
    const info = await page.evaluate(() => ({
      rect: window.__peekDebug.sceneRect(),
      targets: window.__peekDebug.targets(),
      state: window.__peekDebug.state(),
    }));
    if (info.targets.length === 0) throw new Error('no target in the scene');
    // Score: distance of the best target to the right-third point, plus a penalty for every
    // other object inside the icon crop (the brief wants the circled target alone there).
    const aimAt = { x: info.rect.x + info.rect.w * (2 / 3), y: info.rect.y + info.rect.h / 2 };
    const objects = await page.evaluate(() => window.__peekDebug.objects());
    const score = Math.min(
      ...info.targets.map((t) => {
        const r = Math.max(RING_MIN, (t.size ?? RING_MIN) * RING_MULT) * 1.3;
        const crowd = objects.filter(
          (o) => o.id !== t.id && Math.hypot(o.x - t.x, o.y - t.y) < r,
        ).length;
        return Math.hypot(t.x - aimAt.x, t.y - aimAt.y) + crowd * 400;
      }),
    );
    const coverPenalty = info.targets.some((t) => inCoverRegion(t, info.rect)) ? 0 : 2000;
    return {
      ...info,
      salt,
      score: score + coverPenalty,
      shot: await page.screenshot({ type: 'png' }),
    };
  };
  let best = null;
  for (const salt of SALTS) {
    const c = await capture(salt);
    if (!best || c.score < best.score) best = c;
  }
  const { rect, targets, shot } = best;
  const SALT = best.salt;
  const info = best;
  const square = await sharp(shot)
    .extract({
      left: Math.round(rect.x),
      top: Math.round(rect.y),
      width: Math.round(rect.w),
      height: Math.round(rect.h),
    })
    .png()
    .toBuffer();
  const W = Math.round(rect.w);
  const H = Math.round(rect.h);
  // Target nearest the right-third point (brief: rule of thirds, right-hand side).
  const aim = { x: rect.x + rect.w * (2 / 3), y: rect.y + rect.h / 2 };
  const target = targets.reduce((best, t) =>
    Math.hypot(t.x - aim.x, t.y - aim.y) < Math.hypot(best.x - aim.x, best.y - aim.y) ? t : best,
  );
  const tx = target.x - rect.x;
  const ty = target.y - rect.y;
  const ringR = Math.max(RING_MIN, (target.size ?? RING_MIN) * RING_MULT);

  const ringSvg = (cx, cy, r, stroke, magnifier) => {
    const handle = magnifier
      ? `<line x1="${(cx + r * 0.72).toFixed(1)}" y1="${(cy + r * 0.72).toFixed(1)}" x2="${(cx + r * 1.45).toFixed(1)}" y2="${(cy + r * 1.45).toFixed(1)}" stroke="${ACCENT}" stroke-width="${(stroke * 1.6).toFixed(1)}" stroke-linecap="round"/>`
      : '';
    return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="none" stroke="${ACCENT}" stroke-width="${stroke.toFixed(1)}"/>${handle}`;
  };
  const overlay = (w, h, body) =>
    Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${body}</svg>`);

  const written = [];
  const write = async (name, pipeline) => {
    const file = resolve(OUT, name);
    await pipeline.toFile(file);
    written.push(name);
  };

  for (const [variant, magnifier] of [
    ['A', false],
    ['B', true],
  ]) {
    // 16:9 — a 1080 × 608 band of the square that contains the target, scaled to 1280 × 720.
    const bandH = Math.round((W * 9) / 16);
    const top = Math.max(0, Math.min(H - bandH, Math.round(ty - bandH / 2)));
    const k16 = 1280 / W;
    const band = await sharp(square)
      .extract({ left: 0, top, width: W, height: bandH })
      .resize(1280, 720)
      .png()
      .toBuffer();
    await write(
      `thumb-16x9-${variant}.png`,
      sharp(band)
        .composite([
          {
            input: overlay(
              1280,
              720,
              ringSvg(tx * k16, (ty - top) * k16, ringR * k16, STROKE, magnifier),
            ),
          },
        ])
        .removeAlpha()
        .png(),
    );
    if (variant === 'A') {
      await write(
        'thumb-16x9-A.jpg',
        sharp(resolve(OUT, 'thumb-16x9-A.png')).jpeg({ quality: 90 }),
      );
    }
    // 1:1 — the whole square at 1080.
    const k1 = 1080 / W;
    const sq = await sharp(square).resize(1080, 1080).png().toBuffer();
    await write(
      `thumb-1x1-${variant}.png`,
      sharp(sq)
        .composite([
          {
            input: overlay(
              1080,
              1080,
              ringSvg(tx * k1, ty * k1, ringR * k1, STROKE * (1080 / 1280), magnifier),
            ),
          },
        ])
        .removeAlpha()
        .png(),
    );
  }

  // Icon 512² — the circled target alone, ring inside a 48 px margin, no text.
  const side = Math.round(Math.min(W, H, (ringR * 2 * 512) / (512 - 2 * ICON_MARGIN)));
  const left = Math.max(0, Math.min(W - side, Math.round(tx - side / 2)));
  const topI = Math.max(0, Math.min(H - side, Math.round(ty - side / 2)));
  const kI = 512 / side;
  const iconBase = await sharp(square)
    .extract({ left, top: topI, width: side, height: side })
    .resize(512, 512)
    .png()
    .toBuffer();
  await write(
    'icon-512.png',
    sharp(iconBase)
      .composite([
        {
          input: overlay(
            512,
            512,
            ringSvg((tx - left) * kI, (ty - topI) * kI, 512 / 2 - ICON_MARGIN, 14, false),
          ),
        },
      ])
      .removeAlpha()
      .png(),
  );

  // Playgama covers: the same scene on the theme's frame color, the scene edges faded into it,
  // the wordmark in its own band, one target ringed (the brand's "one circled signal").
  const inRegion = targets.filter((t) => inCoverRegion(t, rect));
  const coverTarget = (inRegion.length > 0 ? inRegion : [target]).reduce((a, b) =>
    Math.abs(a.x - rect.x - 580) + Math.abs(a.y - rect.y - 675) <=
    Math.abs(b.x - rect.x - 580) + Math.abs(b.y - rect.y - 675)
      ? a
      : b,
  );
  if (inRegion.length === 0) {
    console.warn('covers: no target inside the cover region, rerun with --try 12');
  }
  const cx = coverTarget.x - rect.x;
  const cy = coverTarget.y - rect.y;
  const coverRing = Math.max(RING_MIN, (coverTarget.size ?? RING_MIN) * RING_MULT);
  const frame = String(info.state.frameColor ?? '#1b1f2a');
  const wordmark = await sharp(WORDMARK).trim().png().toBuffer();
  const sized = async (file, width) => sharp(file).resize({ width }).png().toBuffer();
  const meta = async (buf) => {
    const m = await sharp(buf).metadata();
    return { w: m.width ?? 0, h: m.height ?? 0 };
  };
  /** Opaque frame color at `from`, transparent at `to`, along one axis (SVG gradient). */
  const fade = (w, h, x1, y1, x2, y2) =>
    overlay(
      w,
      h,
      `<defs><linearGradient id="f" gradientUnits="userSpaceOnUse" x1="${String(x1)}" y1="${String(y1)}" x2="${String(x2)}" y2="${String(y2)}">` +
        `<stop offset="0" stop-color="${frame}" stop-opacity="1"/><stop offset="1" stop-color="${frame}" stop-opacity="0"/></linearGradient></defs>` +
        `<rect width="${String(w)}" height="${String(h)}" fill="url(#f)"/>`,
    );
  const cover = async (name, w, h, layers) => {
    await write(
      name,
      sharp({ create: { width: w, height: h, channels: 4, background: frame } })
        .composite(layers)
        .removeAlpha()
        .png(),
    );
  };
  const place = async (buf, centerX, centerY) => {
    const m = await meta(buf);
    return {
      input: buf,
      left: Math.round(centerX - m.w / 2),
      top: Math.round(centerY - m.h / 2),
    };
  };

  {
    // Square 800: the whole scene, the top band faded for the wordmark.
    const k = COVER_SQUARE / W;
    const S = COVER_SQUARE;
    await cover(`cover-${String(S)}x${String(S)}.png`, S, S, [
      { input: await sharp(square).resize(S, S).png().toBuffer(), left: 0, top: 0 },
      { input: fade(S, S, 0, 150, 0, 360) },
      { input: overlay(S, S, ringSvg(cx * k, cy * k, coverRing * k, STROKE * 0.8, false)) },
      await place(await sized(wordmark, 600), S / 2, 118),
    ]);
  }
  {
    // Portrait 1080 × 1920: wordmark band on top, the scene below it, the studio mark under.
    const { w: PW, h: PH } = COVER_PORTRAIT;
    const k = PW / W;
    const top = 580;
    const sh = Math.round(H * k);
    await cover(`cover-${String(PW)}x${String(PH)}.png`, PW, PH, [
      { input: await sharp(square).resize(PW, sh).png().toBuffer(), left: 0, top },
      { input: fade(PW, PH, 0, top, 0, top + 200) },
      { input: fade(PW, PH, 0, top + sh, 0, top + sh - 200) },
      {
        input: overlay(PW, PH, ringSvg(cx * k, top + cy * k, coverRing * k, STROKE, false)),
      },
      await place(await sized(wordmark, 820), PW / 2, 330),
      await place(await sized(STUDIO_MARK, 120), PW / 2, top + sh + 110),
    ]);
  }
  {
    // Landscape 1920 × 1080: the scene on the right, faded into the frame; wordmark on the left.
    const { w: LW, h: LH } = COVER_LANDSCAPE;
    const k = LH / H;
    const sw = Math.round(W * k);
    const left = LW - sw;
    await cover(`cover-${String(LW)}x${String(LH)}.png`, LW, LH, [
      { input: await sharp(square).resize(sw, LH).png().toBuffer(), left, top: 0 },
      { input: fade(LW, LH, left, 0, left + 260, 0) },
      {
        input: overlay(LW, LH, ringSvg(left + cx * k, cy * k, coverRing * k, STROKE, false)),
      },
      await place(await sized(wordmark, 640), left / 2 + 30, LH / 2 - 40),
      await place(await sized(STUDIO_MARK, 110), left / 2 + 30, LH / 2 + 170),
    ]);
  }

  writeFileSync(
    resolve(OUT, 'README.md'),
    [
      '# Generated thumbnails (git-ignored)',
      '',
      `Source: \`node scripts/thumbnails.mjs --level ${String(LEVEL)} --salt ${String(SALT)}\` on ${new Date().toISOString().slice(0, 10)},`,
      `theme ${String(info.state.theme)}, ${String(info.state.remaining)} targets, circled target "${String(target.id)}" (${String(Math.round(target.size ?? 0))} px).`,
      'Files: ' + written.join(', ') + '.',
      'With placeholder art these are layout checks; rerun after `npm run assets` with the real pack.',
      '',
    ].join('\n'),
  );
  console.log(
    `thumbnails: ${written.join(', ')} → docs/store/thumbnails/ (level ${String(LEVEL)}, salt ${String(SALT)}, target ${String(target.id)})`,
  );
} finally {
  await browser.close();
}
