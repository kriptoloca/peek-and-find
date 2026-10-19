import { expect, type Page } from '@playwright/test';
import { CANVAS, TEST, test, waitState, type GameState } from './helpers';

/**
 * GDD v1.9 §4: one mode rhythm for every player. Two players (two salts, as on two devices)
 * meet the same mode on the same level, each in their own scene. A layout that cannot host
 * Spot 5 plays the Spot levels as Find and leaves every other level as it is.
 */
const PLAYERS = ['&salt=7', '&salt=4051966'] as const;
const RHYTHM: [level: number, mode: string][] = [
  [5, 'find'],
  [6, 'odd'],
  [11, 'spot'],
  [13, 'odd'],
  [16, 'odd'],
  [18, 'spot'],
  [25, 'find'],
];

async function openLevel(page: Page, level: number, salt: string): Promise<GameState> {
  await page.goto(`${TEST}?level=${String(level)}&reset=1${salt}${CANVAS}`, { waitUntil: 'load' });
  return waitState(
    page,
    (s) => s.sceneLevel === level && (s.status === 'playing' || s.status === 'intro'),
    `level ${String(level)} ${salt}`,
  );
}

/** Where the first thing to find sits: it stands in for the scene's layout. */
async function firstSpot(page: Page): Promise<string> {
  const p = await page.evaluate(() => {
    const d = window.__peekDebug;
    return d?.differences()[0]?.a ?? d?.targets()[0] ?? null;
  });
  return p ? `${String(Math.round(p.x))},${String(Math.round(p.y))}` : 'none';
}

for (const salt of PLAYERS) {
  test(`player ${salt}: the modes follow the shared rhythm`, async ({ page }) => {
    const seen: string[] = [];
    for (const [level] of RHYTHM) seen.push((await openLevel(page, level, salt)).mode);
    expect(seen).toEqual(RHYTHM.map(([, mode]) => mode));
  });
}

test('same mode, own scene: two players get different layouts in every mode', async ({ page }) => {
  for (const [level, mode] of [
    [5, 'find'],
    [6, 'odd'],
    [11, 'spot'],
  ] as const) {
    const where: string[] = [];
    for (const salt of PLAYERS) {
      const s = await openLevel(page, level, salt);
      expect(s.mode).toBe(mode);
      where.push(await firstSpot(page));
    }
    expect(where[0], `level ${String(level)}`).not.toBe('none');
    expect(where[0], `level ${String(level)}`).not.toBe(where[1]);
  }
});

test('a square layout plays the Spot levels as Find and keeps the rest of the rhythm', async ({
  page,
}) => {
  await page.setViewportSize({ width: 700, height: 700 });
  for (const [level, mode] of RHYTHM) {
    const s = await openLevel(page, level, PLAYERS[0]);
    expect(s.mode, `level ${String(level)}`).toBe(mode === 'spot' ? 'find' : mode);
  }
});
