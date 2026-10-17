import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { test, type Page } from '@playwright/test';
import { CANVAS, TEST, loseScene, waitState, waitTitle, winScene } from '../e2e/helpers';

/**
 * Visual tour (docs/visual-review.md): every screen a player meets, in the three aspect
 * ratios, as PNGs for a human review. No assertions beyond "the state arrived"; the rules
 * themselves are asserted in tests/e2e.
 */
const OUT = resolve('test-results/tour');
mkdirSync(OUT, { recursive: true });

async function snap(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: resolve(OUT, `${name}.png`) });
}

const VIEWS = {
  p: { width: 390, height: 844 },
  l: { width: 844, height: 390 },
  s: { width: 700, height: 700 },
} as const;
type View = keyof typeof VIEWS;

test('title in three aspects', async ({ page }) => {
  for (const [k, v] of Object.entries(VIEWS)) {
    await page.setViewportSize(v);
    await page.goto(`${TEST}?reset=1`, { waitUntil: 'load' });
    await page.waitForTimeout(300);
    await snap(page, `boot-${k}`).catch(() => undefined);
    await waitTitle(page);
    await page.waitForTimeout(400);
    await snap(page, `title-${k}`);
  }
});

const LEVELS: { level: number; mode?: string; views: View[] }[] = [
  { level: 1, views: ['p', 'l', 's'] },
  { level: 3, views: ['p'] },
  { level: 5, views: ['p'] },
  { level: 8, mode: 'odd', views: ['p', 'l'] },
  { level: 10, views: ['p'] },
  { level: 12, mode: 'spot', views: ['p', 'l'] },
  { level: 20, views: ['p'] },
  { level: 25, views: ['p', 'l'] },
  { level: 30, mode: 'spot', views: ['p'] },
  { level: 34, mode: 'odd', views: ['p'] },
  { level: 40, views: ['p'] },
  { level: 50, views: ['p'] },
  { level: 55, mode: 'spot', views: ['l'] },
  { level: 80, views: ['p', 'l', 's'] },
];

for (const L of LEVELS) {
  test(`level ${String(L.level)} ${L.mode ?? ''}`, async ({ page }) => {
    for (const k of L.views) {
      await page.setViewportSize(VIEWS[k]);
      const m = L.mode ? `&mode=${L.mode}` : '';
      await page.goto(`${TEST}?level=${String(L.level)}${m}&reset=1${CANVAS}`, {
        waitUntil: 'load',
      });
      const s = await waitState(page, (x) => x.status === 'playing', 'playing');
      await page.waitForTimeout(900);
      await snap(page, `L${String(L.level).padStart(2, '0')}-${s.mode}-${s.theme}-${k}`);
    }
  });
}

test('feedback: wrong tap, correct tap, hint, pause, won, lost with and without Continue', async ({
  page,
}) => {
  await page.setViewportSize(VIEWS.p);
  await page.goto(`${TEST}?level=8&mode=find&fakeads=1&adfast=1&reset=1${CANVAS}`, {
    waitUntil: 'load',
  });
  await waitState(page, (x) => x.status === 'playing', 'playing');
  await page.waitForTimeout(900);
  const w = await page.evaluate(() => window.__peekDebug?.wrong() ?? []);
  if (w[0]) {
    await page.mouse.click(w[0].x, w[0].y);
    await page.waitForTimeout(60);
    await snap(page, 'fx-wrong');
  }
  const t = await page.evaluate(() => window.__peekDebug?.targets() ?? []);
  if (t[0]) {
    await page.mouse.click(t[0].x, t[0].y);
    await page.waitForTimeout(120);
    await snap(page, 'fx-correct');
  }
  await page.evaluate(() => window.__peekDebug?.tapHint());
  await waitState(page, (x) => x.hintUses === 1 && !x.adInProgress, 'hint');
  await page.waitForTimeout(300);
  await snap(page, 'fx-hint');
  await page.evaluate(() => window.__peekDebug?.simulatePause(true));
  await page.waitForTimeout(200);
  await snap(page, 'fx-pause');
  await page.evaluate(() => window.__peekDebug?.simulatePause(false));
  await winScene(page);
  await page.waitForTimeout(700);
  await snap(page, 'fx-won');
  await waitState(page, (x) => x.status === 'playing' && x.level === 9, 'next');
  await loseScene(page);
  await page.waitForTimeout(500);
  await snap(page, 'fx-lost-continue');
  await page.goto(`${TEST}?level=8&mode=find&reset=1${CANVAS}`, { waitUntil: 'load' });
  await waitState(page, (x) => x.status === 'playing', 'playing');
  await loseScene(page);
  await page.waitForTimeout(500);
  await snap(page, 'fx-lost');
});

test('daily chain: first scene and the Daily Complete overlay', async ({ page }) => {
  await page.setViewportSize(VIEWS.p);
  await page.goto(`${TEST}?daily=1&reset=1&today=20261017${CANVAS}`, { waitUntil: 'load' });
  for (let i = 0; i < 5; i++) {
    await waitState(
      page,
      (x) => x.status === 'playing' && x.dailyIndex === i,
      `daily ${String(i)}`,
    );
    if (i === 0) {
      await page.waitForTimeout(800);
      await snap(page, 'daily-0');
    }
    await winScene(page);
  }
  await waitState(page, (s) => s.streak === 1, 'daily complete', 60_000);
  await page.waitForTimeout(400);
  await snap(page, 'daily-complete');
});
