import { expect, type Page } from '@playwright/test';
import {
  CANVAS,
  SALT,
  TEST,
  openMenu,
  setHidden,
  shot,
  state,
  tapButton,
  tapMenu,
  test,
  waitState,
  wrongTap,
  type GameState,
} from './helpers';

/**
 * Feel pass (GDD v1.8 §3a, `pebblit-game-craft`): the right move is the loudest moment, failure
 * stays local and soft, the found object leaves the board and lands in the HUD, the last find
 * gets its own beat before the win. The dev state carries a feel log (scene clock), what the HUD
 * shows, the flights in the air and every camera shake started (from the camera's own event),
 * so the cascade order is checked without guessing frames. Canvas + `?fpsmin=1` keep the scene
 * clock on wall-clock time on the GPU-less CI machine (see twists.spec); `?feelslow=8` stretches
 * the feel timings (hit stop 360 ms, flight 3.8 s, beat 1.6 s) where a test must act inside one,
 * so no test depends on the machine's speed.
 */
const CLOCK = `${CANVAS}&fpsmin=1`;
const NO_TWIST = '&twist=none';
const SLOW = '&feelslow=8';

type Feel = GameState['feel'][number];

function feelAt(s: GameState, level: number, kind?: Feel['kind']): Feel[] {
  return s.feel.filter((e) => e.level === level && (kind === undefined || e.kind === kind));
}

async function firstTarget(page: Page): Promise<{ x: number; y: number }> {
  const t = await page.evaluate(() => window.__peekDebug?.targets() ?? []);
  const first = t[0];
  if (!first) throw new Error('no target left');
  return first;
}

async function findOne(page: Page): Promise<void> {
  const t = await firstTarget(page);
  await page.mouse.click(t.x, t.y);
}

async function now(page: Page): Promise<GameState> {
  const s = await state(page);
  if (!s) throw new Error('state missing');
  return s;
}

test('a correct tap: the object leaves the board, flies into its icon, the count drops on arrival', async ({
  page,
}, info) => {
  await page.goto(`${TEST}?level=9&mode=find&reset=1${SALT}${CLOCK}${NO_TWIST}`, {
    waitUntil: 'load',
  });
  const s0 = await waitState(page, (s) => s.status === 'playing', 'level 9');
  expect(s0.remaining).toBeGreaterThanOrEqual(2);
  expect(s0.hudRemaining).toBe(s0.remaining);
  await shot(page, info, 'before-find');

  await findOne(page);
  const tapped = await waitState(
    page,
    (s) => feelAt(s, 9, 'correct').length === 1,
    'correct logged',
    10_000,
  );
  // The rules count the find at once and the object is off the board at once...
  expect(tapped.remaining).toBe(s0.remaining - 1);
  expect(tapped.onBoard).toBe(s0.onBoard - 1);
  expect(tapped.shakeStarts).toBe(s0.shakeStarts + 1);
  const correct = feelAt(tapped, 9, 'correct')[0] as Feel;
  expect(correct.step).toBe(0);
  expect(correct.detune).toBe(0);
  expect(correct.shake).toBeGreaterThan(0);

  // ...while the HUD counts down only when the flight lands.
  const landed = await waitState(
    page,
    (s) => feelAt(s, 9, 'arrive').length === 1,
    'arrival logged',
    10_000,
  );
  const arrive = feelAt(landed, 9, 'arrive')[0] as Feel;
  expect(arrive.t - correct.t).toBeGreaterThanOrEqual(300);
  expect(landed.hudRemaining).toBe(s0.remaining - 1);
  expect(landed.flights).toBe(0);
  expect(landed.timeScale).toBe(1);
  expect(landed.audio.played).toContain('tap_correct_1');
  expect(landed.audio.played).toContain('sparkle');
  await shot(page, info, 'after-find');
});

test('mid-flight: the object is off the board and on its way to the HUD', async ({
  page,
}, info) => {
  await page.goto(`${TEST}?level=9&mode=find&reset=1${SALT}${CLOCK}${NO_TWIST}${SLOW}`, {
    waitUntil: 'load',
  });
  const s0 = await waitState(page, (s) => s.status === 'playing', 'level 9');
  await findOne(page);
  const flying = await waitState(page, (s) => s.flights === 1, 'in the air', 5_000);
  expect(flying.onBoard).toBe(s0.onBoard - 1);
  expect(flying.hudRemaining).toBe(s0.remaining);
  // About three quarters into the stretched flight (ease-in: the object is on its way by then).
  await page.waitForTimeout(3300);
  await shot(page, info, 'mid-flight');
  await waitState(
    page,
    (s) => s.flights === 0 && s.hudRemaining === s0.remaining - 1,
    'landed',
    10_000,
  );
});

