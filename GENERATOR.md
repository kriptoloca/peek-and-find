# GENERATOR.md — Procedural scene generation spec (v1.1)

All code in `src/gen/` is pure TypeScript, deterministic, Phaser-free.

## 1. RNG
- `hashSeed(s: string): number` → 32-bit (cyrb53 truncated or FNV-1a).
- `Rng` = mulberry32. Methods: `next()`, `int(a,b)` (inclusive), `pick(arr)`, `shuffle(arr)` (in place, Fisher–Yates), `chance(p)`, `gauss(mean, sd)`.
- Scene seed: `hashSeed(\`${mode}:${level}:${attempt}:${seedSalt}\`)` where `seedSalt` comes from the save model.
- Daily seed: `hashSeed(\`daily:${YYYYMMDD}:${i}\`)` for i in 0..4 (no salt). Daily chain levels are fixed: `[10, 20, 30, 40, 50][i]`.

## 2. Difficulty: `params(level: number): Params`
Piecewise-linear curves between the columns, plateau at level 80. All values are design-space (1080×1080 scene square for Find/Odd).

| Param | L1 | L10 | L30 | L80+ |
|---|---|---|---|---|
| objectCount | 12 | 24 | 42 | 60 |
| targetCount (Find) | 1 | 2 | 3 | 5 |
| targetScale | 1.0 | 0.9 | 0.75 | 0.6 |
| decoyRatio | 0 | 0.15 | 0.3 | 0.5 |
| maxOcclusion (fraction of target hidden) | 0 | 0.1 | 0.3 | 0.4 |
| minSpacing (px between centers) | 150 | 120 | 95 | 80 |
| t3 / t2 star thresholds (s) | 8/15 | 12/22 | 18/32 | 25/45 |

Invariant: object centers are ≥ `2 × 40 + 2` px apart in every mode, so object hit circles (Find, Odd) never overlap. In Spot 5 only the five difference circles are tappable; they may overlap and a tap resolves to the nearest center.

Teaching levels: for levels 1–5 target slots are taken from the front band first (large, unoccluded); for levels 1–3 targets are additionally scaled ×1.3 / ×1.2 / ×1.1.

Mode weights by level: L1–5 Find 100%; L6–10 Find 80 / Odd 20; L11+ Find 60 / Odd 20 / Spot 20. If the layout cannot host Spot (see §11), Spot's weight goes to Find. "Big scene" every 25th level: objectCount ×1.3 (cap 80), targetCount 7, thresholds ×2.

Theme: `themes[floor((level-1)/3) % unlockedThemes]`, `unlockedThemes = min(5, 1 + floor(level/10))`. The atlas for the theme that unlocks at level 10k is preloaded from level 10k−3.

## 3. Object model
```ts
type Family = {
  id: string;            // "cat"
  variants: string[];    // ["cat_a", "cat_b", "cat_c"]  (base frames)
  colors: number;        // number of baked color variants per base frame (e.g. 2 → "_c1", "_c2")
  odd?: string;          // optional "cat_odd" frame (missing-part variant)
  tags: string[];        // "animal", "round", "tall", "flippable", ...
  baseSize: number;      // design px, longest side of variant a
}
type Placed = {
  id: string; family: string; frame: string;   // frame = variant + optional color suffix
  x: number; y: number; scale: number; flipX: boolean; z: number;
  isTarget: boolean; isDecoy: boolean; hitRadius: number
}
type Scene = { seed: number; mode: Mode; theme: string; width: number; height: number;
               objects: Placed[]; targets: Placed[]; prompt: Prompt; params: Params }
```
Each theme has 12 families × 3 variants (+ singletons, see ASSETS.md). Families carry tags used for decoy selection. **Color variants are atlas frames baked at build time (ASSETS.md); the generator only picks frame names.**

## 4. Placement algorithm (Find, and the base scene of Spot)
1. Playable rect: scene width×height minus a 100 px margin for object centers (front-band sprites reach ~215 px, so 40 px would let them hang off the edge). Slot coordinates are rounded to integers right after sampling; the hard minimum spacing is `2 × hitRadius + 2` to absorb the rounding. An object's size is additionally capped at twice its distance to the nearest scene edge so every AABB stays inside the square.
2. Depth bands: 3 horizontal bands (back/mid/front). Band scale multipliers 0.8 / 1.0 / 1.15. Objects lower on screen draw on top (z = y).
3. Candidate positions with **Poisson-disc sampling** (Bridson, spatial grid) using `minSpacing`; take `objectCount` positions; if fewer found, relax spacing by 10% and retry (max 3). Spacing never drops below `2 × hitRadius`.
4. Assign families: targets first (see mode), then decoys (`round(decoyRatio × objectCount)`), then filler families weighted to avoid > 25% of any single family.
5. Scale = `band × family.baseSize / referenceSize × jitter(0.9–1.1)`; targets additionally × `targetScale`.
6. flipX with p = 0.5 for families tagged `flippable`.
7. Occlusion pass: per-object visible fraction = 1 − (area of its AABB covered by higher-z AABBs, union approximated by pairwise sum capped at 1). If any target's visible fraction < `1 − maxOcclusion`, move it to a free Poisson slot or raise its z; after 20 failed attempts regenerate with seed+1 (deterministic).
8. Background: theme background + 2–4 large low-contrast props placed first (never targets, never hit-testable).

