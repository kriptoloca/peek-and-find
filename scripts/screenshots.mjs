// Store screenshots from the development build (same look as production, plus the dev hooks
// that let the script reach a given level): three portrait (1080×1920) and three landscape
// (1920×1080) PNGs for the Playgama / YouTube listing, written to docs/store/screenshots/
// (git-ignored; rerun after the real art pack).
//
//   npm run build:test && npx vite preview --port 4173
//   node scripts/screenshots.mjs [--url http://127.0.0.1:4173/test/] [--salt 7]
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
};
const URL = opt('url', 'http://127.0.0.1:4173/test/');
const SALT = opt('salt', '7');
const OUT = resolve('docs/store/screenshots');
mkdirSync(OUT, { recursive: true });

/** What each shot shows: the first screen, then one scene per mode at a readable density. */
const SHOTS = [
  { name: 'title', query: 'reset=1', wait: 'title' },
  { name: 'find-l9', query: 'level=9&mode=find&reset=1', wait: 'playing' },
  { name: 'odd-l12', query: 'level=12&mode=odd&reset=1', wait: 'playing' },
  { name: 'spot-l15', query: 'level=15&mode=spot&reset=1', wait: 'playing' },
  { name: 'find-l40-shuffle', query: 'level=40&mode=find&twist=shuffle&reset=1', wait: 'playing' },
];
const VIEWS = [
  { tag: '9x16', width: 1080, height: 1920 },
  { tag: '16x9', width: 1920, height: 1080 },
];

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
try {
  const written = [];
  for (const v of VIEWS) {
    const page = await browser.newPage({
      viewport: { width: v.width, height: v.height },
      deviceScaleFactor: 1,
    });
    for (const s of SHOTS) {
      await page.goto(`${URL}?${s.query}&salt=${SALT}&renderer=canvas&fpsmin=1`, {
        waitUntil: 'load',
      });
      const t0 = Date.now();
      for (;;) {
        const ok = await page.evaluate((w) => {
          if (w === 'title') return typeof window.__peekTitle === 'object';
          const st = window.__peekDebug?.state();
          return Boolean(st && st.status === 'playing');
        }, s.wait);
        if (ok) break;
        if (Date.now() - t0 > 40_000) throw new Error(`${s.name}: timeout`);
        await page.waitForTimeout(100);
      }
      await page.waitForTimeout(900); // pop-in and title tweens settled
      const file = `${s.name}-${v.tag}.png`;
      await page.screenshot({ path: resolve(OUT, file), type: 'png' });
      written.push(file);
    }
    await page.close();
  }
  console.log(`screenshots: ${written.join(', ')} → docs/store/screenshots/`);
} finally {
  await browser.close();
}
