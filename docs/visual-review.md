# Visual review — fonts, icons, backgrounds, eye comfort (2026-10-17)

Question from the product owner: do the fonts, icons and background colors stay the same from
level to level or change, does the look tire the eye, and what does this genre do to keep people
playing? Method: (1) a literature pass, (2) a code audit of every visual constant, (3) a
screenshot tour of the development build (Title, 14 levels across the five themes and three
modes, every overlay, three aspect ratios: `npm run tour`), (4) pixel measurements of the
screenshots and of the shipped atlases. Everything below was measured or seen, not assumed.

## 1. What the research says (and how good it is)

Strong evidence (peer-reviewed visual search):

- Search time is driven by **target–distractor similarity** far more than by the number of
  objects; set size only hurts when look-alikes are present. [Springer, 2024](https://link.springer.com/article/10.3758/s13414-024-02954-y),
  [Springer, 2019](https://link.springer.com/article/10.3758/s13414-019-01818-0),
  [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC4980025/)
- **Clutter** lengthens search and increases the number and duration of fixations, i.e. the
  physical work the eye does per scene. [Applied Ergonomics](https://www.sciencedirect.com/science/article/abs/pii/S0003687021002751)
- **Spacing/crowding** matters less than similarity, even for children. [JOV](https://jov.arvojournals.org/article.aspx?articleid=2213221)

Practitioner guidance (vendor blogs and guidelines, weaker but consistent):

- Backgrounds for find-the-object scenes should be **quiet, monotone and contrasting with the
  objects' tones**; objects blend by lighting and texture, never by vanishing.
  [pocketgamer.biz](https://www.pocketgamer.biz/ducky-importance-of-primary-and-secondary-design-in-hypercasual-scenes),
  [gamedeveloper.com](https://www.gamedeveloper.com/design/the-making-of-a-hidden-object-game-2d-background-art),
  [pixune](https://pixune.com/blog/hidden-object-games-art-design/)
- **Consistency**: one font, one icon style and fixed HUD positions across the whole game;
  variety comes from palette and accents per environment, not from moving UI.
  [andacademy](https://www.andacademy.com/resources/blog/ui-ux-design/game-ui-design/),
  [Roblox UI/UX](https://create.roblox.com/docs/en-us/production/game-design/ui-ux-design)
- **Contrast**: text and HUD at ≥ 4.5:1, graphics at ≥ 3:1 (WCAG), because phones are used in
  sunlight and on weak displays; never carry meaning by color alone (8–10 % of men are
  red/green colorblind). [Game Accessibility Guidelines](https://gameaccessibilityguidelines.com/provide-high-contrast-between-text-ui-and-background),
  [Felgo](https://blog.felgo.com/cross-platform-development/accessible-apps-and-games)
- **Dark UI** is comfortable when the text is not pure white on near-black and the large
  surfaces are mid-dark rather than black; the eye refocuses on hard luminance edges.
  [ktcplay](https://us.ktcplay.com/blogs/support-tips/why-dark-mode-causes-eye-strain-and-how-to-fix) (vendor blog)

No credible source gives retention numbers for the genre; the two pages that claimed any were
anecdotal. The actionable rules are therefore: keep the structure fixed, vary the palette, keep
every object findable by luminance (not only hue), keep clutter a difficulty dial rather than a
default, and avoid hard black frames around bright scenes.

## 2. Audit of the game against those rules

| Area | What the game does (code) | Verdict |
| --- | --- | --- |
| Fonts | One family everywhere (`Arial, Helvetica, sans-serif`, bold): wordmark 104 px, boot 72 px, level number 56 px, ×N badges 34 px, PLAY/DAILY labels. The level number and ×N are the only text in play. | Consistent. It is a system font, so iOS (Helvetica) and Android (Roboto fallback) render it differently; the wordmark becomes an image in the real pack (ASSETS.md "Logo"), the digits can stay. |
| Icons | One UI atlas (21 frames) shared by every scene: hearts, stars, hint, badge, prompt icons. Same positions on every level (`hud.ts`). | Consistent and text-free. The Odd prompt is the "≠" glyph of the pack. |
| HUD placement | Portrait: bands above/below the square. Landscape: left column. 1:1: thin bars over the square's top and bottom edges. Hearts always right/bottom, level always left/top. | Fixed structure, as recommended. Issue A below for 1:1. |
| Frame (canvas outside the scene) | Was one constant navy (`0x1b1f2a`) for the Title and every level. | The same dark box behind every theme; a hard luminance edge around every scene (frame/background ratio 1.25–1.67, same hue family nowhere). Changed, see B. |
| Backgrounds | One 1080² placeholder per theme: vertical gradient in the theme's hue (lightness 0.17–0.24, saturation 0.3) with two faint discs and a wave; the Spot crop is the same image. Theme changes every 3 levels among the unlocked themes; a new theme every 10 levels. | Quiet and monotone (good). The composition is identical across themes, only the hue differs; real art replaces it. The first 9 levels are all kitchen (open question 1). |
| Sprites vs background | Each theme assigns the 16 palette colors to its 16 families (`PALETTE[(i + paletteShift) % 16]`). Measured on the shipped files: in every theme 4–6 families had **less than 3:1** luminance contrast against the background mean, the darkest (dark teal `#264653`) at **1.01–1.31:1**, i.e. findable by hue only. | Finding C, the main one. Fixed in the palette and guarded in the pipeline. |
| Scene composition | Centers ≥ 82–150 px apart, occlusion ≤ 40 %, 9 objects at L1 → 78 at the L80 big scene; Odd is a regular grid; Spot a dense pile at L50. | Clutter rises with level as a dial (good). Odd grids at L34/L40 (49 identical sprites) are the most monotone screens of the tour; by design. |
| Feedback | Correct: pop + sparkle + sound + haptic. Wrong: shake + camera shake + heart pulse + sound + haptic. Hint: pulsing ring. Win: 35 % dim + stars + confetti. Fail: 60 % dim + empty hearts + buttons. Pause: 55 % dim. | Multi-channel, never color-only. Finding D for the fail buttons. |
| Dark UI comfort | Frame navy, not black; HUD text white on navy at 16.5:1; badges dark-on-white at 14:1. | Fine. Pure white digits are kept on purpose: sunlight readability beats the small dark-mode gain of off-white. |

## 3. Findings and what changed

**A. 1:1: the HUD bars sat on the scene with nothing behind them.** Prompt icons and ×N badges
were drawn straight over sprites (tour `L80-find-beach-s`), so a prompt icon could be read as a
scene object. The generator cannot keep that strip free (scenes must be identical on every
aspect, the daily chain depends on it), so the HUD now draws a 45 % dark strip behind its bars in
the overlay placement only (`hud.ts`, `HUD_BACKING_ALPHA`). Bands and columns are unchanged.

**B. One navy frame for every theme.** The frame (bands, columns) now takes the theme's hue at
low saturation and low lightness (`src/game/frame-color.ts`, `frameColorFor`): kitchen and beach
warm, city olive, forest green, space brown. The Title and boot keep the neutral navy. The whole
screen changes mood with the theme (variety) while the HUD stays in place (consistency), and the
edge between the frame and the scene is softer because both share a hue. White HUD text keeps
≥ 7:1 on every frame (tested). The dev state reports `frameColor`.

**C. Dark families were invisible by luminance.** Four palette entries (`#264653`, `#6d597a`,
`#9c6644`, `#d62828`) and two borderline ones were lifted in lightness only, same hues
(`src/data/themes.ts` and `scripts/lib/placeholder-svg.mjs`, kept in sync by a test). After the
change every family color is ≥ 3.1:1 against its theme's placeholder background. The asset pipeline now
measures the rendered sprites: at least 35 % of every base sprite's visible area must reach 3:1
against the background mean, else `npm run assets` fails with the file names
(`SPRITE_BG_MIN_CONTRAST`, `SPRITE_CONTRAST_MIN_SHARE` in `scripts/assets.mjs`; the real pack is
held to the same rule, `assets/README.md`). Measured after the rebuild: the least contrasting
sprite per theme has 39–50 % of its area at 3:1. Backgrounds for beach and space changed by a few
hue degrees (their tone colors were lifted); the other three are identical.

| Theme | Lowest family contrast before | after (fill color) | after (rendered sprite, share of area ≥ 3:1) |
| --- | --- | --- | --- |
| kitchen | 1.23:1 | 3.90:1 | 50 % |
| beach | 1.31:1 | 4.12:1 | 46 % |
| city | 1.01:1 | 3.22:1 | 39 % |
| forest | 1.02:1 | 3.12:1 | 39 % |
| space | 1.15:1 | 3.62:1 | 47 % |

**D. Fail overlay buttons disappeared on the Canvas renderer.** The Retry and Continue discs
were white badge images tinted blue/teal with `setTint`; Phaser's Canvas renderer has no tint at
all (`renderer/canvas/CanvasRenderer.js` contains none), so on a device without WebGL the discs
were white with invisible white icons (tour `fx-lost`). The discs are now drawn with Graphics.
Remaining tinted elements (hint ring, Spot ring, confetti, sparkle) are feedback flashes that
still read as white on Canvas; acceptable and allowed by CLAUDE.md.

**E. Rules seen working in the tour** (no change): the HUD never overlaps the Spot images in any
aspect; targets stay inside the square (a front-band sprite may touch the edge: size is capped at
twice the distance to the edge, `scene-gen.ts`); 1:1 never hosts Spot; the hint ring lands on a
remaining target; the lost heart greys out; stars appear in order; the daily chain ends on the
calendar-with-star overlay with the streak flame; the pause dim covers everything.

## 4. Recommendations for the real art pass (Epic 9c), not done now

1. Backgrounds: keep lightness in the 0.15–0.3 band and saturation ≤ 0.35; vary composition
   per theme (horizon, table edge, road) so themes differ by structure, not only hue. The
   pipeline gate will reject a pack whose objects sink into the background.
2. Give the two greys (`#a8a8a8`, `#b5b5b5`) distinct roles or drop one; two families per theme
   are nearly the same grey and differ by shape only.
3. Wordmark as an image frame (ASSETS.md); consider digits `0–9` and `×` as UI frames so the
   HUD looks identical on iOS and Android.
4. Landscape columns and the portrait bands are empty space; theme props (ASSETS.md) belong
   there, at low contrast so they never compete with the scene.
5. Odd One Out grids: a 2–3 px random rotation and ±4 % scale jitter per cell would break the
   wallpaper look without changing the rule (needs a GDD note first).

## 5. Open questions

1. **Theme cadence.** Levels 1–9 are all kitchen; the second theme arrives at level 10 and the
   rotation only then starts alternating. The research favours early variety where day-0 churn
   is highest. Options: unlock beach at level 4 and keep "every 10" after that, or alternate
   kitchen/beach from level 4. GDD §5 says "a new theme every 10 levels", so this is Hasan's call;
   the code change is one constant (`THEME_UNLOCK_EVERY`) plus the preload lookahead.
2. **Odd grids** (recommendation 5) are a GDD change.

How to repeat the tour: `npm run tour` builds the development bundle, screenshots Title, levels
1/3/5/8/10/12/20/25/30/34/40/50/55/80 and every overlay in 9:16, 16:9 and 1:1, and writes contact
sheets to `test-results/tour/` (`sheet-levels-p.png`, `sheet-land.png`, `sheet-square.png`,
`sheet-fx.png`).
