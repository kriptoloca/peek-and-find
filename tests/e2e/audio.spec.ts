import { expect } from '@playwright/test';
import {
  CANVAS,
  TEST,
  setHidden,
  state,
  tapTitle,
  test,
  titleAudio,
  waitState,
  waitTitle,
} from './helpers';

/**
 * Audio from the player's side: silent before the first tap, music after PLAY with a real
 * signal on the master bus, SFX on taps, the Title toggle, and the platform's pause and mute
 * through the host's own path (the SDK watches page visibility), on the Title and in play.
 */

async function waitLevel(
  page: Parameters<typeof state>[0],
  pred: (level: number) => boolean,
  label: string,
  timeout = 15_000,
): Promise<number> {
  const t0 = Date.now();
  for (;;) {
    const s = await state(page);
    const level = s?.audio.level ?? -1;
    if (pred(level)) return level;
    if (Date.now() - t0 > timeout) throw new Error(`timeout: ${label} (level ${String(level)})`);
    await page.waitForTimeout(100);
  }
}

test('silent before the first tap, music and SFX after PLAY', async ({ page }) => {
  await page.goto(`${TEST}?reset=1${CANVAS}`, { waitUntil: 'load' });
  await waitTitle(page);
  await page.waitForTimeout(800);
  // Headless Chromium starts the context unlocked (autoplay policy), so "locked" is not asserted;
  // what matters to the player is that nothing plays before the first tap.
  const before = await titleAudio(page);
  expect(before.ready).toBe(true);
  expect(before.musicPlaying).toBe(false);
  expect(before.played).toEqual([]);
  expect(before.level).toBeLessThan(0.0005);

  await tapTitle(page, 'play');
  const s = await waitState(page, (x) => x.status === 'playing', 'playing');
  expect(s.audio.musicWanted).toBe(true);
  expect(s.audio.musicPlaying).toBe(true);
  expect(s.audio.played).toContain('button');
  const level = await waitLevel(page, (l) => l > 0.002, 'signal on the master bus');
  expect(level).toBeGreaterThan(0.002);
  expect(s.audio.missing).toEqual([]);
});

test('the music toggle on the Title silences the loop and persists', async ({ page }) => {
  await page.goto(`${TEST}?reset=1${CANVAS}`, { waitUntil: 'load' });
  await waitTitle(page);
  await tapTitle(page, 'music');
  await page.waitForTimeout(300);
  expect((await page.evaluate(() => window.__peekTitle?.state()))?.music).toBe(false);
  await tapTitle(page, 'play');
  const s = await waitState(page, (x) => x.status === 'playing', 'playing');
  expect(s.audio.musicPlaying).toBe(false);
  const level = await waitLevel(page, (l) => l >= 0 && l < 0.0005, 'quiet bus');
  expect(level).toBeLessThan(0.0005);
  // persisted: a fresh load shows the toggle off
  await page.goto(`${TEST}?${CANVAS.slice(1)}`, { waitUntil: 'load' });
  await waitTitle(page);
  expect((await page.evaluate(() => window.__peekTitle?.state()))?.music).toBe(false);
});

test('platform pause and mute in play come through the host path and win over the toggles', async ({
  page,
}) => {
  await page.goto(`${TEST}?reset=1${CANVAS}`, { waitUntil: 'load' });
  await waitTitle(page);
  await tapTitle(page, 'play');
  const playing = await waitState(page, (x) => x.status === 'playing', 'playing');
  expect(playing.audio.musicPlaying).toBe(true);
  await waitLevel(page, (l) => l > 0.002, 'music audible');
  const remaining = playing.remaining;

  // The host hides the page: the SDK flips its pause and audio state; the game must freeze
  // and fall silent although the player's toggles are on.
  await setHidden(page, true);
  const paused = await waitState(
    page,
    (x) => x.paused && !x.audio.platformEnabled && !x.audio.musicPlaying,
    'paused and muted by the platform',
  );
  expect(paused.audio.musicOn).toBe(true);
  expect(paused.audio.soundOn).toBe(true);
  await waitLevel(page, (l) => l >= 0 && l < 0.0005, 'silent while paused');
  const t = await page.evaluate(() => window.__peekDebug?.targets() ?? []);
  if (t[0]) await page.mouse.click(t[0].x, t[0].y);
  await page.waitForTimeout(300);
  expect((await state(page))?.remaining).toBe(remaining);

  await setHidden(page, false);
  const resumed = await waitState(
    page,
    (x) => !x.paused && x.audio.platformEnabled && x.audio.musicPlaying,
    'resumed',
  );
  expect(resumed.status).toBe('playing');
  await waitLevel(page, (l) => l > 0.002, 'music back');
});

test('platform pause on the Title: PLAY does nothing until the host resumes', async ({ page }) => {
  await page.goto(`${TEST}?reset=1${CANVAS}`, { waitUntil: 'load' });
  await waitTitle(page);
  await setHidden(page, true);
  await page.waitForTimeout(300);
  expect((await titleAudio(page)).paused).toBe(true);
  await tapTitle(page, 'play');
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => typeof window.__peekDebug)).toBe('undefined');
  await setHidden(page, false);
  await page.waitForTimeout(300);
  expect((await titleAudio(page)).paused).toBe(false);
  await tapTitle(page, 'play');
  await waitState(page, (x) => x.status === 'playing', 'playing after resume');
});

test('?audiodebug=1 draws the audio state on screen (phone diagnostics)', async ({ page }) => {
  await page.goto(`${TEST}?reset=1&audiodebug=1${CANVAS}`, { waitUntil: 'load' });
  await waitTitle(page);
  const box = page.locator('#audio-debug');
  await expect(box).toBeVisible();
  await expect(box).toContainText('formats: ogg=');
  await expect(box).toContainText('missing: -'); // every file of the index decoded
  await tapTitle(page, 'play');
  await waitState(page, (s) => s.status === 'playing', 'playing');
  await expect(box).toContainText('playing=true');
});