## 5. Decoys
A decoy is an object meant to be mistaken for a target. For target family F, pick with weights:
- 50%: same family, same or different variant, **different baked color frame** (`_c1`/`_c2`) — same silhouette, different color.
- 30%: different family sharing ≥ 1 tag with F (similar silhouette, e.g. `round` for a ball target → orange, clock).
- 20%: same frame as the target but `flipX` and scale 0.85, placed partially occluded.
Decoys never count as targets. Tapping a decoy = wrong tap. Targets in Find always use the base color frame so the prompt icon matches exactly. Same-family decoys (color, mirror) are scaled with `targetScale` like the targets, so size never gives the answer away; tag decoys keep their natural size.

## 6. Modes
### Find
- Choose `targetCount` instances of ONE family (level < 20) or up to 2 families (level ≥ 20, badges show both).
- Targets must be ≥ 1.5 × minSpacing apart from each other (spread across the scene).
- hitRadius = 40.
- Targets never flip and always use the base color frame; the prompt shows the exact target frame (`icon` = frame), so a separate `_icon` asset is optional. Singleton families (no color variants) are never targets.
- Prompt: `{ kind: "find", items: [{ family, icon: targetFrame, count }] }`.

### Odd One Out
- Jittered grid (not Poisson): `n = clamp(8 + level, 8, 36)` instances of one frame, identical scale; cell size ≥ 2 × hitRadius + jitter, so spacing holds.
- Exactly one "odd" instance differs by one attribute chosen from: baked color variant (`_c1`/`_c2`), flipX (only for `flippable` families), scale ×0.8, missing-part variant (family `odd` frame, if present).
- Difficulty: larger n and subtler attribute (scale/odd-frame before color) at higher levels; the odd item is never in the 4 corners before level 15.
- hitRadius = 40.
- Prompt: `{ kind: "odd" }`.

### Spot 5
- Own scene size **1080×840**. objectCount = `max(8, round(params.objectCount × 0.5))`, object scale × 1.3, objects spaced like Find (`params.minSpacing`, floor 82). Difference hit circles: `r = max(60, objectSize / 2)`.
- Generate the base scene with Find placement (no targets), then clone and apply exactly 5 mutations, each on a different object, each above the visibility threshold: a changed area ≥ **1600 px²** (40×40 design px) or a bounding-box shift/size change ≥ 40 px on one side.
  Mutations: `remove`, `add` (new object in a free Poisson slot), `recolor` (switch to another baked color frame), `flipX` (flippable families only, asymmetric frames), `scale` (×1.3 or ×0.7), `swapFrame` (different variant of the same family).
- Difference hit areas: circle r = max(objectRadius, 60), same id in both images. Taps on either image resolve to the same difference id.
- Prompt: `{ kind: "spot", count: 5 }`.

## 7. Validation (`validate.ts`, run in tests and in dev builds)
- Exactly `targetCount` targets; each visible fraction ≥ 1 − maxOcclusion.
- Every pair of hit-testable objects: center distance ≥ `2 × hitRadius` (implies no hit-circle overlap, targets included).
- Odd: exactly one odd; all others identical in frame/scale/flip.
- Spot: exactly 5 mutations, all on distinct objects, each above the threshold; both images share ids for untouched objects.
- All objects inside the playable rect.
- Family share ≤ 25% of objectCount (fillers), except Odd mode.
- Determinism: `generate(seed, level, mode)` twice → deep-equal.

## 8. Star timing
Timer starts at scene pop-in end; stops when last target is found. `stars = t ≤ t3 ? 3 : t ≤ t2 ? 2 : 1`.

## 9. Performance
Target ≤ 50 ms per scene on a mid-range phone: Poisson sampling with a spatial grid; occlusion approximation with AABBs; no allocations in hot loops beyond arrays sized once.

## 10. Tests (Vitest)
- Determinism for 200 random seeds × 3 modes.
- Invariants in §7 for levels 1, 5, 10, 25, 50, 80, 200.
- Difficulty monotonic: objectCount and decoyRatio non-decreasing, targetScale non-increasing; `minSpacing ≥ 2 × hitRadius` for every level.
- Daily seed stable across timezones (UTC date) and chain levels fixed.
- Spot: mutation count/distinctness/threshold for levels 11, 25, 50, 80.

## 11. Layout hook (not part of gen, but the generator reads it)
`canHostSpot(layout)` = both images fit at design scale ≥ 0.8 in the current canvas. 9:16 → true (stacked, scale 1.0); 16:9 → true (side by side, ≈ 0.87); 1:1 → false. The mode picker receives this flag and never schedules Spot when it is false.
