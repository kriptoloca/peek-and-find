import { expect } from '@playwright/test';
import {
  CANVAS,
  SALT,
  TEST,
  loseScene,
  openMenu,
  tapButton,
  tapMenu,
  tapTitle,
  test,
  waitState,
  waitTitle,
  winScene,
  wrongTap,
} from './helpers';

/**
 * GDD v1.7 §6: hearts carry over from scene to scene, one comes back on every 20th level
 * (never above three), a lost scene restarts with three, the daily chain keeps its own.
 */

const NO_TWIST = '&twist=none';

test('hearts carry over to the next scene and survive a reload', async ({ page }) => {
  await page.goto(`${TEST}?level=5&mode=find&reset=1${SALT}${CANVAS}`, { waitUntil: 'load' });
  await waitState(page, (s) => s.status === 'playing', 'level 5');
  expect((await wrongTap(page)).hearts).toBe(2);
  await winScene(page);
  const next = await waitState(page, (s) => s.level === 6 && s.status === 'playing', 'level 6');
  expect(next.hearts).toBe(2);
  // The save carries the hearts (rule 7): PLAY after a reload continues with two.
  await page.goto(`${TEST}?${CANVAS.slice(1)}`, { waitUntil: 'load' });
  await waitTitle(page);
  await tapTitle(page, 'play');
  const again = await waitState(page, (s) => s.status === 'playing', 'after reload');
  expect(again.level).toBe(6);
  expect(again.hearts).toBe(2);
});

test('one heart comes back on every 20th level, never above three', async ({ page }) => {
  await page.goto(`${TEST}?level=19&mode=find&hearts=1&reset=1${SALT}${CANVAS}${NO_TWIST}`, {
    waitUntil: 'load',
  });
  const s19 = await waitState(page, (s) => s.status === 'playing', 'level 19');
  expect(s19.hearts).toBe(1);
  await winScene(page);
  const s20 = await waitState(page, (s) => s.level === 20 && s.status === 'playing', 'level 20');
  expect(s20.hearts).toBe(2);
  await winScene(page);
  const s21 = await waitState(page, (s) => s.level === 21 && s.status === 'playing', 'level 21');
  expect(s21.hearts).toBe(2);

  // Full hearts on entering a 20th level: nothing is added.
  await page.goto(`${TEST}?level=39&mode=find&reset=1${SALT}${CANVAS}${NO_TWIST}`, {
    waitUntil: 'load',
  });
  await waitState(page, (s) => s.status === 'playing', 'level 39');
  await winScene(page);
  const s40 = await waitState(page, (s) => s.level === 40 && s.status === 'playing', 'level 40');
  expect(s40.hearts).toBe(3);
});

test('the daily chain carries hearts across its scenes and leaves the chain alone', async ({
  page,
}) => {
  await page.goto(`${TEST}?level=5&mode=find&hearts=1&reset=1${SALT}${CANVAS}`, {
    waitUntil: 'load',
  });
  await waitState(page, (s) => s.status === 'playing' && s.hearts === 1, 'level 5, one heart');
  await winScene(page);
  await waitState(page, (s) => s.level === 6 && s.hearts === 1, 'level 6 saved with one heart');

  await page.goto(`${TEST}?daily=1&today=20261017${SALT}${CANVAS}`, { waitUntil: 'load' });
  const d0 = await waitState(page, (s) => s.status === 'playing' && s.dailyIndex === 0, 'daily 0');
  expect(d0.hearts).toBe(3);
  expect((await wrongTap(page)).hearts).toBe(2);
  await winScene(page);
  const d1 = await waitState(page, (s) => s.status === 'playing' && s.dailyIndex === 1, 'daily 1');
  expect(d1.hearts).toBe(2);

  await page.goto(`${TEST}?${CANVAS.slice(1)}`, { waitUntil: 'load' });
  await waitTitle(page);
  await tapTitle(page, 'play');
  const back = await waitState(
    page,
    (s) => s.status === 'playing' && s.dailyIndex === null,
    'the chain again',
  );
  expect(back.level).toBe(6);
  expect(back.hearts).toBe(1);
});

test('a loss leaves one heart for the retry; the rewarded Continue refills three', async ({
  page,
}) => {
  await page.goto(`${TEST}?level=7&mode=find&fakeads=1&adfast=1&reset=1${SALT}${CANVAS}`, {
    waitUntil: 'load',
  });
  await waitState(page, (s) => s.status === 'playing', 'level 7');
  await loseScene(page);
  await tapButton(page, 'retryCenter');
  const retried = await waitState(page, (s) => s.status === 'playing', 'retried');
  expect(retried.hearts).toBe(1);
  // One mistake now loses the scene; Continue (rewarded) brings three back, and they carry on.
  const lost = await wrongTap(page);
  expect(lost.status).toBe('lost');
  await tapButton(page, 'continueCenter');
  const cont = await waitState(
    page,
    (s) => s.continueUses === 1 && s.status === 'playing',
    'continue',
  );
  expect(cont.hearts).toBe(3);
  await winScene(page);
  const next = await waitState(page, (s) => s.level === 8 && s.status === 'playing', 'level 8');
  expect(next.hearts).toBe(3);
});

test('Home mid-scene keeps the mistakes of the scene', async ({ page }) => {
  await page.goto(`${TEST}?level=5&mode=find&reset=1${SALT}${CANVAS}`, { waitUntil: 'load' });
  await waitState(page, (s) => s.status === 'playing', 'level 5');
  expect((await wrongTap(page)).hearts).toBe(2);
  await openMenu(page);
  await tapMenu(page, 'home');
  await waitTitle(page);
  await tapTitle(page, 'play');
  const back = await waitState(page, (s) => s.status === 'playing', 'level 5 again');
  expect(back.level).toBe(5);
  expect(back.hearts).toBe(2);
});
