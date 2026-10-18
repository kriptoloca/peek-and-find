import { expect } from '@playwright/test';
import {
  CANVAS,
  SALT,
  TEST,
  loseScene,
  openMenu,
  shot,
  state,
  tapButton,
  tapMenu,
  tapTitle,
  test,
  titleState,
  waitState,
  waitTitle,
  winScene,
  wrongTap,
} from './helpers';

/** The player's path through the development-mode build (same code as production + hooks). */

const VIEWS = [
  { name: '9:16', width: 390, height: 844 },
  { name: '16:9', width: 844, height: 390 },
  { name: '1:1', width: 700, height: 700 },
] as const;

for (const view of VIEWS) {
  test(`${view.name}: title → PLAY → first scene → find everything → next level`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width: view.width, height: view.height });
    await page.goto(`${TEST}?reset=1${CANVAS}`, { waitUntil: 'load' });
    await waitTitle(page);
    await shot(page, info, 'title');
    await tapTitle(page, 'play');
    const s1 = await waitState(page, (s) => s.status === 'playing', 'level 1');
    expect(s1.level).toBe(1);
    expect(s1.hearts).toBe(3);
    expect(s1.hudInBand).toBe(true);
    await shot(page, info, 'level-1');
    await winScene(page);
    await shot(page, info, 'won');
    const s2 = await waitState(page, (s) => s.level === 2 && s.status === 'playing', 'level 2');
    expect(s2.scenesPlayed).toBe(1);
    if (view.name === '9:16') {
      // the save survives a fresh page load (rule 7): PLAY continues at level 2
      await page.goto(`${TEST}?${CANVAS.slice(1)}`, { waitUntil: 'load' });
      await waitTitle(page);
      await tapTitle(page, 'play');
      const again = await waitState(page, (s) => s.status === 'playing', 'after reload');
      expect(again.level).toBe(2);
      expect(again.scenesPlayed).toBe(1);
    }
  });
}

test('the WebGL renderer plays the same loop (?fpsmin=1 keeps timers on wall-clock time)', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.goto(`${TEST}?reset=1&fpsmin=1`, { waitUntil: 'load' });
  await waitTitle(page);
  await tapTitle(page, 'play');
  const s = await waitState(page, (x) => x.status === 'playing', 'level 1');
  expect(s.renderer).toBe('webgl');
  await winScene(page);
  await waitState(page, (x) => x.level === 2 && x.status === 'playing', 'level 2', 90_000);
});

test('fake ads: the interstitial blocks taps, hint and Continue are real button taps', async ({
  page,
}, info) => {
  await page.goto(`${TEST}?level=5&mode=find&fakeads=1&adfast=1&reset=1${SALT}${CANVAS}`, {
    waitUntil: 'load',
  });
  await waitState(page, (s) => s.status === 'playing', 'level 5');
  for (let i = 0; i < 3; i++) {
    await winScene(page);
    if (i < 2) await waitState(page, (s) => s.level === 6 + i && s.status === 'playing', 'next');
  }
  const ad = await waitState(page, (s) => s.adInProgress, 'interstitial', 20_000);
  expect(ad.adsShown).toBe(1);
  // CLAUDE.md rule 4 / GDD: nothing reacts while an ad runs (the fake ad lets taps through to
  // the canvas, so this is the game's own guard, not the DOM overlay): pause is tapped at once
  await tapButton(page, 'pauseCenter');
  await tapButton(page, 'hintCenter');
  await page.waitForTimeout(150);
  const during = await state(page);
  expect(during?.adInProgress).toBe(true);
  expect(during?.hintUses).toBe(0);
  expect(during?.menuOpen).toBe(false);
  expect(await page.evaluate(() => typeof window.__peekDebug)).toBe('object');
  await expect(page.locator('#fake-ad')).toBeVisible();
  await shot(page, info, 'interstitial');
  const after = await waitState(page, (s) => s.level === 8 && s.status === 'playing', 'after ad');
  expect(after.hearts).toBe(3);
  expect(after.hintUses).toBe(0);

  const before = after.remaining;
  await tapButton(page, 'hintCenter');
  const hinted = await waitState(page, (s) => s.hintUses === 1 && !s.adInProgress, 'hint earned');
  expect(hinted.remaining).toBe(before);

  await loseScene(page);
  await shot(page, info, 'lost');
  await tapButton(page, 'continueCenter');
  const cont = await waitState(
    page,
    (s) => s.continueUses === 1 && s.status === 'playing',
    'continue',
  );
  expect(cont.hearts).toBe(3);
  expect(cont.level).toBe(8);
});

