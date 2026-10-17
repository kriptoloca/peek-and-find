#!/usr/bin/env node
// Contact sheets from the screenshot tour (tests/tour): test-results/tour/sheet-*.png.
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

const DIR = resolve('test-results/tour');
const files = readdirSync(DIR)
  .filter((f) => f.endsWith('.png') && !f.startsWith('sheet-'))
  .sort();

async function sheet(name, pick, cols, cellW) {
  const list = files.filter(pick);
  if (list.length === 0) return;
  const metas = await Promise.all(list.map((f) => sharp(resolve(DIR, f)).metadata()));
  const cellH = Math.max(
    ...metas.map((m) => Math.round(((m.height ?? 1) * cellW) / (m.width ?? 1))),
  );
  const rows = Math.ceil(list.length / cols);
  const comps = [];
  for (let i = 0; i < list.length; i++) {
    const f = list[i];
    const buf = await sharp(resolve(DIR, f)).resize({ width: cellW }).toBuffer();
    const label = Buffer.from(
      `<svg width="${String(cellW)}" height="22"><rect width="100%" height="100%" fill="#000"/>` +
        `<text x="4" y="16" font-family="sans-serif" font-size="14" fill="#fff">${f.replace('.png', '')}</text></svg>`,
    );
    const left = (i % cols) * (cellW + 6);
    const top = Math.floor(i / cols) * (cellH + 28);
    comps.push({ input: buf, left, top: top + 22 });
    comps.push({ input: label, left, top });
  }
  await sharp({
    create: {
      width: cols * (cellW + 6),
      height: rows * (cellH + 28),
      channels: 3,
      background: '#444',
    },
  })
    .composite(comps)
    .png()
    .toFile(resolve(DIR, `sheet-${name}.png`));
  console.log(`sheet-${name}.png: ${String(list.length)} screenshots`);
}

await sheet('levels-p', (f) => /^L\d+.*-p\.png$/.test(f), 4, 300);
await sheet('land', (f) => /-l\.png$/.test(f), 2, 600);
await sheet('square', (f) => /-s\.png$/.test(f), 3, 400);
await sheet('fx', (f) => /^(fx|daily|title|boot)/.test(f) && !/-[ls]\.png$/.test(f), 5, 260);
