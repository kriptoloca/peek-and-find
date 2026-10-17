import { expect, test } from '@playwright/test';
import {
  CANVAS,
  TEST,
  collect,
  expectSameOrigin,
  loseScene,
  shot,
  state,
  tapTitle,
  waitState,
  waitTitle,
  winScene,
} from './helpers';

/** The player's path through the development-mode build (same code as production + hooks). */

test('title → PLAY → first scene → find everything → next level', async ({
  page,
  baseURL,
}, info) => {
  const c = collect(page);
  await page.goto(`${TEST}?reset=1${CANVAS}`, { waitUntil: 'load' });
  await waitTitle(page);
  await shot(page, info, 'title');
  await tapTitle(page, 'play');
  const s1 = await waitState(page, (s) => s.status === 'playing', 'level 1');
  expect(s1.level).toBe(1);
  expect(s1.hearts).toBe(3);
  await shot(page, info, 'level-1');
  await winScene(page);
  await shot(page, info, 'won');
  const s2 = await waitState(page, (s) => s.level === 2 && s.status === 'playing', 'level 2');
  expect(s2.scenesPlayed).toBe(1);
  expectSameOrigin(c, baseURL);
  expect(c.errors).toEqual([]);
});

test('fake ads: interstitial after three scenes, rewarded hint and continue', async ({
  page,
}, info) => {
  const c = collect(page);
  await page.goto(`${TEST}?level=5&mode=find&fakeads=1&adfast=1${CANVAS}`, { waitUntil: 'load' });
  await waitState(page, (s) => s.status === 'playing', 'level 5');
  for (let i = 0; i < 3; i++) {
    await winScene(page);
    if (i < 2) await waitState(page, (s) => s.level === 6 + i && s.status === 'playing', 'next');
  }
  const ad = await waitState(page, (s) => s.adInProgress, 'interstitial', 20_000);
  expect(ad.adsShown).toBe(1);
  await expect(page.locator('#fake-ad')).toBeVisible();
  await shot(page, info, 'interstitial');
  const after = await waitState(page, (s) => s.level === 8 && s.status === 'playing', 'after ad');
  expect(after.hearts).toBe(3);

  const before = after.remaining;
  await page.evaluate(() => window.__peekDebug?.tapHint());
  const hinted = await waitState(page, (s) => s.hintUses === 1 && !s.adInProgress, 'hint earned');
  expect(hinted.remaining).toBe(before);

  await loseScene(page);
  await shot(page, info, 'lost');
  await page.evaluate(() => window.__peekDebug?.tapContinue());
  const cont = await waitState(
    page,
    (s) => s.continueUses === 1 && s.status === 'playing',
    'continue',
  );
  expect(cont.hearts).toBe(3);
  expect(cont.level).toBe(8);
  expect(c.errors).toEqual([]);
});

test('rotation keeps the HUD out of the images; 1:1 never hosts Spot', async ({ page }, info) => {
  await page.goto(`${TEST}?level=12&mode=spot`, { waitUntil: 'load' });
  const portrait = await waitState(page, (s) => s.status === 'playing', 'spot');
  expect(portrait.mode).toBe('spot');
  expect(portrait.hudInBand).toBe(true);
  await shot(page, info, 'spot-9x16');
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(600);
  const landscape = await state(page);
  expect(landscape?.status).toBe('playing');
  expect(landscape?.hudInBand).toBe(true);
  await shot(page, info, 'spot-16x9');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(600);
  expect((await state(page))?.hudInBand).toBe(true);

  await page.setViewportSize({ width: 700, height: 700 });
  await page.goto(`${TEST}?level=12&mode=spot`, { waitUntil: 'load' });
  const square = await waitState(page, (s) => s.status === 'playing', 'square');
  expect(square.mode).not.toBe('spot');
  expect(square.hudInBand).toBe(true);
  await shot(page, info, 'square-1x1');
});

test('daily chain plays five fixed levels and finishes', async ({ page }, info) => {
  test.setTimeout(240_000);
  await page.goto(`${TEST}?daily=1&reset=1&today=20261017${CANVAS}`, { waitUntil: 'load' });
  for (let i = 0; i < 5; i++) {
    const s = await waitState(
      page,
      (x) => x.status === 'playing' && x.dailyIndex === i,
      `daily ${String(i)}`,
    );
    expect(s.sceneLevel).toBe((i + 1) * 10);
    await winScene(page);
  }
  const done = await waitState(page, (s) => s.streak === 1, 'daily complete', 60_000);
  expect(done.lastDailyDate).toBe('20261017');
  await shot(page, info, 'daily-complete');
});
