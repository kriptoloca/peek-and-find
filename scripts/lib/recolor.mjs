// SVG recolor (ASSETS.md "Recolor pipeline"): rotates the hue of the main fills by a fixed number
// of degrees and leaves outlines, highlights and shadows alone. Pure text transform, deterministic.
//
// Two modes:
//  - "class": the pack marks recolorable shapes with class="fill-main" (or a `.fill-main` CSS rule).
//    Only those fills change, and always visibly (greys are tinted, see variantColor).
//    Chosen automatically when the file contains the class.
//  - "auto":  no classes → every plain-colored fill that passes isMainColor() rotates
//    (saturated, not near-black, not near-white). Strokes never rotate.
import { isMainColor, parseColor, rotateHue, variantColor } from './color.mjs';

export const MAIN_CLASS = 'fill-main';

// Start tags (including self-closing). Attribute values never contain ">" in sane SVG.
const TAG_RE = /<([a-zA-Z][\w:.-]*)((?:\s[^>]*?)?)(\/?)>/g;
const STYLE_BLOCK_RE = /(<style[^>]*>)([\s\S]*?)(<\/style>)/gi;
const CLASS_ATTR_RE = /\sclass\s*=\s*(["'])([^"']*)\1/;
const FILL_ATTR_RE = /(\s(?:fill|stop-color)\s*=\s*)(["'])([^"']*)\2/g;
const STYLE_ATTR_RE = /(\sstyle\s*=\s*)(["'])([^"']*)\2/g;
const DECL_RE = /((?:^|;)\s*(?:fill|stop-color)\s*:\s*)([^;]+)/g;
const RULE_RE = /([^{}]+)\{([^}]*)\}/g;

/**
 * @param {string} svg
 * @returns {boolean} true when any element or CSS rule uses the fill-main class
 */
export function hasMainClass(svg) {
  return (
    new RegExp(`class\\s*=\\s*["'][^"']*\\b${MAIN_CLASS}\\b`).test(svg) ||
    new RegExp(`\\.${MAIN_CLASS}\\b`).test(svg)
  );
}

/**
 * Rotates one color value if it is eligible.
 * @param {string} value
 * @param {number} degrees
 * @param {boolean} checkMain apply the isMainColor heuristic (auto mode)
 * @returns {string | null} new value or null when unchanged
 */
function rotateValue(value, degrees, checkMain) {
  const rgb = parseColor(value);
  if (!rgb) return null;
  // auto mode: only clearly colored fills rotate (greys are shadows there);
  // class mode: the author marked this fill, so the variant must always be visible.
  if (checkMain) return isMainColor(rgb) ? rotateHue(value, degrees) : null;
  return variantColor(value, degrees);
}

/**
 * Rewrites `fill:` / `stop-color:` declarations in a CSS declaration list.
 * @param {string} decls
 * @param {number} degrees
 * @param {boolean} checkMain
 * @param {{ n: number }} stats
 */
function recolorDeclarations(decls, degrees, checkMain, stats) {
  return decls.replace(DECL_RE, (all, head, value) => {
    const next = rotateValue(value.trim(), degrees, checkMain);
    if (next === null) return all;
    stats.n += 1;
    return `${head}${next}`;
  });
}

/**
 * @param {string} attrs the attribute part of a start tag
 * @param {number} degrees
 * @param {boolean} checkMain
 * @param {{ n: number }} stats
 */
function recolorAttributes(attrs, degrees, checkMain, stats) {
  let out = attrs.replace(FILL_ATTR_RE, (all, head, quote, value) => {
    const next = rotateValue(value, degrees, checkMain);
    if (next === null) return all;
    stats.n += 1;
    return `${head}${quote}${next}${quote}`;
  });
  out = out.replace(STYLE_ATTR_RE, (all, head, quote, value) => {
    const next = recolorDeclarations(value, degrees, checkMain, stats);
    return next === value ? all : `${head}${quote}${next}${quote}`;
  });
  return out;
}

/**
 * @param {string} svg SVG source text
 * @param {number} degrees hue rotation (+25 for `_c1`, −25 for `_c2`)
 * @param {{ mode?: 'class' | 'auto' }} [opts] force a mode; default detects from the file
 * @returns {{ svg: string, recolored: number, mode: 'class' | 'auto' }}
 */
export function recolorSvg(svg, degrees, opts = {}) {
  const mode = opts.mode ?? (hasMainClass(svg) ? 'class' : 'auto');
  const checkMain = mode === 'auto';
  const stats = { n: 0 };

  // 1. <style> blocks
  let out = svg.replace(STYLE_BLOCK_RE, (all, open, css, close) => {
    const nextCss = css.replace(RULE_RE, (rule, selector, decls) => {
      const eligible = mode === 'auto' || new RegExp(`\\.${MAIN_CLASS}\\b`).test(selector);
      if (!eligible) return rule;
      const next = recolorDeclarations(decls, degrees, checkMain, stats);
      return next === decls ? rule : `${selector}{${next}}`;
    });
    return nextCss === css ? all : `${open}${nextCss}${close}`;
  });

  // 2. element attributes (fill="…", stop-color="…", style="fill:…")
  out = out.replace(TAG_RE, (all, name, attrs, selfClose) => {
    if (name.toLowerCase() === 'style') return all;
    if (mode === 'class') {
      const cls = CLASS_ATTR_RE.exec(attrs);
      if (!cls || !cls[2].split(/\s+/).includes(MAIN_CLASS)) return all;
    }
    const next = recolorAttributes(attrs, degrees, checkMain, stats);
    return next === attrs ? all : `<${name}${next}${selfClose}>`;
  });

  return { svg: out, recolored: stats.n, mode };
}

/**
 * Lists the plain fill colors of a file with their occurrence counts (diagnostics for the
 * asset checker: a sprite with no recolorable fill would get identical `_c1`/`_c2` frames).
 * @param {string} svg
 * @returns {Map<string, number>} lowercase hex → count
 */
export function listFills(svg) {
  const counts = new Map();
  const add = (value) => {
    const rgb = parseColor(value);
    if (!rgb) return;
    const key = rotateHue(value, 0) ?? value;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  };
  for (const m of svg.matchAll(FILL_ATTR_RE)) add(m[3]);
  for (const m of svg.matchAll(STYLE_ATTR_RE)) {
    for (const d of m[3].matchAll(DECL_RE)) add(d[2].trim());
  }
  for (const m of svg.matchAll(STYLE_BLOCK_RE)) {
    for (const d of m[2].matchAll(DECL_RE)) add(d[2].trim());
  }
  return counts;
}
