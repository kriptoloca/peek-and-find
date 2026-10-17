import { expect } from '@playwright/test';
import { computeLayout, designSize } from '../../src/game/layout';
import {
  TEST,
  changedShare,
  shot,
  tapTitle,
  test,
  waitState,
  waitTitle,
  type GameState,
} from './helpers';

/**
 * Every link of README.md "Test links" opens clean: no page/console errors, only same-origin
 * requests (the guard fixture), something drawn on the canvas, and the expected screen or
 * scene behind the query. The production link is played: Title → PLAY → scene, judged only by
 * what a player sees (pixels) and what the SDK logs with its own ?debug=true switch.
 */
interface Link {
  path: string;
  kind: 'prod' | 'title' | 'title-play' | 'game' | 'gen';
  check?: (s: GameState) => void;
}

const LINKS: Link[] = [
  { path: '?debug=true', kind: 'prod' },
  { path: `${TEST}?reset=1`, kind: 'title' },
  {
    path: `${TEST}?level=30`,
    kind: 'game',
    check: (s) => {
      expect(s.sceneLevel).toBe(30);
      // the frame takes the theme's hue in play (docs/visual-review.md), navy only on the Title
      expect(s.frameColor).toMatch(/^#[0-9a-f]{6}$/);
      expect(s.frameColor).not.toBe('#1b1f2a');
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

/** Waits until an SDK console line matches (the SDK logs every platform message with ?debug=true). */
async function waitConsole(lines: string[], re: RegExp, timeout: number): Promise<number> {
  const t0 = Date.now();
  for (;;) {
    const n = lines.filter((l) => re.test(l)).length;
    if (n > 0) return n;
    if (Date.now() - t0 > timeout) throw new Error(`console never matched ${String(re)}`);
    await new Promise((r) => setTimeout(r, 100));
  }
}

test('the live site serves the commit this run was started for', async ({ page }) => {
  const expected = process.env.E2E_EXPECT_SHA;
  test.skip(!expected, 'only on the deployed site (E2E_EXPECT_SHA)');
  const res = await page.request.get('version.json', { headers: { 'cache-control': 'no-cache' } });
  expect(res.ok()).toBe(true);
  expect(((await res.json()) as { sha: string }).sha).toBe(expected);
});

for (const link of LINKS) {
  test(`link /${link.path} opens clean`, async ({ page, guard }, info) => {
    await page.goto(link.path, { waitUntil: 'load' });
    await expect(page.locator('canvas')).toBeVisible();
    switch (link.kind) {
      case 'prod': {
        // Production never exposes the dev hooks or the dev menu chunk.
        // the SDK logs each message twice (sendMessage() and the platform_message_sent event)
        const sent = (name: string): RegExp => new RegExp(`sendMessage\\(\\).*${name}`, 'i');
        await waitConsole(guard.console, sent('game_ready'), 30_000);
        expect(await page.evaluate(() => typeof window.__peekDebug)).toBe('undefined');
        expect(await page.evaluate(() => typeof window.__peekTitle)).toBe('undefined');
        expect(guard.console.filter((l) => sent('game_ready').test(l))).toHaveLength(1);
        // PLAY sits where the Title layout puts it: the same pure layout math, no hooks.
        const box = await page.locator('canvas').boundingBox();
        if (!box) throw new Error('no canvas');
        const d = designSize(390, 844);
        const l = computeLayout(d.width, d.height);
        const k = box.width / d.width;
        const before = await page.screenshot();
        await page.mouse.click(
          box.x + (l.scene.x + l.scene.w / 2) * k,
          box.y + (l.scene.y + l.scene.h * 0.48) * k,
        );
        await waitConsole(guard.console, sent('gameplay_started'), 30_000);
        await waitConsole(guard.console, sent('level_started'), 30_000);
        // the lifecycle order the platform expects (CLAUDE.md rule 3, docs/bridge-notes.md)
        const first = (re: RegExp): number => guard.console.findIndex((l) => re.test(l));
        const order = [
          first(sent('in_game_loading_started')),
          first(sent('in_game_loading_stopped')),
          first(sent('game_ready')),
          first(sent('gameplay_started')),
        ];
        expect(order.every((i) => i >= 0)).toBe(true);
        expect([...order].sort((a, b) => a - b)).toEqual(order);
        await page.waitForTimeout(800);
        const after = await page.screenshot({ path: info.outputPath('prod-after-play.png') });
        expect(await changedShare(before, after)).toBeGreaterThan(0.2);
        expect(guard.console.filter((l) => sent('game_ready').test(l))).toHaveLength(1);
        break;
      }
      case 'title': {
        await waitTitle(page);
        // CLAUDE.md rule 3: GameReady exactly once, last, after the loading messages …
        const m = await page.evaluate(() => window.__peekTitle?.messages() ?? []);
        expect(m.filter((x) => x === 'game_ready')).toHaveLength(1);
        expect(m[m.length - 1]).toBe('game_ready');
        expect(m.indexOf('in_game_loading_started')).toBeGreaterThanOrEqual(0);
        expect(m.indexOf('in_game_loading_stopped')).toBeGreaterThan(
          m.indexOf('in_game_loading_started'),
        );
        expect(m.indexOf('game_ready')).toBeGreaterThan(m.indexOf('in_game_loading_stopped'));
        // … and the game is interactive at that moment: the very next tap starts play.
        await tapTitle(page, 'play');
        await waitState(page, (x) => x.status === 'playing', 'playing right after GameReady');
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
    // the Bridge runtime is shipped next to the page, never fetched from a CDN
    expect([...guard.paths].some((p) => p.endsWith('/playgama-bridge.js'))).toBe(true);
  });
}
