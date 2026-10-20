#!/usr/bin/env node
// REPL driver for Peek & Find, a Phaser canvas game: commands on stdin -> Playwright Chromium.
// The game draws everything on one <canvas>, so there is nothing to click by selector. Every tap
// goes to the screen position that the development build's hooks report (window.__peekTitle on
// the title screen, window.__peekDebug in a scene); those hooks exist only in dev builds
// (`npm run dev`, or dist/test/ from `npm run build:test`).
//
// Agents: pipe a script (`node driver.mjs <<'EOF' ... EOF`) or run it under tmux and send lines.
// Each command prints one result line starting with "ok", "ERROR" or the requested data; the
// prompt "driver>" follows every command, so a tmux poll can wait for it.
import { chromium } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';

const BASE = process.env.PEEK_URL ?? 'http://127.0.0.1:5173/';
const SHOTS = process.env.SCREENSHOT_DIR ?? '/tmp/shots';
// Canvas by default: headless Chromium has no GPU, SwiftShader WebGL runs at a few fps and the
// game's clock (intro, auto-advance, stars) then falls far behind the wall clock.
const RENDERER = process.env.PEEK_RENDERER ?? 'canvas';
fs.mkdirSync(SHOTS, { recursive: true });

let browser = null;
let page = null;
const errors = [];
// scenesPlayed at the moment of the last win: the game advances by itself ~1.6 s (game clock)
// after a win, so reading the counter later (after a screenshot, say) already sees the next scene.
let wonAt = null;

const out = (...a) => console.log(...a);
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

function url(query = '') {
  const q = query.startsWith('?') || query === '' ? query : `?${query}`;
  const params = new URLSearchParams(q.slice(1));
  if (RENDERER === 'canvas' && !params.has('renderer')) params.set('renderer', 'canvas');
  const s = params.toString();
  return BASE + (s ? `?${s}` : '');
}

function need() {
  if (!page) throw new Error('no page: run "open" first');
}

const gameState = () => page.evaluate(() => window.__peekDebug?.state() ?? null);
const titleHooks = () =>
  page.evaluate(() =>
    window.__peekTitle
      ? { positions: window.__peekTitle.positions(), state: window.__peekTitle.state() }
      : null,
  );

// Polls instead of sleeping: Phaser's clock lags in headless Chromium.
async function waitState(pred, label, timeout = 40_000) {
  const t0 = Date.now();
  for (;;) {
    const s = await gameState();
    if (s && pred(s)) return s;
    if (Date.now() - t0 > timeout) throw new Error(`timeout waiting for ${label}`);
    await pause(100);
  }
}

function summary(s) {
  if (!s) return 'no scene (title screen or loading)';
  const keys = [
    'level',
    'mode',
    'theme',
    'status',
    'remaining',
    'hearts',
    'stars',
    'overlay',
    'twist',
    'menuOpen',
    'paused',
    'inputEnabled',
    'adsShown',
    'renderer',
    'fps',
  ];
  return keys.map((k) => `${k}=${JSON.stringify(s[k])}`).join(' ');
}

async function tapAt(x, y) {
  await page.mouse.click(x, y);
}

