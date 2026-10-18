import { expect } from '@playwright/test';
import { CANVAS, SALT, TEST, setHidden, shot, state, test, waitState } from './helpers';

/**
 * Late-game twists (GDD v1.5 §5a) from the player's side: the board really moves and the tap
 * at the new place counts; the clock pauses with the game; the memory prompt hides and peeks;
 * the daily chain stays plain. `?twist=` forces a twist in the development build. The Canvas
 * renderer and `?fpsmin=1` keep Phaser's clock on wall-clock time on the GPU-less CI machine
 * (a slow WebGL frame is otherwise clamped to 16.7 ms and the twist timers crawl).
 */
const CLOCK = `${CANVAS}&fpsmin=1`;

const dist = (a: { x: number; y: number }, b: { x: number; y: number }): number =>
  Math.hypot(a.x - b.x, a.y - b.y);

test('shuffle: the marker shows, every object moves after 8 s, the tap at the new place counts', async ({
  page,
}, info) => {
  await page.goto(`${TEST}?level=40&mode=find&twist=shuffle&reset=1${SALT}${CLOCK}`, {
    waitUntil: 'load',
  });
  const s0 = await waitState(page, (s) => s.status === 'playing', 'playing');
  expect(s0.twist).toBe('shuffle');
  expect(s0.layout).toBe(0);
  const marker = await page.evaluate(() => window.__peekDebug?.twistCenter() ?? null);
  expect(marker).not.toBeNull();
  const before = await page.evaluate(() => window.__peekDebug?.objects() ?? []);
  const targetsBefore = await page.evaluate(() => window.__peekDebug?.targets() ?? []);
  expect(targetsBefore.length).toBeGreaterThan(0);
  await shot(page, info, 'shuffle-before');

  const s1 = await waitState(page, (s) => s.layout === 1 && !s.moving, 'first shuffle', 30_000);
  expect(s1.shufflesDone).toBe(1);
  expect(s1.status).toBe('playing');
  const after = await page.evaluate(() => window.__peekDebug?.objects() ?? []);
  expect(after.map((o) => o.id)).toEqual(before.map((o) => o.id));
  const moved = after.filter((o, i) => dist(o, before[i] as { x: number; y: number }) > 20);
  expect(moved.length).toBeGreaterThanOrEqual(Math.ceil(after.length / 2));
  await shot(page, info, 'shuffle-after');

  // the remaining targets are reported at their new places; tapping one there counts
  const targetsAfter = await page.evaluate(() => window.__peekDebug?.targets() ?? []);
  expect(targetsAfter.map((t) => t.id).sort()).toEqual(targetsBefore.map((t) => t.id).sort());
  const t = targetsAfter[0];
  if (!t) throw new Error('no target');
  await page.mouse.click(t.x, t.y);
  await waitState(page, (s) => s.remaining === s1.remaining - 1, 'found after the shuffle');
});

test('shuffle: the countdown pauses with the game and the second slide follows 8 s later', async ({
  page,
}) => {
  await page.goto(`${TEST}?level=35&mode=odd&twist=shuffle&reset=1${SALT}${CLOCK}`, {
    waitUntil: 'load',
  });
  const s0 = await waitState(page, (s) => s.status === 'playing', 'playing');
  expect(s0.twist).toBe('shuffle');
  expect(s0.mode).toBe('odd');
  await setHidden(page, true);
  await waitState(page, (s) => s.paused, 'paused');
  await page.waitForTimeout(10_000);
  expect((await state(page))?.layout).toBe(0);
  await setHidden(page, false);
  await waitState(page, (s) => !s.paused, 'resumed');
  const t1 = Date.now();
  await waitState(page, (s) => s.layout === 1 && !s.moving, 'first shuffle', 30_000);
  const odd = await page.evaluate(() => window.__peekDebug?.targets() ?? []);
  expect(odd).toHaveLength(1);
  await waitState(page, (s) => s.layout === 2 && !s.moving, 'second shuffle', 30_000);
  expect(Date.now() - t1).toBeGreaterThan(8_000);
  const oddLater = await page.evaluate(() => window.__peekDebug?.targets() ?? []);
  const o = oddLater[0];
  if (!o || !odd[0]) throw new Error('no odd item');
  expect(dist(o, odd[0])).toBeGreaterThan(20);
  await page.mouse.click(o.x, o.y);
  await waitState(page, (s) => s.status === 'won', 'won at the new place');
});

test('memory: the prompt hides after 3 s, a tap on it peeks for a second, a find peeks too', async ({
  page,
}, info) => {
  await page.goto(`${TEST}?level=46&mode=find&twist=memory&reset=1${SALT}${CLOCK}`, {
    waitUntil: 'load',
  });
  const s0 = await waitState(page, (s) => s.status === 'playing', 'playing');
  expect(s0.twist).toBe('memory');
  expect(s0.promptHidden).toBe(false);
  expect(await page.evaluate(() => window.__peekDebug?.twistCenter() ?? null)).toBeNull();
  const hidden = await waitState(page, (s) => s.promptHidden, 'prompt hidden', 10_000);
  expect(hidden.hearts).toBe(3);
  await shot(page, info, 'memory-hidden');
  const prompts = await page.evaluate(() => window.__peekDebug?.promptCenters() ?? []);
  const p = prompts[0];
  if (!p) throw new Error('no prompt icon');
  await page.mouse.click(p.x, p.y);
  const peek = await waitState(page, (s) => !s.promptHidden, 'peek', 5_000);
  expect(peek.hearts).toBe(3);
  expect(peek.remaining).toBe(s0.remaining);
  await shot(page, info, 'memory-peek');
  await waitState(page, (s) => s.promptHidden, 'hidden again', 5_000);
  const t = (await page.evaluate(() => window.__peekDebug?.targets() ?? []))[0];
  if (!t) throw new Error('no target');
  await page.mouse.click(t.x, t.y);
  const found = await waitState(page, (s) => s.remaining === s0.remaining - 1, 'found');
  expect(found.promptHidden).toBe(false);
});

test('the daily chain never has a twist, even when one is forced', async ({ page }) => {
  await page.goto(`${TEST}?daily=1&today=20261018&twist=shuffle&reset=1${CLOCK}`, {
    waitUntil: 'load',
  });
  const s = await waitState(page, (s) => s.status === 'playing', 'daily playing');
  expect(s.dailyIndex).toBe(0);
  expect(s.twist).toBeNull();
  expect(await page.evaluate(() => window.__peekDebug?.twistCenter() ?? null)).toBeNull();
});
