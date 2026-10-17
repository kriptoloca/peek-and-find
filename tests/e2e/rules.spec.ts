import { expect, test } from '@playwright/test';
import sharp from 'sharp';
import type { DebugDifference, DebugPoint } from '../../src/dev/debug';
import { CANVAS, TEST, state, waitState, winScene } from './helpers';

/**
 * The gameplay rules, checked by playing and looking (player feedback 2026-10-17: "the fifth
 * difference cannot be found", "a tap on a shape does not register"):
 *  - every Spot difference is visible on screen (pixels differ between the two images) and the
 *    five of them can be found by tapping their centers;
 *  - a tap anywhere on a big sprite counts, not only near its center;
 *  - a tap while the sprites are still popping in counts.
 */

/** Share of pixels that differ noticeably between two same-size crops of a screenshot. */
async function changedShare(
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
  test(`Spot level ${String(level)}: five visible differences, all findable`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width: 844, height: 390 }); // side by side, both images large
    await page.goto(`${TEST}?level=${String(level)}&mode=spot&reset=1${CANVAS}`, {
      waitUntil: 'load',
    });
    const s = await waitState(page, (x) => x.status === 'playing', 'spot');
    expect(s.mode).toBe('spot');
    await page.waitForTimeout(400); // pop-in tweens settle
    const diffs: DebugDifference[] = await page.evaluate(
      () => window.__peekDebug?.differences() ?? [],
    );
    expect(diffs).toHaveLength(5);
    const file = info.outputPath(`spot-${String(level)}.png`);
    const png = await page.screenshot({ path: file });
    await info.attach(`spot-${String(level)}`, { path: file, contentType: 'image/png' });
    const meta = await sharp(png).metadata();
    const bounds = { w: meta.width ?? 0, h: meta.height ?? 0 };
    const shares: string[] = [];
    for (const d of diffs) {
      const share = await changedShare(png, d.a, d.b, d.r, bounds);
      shares.push(`${d.kind}:${String(Math.round(share * 100))}%`);
      expect(share, `${d.id} (${d.kind}) must look different in the two images`).toBeGreaterThan(
        0.02,
      );
    }
    info.annotations.push({ type: 'differences', description: shares.join(' ') });
    const won = await winScene(page);
    expect(won.remaining).toBe(0);
  });
}

test('a tap on the edge of a big sprite counts', async ({ page }) => {
  await page.goto(`${TEST}?level=12&mode=find&reset=1${CANVAS}`, { waitUntil: 'load' });
  const before = await waitState(page, (x) => x.status === 'playing', 'find');
  await page.waitForTimeout(400);
  const objects: DebugPoint[] = await page.evaluate(() => window.__peekDebug?.objects() ?? []);
  const targets = objects.filter((o) => o.isTarget && (o.size ?? 0) > 0);
  expect(targets.length).toBeGreaterThan(0);
  const big = [...targets].sort((a, b) => (b.size ?? 0) - (a.size ?? 0))[0]!;
  const size = big.size ?? 0;
  // screen px per design px (portrait: the canvas fits the 1080 design width)
  const k = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    return c ? c.getBoundingClientRect().width / 1080 : 1;
  });
  expect(size).toBeGreaterThan(2 * 40 * k); // bigger than the old fixed 40 px circle
  expect(big.r ?? 0).toBeGreaterThanOrEqual(size / 2 - 1); // the circle covers the sprite
  // tap near the rim, in the direction that stays farthest from every other object center
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const;
  const d = 0.45 * size;
  const best = dirs
    .map(([dx, dy]) => {
      const p = { x: big.x + dx * d, y: big.y + dy * d };
      const nearestOther = Math.min(
        ...objects.filter((o) => o.id !== big.id).map((o) => Math.hypot(o.x - p.x, o.y - p.y)),
      );
      return { p, nearestOther };
    })
    .sort((a, b) => b.nearestOther - a.nearestOther)[0]!;
  await page.mouse.click(best.p.x, best.p.y);
  const after = await waitState(page, (x) => x.remaining === before.remaining - 1, 'rim tap');
  expect(after.hearts).toBe(3);
});

test('a tap during the pop-in counts', async ({ page }) => {
  await page.goto(`${TEST}?level=1&reset=1${CANVAS}`, { waitUntil: 'load' });
  // catch the intro if we can; a fast machine may already be playing, which is fine
  const first = await waitState(
    page,
    (x) => x.status === 'intro' || x.status === 'playing',
    'scene',
  );
  const t = (await page.evaluate(() => window.__peekDebug?.targets() ?? []))[0];
  expect(t).toBeDefined();
  await page.mouse.click(t!.x, t!.y);
  const won = await waitState(page, (x) => x.status === 'won', 'won by the first tap');
  expect(won.remaining).toBe(0);
  expect(['intro', 'playing']).toContain(first.status);
  const s = await state(page);
  expect(s?.hearts).toBe(3);
});
