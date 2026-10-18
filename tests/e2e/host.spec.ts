import { expect, test as raw, type Frame, type Page } from '@playwright/test';
import { CANVAS, SALT, TEST, test, waitState, type GameState } from './helpers';

/**
 * The game inside a host page, the way Playgama and YouTube embed it. Bridge 2.3.1 pauses the
 * game when its window loses focus (an ad in the parent page, a click outside the iframe) and
 * resumes it on focus, which only comes back with the next tap inside the game
 * (src/platform/bridge.ts RESUME_TAP_GRACE_MS). Sandbox report 2026-10-18: after an ad the
 * board stayed dim until a tap, and that tap cost a heart.
 */

const FRAME_H = 700;

function hostHtml(url: string): string {
  return (
    `<!doctype html><html><body style="margin:0;background:#222">` +
    `<iframe name="game" src="${url}" style="position:absolute;left:0;top:0;width:390px;height:${String(FRAME_H)}px;border:0"></iframe>` +
    `<button id="outside" style="position:absolute;left:0;top:${String(FRAME_H + 20)}px;width:390px;height:100px;font-size:24px">host</button>` +
    `</body></html>`
  );
}

/** Same-origin host page: the game in an iframe at (0,0), a button of the host below it. */
async function host(page: Page, baseURL: string | undefined, query: string): Promise<Frame> {
  const base = baseURL ?? 'http://127.0.0.1:4173/';
  const url = new URL(`${TEST}?${query}`, base).toString();
  // A same-origin document that is not the game (the build's version stamp), then the host page.
  await page.goto(new URL('version.json', base).toString(), { waitUntil: 'load' });
  await page.setContent(hostHtml(url));
  const frame = page.frame({ name: 'game' });
  if (!frame) throw new Error('game frame missing');
  return frame;
}

function frameState(frame: Frame): Promise<GameState | undefined> {
  return frame.evaluate(() => window.__peekDebug?.state());
}

async function waitFrame(
  frame: Frame,
  pred: (s: GameState) => boolean,
  label: string,
  timeout = 40_000,
): Promise<GameState> {
  const t0 = Date.now();
  for (;;) {
    const s = await frameState(frame);
    if (s && pred(s)) return s;
    if (Date.now() - t0 > timeout) {
      throw new Error(`timeout waiting for ${label}: ${JSON.stringify(s)}`);
    }
    await frame.waitForTimeout(100);
  }
}

/** The frame sits at (0,0) in the host, so its screen coordinates are the page's. */
async function winInFrame(page: Page, frame: Frame): Promise<GameState> {
  await waitFrame(frame, (s) => s.status === 'playing' && !s.adInProgress, 'playing');
  for (let k = 0; k < 12; k++) {
    const s = await frameState(frame);
    if (!s || s.status !== 'playing') break;
    const t = await frame.evaluate(() => window.__peekDebug?.targets() ?? []);
    const first = t[0];
    if (!first) break;
    await page.mouse.click(first.x, first.y);
    await page.waitForTimeout(250);
  }
  return waitFrame(frame, (s) => s.status === 'won', 'won');
}

test('host blur pauses the game; the tap that brings focus back is not a game tap', async ({
  page,
  baseURL,
}) => {
  const frame = await host(
    page,
    baseURL,
    `level=5&mode=find&reset=1${SALT.slice(1)}${CANVAS}&fpsmin=1`,
  );
  const s0 = await waitFrame(frame, (s) => s.status === 'playing', 'level 5');
  expect(s0.hearts).toBe(3);
  expect(s0.paused).toBe(false);

  // The host takes focus (an ad in the parent page, a click outside): Bridge reports paused.
  await page.click('#outside');
  await waitFrame(frame, (s) => s.paused, 'paused by blur', 10_000);

  // The player taps a non-target object. On iOS Safari the window focus event (Bridge
  // resumes) lands before Phaser sees the touch; the same order here: focus first, then the
  // tap a few ms later. That tap must only wake the game.
  const wrong = await frame.evaluate(() => window.__peekDebug?.wrong() ?? []);
  const w = wrong[0];
  if (!w) throw new Error('no wrong object');
  await frame.evaluate(() => {
    window.dispatchEvent(new Event('focus'));
  });
  const woke = await waitFrame(frame, (s) => !s.paused, 'resumed', 10_000);
  expect(woke.inputEnabled).toBe(false);
  await page.mouse.click(w.x, w.y);
  await page.waitForTimeout(150);
  const after = await frameState(frame);
  expect(after?.hearts).toBe(3);
  expect(after?.status).toBe('playing');

  // After the grace a wrong tap counts again.
  await waitFrame(frame, (s) => s.inputEnabled, 'grace over', 10_000);
  await page.mouse.click(w.x, w.y);
  const counted = await waitFrame(frame, (s) => s.hearts === 2, 'wrong tap counted', 10_000);
  expect(counted.paused).toBe(false);
});

