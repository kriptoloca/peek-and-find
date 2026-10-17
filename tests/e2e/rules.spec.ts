import { expect } from '@playwright/test';
import sharp from 'sharp';
import type { DebugDifference, DebugPoint } from '../../src/dev/debug';
import { CANVAS, SALT, TEST, state, test, waitState, winScene, wrongTap } from './helpers';

/**
 * The gameplay rules, checked by playing and looking (player feedback 2026-10-17: "the fifth
 * difference cannot be found", "a tap on a shape does not register"):
 *  - every Spot difference is visible on screen (pixels differ between the two images, more
 *    than the unchanged objects differ) and the five of them can be found by tapping;
 *  - Odd One Out: a wrong cell costs a heart, the odd cell wins;
 *  - a tap anywhere on a big sprite counts, not only near its center;
 *  - a tap while the sprites are still popping in counts.
 * Scenes are pinned with ?salt= so a failure reproduces.
 */

/** Share of pixels that differ noticeably between two same-size crops of a screenshot. */
async function cropShare(
  png: Buffer,
  a: { x: number; y: number },
  b: { x: number; y: number },
  r: number,
  bounds: { w: number; h: number },
): Promise<number> {
  const side = Math.max(8, Math.round(r * 2));
  const crop = (p: { x: number; y: number }): { left: number; top: number } => ({
    left: Math.max(0, Math.min(bounds.w - side, Math.round(p.x - r))),
    top: Math.max(0, Math.min(bounds.h - side, Math.round(p.y - r))),
  });
  const raw = async (p: { x: number; y: number }): Promise<Buffer> =>
    sharp(png)
      .extract({ ...crop(p), width: side, height: side })
      .removeAlpha()
      .raw()
      .toBuffer();
  const [ra, rb] = await Promise.all([raw(a), raw(b)]);
  let changed = 0;
  const n = side * side;
  for (let i = 0; i < n; i++) {
    const d = Math.max(
      Math.abs((ra[i * 3] ?? 0) - (rb[i * 3] ?? 0)),
      Math.abs((ra[i * 3 + 1] ?? 0) - (rb[i * 3 + 1] ?? 0)),
      Math.abs((ra[i * 3 + 2] ?? 0) - (rb[i * 3 + 2] ?? 0)),
    );
    if (d > 32) changed += 1;
  }
  return changed / n;
}

for (const level of [12, 30, 55]) {
  test(`Spot level ${String(level)}: five differences visible above the noise floor, all findable`, async ({
    page,
  }, info) => {
    // 540×960: canvas scale 0.5, so the stacked images sit an integer number of screen pixels
    // apart and an unchanged object crops identically in both images.
    await page.setViewportSize({ width: 540, height: 960 });
    await page.goto(`${TEST}?level=${String(level)}&mode=spot&reset=1${SALT}${CANVAS}`, {
      waitUntil: 'load',
    });
    const s = await waitState(page, (x) => x.status === 'playing', 'spot');
    expect(s.mode).toBe('spot');
    await page.waitForTimeout(1000); // pop-in tweens (≤ 650 ms) settle in both images
    const diffs: DebugDifference[] = await page.evaluate(
      () => window.__peekDebug?.differences() ?? [],
    );
    expect(diffs).toHaveLength(5);
    const objects: DebugPoint[] = await page.evaluate(() => window.__peekDebug?.objects() ?? []);
    const png = await page.screenshot({ path: info.outputPath(`spot-${String(level)}.png`) });
    const meta = await sharp(png).metadata();
    const bounds = { w: meta.width ?? 0, h: meta.height ?? 0 };
    const first = diffs[0];
    if (!first) throw new Error('no differences');
    const offset = { x: first.b.x - first.a.x, y: first.b.y - first.a.y };
    expect(Math.abs(offset.x - Math.round(offset.x))).toBeLessThan(0.01);
    expect(Math.abs(offset.y - Math.round(offset.y))).toBeLessThan(0.01);

    // noise floor: objects that are the same in both images and sit clear of every difference
    // (a removed or rescaled object changes what its neighbours overlap; a swap partner changes
    // too), measured as the median so one contaminated control cannot hide a real difference
    const diffIds = new Set(diffs.map((d) => d.id));
    const clearance = (o: DebugPoint): number =>
      Math.min(...diffs.map((d) => Math.hypot(d.a.x - o.x, d.a.y - o.y) - d.r - (o.r ?? 24)));
    const controls = objects
      .filter((o) => !diffIds.has(o.id))
      .sort((a, b) => clearance(b) - clearance(a)) // farthest from any difference first
      .slice(0, 12);
    expect(controls.length).toBeGreaterThanOrEqual(2);
    const shares: number[] = [];
    for (const c of controls) {
      shares.push(
        await cropShare(
          png,
          c,
          { x: c.x + offset.x, y: c.y + offset.y },
          Math.max(12, c.r ?? 24),
          bounds,
        ),
      );
    }
    shares.sort((a, b) => a - b);
    const noise = shares[Math.floor(shares.length / 2)] ?? 0;
    const threshold = Math.max(0.02, 3 * noise);
    for (const d of diffs) {
      const share = await cropShare(png, d.a, d.b, Math.max(12, d.r), bounds);
      expect(
        share,
        `${d.id} (${d.kind}) vs noise median ${noise.toFixed(3)} max ${String(shares[shares.length - 1]?.toFixed(3))}`,
      ).toBeGreaterThan(threshold);
    }

    for (const d of diffs) {
      await page.mouse.click(d.a.x, d.a.y);
      await page.waitForTimeout(150);
    }
    const done = await waitState(page, (x) => x.status === 'won', 'all five found');
    expect(done.remaining).toBe(0);
  });
}

