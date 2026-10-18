// Store thumbnails from the brief (docs/store/thumbnail-brief.md): screenshots a real generated
// scene in the development build, circles one target and writes the 16:9, 1:1 and 512² icon
// drafts (variants A: plain ring, B: magnifier) to docs/store/thumbnails/ (git-ignored output).
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
    return { ...info, salt, score, shot: await page.screenshot({ type: 'png' }) };
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