test('an ad that took the focus ends: the game asks for it back and resumes by itself', async ({
  page,
  baseURL,
}) => {
  const frame = await host(
    page,
    baseURL,
    `level=5&mode=find&fakeads=1&adfast=1&reset=1${SALT.slice(1)}${CANVAS}&fpsmin=1`,
  );
  await waitFrame(frame, (s) => s.status === 'playing', 'level 5');
  for (let i = 0; i < 3; i++) {
    await winInFrame(page, frame);
    if (i < 2) await waitFrame(frame, (s) => s.level === 6 + i && s.status === 'playing', 'next');
  }
  await waitFrame(frame, (s) => s.adInProgress, 'interstitial', 20_000);
  // The ad lives in the host page and takes the focus from the game.
  await page.click('#outside');
  await waitFrame(frame, (s) => s.paused, 'paused during the ad', 10_000);
  expect(await page.evaluate(() => document.activeElement?.id)).toBe('outside');

  // The ad ends: nobody taps the game, yet the next scene must start unfrozen.
  const next = await waitFrame(
    frame,
    (s) => s.level === 8 && s.status === 'playing' && !s.paused && !s.adInProgress,
    'resumed after the ad without a tap',
    20_000,
  );
  expect(next.hearts).toBe(3);
  expect(await frame.evaluate(() => document.hasFocus())).toBe(true);
});

test('the Game scene may start while the host holds the pause', async ({ page, baseURL }) => {
  const url = new URL(
    `${TEST}?level=5&mode=find&reset=1${SALT}${CANVAS}&fpsmin=1`,
    baseURL ?? 'http://127.0.0.1:4173/',
  ).toString();
  // Hold the atlas images: Boot (which initialises the SDK first) cannot start the Game scene
  // before the host took the focus.
  let release: () => void = () => undefined;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/atlases/*.png', async (route) => {
    await held;
    await route.continue();
  });
  await page.goto(url, { waitUntil: 'load' });
  // The host takes the focus while the game still loads (Bridge: blur → paused).
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const w = window as unknown as {
            bridge?: { isInitialized?: boolean; platform?: { isPaused?: boolean } };
          };
          if (!w.bridge?.isInitialized) return false;
          window.dispatchEvent(new Event('blur'));
          return w.bridge.platform?.isPaused ?? false;
        }),
      { timeout: 30_000 },
    )
    .toBe(true);
  expect(await page.evaluate(() => typeof window.__peekDebug)).toBe('undefined');
  release();
  // The scene starts frozen under the dim (it used to crash in create()), then resumes.
  const started = await waitState(page, (s) => s.paused && s.level === 5, 'started paused');
  expect(started.status).toBe('intro');
  await page.evaluate(() => {
    window.dispatchEvent(new Event('focus'));
  });
  const resumed = await waitState(page, (s) => !s.paused && s.status === 'playing', 'resumed');
  expect(resumed.hearts).toBe(3);
});

/**
 * Cross-origin host (localhost against 127.0.0.1): the browser may refuse the focus request
 * after the ad. Whether it does or not, the first tap inside the game is never a game tap.
 */
const CROSS_HOST = 'http://localhost:4173/';

raw(
  'cross-origin host: an ad that took the focus ends, the wake tap is free',
  async ({ page, baseURL }) => {
    raw.skip(Boolean(process.env.E2E_BASE_URL), 'needs the local preview server on two origins');
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const query = `level=5&mode=find&fakeads=1&adfast=1&reset=1${SALT}${CANVAS}&fpsmin=1`;
    const url = new URL(`${TEST}?${query}`, baseURL ?? 'http://127.0.0.1:4173/').toString();
    await page.goto(new URL('version.json', CROSS_HOST).toString(), { waitUntil: 'load' });
    await page.setContent(hostHtml(url));
    const frame = page.frame({ name: 'game' });
    if (!frame) throw new Error('game frame missing');
    await waitFrame(frame, (s) => s.status === 'playing', 'level 5');
    for (let i = 0; i < 3; i++) {
      await winInFrame(page, frame);
      if (i < 2) await waitFrame(frame, (s) => s.level === 6 + i && s.status === 'playing', 'next');
    }
    await waitFrame(frame, (s) => s.adInProgress, 'interstitial', 20_000);
    await page.click('#outside');
    await waitFrame(frame, (s) => s.paused, 'paused during the ad', 10_000);
    const next = await waitFrame(frame, (s) => s.level === 8 && !s.adInProgress, 'ad over', 20_000);
    expect(next.hearts).toBe(3);
    await page.waitForTimeout(300);
    const selfResumed = (await frameState(frame))?.paused === false;
    raw
      .info()
      .annotations.push({ type: 'self-resume after the ad', description: String(selfResumed) });
    const wrong = await frame.evaluate(() => window.__peekDebug?.wrong() ?? []);
    const w = wrong[0];
    if (!w) throw new Error('no wrong object');
    if (!selfResumed) {
      // The wake tap: focus returns, Bridge resumes, the tap itself is swallowed by the grace.
      await page.mouse.click(w.x, w.y);
      const woken = await waitFrame(frame, (s) => !s.paused, 'woken by the tap', 10_000);
      expect(woken.hearts).toBe(3);
    }
    await waitFrame(frame, (s) => s.inputEnabled && s.status === 'playing', 'grace over', 10_000);
    await page.mouse.click(w.x, w.y);
    const counted = await waitFrame(frame, (s) => s.hearts === 2, 'wrong tap counted', 10_000);
    expect(counted.paused).toBe(false);
    expect(errors).toEqual([]);
  },
);
