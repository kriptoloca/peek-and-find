import { expect } from '@playwright/test';
import {
  CANVAS,
  SALT,
  TEST,
  loseScene,
  openMenu,
  setHidden,
  shot,
  state,
  tapButton,
  tapMenu,
  tapTitle,
  test,
  titleState,
  waitState,
  waitTitle,
  winScene,
} from './helpers';

/**
 * In-game menu (GDD v1.6 §9), from the player's side: the pause button freezes the scene
 * (star timer, shuffle cadence, tweens), the toggles work mid-scene and persist, Resume keeps
 * the finds and hearts, Home abandons the scene, and the platform pause stacks on top.
 */
const CLOCK = `${CANVAS}&fpsmin=1`;

test('pause freezes the round; sound and music toggle in place; Resume continues the same scene', async ({
  page,
}, info) => {
  await page.goto(`${TEST}?level=40&mode=find&twist=shuffle&reset=1${SALT}${CLOCK}`, {
    waitUntil: 'load',
  });
  const s0 = await waitState(page, (s) => s.status === 'playing', 'playing');
  expect(s0.twist).toBe('shuffle');
  // one find, then the menu
  const t = (await page.evaluate(() => window.__peekDebug?.targets() ?? []))[0];
  if (!t) throw new Error('no target');
  await page.mouse.click(t.x, t.y);
  const found = await waitState(page, (s) => s.remaining === s0.remaining - 1, 'found one');
  const opened = await openMenu(page);
  expect(opened.status).toBe('playing');
  expect(opened.remaining).toBe(found.remaining);
  await shot(page, info, 'menu-9x16');
  const elapsedAtOpen = opened.elapsed;
  // 12 s on the wall clock: nothing moves, the star timer stands still, no shuffle
  await page.waitForTimeout(12_000);
  const still = await state(page);
  expect(still?.menuOpen).toBe(true);
  expect(still?.layout).toBe(0);
  expect(still?.shufflesDone).toBe(0);
  expect(Math.abs((still?.elapsed ?? 0) - elapsedAtOpen)).toBeLessThan(0.2);
  // a tap on a target does nothing while the menu is open
  const t2 = (await page.evaluate(() => window.__peekDebug?.targets() ?? []))[0];
  if (!t2) throw new Error('no second target');
  await page.mouse.click(t2.x, t2.y);
  await page.waitForTimeout(200);
  expect((await state(page))?.remaining).toBe(found.remaining);
  // toggles work in place
  await tapMenu(page, 'sound');
  await waitState(page, (s) => !s.sound, 'sound off', 5_000);
  await tapMenu(page, 'music');
  await waitState(page, (s) => !s.music, 'music off', 5_000);
  await shot(page, info, 'menu-toggled');
  await tapMenu(page, 'sound');
  await waitState(page, (s) => s.sound, 'sound on again', 5_000);
  // Resume: same scene, same finds, same hearts, the timer continues from where it stopped
  await tapMenu(page, 'resume');
  const resumed = await waitState(page, (s) => !s.menuOpen, 'resumed', 5_000);
  expect(resumed.status).toBe('playing');
  expect(resumed.remaining).toBe(found.remaining);
  expect(resumed.hearts).toBe(3);
  expect(resumed.elapsed).toBeLessThan(elapsedAtOpen + 1.5);
  await page.mouse.click(t2.x, t2.y);
  await waitState(page, (s) => s.remaining === found.remaining - 1, 'found after resume');
  // the shuffle cadence picks up where it was frozen
  await waitState(page, (s) => s.layout === 1 && !s.moving, 'shuffle after resume', 30_000);
  // the music toggle survived a reload (saved like the Title toggles); without ?level= the
  // development build opens on the Title
  await page.goto(`${TEST}?renderer=canvas&fpsmin=1`, { waitUntil: 'load' });
  await waitTitle(page);
  expect(await titleState(page)).toMatchObject({ sound: true, music: false });
});

