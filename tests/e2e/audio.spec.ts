import { expect, test } from '@playwright/test';
import { TEST, collect, state, tapTitle, titleAudio, waitState, waitTitle } from './helpers';

/**
 * Audio from the player's side: silent before the first tap, music after PLAY with a real
 * signal on the master bus, SFX on taps, the Title toggle and the platform pause silence it.
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
  const c = collect(page);
  await page.goto(`${TEST}?reset=1`, { waitUntil: 'load' });
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
  const s = await waitState(page, (x) => x.status === 'playing' && x.audio.musicPlaying, 'music');
  expect(s.audio.locked).toBe(false);
  expect(s.audio.played).toContain('button');
  expect(s.audio.played).toContain('pop');
  const level = await waitLevel(page, (l) => l > 0.002, 'signal on the master bus');
  expect(level).toBeGreaterThan(0.002);
  expect(c.errors).toEqual([]);
});

test('music toggle on the Title keeps the loop off', async ({ page }) => {
  await page.goto(`${TEST}?reset=1`, { waitUntil: 'load' });
  await waitTitle(page);
  await tapTitle(page, 'music');
  await page.waitForTimeout(300);
  expect((await page.evaluate(() => window.__peekTitle?.state()))?.music).toBe(false);
  await tapTitle(page, 'play');
  const s = await waitState(page, (x) => x.status === 'playing', 'playing');
  expect(s.audio.musicWanted).toBe(true);
  expect(s.audio.musicPlaying).toBe(false);
  // the tap/pop sounds decay within a second; with the loop off the bus goes quiet
  await page.waitForTimeout(1500);
  const level = await waitLevel(page, (l) => l >= 0 && l < 0.0005, 'quiet bus');
  expect(level).toBeLessThan(0.0005);
});

test('platform pause silences the music, resume restores it', async ({ page }) => {
  await page.goto(`${TEST}?reset=1`, { waitUntil: 'load' });
  await waitTitle(page);
  await tapTitle(page, 'play');
  await waitState(page, (x) => x.status === 'playing' && x.audio.musicPlaying, 'music');
  await page.evaluate(() => window.__peekDebug?.simulatePause(true));
  await page.waitForTimeout(300);
  const paused = await state(page);
  expect(paused?.audio.paused).toBe(true);
  expect(paused?.audio.musicPlaying).toBe(false);
  await page.evaluate(() => window.__peekDebug?.simulatePause(false));
  const resumed = await waitState(page, (x) => x.audio.musicPlaying, 'resumed');
  expect(resumed.audio.paused).toBe(false);
});
