# assets/ — source art (never shipped raw)

`npm run assets` reads `assets/svg/` and writes `public/atlases/` (one atlas per theme + `ui`)
and `public/backgrounds/` (1080² square + 1080×840 Spot crop per theme). Every missing source is
replaced by a generated placeholder, so the game is always complete; `public/atlases/index.json`
records per theme whether the frames are `svg`, `placeholder` or `mixed`.

`npm run assets:check` lists what is present and missing without building.

## Folder layout

```
assets/svg/<theme>/<family>_a.svg      12 families × variants a, b, c (names: src/data/themes.json)
assets/svg/<theme>/<family>_b.svg
assets/svg/<theme>/<family>_c.svg
assets/svg/<theme>/<singleton>_a.svg   4 singletons per theme
assets/svg/<theme>/background.svg      or background.png, ≥ 1080×1080 (cover-cropped to square)
assets/svg/ui/<name>.svg               names: src/data/ui-frames.json
assets/LICENSES.md                     license + purchase proof of every pack used
```

Themes: `kitchen`, `beach`, `city`, `forest`, `space`. Example: `assets/svg/kitchen/mug_b.svg`.

## Sprite SVG contract

- One object per file, centered, filling most of the viewBox. A square viewBox (e.g.
  `0 0 256 256`) is easiest; the pipeline trims transparent borders and scales the longest side to
  the in-atlas frame size, so the viewBox size itself does not matter.
- Plain SVG: no `<text>`, no `<image>`, no external references, no fonts, no CSS variables.
  Gradients, clip paths and opacity are fine (rendered by librsvg through sharp).
- **Main fills carry `class="fill-main"`** (on the element, with `fill="…"` or `style="fill:…"`,
  or through a `.fill-main { fill: … }` rule). Those fills rotate by +25° (`_c1`) and −25° (`_c2`);
  outlines, highlights and shadows stay. A file without the class falls back to "auto" mode: every
  saturated mid-tone fill rotates. Check the atlas PNG after the first build.
- A family's variants a/b/c share the silhouette class (tags in themes.json) but must be
  distinguishable in shape or detail at 100 px on a phone.
- Flippable families need asymmetric art (mirror decoys flip the sprite).
- Colors: 2–3 tone shading, 0–2 px outlines, no nursery pastels (GDD §11).

## Backgrounds

Low contrast, no small details that compete with objects. The pipeline quantizes to a palette PNG
and reports when a file exceeds 200 KB.

## UI icons

`128×128` viewBox (spark `32×32`, confetti `24×14`). White glyphs except the ones the game shows
untinted: heart red, star gold, flame orange/gold, hint gold. UI frames keep their full canvas
(no trimming), because the HUD scales them by canvas size.

## Workflow when the pack arrives

1. Unzip into a scratch folder. Write license and purchase proof into `assets/LICENSES.md`.
2. Copy or rename files into `assets/svg/<theme>/` with the names above (12 × 3 + 4 per theme).
   Add `class="fill-main"` to the main fills if the pack does not have it.
3. `npm run assets:check` until nothing is missing for that theme.
4. `npm run assets`, open `public/atlases/<theme>.png`: are `_c1`/`_c2` visible but not garish?
   Run the game (`npm run dev`) and look at the theme on a phone.
5. Commit `assets/` and `public/` together. CI rebuilds the atlases and fails when the committed
   output is stale (`git diff --exit-code -- public/atlases public/backgrounds`).

## Audio (`npm run audio`)

Sources: `assets/audio/<name>.wav|ogg|mp3|flac|m4a` with the names of `src/data/audio-manifest.json`
(15 SFX + `music_loop`). `npm run audio` encodes mono OGG + M4A into `public/audio/` with ffmpeg
(libvorbis + aac) and writes `public/audio/index.json`; a missing source is synthesized. Budgets:
loop ≤ 150 KB, everything ≤ 1 MB per format. `npm run audio:check` lists what is present.
Keep clips trimmed (no leading silence); the loop must be seamless (ends on the bar).