for (const level of [8, 34]) {
  test(`Odd One Out level ${String(level)}: a wrong cell costs a heart, the odd cell wins`, async ({
    page,
  }) => {
    await page.goto(`${TEST}?level=${String(level)}&mode=odd&reset=1${SALT}${CANVAS}`, {
      waitUntil: 'load',
    });
    const s = await waitState(page, (x) => x.status === 'playing', 'odd');
    expect(s.mode).toBe('odd');
    expect(s.remaining).toBe(1);
    expect((await wrongTap(page)).hearts).toBe(2);
    const t = await page.evaluate(() => window.__peekDebug?.targets() ?? []);
    if (!t[0]) throw new Error('no odd cell');
    await page.mouse.click(t[0].x, t[0].y);
    await waitState(page, (x) => x.status === 'won', 'odd found');
  });
}

test('a tap on the rim of the biggest sprite counts (hit circle covers the sprite)', async ({
  page,
}) => {
  await page.goto(`${TEST}?level=20&mode=find&reset=1${SALT}${CANVAS}`, { waitUntil: 'load' });
  await waitState(page, (x) => x.status === 'playing', 'find');
  await page.waitForTimeout(400);
  const objects: DebugPoint[] = await page.evaluate(() => window.__peekDebug?.objects() ?? []);
  const targets = objects.filter((o) => o.isTarget && o.size !== undefined && o.r !== undefined);
  const big = [...targets].sort((a, b) => (b.size ?? 0) - (a.size ?? 0))[0];
  if (!big || big.size === undefined || big.r === undefined) throw new Error('no target');
  // 0.45 × size from the center along the direction that leads away from every other object,
  // inside the sprite's own circle (r ≥ size / 2) and not inside any neighbour's circle
  const others = objects.filter((o) => o.id !== big.id);
  let best = { x: 0, y: 0, score: -1 };
  for (let a = 0; a < 360; a += 15) {
    const x = big.x + Math.cos((a * Math.PI) / 180) * big.size * 0.45;
    const y = big.y + Math.sin((a * Math.PI) / 180) * big.size * 0.45;
    const nearest = Math.min(...others.map((o) => Math.hypot(o.x - x, o.y - y) - (o.r ?? 0)));
    if (nearest > best.score) best = { x, y, score: nearest };
  }
  expect(best.score).toBeGreaterThan(0);
  const before = (await state(page))?.remaining ?? 0;
  await page.mouse.click(best.x, best.y);
  await waitState(page, (x) => x.remaining === before - 1, 'rim tap found the target');
});

test('a tap during the pop-in counts and starts the round', async ({ page }) => {
  let caught = false;
  for (let attempt = 0; attempt < 3 && !caught; attempt++) {
    await page.goto(`${TEST}?level=1&mode=find&reset=1${SALT}${CANVAS}`, { waitUntil: 'load' });
    const first = await waitState(
      page,
      (x) => x.status === 'intro' || x.status === 'playing',
      'scene exists',
    );
    if (first.status !== 'intro') continue;
    caught = true;
    const t = await page.evaluate(() => window.__peekDebug?.targets() ?? []);
    if (!t[0]) throw new Error('no target');
    await page.mouse.click(t[0].x, t[0].y);
    const s = await waitState(
      page,
      (x) => x.remaining === first.remaining - 1 || x.status === 'won',
      'early tap counted',
    );
    expect(['playing', 'won']).toContain(s.status);
  }
  expect(caught, 'the pop-in was observed at least once in three loads').toBe(true);
  await winScene(page);
});