test('no interstitial before 120 s even after four scenes (CLAUDE.md rule 6)', async ({ page }) => {
  await page.goto(`${TEST}?level=5&mode=find&fakeads=1&reset=1${SALT}${CANVAS}`, {
    waitUntil: 'load',
  });
  await waitState(page, (s) => s.status === 'playing', 'level 5');
  for (let i = 0; i < 4; i++) {
    const s = await winScene(page);
    expect(s.adInProgress).toBe(false);
    await waitState(page, (x) => x.level === 6 + i && x.status === 'playing', 'next');
  }
  const s = await state(page);
  expect(s?.adsShown).toBe(0);
  expect(s?.interstitialSupported).toBe(true);
});

test('Retry: a fresh layout in the chain, the same scene in the daily', async ({ page }) => {
  await page.goto(`${TEST}?level=7&mode=find&reset=1${SALT}${CANVAS}`, { waitUntil: 'load' });
  await waitState(page, (s) => s.status === 'playing', 'level 7');
  const first = await page.evaluate(() => window.__peekDebug?.objects() ?? []);
  await loseScene(page);
  await tapButton(page, 'retryCenter');
  const again = await waitState(page, (s) => s.status === 'playing' && s.hearts === 1, 'retried');
  expect(again.level).toBe(7);
  const second = await page.evaluate(() => window.__peekDebug?.objects() ?? []);
  expect(second.map((o) => `${String(o.x)},${String(o.y)}`)).not.toEqual(
    first.map((o) => `${String(o.x)},${String(o.y)}`),
  );

  await page.goto(`${TEST}?daily=1&reset=1&today=20261017${SALT}${CANVAS}`, { waitUntil: 'load' });
  await waitState(page, (s) => s.status === 'playing' && s.dailyIndex === 0, 'daily 0');
  const d1 = await page.evaluate(() => window.__peekDebug?.objects() ?? []);
  await loseScene(page);
  await tapButton(page, 'retryCenter');
  await waitState(page, (s) => s.status === 'playing' && s.hearts === 1, 'daily retried');
  const d2 = await page.evaluate(() => window.__peekDebug?.objects() ?? []);
  expect(d2).toEqual(d1);
});

test('hearts step down on wrong taps, three of them lose the scene; a fast win earns 3 stars', async ({
  page,
}) => {
  await page.goto(`${TEST}?level=3&mode=find&reset=1${SALT}${CANVAS}`, { waitUntil: 'load' });
  await waitState(page, (s) => s.status === 'playing', 'level 3');
  expect((await wrongTap(page)).hearts).toBe(2);
  expect((await wrongTap(page)).hearts).toBe(1);
  const lost = await wrongTap(page);
  expect(lost.hearts).toBe(0);
  expect(lost.status).toBe('lost');
  await tapButton(page, 'retryCenter');
  await waitState(page, (s) => s.status === 'playing' && s.hearts === 1, 'retried');
  const won = await winScene(page);
  expect(won.stars).toBe(3);
});

test('the theme that unlocks at 20 is already loaded at 19 (no stall at the unlock)', async ({
  page,
}) => {
  await page.goto(`${TEST}?level=19&mode=find&reset=1${CANVAS}`, { waitUntil: 'load' });
  await waitState(page, (s) => s.status === 'playing', 'level 19');
  const s = await waitState(page, (x) => x.atlasKeys.includes('atlas_city'), 'city preloaded');
  expect(s.atlasKeys.length).toBeLessThanOrEqual(4);
});

test('level 25 is a big scene with seven targets', async ({ page }) => {
  await page.goto(`${TEST}?level=25&mode=find&reset=1${SALT}${CANVAS}`, { waitUntil: 'load' });
  const s = await waitState(page, (x) => x.status === 'playing', 'level 25');
  expect(s.bigScene).toBe(true);
  expect(s.remaining).toBe(7);
});

test('sound and music toggles are real taps and survive a reload', async ({ page }) => {
  await page.goto(`${TEST}?reset=1${CANVAS}`, { waitUntil: 'load' });
  await waitTitle(page);
  await tapTitle(page, 'sound');
  await tapTitle(page, 'music');
  await page.waitForTimeout(300);
  expect(await titleState(page)).toMatchObject({ sound: false, music: false });
  await page.goto(`${TEST}?${CANVAS.slice(1)}`, { waitUntil: 'load' });
  await waitTitle(page);
  expect(await titleState(page)).toMatchObject({ sound: false, music: false });
  await tapTitle(page, 'sound');
  await tapTitle(page, 'music');
  await page.waitForTimeout(300);
  expect(await titleState(page)).toMatchObject({ sound: true, music: true });
});