test('combo: pitch and kick rise with finds in a row; a wrong tap is quiet, unshaken and resets it', async ({
  page,
}) => {
  await page.goto(`${TEST}?level=100&mode=find&reset=1${SALT}${CLOCK}${NO_TWIST}`, {
    waitUntil: 'load',
  });
  const s0 = await waitState(page, (s) => s.status === 'playing', 'level 100');
  expect(s0.remaining).toBeGreaterThanOrEqual(4);

  for (let i = 0; i < 3; i++) {
    await findOne(page);
    await waitState(page, (s) => feelAt(s, 100, 'correct').length === i + 1, `find ${String(i)}`);
    await page.waitForTimeout(250);
  }
  const s3 = await now(page);
  const three = feelAt(s3, 100, 'correct');
  expect(three.map((e) => e.step)).toEqual([0, 1, 2]);
  expect(three.map((e) => e.detune)).toEqual([0, 200, 400]);
  const shakes = three.map((e) => e.shake as number);
  expect(shakes[1]).toBeGreaterThan(shakes[0] as number);
  expect(shakes[2]).toBeGreaterThan(shakes[1] as number);
  // Every find started its own kick (a fast follow-up restarts it at the stronger step).
  expect(s3.shakeStarts).toBe(s0.shakeStarts + 3);

  const wrong = await wrongTap(page);
  expect(wrong.hearts).toBe(2);
  // No camera shake from the wrong tap, whoever would start it (the camera's own event).
  expect(wrong.shakeStarts).toBe(s3.shakeStarts);
  const w = feelAt(wrong, 100, 'wrong').at(-1) as Feel;
  expect(w.lost).toBe(false);
  expect(wrong.audio.played).toContain('tap_wrong');
  expect(wrong.audio.played).not.toContain('heart_lose');

  await findOne(page);
  const after = await waitState(page, (s) => feelAt(s, 100, 'correct').length === 4, 'find after');
  expect((feelAt(after, 100, 'correct').at(-1) as Feel).step).toBe(0);
});

test('only the losing tap adds the heart sound, and it shakes nothing', async ({ page }) => {
  await page.goto(`${TEST}?level=9&mode=find&hearts=1&reset=1${SALT}${CLOCK}${NO_TWIST}`, {
    waitUntil: 'load',
  });
  const s0 = await waitState(page, (s) => s.status === 'playing' && s.hearts === 1, 'one heart');
  const lost = await wrongTap(page);
  expect(lost.status).toBe('lost');
  const done = await waitState(
    page,
    (s) => s.audio.played.includes('heart_lose'),
    'heart sound on the losing tap',
    5_000,
  );
  expect(done.shakeStarts).toBe(s0.shakeStarts);
  expect((feelAt(done, 9, 'wrong').at(-1) as Feel).lost).toBe(true);
});

test('the last find lands first; the win comes a beat later and keeps its stars', async ({
  page,
}, info) => {
  await page.goto(`${TEST}?level=9&mode=find&reset=1${SALT}${CLOCK}${NO_TWIST}`, {
    waitUntil: 'load',
  });
  const s0 = await waitState(page, (s) => s.status === 'playing', 'level 9');
  for (let i = 0; i < s0.remaining; i++) {
    await findOne(page);
    await waitState(page, (s) => feelAt(s, 9, 'correct').length === i + 1, `find ${String(i)}`);
  }
  const won = await waitState(page, (s) => s.overlay === 'won', 'win overlay', 10_000);
  const lastCorrect = feelAt(won, 9, 'correct').at(-1) as Feel;
  const lastArrive = feelAt(won, 9, 'arrive').at(-1) as Feel;
  const win = feelAt(won, 9, 'win').at(-1) as Feel;
  expect(feelAt(won, 9, 'arrive')).toHaveLength(s0.remaining);
  // The win waits for the landing, then a beat (WIN_BEAT_MS = 200 ms, scene clock).
  expect(win.t - lastArrive.t).toBeGreaterThanOrEqual(180);
  expect(win.t - lastCorrect.t).toBeGreaterThanOrEqual(600);
  expect(won.stars).toBe(3);
  expect(won.hudRemaining).toBe(0);
  await shot(page, info, 'win');
});

test('during the beat: no pause menu, taps change nothing, the star timer stopped at the tap', async ({
  page,
}) => {
  await page.goto(`${TEST}?level=9&mode=find&reset=1${SALT}${CLOCK}${NO_TWIST}${SLOW}`, {
    waitUntil: 'load',
  });
  const s0 = await waitState(page, (s) => s.status === 'playing', 'level 9');
  const others = await page.evaluate(() => window.__peekDebug?.wrong() ?? []);
  const other = others[0];
  if (!other) throw new Error('no other object');
  for (let i = 0; i < s0.remaining; i++) {
    await findOne(page);
    await waitState(page, (s) => feelAt(s, 9, 'correct').length === i + 1, `find ${String(i)}`);
  }
  const atWin = await now(page);
  expect(atWin.status).toBe('won');
  expect(atWin.overlay).toBeNull();
  expect(atWin.flights).toBeGreaterThan(0);

  await tapButton(page, 'pauseCenter');
  await page.mouse.click(other.x, other.y);
  await page.waitForTimeout(300);
  const during = await now(page);
  expect(during.overlay).toBeNull();
  expect(during.menuOpen).toBe(false);
  expect(during.hearts).toBe(atWin.hearts);
  expect(feelAt(during, 9, 'wrong')).toHaveLength(0);

  const won = await waitState(page, (s) => s.overlay === 'won', 'win overlay', 15_000);
  expect(won.elapsed).toBe(atWin.elapsed);
  expect(feelAt(won, 9, 'win')).toHaveLength(1);
});