const COMMANDS = {
  help() {
    out('commands:', Object.keys(COMMANDS).join(', '));
  },

  /** open [query]  e.g. open reset=1  |  open level=12&mode=odd  |  open fakeads=1&adfast=1 */
  async open(query) {
    if (!browser) {
      browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--use-gl=angle',
          '--use-angle=swiftshader',
          '--enable-unsafe-swiftshader',
          '--autoplay-policy=no-user-gesture-required',
        ],
      });
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      page = await ctx.newPage();
      page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
      page.on('console', (m) => {
        if (m.type() === 'error' || m.type() === 'warning') {
          errors.push(`${m.type()}: ${m.text().slice(0, 200)}`);
        }
      });
    }
    const target = url(query ?? '');
    await page.goto(target);
    try {
      await page.waitForFunction(
        () =>
          typeof window.__peekTitle !== 'undefined' || typeof window.__peekDebug !== 'undefined',
        null,
        { timeout: 30_000 },
      );
    } catch {
      throw new Error(
        `no dev hooks after 30 s at ${target}: a production build has none; ` +
          'use "npm run dev" (port 5173) or dist/test/ from "npm run build:test"',
      );
    }
    const onTitle = await page.evaluate(() => typeof window.__peekTitle !== 'undefined');
    out(`ok opened ${target} -> ${onTitle ? 'title screen' : 'scene'}`);
  },

  async ss(name) {
    need();
    const file = path.join(SHOTS, `${name || `ss-${Date.now()}`}.png`);
    await page.screenshot({ path: file });
    out(`ok screenshot ${file}`);
  },

  async title() {
    need();
    const t = await titleHooks();
    out(t ? JSON.stringify(t) : 'ERROR not on the title screen');
  },

  /** tap-title play|daily|sound|music */
  async 'tap-title'(spot) {
    need();
    const t = await titleHooks();
    if (!t) throw new Error('not on the title screen');
    const p = t.positions[spot || 'play'];
    if (!p) throw new Error(`no title button "${spot}"`);
    await tapAt(p.x, p.y);
    out(`ok tapped title ${spot || 'play'} at ${Math.round(p.x)},${Math.round(p.y)}`);
  },

  /** Title -> Play -> waits until a scene is playing. */
  async play() {
    await COMMANDS['tap-title']('play');
    const s = await waitState((x) => x.status === 'playing', 'a scene in play');
    out(`ok playing ${summary(s)}`);
  },

  async state() {
    need();
    out(summary(await gameState()));
  },

  async targets() {
    need();
    const t = await page.evaluate(() => window.__peekDebug?.targets() ?? []);
    out(JSON.stringify(t.map((p) => ({ id: p.id, x: Math.round(p.x), y: Math.round(p.y) }))));
  },

  /** One correct tap on the first remaining target. */
  async find() {
    need();
    const t = await page.evaluate(() => window.__peekDebug?.targets() ?? []);
    if (!t[0]) throw new Error('no target left');
    await tapAt(t[0].x, t[0].y);
    await pause(300);
    out(`ok found ${t[0].id}; ${summary(await gameState())}`);
  },

  /** Taps every remaining target, then waits for the win. */
  async win() {
    need();
    await waitState((s) => s.status === 'playing' && !s.adInProgress, 'playing');
    for (let k = 0; k < 15; k++) {
      const s = await gameState();
      if (!s || s.status !== 'playing') break;
      const t = await page.evaluate(() => window.__peekDebug?.targets() ?? []);
      if (!t[0]) break;
      await tapAt(t[0].x, t[0].y);
      await pause(250);
    }
    const s = await waitState((x) => x.status === 'won', 'the win');
    wonAt = s.scenesPlayed;
    out(`ok won ${summary(s)}`);
  },

  /** One wrong tap on a non-target object (costs a heart). */
  async wrong() {
    need();
    const w = await page.evaluate(() => window.__peekDebug?.wrong() ?? []);
    if (!w[0]) throw new Error('no wrong object to tap');
    await tapAt(w[0].x, w[0].y);
    await pause(300);
    out(`ok wrong tap; ${summary(await gameState())}`);
  },

  /** Waits for the next scene after a win (the game advances by itself: won -> intro -> playing). */
  async next() {
    need();
    const before = wonAt ?? (await gameState())?.scenesPlayed ?? 0;
    const s = await waitState(
      (x) => x.status === 'playing' && x.scenesPlayed > before,
      'the next scene',
      60_000,
    );
    wonAt = null;
    out(`ok next ${summary(s)}`);
  },

  /** tap <x> <y> in CSS px of the 390x844 viewport. */
  async tap(args) {
    need();
    const [x, y] = (args || '').split(/\s+/).map(Number);
    if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('usage: tap <x> <y>');
    await tapAt(x, y);
    out(`ok tapped ${x},${y}`);
  },

  /** Opens the in-game menu with the HUD pause button. */
  async menu() {
    need();
    const p = await page.evaluate(() => window.__peekDebug?.pauseCenter() ?? null);
    if (!p) throw new Error('no scene');
    await tapAt(p.x, p.y);
    const s = await waitState((x) => x.menuOpen, 'the menu', 10_000);
    out(`ok menu open ${summary(s)}`);
  },

  /** hide on|off: the host hides or shows the page (Bridge pause, the real pause path). */
  async hide(arg) {
    need();
    const hidden = arg !== 'off';
    await page.evaluate((h) => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => (h ? 'hidden' : 'visible'),
      });
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => h });
      document.dispatchEvent(new Event('visibilitychange'));
    }, hidden);
    await pause(300);
    out(`ok hidden=${hidden}; ${summary(await gameState())}`);
  },

  /** wait <js over s>, e.g. wait s.status === 'won' */
  async wait(expr) {
    need();
    const pred = new Function('s', `return (${expr});`);
    const s = await waitState((x) => Boolean(pred(x)), expr);
    out(`ok ${summary(s)}`);
  },

  async eval(expr) {
    need();
    out(JSON.stringify(await page.evaluate(expr)));
  },

  /** sleep <ms>: wall-clock pause inside the driver (prefer "wait" on a state predicate). */
  async sleep(ms) {
    await pause(Number(ms) || 1000);
    out(`ok slept ${Number(ms) || 1000} ms`);
  },

  errors() {
    out(errors.length ? errors.join('\n') : 'ok no console errors or page errors');
  },

  /** The representative flow: fresh start, title, play, win one scene, next scene. */
  async smoke() {
    await COMMANDS.open('reset=1');
    await COMMANDS.ss('01-title');
    await COMMANDS.play();
    await COMMANDS.ss('02-scene');
    await COMMANDS.win();
    await pause(500); // let the found object land in the HUD before the picture
    await COMMANDS.ss('03-won');
    await COMMANDS.next();
    await COMMANDS.ss('04-next-scene');
    COMMANDS.errors();
  },

  async quit() {
    if (browser) await browser.close().catch(() => {});
    browser = null;
    page = null;
  },
};

const rl = readline.createInterface({ input: process.stdin, terminal: false });
out(`peek-and-find driver (${BASE}, renderer=${RENDERER}) - "help" for commands`);
process.stdout.write('driver> \n');
for await (const raw of rl) {
  const line = raw.trim();
  if (line && !line.startsWith('#')) {
    const [cmd, ...rest] = line.split(/\s+/);
    const fn = COMMANDS[cmd];
    if (!fn) out(`ERROR unknown command "${cmd}" - try: help`);
    else {
      try {
        await fn(rest.join(' ') || undefined);
      } catch (e) {
        out(`ERROR ${cmd}: ${e.message.split('\n')[0]}`);
      }
    }
    if (cmd === 'quit') break;
  }
  process.stdout.write('driver> \n');
}
await COMMANDS.quit();
process.exit(0);
