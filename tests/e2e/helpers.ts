import { expect, test as base, type Page, type TestInfo } from '@playwright/test';
import sharp from 'sharp';
import type { PeekDebug, PeekTitleDebug } from '../../src/dev/debug';

export type GameState = ReturnType<PeekDebug['state']>;
export type TitleSpot = keyof ReturnType<PeekTitleDebug['positions']>;

/** Published path of the development-mode build (dev shortcuts, debug hooks). */
export const TEST = 'test/';
/**
 * Flows that wait on Phaser timers (intro, auto-advance, stars) run on the Canvas renderer:
 * CI machines have no GPU and SwiftShader WebGL drops to a few fps, where Phaser caps the
 * delta per frame and its clock falls far behind the wall clock. The links suite keeps the
 * default (WebGL) renderer, and one player-path test runs WebGL with `?fpsmin=1`.
 */
export const CANVAS = '&renderer=canvas';
/** Pins the per-player seed salt, so a failing scene can be reproduced (dev builds). */
export const SALT = '&salt=7';

export interface Collected {
  errors: string[];
  origins: Set<string>;
  paths: Set<string>;
  /** Every console line (the SDK's own log with ?debug=true, dev warnings). */
  console: string[];
}

/** Console warnings the development build emits on purpose. */
const EXPECTED_WARNINGS = [/peek: \?mode=spot refused/];

/** Records page errors, console errors/warnings and every request's origin. */
export function collect(page: Page): Collected {
  const c: Collected = { errors: [], origins: new Set(), paths: new Set(), console: [] };
  page.on('pageerror', (e) => c.errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    const text = m.text();
    c.console.push(text);
    if (m.type() === 'error' || m.type() === 'warning') {
      if (!EXPECTED_WARNINGS.some((re) => re.test(text))) {
        c.errors.push(`${m.type()}: ${text.slice(0, 200)}`);
      }
    }
  });
  page.on('request', (r) => {
    const u = new URL(r.url());
    c.origins.add(u.origin);
    c.paths.add(u.pathname);
  });
  page.on('websocket', (ws) => c.errors.push(`websocket: ${ws.url()}`));
  page.on('requestfailed', (r) => {
    // a navigation cancels the previous page's requests; that is not a failed asset
    if (r.failure()?.errorText === 'net::ERR_ABORTED') return;
    c.errors.push(`requestfailed: ${r.url()} ${r.failure()?.errorText ?? ''}`);
  });
  return c;
}

/** CLAUDE.md rule 1: everything comes from the page's own origin. */
export function expectSameOrigin(c: Collected, baseURL: string | undefined): void {
  const origin = new URL(baseURL ?? 'http://127.0.0.1:4173/').origin;
  expect([...c.origins].filter((o) => o !== origin)).toEqual([]);
}

/**
 * Every test gets the collector automatically and ends with the same-origin and no-error
 * checks, so a stray request or console error fails whichever test caused it.
 */
export const test = base.extend<{ guard: Collected }>({
  guard: [
    async ({ page, baseURL }, use) => {
      const c = collect(page);
      await use(c);
      expectSameOrigin(c, baseURL);
      expect(c.errors).toEqual([]);
    },
    { auto: true },
  ],
});

export function state(page: Page): Promise<GameState | undefined> {
  return page.evaluate(() => window.__peekDebug?.state());
}

/** Polls the dev state until `pred` holds (Phaser's clock lags headless, so poll, never sleep). */
export async function waitState(
  page: Page,
  pred: (s: GameState) => boolean,
  label: string,
  timeout = 40_000,
): Promise<GameState> {
  const t0 = Date.now();
  for (;;) {
    const s = await state(page);
    if (s && pred(s)) return s;
    if (Date.now() - t0 > timeout) {
      throw new Error(`timeout waiting for ${label}: ${JSON.stringify(s)}`);
    }
    await page.waitForTimeout(100);
  }
}

export async function waitTitle(page: Page, timeout = 30_000): Promise<void> {
  await page.waitForFunction(() => typeof window.__peekTitle !== 'undefined', null, { timeout });
}

export async function titlePositions(page: Page): Promise<ReturnType<PeekTitleDebug['positions']>> {
  const p = await page.evaluate(() => window.__peekTitle?.positions());
  if (!p) throw new Error('title hooks missing');
  return p;
}

export async function titleState(page: Page): Promise<ReturnType<PeekTitleDebug['state']>> {
  const s = await page.evaluate(() => window.__peekTitle?.state());
  if (!s) throw new Error('title hooks missing');
  return s;
}

export async function titleAudio(page: Page): Promise<ReturnType<PeekTitleDebug['audio']>> {
  const a = await page.evaluate(() => window.__peekTitle?.audio());
  if (!a) throw new Error('title hooks missing');
  return a;
}

export async function tapTitle(page: Page, spot: TitleSpot): Promise<void> {
  const p = (await titlePositions(page))[spot];
  await page.mouse.click(p.x, p.y);
}

/** Taps a HUD/overlay button at the screen position the dev hook reports (a real tap). */
export async function tapButton(
  page: Page,
  which: 'pauseCenter' | 'hintCenter' | 'retryCenter' | 'continueCenter',
): Promise<void> {
  const p = await page.evaluate((w) => window.__peekDebug?.[w](), which);
  if (!p) throw new Error(`${which}: no button on screen`);
  await page.mouse.click(p.x, p.y);
}

