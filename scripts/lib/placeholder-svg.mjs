// Placeholder SVG sources, generated in memory for every sprite, background or UI icon that has
// no file under assets/svg/. They follow the same input contract the real pack must meet
// (assets/README.md): 256² sprite canvas, main fills marked class="fill-main", no text.
// Shapes mirror the runtime placeholders so the game looks the same with or without atlases.
import { hslToRgb, intToHex, parseColor, rgbToHsl, scaleLightness, toHex } from './color.mjs';

/** Same preview palette as src/data/themes.ts (PALETTE). */
export const PALETTE = [
  0xe76f51, 0x264653, 0xa8a8a8, 0xd62828, 0xf4f1de, 0xc98a3d, 0xf2c14e, 0x2a9d8f, 0x8ecae6,
  0x5aa469, 0x6d597a, 0xb5b5b5, 0x9c6644, 0x3a86ff, 0x52b788, 0xffb703,
];

export const SHAPES = [
  'circle',
  'square',
  'triangle',
  'diamond',
  'tall',
  'wide',
  'hexagon',
  'star',
  'drop',
  'capsule',
  'cross',
  'ring',
  'pentagon',
  'semicircle',
  'arch',
  'bolt',
];

const SPRITE_SIZE = 256;
const SVG_NS = 'http://www.w3.org/2000/svg';

const fmt = (n) => String(Math.round(n * 100) / 100);
const pts = (list) => list.map(([x, y]) => `${fmt(x)},${fmt(y)}`).join(' ');

function regular(n, r, cx = 128, cy = 128, rot = -Math.PI / 2) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2;
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return out;
}