test('the pause menu freezes a flight; it lands after Resume', async ({ page }) => {
  await page.goto(`${TEST}?level=9&mode=find&reset=1${SALT}${CLOCK}${NO_TWIST}${SLOW}`, {
    waitUntil: 'load',
  });
  const s0 = await waitState(page, (s) => s.status === 'playing', 'level 9');
  await findOne(page);
  await openMenu(page);
  await page.waitForTimeout(4500); // longer than the whole stretched flight
  const still = await now(page);
  expect(feelAt(still, 9, 'arrive')).toHaveLength(0);
  expect(still.flights).toBe(1);
  expect(still.hudRemaining).toBe(s0.remaining);
  await tapMenu(page, 'resume');
  const landed = await waitState(
    page,
    (s) => feelAt(s, 9, 'arrive').length === 1,
    'landed',
    10_000,
  );
  expect(landed.hudRemaining).toBe(s0.remaining - 1);
  expect(landed.timeScale).toBe(1);
});

test('a platform pause inside the hit stop: the restore resumes nothing, the flight waits', async ({
  page,
}) => {
  await page.goto(`${TEST}?level=9&mode=find&reset=1${SALT}${CLOCK}${NO_TWIST}${SLOW}`, {
    waitUntil: 'load',
  });
  await waitState(page, (s) => s.status === 'playing', 'level 9');
  await findOne(page);
  await setHidden(page, true);
  const inStop = await waitState(page, (s) => s.paused, 'paused');
  // Still inside the stretched hit stop (360 ms): the pause landed in it.
  expect(inStop.timeScale).toBe(0);
  await page.waitForTimeout(1000);
  const later = await now(page);
  // The wall-clock restore ran under the pause, but tweens stay frozen: nothing landed.
  expect(later.paused).toBe(true);
  expect(later.timeScale).toBe(1);
  expect(later.flights).toBe(1);
  expect(feelAt(later, 9, 'arrive')).toHaveLength(0);
  await setHidden(page, false);
  const back = await waitState(
    page,
    (s) => !s.paused && feelAt(s, 9, 'arrive').length === 1,
    'resumed and landed',
    10_000,
  );
  expect(back.timeScale).toBe(1);
  expect(back.status).toBe('playing');
});

test('a rotation mid-flight lands the flight at once instead of flying to an empty spot', async ({
  page,
}) => {
  await page.goto(`${TEST}?level=9&mode=find&reset=1${SALT}${CLOCK}${NO_TWIST}${SLOW}`, {
    waitUntil: 'load',
  });
  const s0 = await waitState(page, (s) => s.status === 'playing', 'level 9');
  await findOne(page);
  await waitState(page, (s) => s.flights === 1, 'in the air', 5_000);
  await page.setViewportSize({ width: 844, height: 390 });
  const landed = await waitState(page, (s) => s.flights === 0, 'landed on rotate', 2_000);
  expect(landed.hudRemaining).toBe(s0.remaining - 1);
  expect(feelAt(landed, 9, 'arrive')).toHaveLength(1);
  expect(landed.status).toBe('playing');
});

test('Spot 5: the difference stays in the picture, a token flies from the tapped image', async ({
  page,
}) => {
  await page.goto(`${TEST}?level=15&mode=spot&reset=1${SALT}${CLOCK}`, { waitUntil: 'load' });
  const s0 = await waitState(page, (s) => s.status === 'playing' && s.mode === 'spot', 'spot');
  const diffs = await page.evaluate(() => window.__peekDebug?.differences() ?? []);
  const [d1, d2] = diffs;
  if (!d1 || !d2) throw new Error('no differences');
  await page.mouse.click(d1.a.x, d1.a.y);
  const one = await waitState(
    page,
    (s) => feelAt(s, s0.sceneLevel, 'arrive').length === 1,
    'token from A landed',
  );
  expect(one.remaining).toBe(s0.remaining - 1);
  expect(one.onBoard).toBe(s0.onBoard);
  expect(one.hudRemaining).toBe(s0.remaining - 1);
  await page.mouse.click(d2.b.x, d2.b.y);
  const two = await waitState(
    page,
    (s) => feelAt(s, s0.sceneLevel, 'arrive').length === 2,
    'token from B landed',
  );
  expect(two.hudRemaining).toBe(s0.remaining - 2);
});