/** Taps a button of the in-game menu (GDD v1.6); the menu must be open. */
export async function tapMenu(
  page: Page,
  which: 'resume' | 'sound' | 'music' | 'home',
): Promise<void> {
  const m = await page.evaluate(() => window.__peekDebug?.menu() ?? null);
  if (!m) throw new Error(`${which}: the menu is not open`);
  await page.mouse.click(m[which].x, m[which].y);
}

/** Opens the in-game menu with the HUD pause button and waits for it. */
export async function openMenu(page: Page): Promise<GameState> {
  await tapButton(page, 'pauseCenter');
  return waitState(page, (s) => s.menuOpen, 'menu open', 10_000);
}

/** Taps the remaining targets of the current scene until it is won. */
export async function winScene(page: Page): Promise<GameState> {
  await waitState(page, (s) => s.status === 'playing' && !s.adInProgress, 'playing');
  for (let k = 0; k < 12; k++) {
    const s = await state(page);
    if (!s || s.status !== 'playing') break;
    const t = await page.evaluate(() => window.__peekDebug?.targets() ?? []);
    const first = t[0];
    if (!first) break;
    await page.mouse.click(first.x, first.y);
    await page.waitForTimeout(250);
  }
  return waitState(page, (s) => s.status === 'won', 'won');
}

/** One wrong tap (a non-target object); returns the state after it. */
export async function wrongTap(page: Page): Promise<GameState> {
  const w = await page.evaluate(() => window.__peekDebug?.wrong() ?? []);
  const first = w[0];
  if (!first) throw new Error('no wrong object to tap');
  await page.mouse.click(first.x, first.y);
  await page.waitForTimeout(300);
  const s = await state(page);
  if (!s) throw new Error('state missing');
  return s;
}

/** Taps non-target objects until the round is lost (three hearts). */
export async function loseScene(page: Page): Promise<GameState> {
  for (let k = 0; k < 6; k++) {
    const s = await state(page);
    if (!s || s.status !== 'playing') break;
    const w = await page.evaluate(() => window.__peekDebug?.wrong() ?? []);
    const first = w[k % Math.max(1, w.length)];
    if (!first) break;
    await page.mouse.click(first.x, first.y);
    await page.waitForTimeout(300);
  }
  return waitState(page, (s) => s.status === 'lost', 'lost');
}

/**
 * Hides or shows the page the way the host does: the Bridge SDK listens to visibilitychange
 * and flips its pause and audio state, which is the real path into the game's pause handling.
 */
export async function setHidden(page: Page, hidden: boolean): Promise<void> {
  await page.evaluate((h) => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => (h ? 'hidden' : 'visible'),
    });
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => h });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
}

/** Mean luminance (0–255) of a screenshot: the pause dim must darken the screen visibly. */
export async function meanLuma(png: Buffer): Promise<number> {
  const st = await sharp(png).removeAlpha().stats();
  const [r, g, b] = st.channels.map((c) => c.mean) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Flips the SDK's own audio state (what the YouTube adapter's onAudioEnabledChange feeds), so
 * "platform mute wins" is tested without a pause. Reaches into the pinned Bridge 2.3.1 runtime.
 */
export async function setSdkAudio(page: Page, enabled: boolean): Promise<void> {
  await page.evaluate((on) => {
    const w = window as unknown as {
      bridge: { platform: { _platformBridge: { _setAudioState: (v: boolean) => void } } };
    };
    w.bridge.platform._platformBridge._setAudioState(on);
  }, enabled);
}

/** Saves a screenshot next to the test results and returns how much is drawn (0 = blank). */
export async function shot(page: Page, info: TestInfo, name: string): Promise<number> {
  const file = info.outputPath(`${name}.png`);
  const png = await page.screenshot({ path: file });
  await info.attach(name, { path: file, contentType: 'image/png' });
  const st = await sharp(png).stats();
  return Math.max(...st.channels.map((c) => c.stdev));
}

/** Share of pixels that differ noticeably between two same-size screenshots. */
export async function changedShare(a: Buffer, b: Buffer): Promise<number> {
  const [ra, rb] = await Promise.all(
    [a, b].map((p) => sharp(p).removeAlpha().raw().toBuffer({ resolveWithObject: true })),
  );
  if (!ra || !rb || ra.info.width !== rb.info.width || ra.info.height !== rb.info.height) {
    throw new Error('screenshots differ in size');
  }
  const n = ra.info.width * ra.info.height;
  let changed = 0;
  for (let i = 0; i < n; i++) {
    const d = Math.max(
      Math.abs((ra.data[i * 3] ?? 0) - (rb.data[i * 3] ?? 0)),
      Math.abs((ra.data[i * 3 + 1] ?? 0) - (rb.data[i * 3 + 1] ?? 0)),
      Math.abs((ra.data[i * 3 + 2] ?? 0) - (rb.data[i * 3 + 2] ?? 0)),
    );
    if (d > 32) changed += 1;
  }
  return changed / n;
}