test('rotation keeps the HUD out of the images, a tap after rotating counts, 1:1 never hosts Spot', async ({
  page,
}, info) => {
  await page.goto(`${TEST}?level=12&mode=spot&reset=1${SALT}`, { waitUntil: 'load' });
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
  // a tap at the rotated layout's own coordinates still finds a difference
  const t = await page.evaluate(() => window.__peekDebug?.targets() ?? []);
  if (!t[0]) throw new Error('no target');
  await page.mouse.click(t[0].x, t[0].y);
  await waitState(
    page,
    (s) => s.remaining === (landscape?.remaining ?? 0) - 1,
    'found after rotating',
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(600);
  expect((await state(page))?.hudInBand).toBe(true);

  await page.setViewportSize({ width: 700, height: 700 });
  await page.goto(`${TEST}?level=12&mode=spot&reset=1${SALT}`, { waitUntil: 'load' });
  const square = await waitState(page, (s) => s.status === 'playing', 'square');
  expect(square.mode).not.toBe('spot');
  expect(square.hudInBand).toBe(true);
  await shot(page, info, 'square-1x1');
});

test('daily from the Title: five scenes, the check mark, streak 2 the next day, reset after a skipped day', async ({
  page,
}, info) => {
  test.setTimeout(420_000);
  const playDaily = async (today: string, expectStreak: number): Promise<void> => {
    await page.goto(`${TEST}?today=${today}${CANVAS}`, { waitUntil: 'load' });
    await waitTitle(page);
    expect((await titleState(page)).dailyDone).toBe(false);
    await tapTitle(page, 'daily');
    for (let i = 0; i < 5; i++) {
      const s = await waitState(
        page,
        (x) => x.status === 'playing' && x.dailyIndex === i,
        `daily ${String(i)}`,
      );
      expect(s.sceneLevel).toBe((i + 1) * 10);
      // at most three theme atlases stay loaded (plus the UI atlas)
      expect(s.atlasKeys.length).toBeLessThanOrEqual(4);
      await winScene(page);
    }
    const done = await waitState(page, (s) => s.streak === expectStreak, 'daily complete', 60_000);
    expect(done.lastDailyDate).toBe(today);
    await shot(page, info, `daily-complete-${today}`);
    // the Daily Complete overlay returns to the Title on a tap
    const box = await page.locator('canvas').boundingBox();
    if (!box) throw new Error('no canvas');
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await waitTitle(page);
    expect(await titleState(page)).toMatchObject({ dailyDone: true, streak: expectStreak });
  };
  await page.goto(`${TEST}?reset=1${SALT}${CANVAS}`, { waitUntil: 'load' });
  await waitTitle(page);
  await playDaily('20261017', 1);
  await playDaily('20261018', 2);
  await playDaily('20261020', 1); // 20261019 skipped: the streak starts over
});

test('menu → home: back to the Title from play, PLAY returns to the same scene', async ({
  page,
}, info) => {
  for (const view of [
    { width: 390, height: 844 },
    { width: 700, height: 700 },
  ]) {
    await page.setViewportSize(view);
    await page.goto(`${TEST}?level=7&mode=find&reset=1${CANVAS}`, { waitUntil: 'load' });
    const before = await waitState(page, (s) => s.status === 'playing', 'playing');
    const layout = await page.evaluate(() => window.__peekDebug?.objects() ?? []);
    await openMenu(page);
    await tapMenu(page, 'home');
    await waitTitle(page);
    await shot(page, info, `title-after-home-${String(view.width)}`);
    await tapTitle(page, 'play');
    const again = await waitState(page, (s) => s.status === 'playing', 'same scene');
    expect(again.level).toBe(7);
    expect(again.sceneLevel).toBe(before.sceneLevel);
    expect(again.theme).toBe(before.theme);
    await page.waitForTimeout(800);
    expect(await page.evaluate(() => window.__peekDebug?.objects() ?? [])).toEqual(layout);
  }
});

test('the Title shows the brand wordmark texture (text only as a fallback)', async ({
  page,
}, info) => {
  for (const view of [
    { width: 390, height: 844 },
    { width: 844, height: 390 },
    { width: 700, height: 700 },
  ]) {
    await page.setViewportSize(view);
    await page.goto(`${TEST}?reset=1${CANVAS}`, { waitUntil: 'load' });
    await waitTitle(page);
    expect((await titleState(page)).brand).toBe(true);
    await page.waitForTimeout(300);
    await shot(page, info, `title-brand-${String(view.width)}x${String(view.height)}`);
  }
});