test('platform pause over the open menu keeps the game frozen after the platform resumes', async ({
  page,
}) => {
  await page.goto(`${TEST}?level=12&mode=find&reset=1${SALT}${CLOCK}`, { waitUntil: 'load' });
  await waitState(page, (s) => s.status === 'playing', 'playing');
  const opened = await openMenu(page);
  await setHidden(page, true);
  await waitState(page, (s) => s.paused, 'platform paused');
  await setHidden(page, false);
  await waitState(page, (s) => !s.paused, 'platform resumed');
  await page.waitForTimeout(1500);
  const after = await state(page);
  expect(after?.menuOpen).toBe(true);
  expect(Math.abs((after?.elapsed ?? 0) - opened.elapsed)).toBeLessThan(0.2);
  await tapMenu(page, 'resume');
  await waitState(page, (s) => !s.menuOpen && s.status === 'playing', 'resumed', 5_000);
});

test('the menu follows a rotation and is drawn in 16:9 and 1:1', async ({ page }, info) => {
  await page.goto(`${TEST}?level=12&mode=find&reset=1${SALT}${CLOCK}`, { waitUntil: 'load' });
  await waitState(page, (s) => s.status === 'playing', 'playing');
  await openMenu(page);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(600);
  await shot(page, info, 'menu-16x9');
  const m = await page.evaluate(() => window.__peekDebug?.menu() ?? null);
  expect(m).not.toBeNull();
  if (!m) throw new Error('no menu');
  expect(m.resume.x).toBeGreaterThan(0);
  expect(m.resume.x).toBeLessThan(844);
  expect(m.home.y).toBeLessThan(390);
  await page.setViewportSize({ width: 700, height: 700 });
  await page.waitForTimeout(600);
  await shot(page, info, 'menu-1x1');
  await tapMenu(page, 'resume');
  await waitState(page, (s) => !s.menuOpen, 'resumed', 5_000);
});

test('the menu opens over the fail overlay, so Home is one tap away from a lost round', async ({
  page,
}, info) => {
  await page.goto(`${TEST}?level=12&mode=find&reset=1${SALT}${CLOCK}`, { waitUntil: 'load' });
  await waitState(page, (s) => s.status === 'playing', 'playing');
  await loseScene(page);
  const opened = await openMenu(page);
  expect(opened.status).toBe('lost');
  await shot(page, info, 'menu-over-fail');
  // Resume just closes the menu: the fail overlay and its buttons are back
  await tapMenu(page, 'resume');
  await waitState(page, (s) => !s.menuOpen && s.status === 'lost', 'fail overlay again', 5_000);
  expect(await page.evaluate(() => window.__peekDebug?.retryCenter() ?? null)).not.toBeNull();
  await openMenu(page);
  await tapMenu(page, 'home');
  await waitTitle(page);
});

test('Home acts on the finger lifting, so a real tap never falls through to the Title', async ({
  page,
}) => {
  await page.goto(`${TEST}?level=12&mode=find&reset=1${SALT}${CLOCK}`, { waitUntil: 'load' });
  await waitState(page, (s) => s.status === 'playing', 'playing');
  await openMenu(page);
  const m = await page.evaluate(() => window.__peekDebug?.menu() ?? null);
  if (!m) throw new Error('no menu');
  // a finger: down, a short hold, up (the DAILY button of the Title overlaps this spot)
  await page.mouse.move(m.home.x, m.home.y);
  await page.mouse.down();
  await page.waitForTimeout(150);
  await page.mouse.up();
  await waitTitle(page);
  await page.waitForTimeout(600);
  expect(await state(page)).toBeUndefined(); // still on the Title, not in the daily chain
  // a down on one button and an up on another does nothing
  await tapTitle(page, 'play');
  await waitState(page, (s) => s.status === 'playing', 'playing again');
  await openMenu(page);
  const m2 = await page.evaluate(() => window.__peekDebug?.menu() ?? null);
  if (!m2) throw new Error('no menu');
  await page.mouse.move(m2.home.x, m2.home.y);
  await page.mouse.down();
  await page.mouse.move(m2.resume.x, m2.resume.y, { steps: 4 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  expect((await state(page))?.menuOpen).toBe(true);
  await tapMenu(page, 'resume');
  await waitState(page, (s) => !s.menuOpen, 'resumed', 5_000);
});

test('Bridge messages: gameplay_stopped when the menu opens, gameplay_started on Resume, nothing on Home', async ({
  page,
}) => {
  await page.goto(`${TEST}?level=12&mode=find&reset=1${SALT}${CLOCK}`, { waitUntil: 'load' });
  const s0 = await waitState(page, (s) => s.status === 'playing', 'playing');
  const n0 = s0.messages.length;
  const opened = await openMenu(page);
  expect(opened.messages.slice(n0)).toEqual(['gameplay_stopped']);
  await tapMenu(page, 'resume');
  const resumed = await waitState(page, (s) => !s.menuOpen, 'resumed', 5_000);
  expect(resumed.messages.slice(n0)).toEqual(['gameplay_stopped', 'gameplay_started']);
  const opened2 = await openMenu(page);
  const n1 = opened2.messages.length;
  await tapMenu(page, 'home');
  await waitTitle(page);
  const titleMessages = await page.evaluate(() => window.__peekTitle?.messages() ?? []);
  expect(titleMessages.slice(n1).filter((m) => m.startsWith('gameplay'))).toEqual([]);
});

test('the menu never opens over the win overlay: the pause spot skips the auto-advance instead', async ({
  page,
}) => {
  await page.goto(`${TEST}?level=1&reset=1${SALT}${CLOCK}`, { waitUntil: 'load' });
  await waitState(page, (s) => s.status === 'playing', 'playing');
  const won = await winScene(page);
  expect(won.status).toBe('won');
  await tapButton(page, 'pauseCenter');
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__peekDebug?.menu() ?? null)).toBeNull();
  const next = await waitState(page, (s) => s.level === 2 && s.status === 'playing', 'level 2');
  expect(next.menuOpen).toBe(false);
});

