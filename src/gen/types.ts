/** Shared generator types. Pure data, no Phaser (GENERATOR.md §3). */

export type Mode = 'find' | 'odd' | 'spot';

export interface GenRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Family {
  /** Family id within the theme, e.g. "mug". */
  id: string;
  /** Base frame names without color suffix, e.g. ["kitchen_mug_a", "kitchen_mug_b"]. */
  variants: string[];
  /** Number of baked color variants per base frame (`_c1` … `_cN`). 0 for singletons. */
  colors: number;
  /** Optional missing-part frame for Odd One Out. */
  odd?: string;
  tags: string[];
  /** Longest side in design px at band scale 1.0. */
  baseSize: number;
  /** Dev-preview color. Never used by gameplay. */
  previewColor: number;
}

export interface Theme {
  id: string;
  families: Family[];
  background: string;
  props: string[];
  /** Palette base color of the theme: the placeholder background hue and the frame tint. */
  tone: number;
}

export type DecoyKind = 'color' | 'tag' | 'mirror';

export type Band = 0 | 1 | 2;

export interface Placed {
  id: string;
  family: string;
  /** Base frame plus optional color suffix, e.g. "kitchen_mug_b_c1". */
  frame: string;
  x: number;
  y: number;
  /** Longest side in design px after band, jitter and target/decoy scaling. */
  size: number;
  /** size / family.baseSize. */
  scale: number;
  flipX: boolean;
  /** Draw order; larger draws on top. Normally equals y. */
  z: number;
  band: Band;
  isTarget: boolean;
  isDecoy: boolean;
  decoyKind?: DecoyKind;
  hitRadius: number;
}

export interface PromptItem {
  family: string;
  /** Exact frame to show in the prompt bar. */
  icon: string;
  count: number;
}

export type Prompt =
  { kind: 'find'; items: PromptItem[] } | { kind: 'odd' } | { kind: 'spot'; count: number };

export interface Params {
  level: number;
  objectCount: number;
  targetCount: number;
  targetScale: number;
  decoyRatio: number;
  maxOcclusion: number;
  minSpacing: number;
  /** Star thresholds in seconds. */
  t3: number;
  t2: number;
  bigScene: boolean;
}

export type OddKind = 'color' | 'flip' | 'scale' | 'odd';

/** Odd One Out bookkeeping for validation and the dev preview. */
export interface OddInfo {
  kind: OddKind;
  cols: number;
  rows: number;
  /** Grid cell of the odd item. */
  col: number;
  row: number;
  /** Frame every regular item uses. */
  baseFrame: string;
}

export type SpotMutation = 'remove' | 'add' | 'recolor' | 'flip' | 'scale' | 'swap';

/** One of the five differences of a Spot 5 scene. Position/hit circle are shared by both images. */
export interface Difference {
  id: string;
  kind: SpotMutation;
  /** Object id in image A (or in image B for "add"). */
  objectId: string;
  x: number;
  y: number;
  hitRadius: number;
}

/** Spot 5 bookkeeping: image B and the differences. Image A is `Scene.objects`. */
export interface SpotInfo {
  b: Placed[];
  differences: Difference[];
}

export interface Scene {
  seed: number;
  mode: Mode;
  theme: string;
  level: number;
  width: number;
  height: number;
  playable: GenRect;
  /** Effective Poisson spacing after relaxation (≥ 2 × hitRadius). */
  spacing: number;
  /** Effective minimum distance between targets. */
  targetSpacing: number;
  objects: Placed[];
  targets: Placed[];
  prompt: Prompt;
  params: Params;
  /** How many seed+1 regenerations were needed (diagnostics). */
  regenerations: number;
  /** Present for mode "odd". */
  odd?: OddInfo;
  /** Present for mode "spot". */
  spot?: SpotInfo;
}