function star(n, r, inner, cx = 128, cy = 128) {
  const out = [];
  for (let i = 0; i < n * 2; i++) {
    const a = -Math.PI / 2 + (i / (n * 2)) * Math.PI * 2;
    const rr = i % 2 === 0 ? r : inner;
    out.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return out;
}

/**
 * Geometry of a placeholder shape on the 256² canvas, as one SVG element with `attrs` appended.
 * @param {string} shape
 * @param {string} attrs
 */
export function shapeElement(shape, attrs) {
  const a = attrs ? ` ${attrs}` : '';
  switch (shape) {
    case 'circle':
      return `<circle cx="128" cy="128" r="108"${a}/>`;
    case 'square':
      return `<rect x="28" y="28" width="200" height="200" rx="22"${a}/>`;
    case 'triangle':
      return `<polygon points="${pts([
        [128, 22],
        [232, 214],
        [24, 214],
      ])}"${a}/>`;
    case 'diamond':
      return `<polygon points="${pts([
        [128, 18],
        [236, 128],
        [128, 238],
        [20, 128],
      ])}"${a}/>`;
    case 'tall':
      return `<rect x="72" y="18" width="112" height="220" rx="30"${a}/>`;
    case 'wide':
      return `<rect x="18" y="72" width="220" height="112" rx="30"${a}/>`;
    case 'hexagon':
      return `<polygon points="${pts(regular(6, 110))}"${a}/>`;
    case 'star':
      return `<polygon points="${pts(star(5, 114, 50))}"${a}/>`;
    case 'drop':
      return `<path d="M128 18 C172 84 214 122 214 164 A86 86 0 0 1 42 164 C42 122 84 84 128 18 Z"${a}/>`;
    case 'capsule':
      return `<rect x="74" y="18" width="108" height="220" rx="54"${a}/>`;
    case 'cross':
      return `<polygon points="${pts([
        [98, 22],
        [158, 22],
        [158, 98],
        [234, 98],
        [234, 158],
        [158, 158],
        [158, 234],
        [98, 234],
        [98, 158],
        [22, 158],
        [22, 98],
        [98, 98],
      ])}"${a}/>`;
    case 'ring':
      return `<path fill-rule="evenodd" d="M128 20 A108 108 0 1 0 128 236 A108 108 0 1 0 128 20 Z M128 78 A50 50 0 1 1 128 178 A50 50 0 1 1 128 78 Z"${a}/>`;
    case 'pentagon':
      return `<polygon points="${pts(regular(5, 112))}"${a}/>`;
    case 'semicircle':
      return `<path d="M20 160 A108 108 0 0 1 236 160 Z"${a}/>`;
    case 'arch':
      return `<path d="M24 232 V140 A104 104 0 0 1 232 140 V232 H176 V140 A48 48 0 0 0 80 140 V232 Z"${a}/>`;
    case 'bolt':
      return `<polygon points="${pts([
        [150, 16],
        [70, 140],
        [122, 140],
        [96, 240],
        [190, 104],
        [136, 104],
      ])}"${a}/>`;
    default:
      throw new Error(`unknown placeholder shape ${shape}`);
  }
}

/**
 * Placeholder sprite: outline, main fill (class fill-main), bottom shade, highlight, variant
 * marker (b: white dot, c: dark stripe) and an asymmetry dot for flippable families.
 * @param {{ shapeIndex: number, variant: string, tags: string[] }} spec
 * @param {number} paletteShift
 * @returns {string}
 */
export function placeholderSprite(spec, paletteShift) {
  const shape = SHAPES[spec.shapeIndex % SHAPES.length];
  const main = intToHex(PALETTE[(spec.shapeIndex + paletteShift) % PALETTE.length]);
  const outline = scaleLightness(main, 0.55);
  const dark = scaleLightness(main, 0.4);
  const parts = [];
  parts.push(`<defs><clipPath id="clip">${shapeElement(shape, '')}</clipPath></defs>`);
  parts.push(
    shapeElement(
      shape,
      `fill="${outline}" stroke="${outline}" stroke-width="14" stroke-linejoin="round"`,
    ),
  );
  parts.push(shapeElement(shape, `class="fill-main" fill="${main}"`));
  parts.push(
    `<g clip-path="url(#clip)"><rect x="0" y="150" width="256" height="106" fill="#000000" opacity="0.18"/>`,
  );
  if (spec.variant === 'b') {
    parts.push(`<circle cx="138" cy="148" r="22" fill="#ffffff" opacity="0.95"/>`);
  } else if (spec.variant === 'c') {
    parts.push(`<rect x="58" y="152" width="140" height="20" fill="${dark}"/>`);
  }
  parts.push(`</g>`);
  parts.push(`<circle cx="92" cy="84" r="16" fill="#ffffff" opacity="0.55"/>`);
  if (spec.tags.includes('flippable')) {
    parts.push(`<circle cx="186" cy="124" r="12" fill="${dark}"/>`);
  }
  return svgDoc(SPRITE_SIZE, SPRITE_SIZE, parts.join(''));
}

function svgDoc(w, h, body) {
  return `<svg xmlns="${SVG_NS}" viewBox="0 0 ${String(w)} ${String(h)}" width="${String(w)}" height="${String(h)}">${body}</svg>`;
}

/**
 * Low-contrast 1080² background tinted with the theme's first palette color (ASSETS.md
 * Backgrounds): a vertical gradient and three large soft shapes.
 * @param {{ id: string, paletteShift: number }} theme
 */
export function placeholderBackground(theme) {
  const base = parseColor(intToHex(PALETTE[theme.paletteShift % PALETTE.length]));
  const hsl = rgbToHsl(base);
  const tone = (s, l) => toHex(hslToRgb({ h: hsl.h, s, l }));
  const top = tone(0.3, 0.17);
  const bottom = tone(0.32, 0.24);
  const accent = tone(0.45, 0.5);
  const body =
    `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/>` +
    `</linearGradient></defs>` +
    `<rect width="1080" height="1080" fill="url(#g)"/>` +
    `<circle cx="820" cy="250" r="300" fill="${accent}" opacity="0.08"/>` +
    `<circle cx="240" cy="840" r="360" fill="${accent}" opacity="0.07"/>` +
    `<path d="M0 700 C 260 620 420 800 700 720 S 980 640 1080 680 V1080 H0 Z" fill="${accent}" opacity="0.06"/>`;
  return svgDoc(1080, 1080, body);
}

const WHITE = '#ffffff';
const DARK = '#2e3650';
const RED = '#e63946';
const GOLD = '#ffc857';
const GRAY = '#4a4f63';
const ORANGE = '#ff7b00';

const HEART =
  'M64 112 C20 80 8 56 20 36 C30 20 52 20 64 38 C76 20 98 20 108 36 C120 56 108 80 64 112 Z';
const NOTE =
  `<circle cx="44" cy="92" r="16" fill="${WHITE}"/><rect x="56" y="28" width="10" height="66" fill="${WHITE}"/>` +
  `<path d="M66 28 C86 36 96 48 90 70 C88 54 78 46 66 42 Z" fill="${WHITE}"/>`;
const SPEAKER = `<polygon points="24,48 48,48 74,26 74,102 48,80 24,80" fill="${WHITE}"/>`;
const SLASH = `<line x1="30" y1="30" x2="98" y2="98" stroke="${RED}" stroke-width="10" stroke-linecap="round"/>`;

/**
 * Placeholder UI icon by frame name (src/data/ui-frames.json). Sizes match the runtime
 * placeholders so HUD code that scales them keeps working: 128² icons, 32² spark, 24×14 confetti.
 * @param {string} name
 * @returns {string}
 */
export function placeholderUi(name) {
  switch (name) {
    case 'heart':
      return svgDoc(128, 128, `<path d="${HEART}" fill="${RED}"/>`);
    case 'heart_empty':
      return svgDoc(128, 128, `<path d="${HEART}" fill="${GRAY}"/>`);
    case 'star':
      return svgDoc(128, 128, `<polygon points="${pts(star(5, 59, 26, 64, 66))}" fill="${GOLD}"/>`);
    case 'star_empty':
      return svgDoc(128, 128, `<polygon points="${pts(star(5, 59, 26, 64, 66))}" fill="${GRAY}"/>`);
    case 'retry':
      return svgDoc(
        128,
        128,
        `<path d="M102 56 A40 40 0 1 1 86 30" fill="none" stroke="${WHITE}" stroke-width="14" stroke-linecap="round"/>` +
          `<polygon points="80,10 108,38 72,48" fill="${WHITE}"/>`,
      );
    case 'spark':
      return svgDoc(32, 32, `<circle cx="16" cy="16" r="14" fill="${WHITE}"/>`);
    case 'confetti':
      return svgDoc(24, 14, `<rect width="24" height="14" fill="${WHITE}"/>`);
    case 'badge':
      return svgDoc(128, 128, `<circle cx="64" cy="64" r="64" fill="${WHITE}"/>`);
    case 'ring':
      return svgDoc(
        128,
        128,
        `<circle cx="64" cy="64" r="58" fill="none" stroke="${WHITE}" stroke-width="10"/>`,
      );
    case 'odd':
      return svgDoc(
        128,
        128,
        `<circle cx="64" cy="64" r="64" fill="${DARK}"/>` +
          `<rect x="30" y="48" width="68" height="10" fill="${WHITE}"/><rect x="30" y="70" width="68" height="10" fill="${WHITE}"/>` +
          `<line x1="84" y1="28" x2="44" y2="100" stroke="${WHITE}" stroke-width="11" stroke-linecap="round"/>`,
      );
    case 'spot':
      return svgDoc(
        128,
        128,
        `<circle cx="64" cy="64" r="64" fill="${DARK}"/>` +
          `<rect x="26" y="40" width="30" height="40" rx="6" fill="${WHITE}"/><rect x="72" y="40" width="30" height="40" rx="6" fill="${WHITE}"/>` +
          [0, 1, 2, 3, 4]
            .map((i) => `<circle cx="${String(36 + i * 14)}" cy="98" r="4.5" fill="${WHITE}"/>`)
            .join(''),
      );
    case 'play':
      return svgDoc(128, 128, `<polygon points="40,24 108,64 40,104" fill="${WHITE}"/>`);
    case 'daily':
      return svgDoc(
        128,
        128,
        `<rect x="20" y="28" width="88" height="84" rx="10" fill="${WHITE}"/>` +
          `<path d="M20 38 A10 10 0 0 1 30 28 H98 A10 10 0 0 1 108 38 V50 H20 Z" fill="${RED}"/>` +
          `<rect x="38" y="18" width="10" height="22" rx="4" fill="${DARK}"/><rect x="80" y="18" width="10" height="22" rx="4" fill="${DARK}"/>` +
          `<polygon points="${pts(star(5, 22, 10, 64, 82))}" fill="${GOLD}"/>`,
      );
    case 'flame':
      return svgDoc(
        128,
        128,
        `<path d="M64 10 C70 40 98 50 98 82 A34 34 0 0 1 30 82 C30 60 46 54 44 32 C52 44 60 46 64 10 Z" fill="${ORANGE}"/>` +
          `<path d="M64 56 C68 70 82 74 82 88 A18 18 0 0 1 46 88 C46 78 56 74 54 62 C58 70 62 68 64 56 Z" fill="${GOLD}"/>`,
      );
    case 'check':
      return svgDoc(
        128,
        128,
        `<polyline points="28,66 54,92 102,40" fill="none" stroke="${WHITE}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>`,
      );
    case 'sound_on':
      return svgDoc(
        128,
        128,
        SPEAKER +
          `<path d="M86 46 A24 24 0 0 1 86 82" fill="none" stroke="${WHITE}" stroke-width="9" stroke-linecap="round"/>` +
          `<path d="M98 32 A42 42 0 0 1 98 96" fill="none" stroke="${WHITE}" stroke-width="9" stroke-linecap="round"/>`,
      );
    case 'sound_off':
      return svgDoc(128, 128, SPEAKER + SLASH);
    case 'music_on':
      return svgDoc(128, 128, NOTE);
    case 'music_off':
      return svgDoc(128, 128, NOTE + SLASH);
    case 'home':
      return svgDoc(
        128,
        128,
        `<polygon points="64,22 112,66 100,66 100,108 28,108 28,66 16,66" fill="${WHITE}"/>` +
          `<rect x="54" y="76" width="20" height="32" fill="${DARK}"/>`,
      );
    case 'hint':
      return svgDoc(
        128,
        128,
        `<circle cx="64" cy="52" r="30" fill="${GOLD}"/>` +
          `<rect x="50" y="82" width="28" height="14" rx="3" fill="${WHITE}"/>` +
          `<rect x="54" y="100" width="20" height="8" rx="3" fill="${DARK}"/>`,
      );
    default:
      throw new Error(`no placeholder for UI frame ${name}`);
  }
}
