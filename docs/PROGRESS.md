# PROGRESS.md — where we are

Single source of truth for "where did we leave off". Update at the end of every epic and whenever a decision changes the plan. Read this first at the start of every session.

## Status
Epic: 9 done with placeholder art and sound (9g visual review applied); 10 and 11 done except the device/QA-tool items · Next: Epic 12 (store assets, submission ZIP) and the real art/sound drop-in · Last update: 2026-10-17 · Branch: main
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
| 9b | Audio: `npm run audio` (sources → OGG + M4A, synthesized placeholders), `src/game/audio.ts` (platform mute wins, pause, first-gesture music), SFX wired to taps/win/stars/hints/buttons/daily | done (code) | 6 tests; headless: 16 files load at boot, music starts on PLAY, SFX order button → pop → tap_correct → scene_complete → confetti → star_1..3 → tap_wrong, pause stops the music, resume restarts it, no console errors |
| 9c | Real art + sound drop-in (no code change expected), HUD polish pass on the real look | | the art pack, CC0 sounds (kenney.nl was unreachable from the cloud session) |
| 9d | Playwright e2e (links, player path, audio with bus measurement), own boot screen instead of the Bridge logo, iOS silent-switch unmute, GitHub Pages publishing (production + /test/) | done (code) | 15 e2e tests green locally; CI runs them on every push and on the live site after each deploy |
| 9e | Phone test 2 fixes: visible color variants (grey tint, pixel-measured in the pipeline), tap circle = whole sprite, taps during the pop-in count, rules e2e (Spot pixel diff, rim tap, early tap) | done (code) | 20 e2e + 145 unit tests |
| 9f | Haptics (Android; iOS has no API), audio self-review (`docs/audio-review.md`) | done (code) | 4 haptics tests; 149 unit |
| 9g | Visual review (`docs/visual-review.md`): research + audit + screenshot tour (`npm run tour`); theme-tinted frame, palette lifted to ≥ 3:1 against the backgrounds with a pipeline gate, 1:1 HUD backing, fail buttons drawn (Canvas has no tint) | done (code) | 156 unit + 20 e2e; tour sheets reviewed in 9:16 / 16:9 / 1:1 before and after |
| 10 | Size & performance budget | report done (code) | `docs/size-report.md`: initial load 2.24 MB OGG / 2.26 MB M4A of the 8 MB target, dist 4.61 MB; no update loops; **phone profile at L80 pending (Hasan)** |
| 11 | Playgama QA tool, certification checklist | checklist done (code) | `docs/certification-checklist.md`: 12 rules with evidence; GameReady order and save persistence now asserted in e2e; **QA tool pending (needs the Playgama account)** |
| 12 | Store assets, submission ZIP | | |

## Hasan's steps (outside the code)
- [x] Phone test started 2026-10-16 19:35–19:45: desktop 16:9 and iPhone 9:16 both render; first bug (HUD inside the Spot image) found and fixed. Still wanted: 3 lines on L30/L60 search feel, mirror decoys, Spot miss penalty, rotation.
- [x] Phone test 2 (2026-10-17): "fifth difference not findable" (grey recolor was invisible) and "tap on a shape not registering" (40 px circle under big sprites, taps during pop-in) → fixed in 9e.
- [x] Repo renamed to `peek-and-find` (2026-10-16); made public and GitHub Pages switched to "GitHub Actions" (2026-10-17) so the test links in README.md are live.
- [ ] Art pack: 2–3 candidate links, **SVG sources required** (ASSETS.md). Flat, cute but not childish, no nursery palette. Input contract and drop-in workflow: `assets/README.md`.
- [ ] Sounds: download Kenney "Interface Sounds" / "Digital Audio" (CC0) or pick freesound CC0 clips, drop them as `assets/audio/<name>.wav|ogg` (names in `src/data/audio-manifest.json`), run `npm run audio`. Until then the synthesized placeholders play.
- [ ] Playgama developer account (developer.playgama.com) and YouTube Playables interest form.
- [ ] Phone test of the Bridge build (links in README.md → Test links; `https://kriptoloca.github.io/peek-and-find/test/?fakeads=1&adfast=1`). First report (2026-10-17): no sound heard on iPhone Safari; the ringer switch silences Web Audio there, now worked around (`src/platform/ios-unmute.ts`). Third report (2026-10-17, production link, level 10): still no music, no vibration (iPhone: expected, no API). **Next:** open `https://kriptoloca.github.io/peek-and-find/test/?audiodebug=1`, tap PLAY, screenshot the green text box in the corner and send it; also check the music toggle on the Title is on (it is persisted). `?fakeads=1&adfast=1` on iPhone — interstitial after 3 scenes, hint bulb, Continue on the fail screen, rotation during an ad.
- [ ] Decide: in-game home button back to the Title (GDD change; docs/questions.md 2026-10-17 phone test 3).