test('with the menu open the hint bulb and the sound-off click do nothing', async ({ page }) => {
  await page.goto(`${TEST}?level=12&mode=find&fakeads=1&reset=1${SALT}${CLOCK}`, {
    waitUntil: 'load',
  });
  await waitState(page, (s) => s.status === 'playing' && s.rewardedSupported, 'playing');
  await openMenu(page);
  await tapButton(page, 'hintCenter');
  await page.waitForTimeout(400);
  const after = await state(page);
  expect(after?.hintUses).toBe(0);
  expect(after?.adInProgress).toBe(false);
  expect(after?.menuOpen).toBe(true);
  await tapMenu(page, 'sound');
  const off = await waitState(page, (s) => !s.sound, 'sound off', 5_000);
  const dropped = off.audio.dropped;
  await tapMenu(page, 'music');
  const again = await waitState(page, (s) => !s.music, 'music off', 5_000);
  expect(again.audio.dropped).toBeGreaterThan(dropped); // the click of a muted toggle is dropped
  await tapMenu(page, 'sound');
  await tapMenu(page, 'music');
  await waitState(page, (s) => s.sound && s.music, 'both on again', 5_000);
  await tapMenu(page, 'resume');
  await waitState(page, (s) => !s.menuOpen, 'resumed', 5_000);
});

test('pause during the pop-in: Resume lets the round start normally', async ({ page }) => {
  await page.goto(`${TEST}?level=12&mode=find&reset=1${SALT}${CLOCK}`, { waitUntil: 'load' });
  // the Game scene exists before the pop-in ends; open the menu as soon as the hook answers
  const t0 = Date.now();
  for (;;) {
    const ok = await page.evaluate(() => typeof window.__peekDebug === 'object');
    if (ok) break;
    if (Date.now() - t0 > 20_000) throw new Error('no game hooks');
    await page.waitForTimeout(50);
  }
  await tapButton(page, 'pauseCenter');
  const opened = await waitState(page, (s) => s.menuOpen, 'menu during intro', 10_000);
  expect(['intro', 'playing']).toContain(opened.status);
  await page.waitForTimeout(1500);
  if (opened.status === 'intro') expect((await state(page))?.status).toBe('intro');
  await tapMenu(page, 'resume');
  const started = await waitState(page, (s) => !s.menuOpen && s.status === 'playing', 'started');
  expect(started.hearts).toBe(3);
  const t = (await page.evaluate(() => window.__peekDebug?.targets() ?? []))[0];
  if (!t) throw new Error('no target');
  await page.mouse.click(t.x, t.y);
  await waitState(page, (s) => s.remaining === started.remaining - 1, 'found');
});
