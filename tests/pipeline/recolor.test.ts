import { describe, expect, it } from 'vitest';
import { rotateHue } from '../../scripts/lib/color.mjs';
import { hasMainClass, listFills, recolorSvg } from '../../scripts/lib/recolor.mjs';

const MAIN = '#e76f51';
const OUTLINE = '#1a1a1a';
const HIGHLIGHT = '#ffffff';

const CLASSED = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">
  <circle class="shape fill-main" cx="5" cy="5" r="4" fill="${MAIN}" stroke="${OUTLINE}"/>
  <circle cx="4" cy="4" r="1" fill="${HIGHLIGHT}"/>
  <rect class="fill-main" x="1" y="1" width="2" height="2" style="opacity:1;fill:${MAIN};stroke:${OUTLINE}"/>
  <path d="M0 0" fill="#2a9d8f"/>
</svg>`;

const UNCLASSED = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">
  <circle cx="5" cy="5" r="4" fill="${MAIN}" stroke="${OUTLINE}"/>
  <circle cx="4" cy="4" r="1" fill="${HIGHLIGHT}"/>
  <rect x="0" y="0" width="1" height="1" fill="none"/>
  <rect x="0" y="0" width="1" height="1" fill="url(#g)"/>
  <linearGradient id="g"><stop offset="0" stop-color="#2a9d8f"/><stop offset="1" stop-color="#101010"/></linearGradient>
</svg>`;

describe('recolorSvg', () => {
  it('class mode rotates only fill-main fills, in attributes and style, never strokes', () => {
    expect(hasMainClass(CLASSED)).toBe(true);
    const out = recolorSvg(CLASSED, 25);
    expect(out.mode).toBe('class');
    expect(out.recolored).toBe(2);
    const rotated = rotateHue(MAIN, 25)!;
    expect(out.svg).toContain(`fill="${rotated}" stroke="${OUTLINE}"`);
    expect(out.svg).toContain(`fill:${rotated};stroke:${OUTLINE}`);
    expect(out.svg).toContain(`fill="${HIGHLIGHT}"`);
    expect(out.svg).toContain('fill="#2a9d8f"'); // not classed → untouched
    expect(out.svg).not.toContain(MAIN);
  });

  it('auto mode rotates saturated fills and gradient stops, keeps outlines, highlights, none and url()', () => {
    expect(hasMainClass(UNCLASSED)).toBe(false);
    const out = recolorSvg(UNCLASSED, -25);
    expect(out.mode).toBe('auto');
    expect(out.recolored).toBe(2); // the main circle and the teal stop
    expect(out.svg).toContain(`fill="${rotateHue(MAIN, -25)!}"`);
    expect(out.svg).toContain(`stop-color="${rotateHue('#2a9d8f', -25)!}"`);
    expect(out.svg).toContain(`stroke="${OUTLINE}"`);
    expect(out.svg).toContain(`fill="${HIGHLIGHT}"`);
    expect(out.svg).toContain('fill="none"');
    expect(out.svg).toContain('fill="url(#g)"');
    expect(out.svg).toContain('stop-color="#101010"');
  });

  it('rewrites .fill-main rules inside <style> blocks', () => {
    const svg = `<svg><style>.fill-main{fill:${MAIN};stroke:${OUTLINE}} .other{fill:${MAIN}}</style><path class="fill-main" d="M0 0"/></svg>`;
    const out = recolorSvg(svg, 25);
    expect(out.recolored).toBe(1);
    expect(out.svg).toContain(`.fill-main{fill:${rotateHue(MAIN, 25)!};stroke:${OUTLINE}}`);
    expect(out.svg).toContain(`.other{fill:${MAIN}}`);
  });

  it('is deterministic and leaves structure intact', () => {
    const a = recolorSvg(CLASSED, 25).svg;
    const b = recolorSvg(CLASSED, 25).svg;
    expect(a).toBe(b);
    expect(a.length).toBe(CLASSED.length); // hex → hex of the same length
    expect(recolorSvg(CLASSED, 0).svg).toBe(CLASSED);
  });

  it('_c1 and _c2 differ from each other and from the base', () => {
    const c1 = recolorSvg(UNCLASSED, 25).svg;
    const c2 = recolorSvg(UNCLASSED, -25).svg;
    expect(c1).not.toBe(UNCLASSED);
    expect(c2).not.toBe(UNCLASSED);
    expect(c1).not.toBe(c2);
  });

  it('listFills counts plain fill colors for diagnostics', () => {
    const fills = listFills(CLASSED);
    expect(fills.get(MAIN)).toBe(2);
    expect(fills.get(HIGHLIGHT)).toBe(1);
    expect(fills.get('#2a9d8f')).toBe(1);
  });
});