## Open design questions (decide after the phone test)
- Theme cadence: levels 1–9 are all kitchen (second theme at 10). Early variety helps day-0 retention; unlocking beach at level 4 is one constant (`THEME_UNLOCK_EVERY`) but changes GDD §5 (visual-review.md §5).
- Odd One Out grids read as wallpaper at 7×7; a small per-cell rotation/scale jitter would help, GDD change (visual-review.md §4).
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
| Tests | 156 unit + 20 e2e (+ `npm run tour`, 17 screenshot flows, not a gate) |
| Bundle (dist/) | 4.6 MB shipped; initial load before GameReady 2.24 MB (OGG) / 2.26 MB (M4A): bundle 1.22 + Bridge 0.29 + kitchen atlas 0.50 + UI 0.03 + backgrounds + audio 0.16 (`docs/size-report.md`) |
| Atlases | 2048×2048 per theme, 112 frames at 208 px; UI 1024×512 |
| Level 80 generation | ≈ 0.4 ms |
| Asset build | atlases ≈ 7 s, reproducible (CI diff check); sprite/background contrast gate: least contrasting sprite per theme has 39–50 % of its area at ≥ 3:1; audio ≈ 3 s with ffmpeg (presence checked, not bytes) |
| CI | 8/8 runs green on main before this epic |

## Next steps (in order)
1. **Phone pass of the whole loop** (Hasan): sound on iPhone Safari after the first tap, music toggle, interstitial flow with `?fakeads=1&adfast=1`, rotation. Report in 3 lines.
2. **Epic 10 remainder (Hasan):** 10 scenes at level 80 on the iPhone without drops; `https://kriptoloca.github.io/peek-and-find/test/?level=80` and read `fps` in the dev state if it stutters. Haptics: does an Android phone buzz on correct/wrong?
3. **Drop-ins when they exist:** art per `assets/README.md` (`npm run assets`), sounds per the audio section (`npm run audio`); commit `assets/` + `public/` together. No code change expected.
4. Epic 11 Playgama QA tool + certification checklist (next for me: the checklist with the e2e evidence; the QA tool needs the Playgama account), Epic 12 store assets and ZIP.
5. Open tuning items (density/overlap, mirror decoys, empty taps, frame size, theme cadence, Odd grid jitter) stay here until Hasan's feedback on L30/L60.
6. Visual: when the real pack lands, re-run `npm run tour` and re-check the contrast gate output; recommendations for the pack are in docs/visual-review.md §4.

Dev shortcuts: `?level=N`, `?mode=find|odd|spot`, `?daily=1`, `?today=YYYYMMDD`, `?reset=1`, `?fakeads=1`, `?adfast=1`, `?debug=true` (SDK logs), `?renderer=canvas` (Canvas renderer, e2e on GPU-less machines), `?audiodebug=1` (audio state drawn on screen for phone tests), triple-tap top-left for the dev menu, `/#gen` (M cycles modes). `__peekDebug.state().atlasKeys` lists the loaded atlases, `.audio` the sound state (locked, music, last SFX).
