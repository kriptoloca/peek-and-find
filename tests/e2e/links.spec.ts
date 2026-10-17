import { expect, test } from '@playwright/test';
import {
  TEST,
  collect,
  expectSameOrigin,
  shot,
  tapTitle,
  waitState,
  waitTitle,
  type GameState,
} from './helpers';

/**
 * Every link of README.md "Test links" opens clean: no page/console errors, only same-origin
 * requests, something drawn on the canvas, and the expected screen or scene behind the query.
 */
interface Link {
  path: string;
  kind: 'prod' | 'title' | 'title-play' | 'game' | 'gen';
  check?: (s: GameState) => void;
}

const LINKS: Link[] = [
  { path: '', kind: 'prod' },
  { path: `${TEST}?reset=1`, kind: 'title' },
  {
    path: `${TEST}?level=30`,
    kind: 'game',
    check: (s) => {
      expect(s.sceneLevel).toBe(30);
    },
  },
  {
    path: `${TEST}?level=12&mode=spot`,
    kind: 'game',
    check: (s) => {
      expect(s.mode).toBe('spot');
      expect(s.hudInBand).toBe(true);
    },
  },
  {
    path: `${TEST}?fakeads=1&adfast=1`,
    kind: 'title-play',
    check: (s) => {
      expect(s.interstitialSupported).toBe(true);
      expect(s.rewardedSupported).toBe(true);
    },
  },
  {
    path: `${TEST}?daily=1`,
    kind: 'game',
    check: (s) => {
      expect(s.dailyIndex).toBe(0);
      expect(s.sceneLevel).toBe(10);
    },
  },
  {
    path: `${TEST}?daily=1&today=20261017`,
    kind: 'game',
    check: (s) => {
      expect(s.dailyIndex).toBe(0);
    },
  },
  { path: `${TEST}#gen`, kind: 'gen' },
];

for (const link of LINKS) {
  test(`link /${link.path} opens clean`, async ({ page, baseURL }, info) => {
    const c = collect(page);
    await page.goto(link.path, { waitUntil: 'load' });
    await expect(page.locator('canvas')).toBeVisible();
    switch (link.kind) {
      case 'prod': {
        await page.waitForTimeout(3000);
        // Production never exposes the dev hooks or the dev menu chunk.
        expect(await page.evaluate(() => typeof window.__peekDebug)).toBe('undefined');
        expect(await page.evaluate(() => typeof window.__peekTitle)).toBe('undefined');
        break;
      }
      case 'title': {
        await waitTitle(page);
        // CLAUDE.md rule 3: GameReady exactly once, last, after the loading messages.
        const m = await page.evaluate(() => window.__peekTitle?.messages() ?? []);
        expect(m.filter((x) => x === 'game_ready')).toHaveLength(1);
        expect(m[m.length - 1]).toBe('game_ready');
        expect(m.indexOf('in_game_loading_started')).toBeGreaterThanOrEqual(0);
        expect(m.indexOf('in_game_loading_stopped')).toBeGreaterThan(
          m.indexOf('in_game_loading_started'),
        );
        expect(m.indexOf('game_ready')).toBeGreaterThan(m.indexOf('in_game_loading_stopped'));
        break;
      }
      case 'title-play': {
        await waitTitle(page);
        await tapTitle(page, 'play');
        const s = await waitState(page, (x) => x.status === 'playing', 'playing');
        link.check?.(s);
        break;
      }
      case 'game': {
        const s = await waitState(page, (x) => x.status === 'playing', 'playing');
        link.check?.(s);
        break;
      }
      case 'gen':
        await page.waitForTimeout(2000);
        break;
    }
    const drawn = await shot(page, info, 'screen');
    expect(drawn, 'canvas shows something').toBeGreaterThan(6);
    expectSameOrigin(c, baseURL);
    expect(c.errors).toEqual([]);
    // the Bridge runtime is shipped next to the page, never fetched from a CDN
    expect([...c.paths].some((p) => p.endsWith('/playgama-bridge.js'))).toBe(true);
  });
}
