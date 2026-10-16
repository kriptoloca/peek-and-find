# PROGRESS.md — where we are

Single source of truth for "where did we leave off". Update at the end of every epic and whenever a decision changes the plan. Read this first at the start of every session.

## Status
Epic: 9a done (asset pipeline + atlas loading) · Next: 9b (audio, HUD polish) can start now; real art drops in whenever the pack is chosen · Last update: 2026-10-16 · Branch: main
Repo: https://github.com/kriptoloca/peek-and-find

## Epic board
| # | Epic | State | Gate |
|---|---|---|---|
| 0 | Design docs v1.1 (GDD, GENERATOR, ASSETS, TASKS, CLAUDE) | done | reviewed, 8 corrections applied |
| 1 | Project skeleton, layout, dist audit | done | 10 layout tests, headless 4 aspects |
| 2 | Generator core (Find) | done | 41 tests, L80 ≈ 0.4 ms, #gen preview |
| 3 | Find mode playable | done (code) | headless full round; **phone test pending** |
| 3b | Teaching tweaks (hide ×1, prompt pulse, front-band targets L1–5, ?level= dev param) | done | headless L1/L40 screenshots |
| 4 | Odd One Out | done (code) | 19 tests, headless L8/L34/L20; **phone test pending** |
| 5 | Spot 5 | done (code) | 8 tests, headless L12 stacked / L30 side-by-side, 1:1 gate verified; **phone test pending** |
| 6 | Progression, saves, theme rotation/preload, big scene, dev menu | done (code) | 12 tests; headless: reload keeps level, L10 = beach, L25 big scene (7 targets), dev menu jump |
| 7 | Daily Find + Title screen | done (code) | 8 tests; headless: title → PLAY, title → 5-scene chain → Daily Complete → title with check; streak 1 → 2 → reset after a skipped day |
| 8 | Playgama Bridge 2.3.1 (source read), ad gating, rewarded hint/continue, pause | done (code) | 6 tests; headless: SDK initialises on the mock platform, saves via bridge storage, fake interstitial after 3 scenes, hint, continue, pause blocks input; only same-origin requests |
| 9a | Asset pipeline (`npm run assets`: SVG recolor `_c1`/`_c2`, MaxRects atlas ≤ 2048², Spot background crop, placeholders for missing sources, checker) + atlas loading with preload/on-demand | done (code) | 21 tests; byte-identical rebuild (23/23 hashes); headless: UI + kitchen at boot, beach preloaded at L9, city/forest on demand, Spot crop, 9:16 / 16:9 / 1:1 screenshots, no console errors |
| 9b | Audio (15 SFX + loop, platform mute precedence, nothing before first tap), HUD polish, real art pass | | audio files (CC0) + the art pack |
| 10 | Size & performance budget | | |
| 11 | Playgama QA tool, certification checklist | | |
| 12 | Store assets, submission ZIP | | |

## Hasan's steps (outside the code)
- [x] Phone test started 2026-10-16 19:35–19:45: desktop 16:9 and iPhone 9:16 both render; first bug (HUD inside the Spot image) found and fixed. Still wanted: 3 lines on L30/L60 search feel, mirror decoys, Spot miss penalty, rotation.
- [x] Repo renamed to `peek-and-find` (2026-10-16).
- [ ] Art pack: 2–3 candidate links, **SVG sources required** (ASSETS.md). Flat, cute but not childish, no nursery palette. Input contract and drop-in workflow: `assets/README.md`.
- [ ] Playgama developer account (developer.playgama.com) and YouTube Playables interest form.
- [ ] Phone test of the Bridge build: `?fakeads=1&adfast=1` on iPhone — interstitial after 3 scenes, hint bulb, Continue on the fail screen, rotation during an ad. The build now ships atlases (sprites are tight-cropped, so they look ~15% bigger than before).

## Open design questions (decide after the phone test)
- Density/overlap: generator keeps centers ≥ 80–150 px apart and occlusion ≤ 40%; real hidden-object "clutter" may need more overlap at high levels. Tap resolution (nearest center) already allows it; the spacing invariant would have to change to a hit-circle rule.
- Mirror decoys (same frame flipped, 0.85×): keep, reduce weight, or drop.
- Empty-background taps: currently free; penalise if players spam-tap.
- Desktop 16:9 side columns are empty; fill with theme décor (props) once the pack exists.
- In-atlas frame size landed at 208 px (112 frames per theme in 2048²). If phones show softness on big sprites, options: two atlases per theme, 4096² on WebGL2, or fewer color variants per singleton.

## Decisions log
See `docs/questions.md` (every deviation from the spec with its reason).

## Measured
| Metric | Value |
|---|---|
| Tests | 136 |
| Bundle (dist/) | 4.22 MB: code 1.22 + Bridge 0.29 + 5 theme atlases 2.53 + UI 0.03 + backgrounds 0.04 |
| Atlases | 2048×2048 per theme, 112 frames at 208 px; UI 1024×512 |
| Level 80 generation | ≈ 0.4 ms |
| Asset build | ≈ 7 s, reproducible (CI diff check) |
| CI | 8/8 runs green on main before this epic |

## Next steps (in order)
1. **Epic 9b (no pack needed):** audio module (`src/game/audio.ts`) with platform mute precedence and first-interaction unlock; CC0 SFX from Kenney (OGG + M4A) under `public/audio/`, licenses in `assets/LICENSES.md`; HUD polish (star reveal timing, badge style); then the first phone pass of the whole loop.
2. **When the pack is chosen:** follow `assets/README.md` (copy into `assets/svg/<theme>/`, `npm run assets:check`, `npm run assets`, commit `assets/` + `public/`). The game needs no code change; themes switch from `placeholder` to `svg` in `public/atlases/index.json`.
3. Epic 10 size/perf report (`docs/size-report.md`, phone profile at L80), Epic 11 Playgama QA tool + certification checklist, Epic 12 store assets and ZIP.
4. Open tuning items (density/overlap, mirror decoys, empty taps, frame size) stay here until Hasan's feedback on L30/L60.

Dev shortcuts: `?level=N`, `?mode=find|odd|spot`, `?daily=1`, `?today=YYYYMMDD`, `?reset=1`, `?fakeads=1`, `?adfast=1`, `?debug=true` (SDK logs), triple-tap top-left for the dev menu, `/#gen` (M cycles modes). `__peekDebug.state().atlasKeys` lists the loaded atlases.
