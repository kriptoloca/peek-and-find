# Thumbnail brief

Two deliverables: **1280×720** (16:9) and **1080×1080** (1:1). Plus the **512×512 icon** (ASSETS.md).
Produce them from the real art pack; the placeholder shapes are only for layout checks.

## The one idea

Every scene of the game already is a "can you find it?" picture (GDD §2). The thumbnail is one
such scene with **one obvious target circled**, nothing else to explain.

## Composition

- One scene from the kitchen theme at mid density: 12–16 objects, no overlap heavier than the
  level-20 look (`npm run tour` → `L20-find-kitchen-p.png` is the reference density).
- One target (a teapot or a mug, big, front band) circled with a 10–12 px ring in the accent
  yellow `#ffc857`, the circle slightly off-center (rule of thirds, right-hand side).
- The prompt bar of the game is **not** shown; the circle is the prompt.
- Optional single word "FIND?" in the wordmark style, top-left, ≤ 12 % of the height. No other
  text, no numbers, no logo on the 16:9 (the platform adds the title); the 1:1 may carry the
  Pebblit mark bottom-right at ≤ 8 %.
- Safe area: keep the circled target and the word inside the central 80 % of both canvases
  (platform overlays and rounded corners crop the edges).
- Palette: the theme's own colors, background darkened to lightness 0.15–0.25 so the objects
  carry the contrast (docs/visual-review.md); no pastel, no white background.
- Export: PNG, sRGB, no alpha; JPEG q90 as a second file if the console asks for it.

## Icon 512×512

The circled target alone on the theme background (the mug with the yellow ring), no text,
no gradient borders, 48 px inner margin.

## Variants to test

A: circled target (default). B: a magnifier ring instead of a plain circle. Keep the scene,
swap only the ring; pick by click-through if the platform shows the numbers.
