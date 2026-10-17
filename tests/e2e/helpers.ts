import { expect, type Page, type TestInfo } from '@playwright/test';
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
 * default (WebGL) renderer, so both paths are covered.
 */
export const CANVAS = '&renderer=canvas';

export interface Collected {
  errors: string[];
  origins: Set<string>;
  paths: Set<string>;
}

/** Records page errors, console errors/warnings and every request's origin. */
export function collect(page: Page): Collected {
  const c: Collected = { errors: [], origins: new Set(), paths: new Set() };
  page.on('pageerror', (e) => c.errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') {
      c.errors.push(`${m.type()}: ${m.text().slice(0, 200)}`);
    }
  });
  page.on('request', (r) => {
    const u = new URL(r.url());
    c.origins.add(u.origin);
    c.paths.add(u.pathname);
  });
  return c;
}

/** CLAUDE.md rule 1: everything comes from the page's own origin. */
export function expectSameOrigin(c: Collected, baseURL: string | undefined): void {
  const origin = new URL(baseURL ?? 'http://127.0.0.1:4173/').origin;
  expect([...c.origins].filter((o) => o !== origin)).toEqual([]);
}

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

export async function titleAudio(page: Page): Promise<ReturnType<PeekTitleDebug['audio']>> {
  const a = await page.evaluate(() => window.__peekTitle?.audio());
  if (!a) throw new Error('title hooks missing');
  return a;
}

export async function tapTitle(page: Page, spot: TitleSpot): Promise<void> {
  const p = (await titlePositions(page))[spot];
  await page.mouse.click(p.x, p.y);
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

/** Saves a screenshot next to the test results and returns how much is drawn (0 = blank). */
export async function shot(page: Page, info: TestInfo, name: string): Promise<number> {
  const file = info.outputPath(`${name}.png`);
  const png = await page.screenshot({ path: file });
  await info.attach(name, { path: file, contentType: 'image/png' });
  const st = await sharp(png).stats();
  return Math.max(...st.channels.map((c) => c.stdev));
}
