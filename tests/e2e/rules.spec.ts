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

/** Raw RGB of a square crop; `left/top` are clamped so the crop stays inside the screenshot. */
async function cropRaw(
  png: Buffer,
  left: number,
  top: number,
  side: number,
  bounds: { w: number; h: number },
): Promise<{ data: Buffer; left: number; top: number }> {
  const l = Math.max(0, Math.min(bounds.w - side, left));
  const t = Math.max(0, Math.min(bounds.h - side, top));
  const data = await sharp(png)
    .extract({ left: l, top: t, width: side, height: side })
    .removeAlpha()
    .raw()
    .toBuffer();
  return { data, left: l, top: t };
}

interface Circle {
  x: number;
  y: number;
  r: number;
}

/**
 * Share of the pixels inside `disc` (and outside every `mask` circle) that differ noticeably
 * between image A and the same spot in image B (`offset`, an integer number of pixels).
 */
async function discShare(
  png: Buffer,
  disc: Circle,
  offset: { x: number; y: number },
  masks: Circle[],
  bounds: { w: number; h: number },
): Promise<number> {
  const r = Math.max(6, disc.r);
  const side = Math.round(r * 2);
  const a = await cropRaw(png, Math.round(disc.x - r), Math.round(disc.y - r), side, bounds);
  const b = await cropRaw(png, a.left + offset.x, a.top + offset.y, side, bounds);
  let counted = 0;
  let changed = 0;
  for (let y = 0; y < side; y++) {
    for (let x = 0; x < side; x++) {
      const sx = a.left + x;
      const sy = a.top + y;
      if (Math.hypot(sx - disc.x, sy - disc.y) > r) continue;
      if (masks.some((m) => Math.hypot(sx - m.x, sy - m.y) <= m.r)) continue;
      counted += 1;
      const i = (y * side + x) * 3;
      const d = Math.max(
        Math.abs((a.data[i] ?? 0) - (b.data[i] ?? 0)),
        Math.abs((a.data[i + 1] ?? 0) - (b.data[i + 1] ?? 0)),
        Math.abs((a.data[i + 2] ?? 0) - (b.data[i + 2] ?? 0)),
      );
      if (d > 32) changed += 1;
    }
  }
  return counted === 0 ? 0 : changed / counted;
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
    expect(await page.evaluate(() => window.devicePixelRatio)).toBe(1);
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
    const off = { x: Math.round(offset.x), y: Math.round(offset.y) };
    const circles: Circle[] = diffs.map((d) => ({ x: d.a.x, y: d.a.y, r: d.r }));

    // Noise floor: objects that are the same in both images and whose discs stay clear of every
    // difference (a removed or rescaled neighbour changes what overlaps them); the median share
    // inside their discs. No clean control → the fixed 2 % floor.
    const diffIds = new Set(diffs.map((d) => d.id));
    const clean = objects
      .filter((o) => !diffIds.has(o.id))
      .filter((o) => circles.every((c) => Math.hypot(c.x - o.x, c.y - o.y) > c.r + (o.r ?? 24)))
      .slice(0, 12);
    const shares: number[] = [];
    for (const o of clean) {
      shares.push(await discShare(png, { x: o.x, y: o.y, r: o.r ?? 24 }, off, circles, bounds));
    }
    shares.sort((a, b) => a - b);
    const noise = shares[Math.floor(shares.length / 2)] ?? 0;
    const threshold = Math.max(0.02, 3 * noise);
    for (const d of diffs) {
      const masks = circles.filter((c) => c.x !== d.a.x || c.y !== d.a.y);
      const share = await discShare(png, { x: d.a.x, y: d.a.y, r: d.r }, off, masks, bounds);
      expect(
        share,
        `${d.id} (${d.kind}) share ${share.toFixed(3)} vs noise median ${noise.toFixed(3)} over ${String(clean.length)} clean controls`,
      ).toBeGreaterThan(threshold);
    }

    // Found by tapping: alternate between the two images (both are tappable).
    for (const [i, d] of diffs.entries()) {
      const p = i % 2 === 0 ? d.a : d.b;
      await page.mouse.click(p.x, p.y);
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
