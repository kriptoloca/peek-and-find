# PROGRESS.md — where we are

Single source of truth for "where did we leave off". Update at the end of every epic and whenever a decision changes the plan. Read this first at the start of every session.

## Status
Epic: 14 (pause menu, GDD v1.6) and 13 (late-game twists + second ramp, GDD v1.5) done in code; 9 done with placeholder art and sound; 10 and 11 done except the device/QA-tool items; 12 done except the uploads · Next: Hasan's phone pass of the twists, the real art/sound drop-in, then the uploads (Playgama console, QA tool) · Last update: 2026-10-18 · Branch: main
Repo: https://github.com/kriptoloca/peek-and-find

## Session plan (2026-10-18, Epic 13: late-game twists + second ramp)
Hasan's phone pass: level 80 feels "medium"; asked for creative late-game pressure (objects
changing places after a while) and a curve that hooks from level 1 to the end without
frustrating. Decisions in docs/questions.md (same date).
- [x] Difficulty table: fifth column at L150 (gentle second ramp), plateau 80 → 150.
- [x] `src/gen/twist.ts` (pure): shuffle from L30 (Find, Odd), memory from L45 (Find); never on
      Spot, big scenes or the daily chain; chance 25 % → 50 % by L80; seeded per scene.
- [x] Generator: shuffle scenes carry two extra validated layouts (`Scene.shuffles`); Odd
      layouts permute the grid cells; validator checks every layout.
- [x] Rules: the round tracks the current layout; taps resolve against it; taps ignored while
      sprites slide.
- [x] GameScene/HUD: warning pulse 0.9 s before each shuffle (first at 8 s, then every 8 s),
      450 ms slide; memory hides the prompt icons after 3 s, a tap on the prompt (or a find)
      peeks for 1 s; shuffle icon in the HUD; `?twist=` dev param; dev hooks.
- [x] UI frames `shuffle`, `memory` (pipeline SVG + runtime placeholder).
- [x] Tests: unit (table, picker, layouts, validator, rules) + e2e (shuffle moves a target and
      the tap counts at the new place; memory hides and peeks; daily has no twist).
- [x] Docs: GDD v1.5, GENERATOR.md, questions.md, PROGRESS.md.
- [x] Skills: `docs/skills.md` (which enabled skill at which step), CLAUDE.md "Skills"; `design:ux-copy` applied to the store listing; `npm run thumbnails` produces the thumbnail/icon drafts from a real scene (layout check with placeholder art).
- [x] Brand (`canvas-design`): `npm run brand` → `docs/store/brand/` (Peek & Find icon 1024/512 + wordmark, Pebblit profile mark + wordmark, preview sheet); philosophy in `docs/store/brand/philosophy.md`.
- [x] Launch plan (`game-trend-skills:launching-on-zero-budget`): `docs/store/launch-plan.md`; `npm run screenshots` (10 store screenshots); listing gets the "How to play" field and the console field map.
- [x] Brand decisions with `design:design-critique` (`docs/store/brand/critique.md`: scene-blue ground, teal signal) and the brand in the game: wordmark on the boot screen and the Title, Pebblit cairn as the Title's signature (`public/brand/*`, +22 KB initial load).

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
| 10 | Size & performance budget | report done (code) | `docs/size-report.md`: initial load 3.15 MB OGG / 3.17 MB M4A of the 8 MB target (5 MB YouTube target), dist 4.6 MB; no update loops; **phone profile at L80 pending (Hasan)** |
| 11 | Playgama QA tool, certification checklist | checklist done (code) | `docs/certification-checklist.md`: 12 rules with evidence; GameReady order and save persistence now asserted in e2e; **QA tool pending (needs the Playgama account)** |
| 13 | Late-game twists (shuffle from L30, memory from L45; GDD v1.5 §5a) + second difficulty ramp to L150; `?twist=` dev param; HUD marker and "?" prompt | done (code) | 189 unit + 40 e2e; twist layouts validated like the main one; adversarial audit 0/1/1/10 all closed (docs/questions.md 2026-10-18); **phone pass at L30–60 pending (Hasan)** |
| 14 | In-game pause menu (GDD v1.6 §9): pause button freezes the scene, Resume / Sound / Music / Home; star timer leaves frozen time out (also fixes the platform-pause star loss) | done (code) | 191 unit + 50 e2e (`menu.spec`); **phone check pending (Hasan)** |
| 12 | Store assets, submission ZIP | done (code) | `npm run zip` → deterministic `release/peek-and-find-0.1.0.zip` (3.27 MB, index.html at the root, no /test/, limits checked, SHA-256 printed); `docs/store/`: listing, thumbnail brief, video script, submission notes; `tests/store.test.ts` bans young-audience wording; **uploads and the thumbnails need the Playgama account and the art pack (Hasan)** |

## Denetim özeti (2026-10-17, düşman denetçi, HEAD dcfa024 → bu commit)

| Denetim | KRİTİK | YÜKSEK | ORTA | DÜŞÜK | Durum |
| --- | --- | --- | --- | --- | --- |
| Sistem mantığı (CLAUDE.md/GDD/GENERATOR) | 0 | 2 | 6 | 17 | YÜKSEK 2/2 düzeltildi; ORTA 5 düzeltildi, 1 kayıt; DÜŞÜK 12 düzeltildi, 5 kayıt |
| E2E (oyuncu gözünden) | 2 | 5 | 10 | 7 | KRİTİK 2/2, YÜKSEK 5/5 düzeltildi; ORTA 8 düzeltildi, 2 kayıt; DÜŞÜK 5 düzeltildi, 2 kayıt |

Gerekçeli kayıtlar docs/questions.md "adversarial audit" bölümlerinde. İkinci koşu (3259086 üzerinde): sistem denetimi ilk tur bulgularını 14 kapandı / 5 kısmen / 1 açık / 5 kayıt olarak hükme bağladı ve 1 ORTA + 11 DÜŞÜK yeni bulgu verdi; hepsi bu commit'te düzeltildi ya da kaydedildi (questions.md "second round"). E2E ikinci turu ilk tur bulgularını 13 kapandı / 6 kısmen / 3 açık / 2 kayıt olarak hükme bağladı ve 2 YÜKSEK (Spot piksel metriği) + 4 ORTA + 6 DÜŞÜK yeni bulgu verdi; YÜKSEK ve ORTA'ların hepsi bu commit'te düzeltildi, DÜŞÜK'ler düzeltildi ya da kaydedildi (questions.md "E2E re-audit").

## Hasan's steps (outside the code)
- [x] Phone test started 2026-10-16 19:35–19:45: desktop 16:9 and iPhone 9:16 both render; first bug (HUD inside the Spot image) found and fixed. Still wanted: 3 lines on L30/L60 search feel, mirror decoys, Spot miss penalty, rotation.
- [x] Phone test 2 (2026-10-17): "fifth difference not findable" (grey recolor was invisible) and "tap on a shape not registering" (40 px circle under big sprites, taps during pop-in) → fixed in 9e.
- [x] Repo renamed to `peek-and-find` (2026-10-16); made public and GitHub Pages switched to "GitHub Actions" (2026-10-17) so the test links in README.md are live.
- [ ] Art pack: 2–3 candidate links, **SVG sources required** (ASSETS.md). Flat, cute but not childish, no nursery palette. Input contract and drop-in workflow: `assets/README.md`.
- [ ] Sounds: download Kenney "Interface Sounds" / "Digital Audio" (CC0) or pick freesound CC0 clips, drop them as `assets/audio/<name>.wav|ogg` (names in `src/data/audio-manifest.json`), run `npm run audio`. Until then the synthesized placeholders play.
- [x] Playgama developer account opened and YouTube channel created (2026-10-18).
- [ ] Playgama Sandbox (live 2026-10-18; targets 100 plays and 5:00 average play time; `docs/store/launch-plan.md` "Playgama Sandbox"): test the sandbox link on phone and desktop, run the QA tool, post about the game and start the free share-bonus run from "Get More Players" (no paid traffic), then share the link.
- [x] Add Game on developer.playgama.com done 2026-10-18 (`docs/store/launch-plan.md` step 1: fields in `docs/store/listing.md`, ZIP `peek-and-find-0.1.0.zip` SHA `cadf90ac…2bb5`, media from `docs/store/brand/` and `npm run screenshots`), then forward Playgama's feedback. YouTube Playables interest form in parallel. Then `npm run zip` and the upload steps in `docs/store/submission.md`; listing text in `docs/store/listing.md`; icon and profile photo ready in `docs/store/brand/` (2026-10-18); thumbnails per `docs/store/thumbnail-brief.md` once the art pack is in.
- [ ] Phone test of the Bridge build (links in README.md → Test links; `https://kriptoloca.github.io/peek-and-find/test/?fakeads=1&adfast=1`). First report (2026-10-17): no sound heard on iPhone Safari; the ringer switch silences Web Audio there, now worked around (`src/platform/ios-unmute.ts`). Third report (2026-10-17, production link, level 10): still no music, no vibration (iPhone: expected, no API). Diagnostics screenshot received (2026-10-17 19:13): the chain works on iOS 26 (ogg decoded, context running, music playing, bus RMS 0.02); the loop was ≈ −30 dBFS, raised by ≈ 8 dB. **Retest 2026-10-17 evening: sound and music audible on the iPhone, home button works.** Audio diagnostics screenshot 2026-10-18 12:12 (iPhone, in play): ogg+m4a+webAudio true, context running, locked false, music playing, bus level 0.047, dropped 0, missing none, iOS unmute element playing (3 kicks); SFX chain heard (heart_lose, tap_correct, scene_complete, confetti, stars). Audio on iPhone is closed. Still open on the phone: `?fakeads=1&adfast=1` flow, rotation, Android haptics, L80 profile. `?fakeads=1&adfast=1` on iPhone — interstitial after 3 scenes, hint bulb, Continue on the fail screen, rotation during an ad.
- [x] Decided 2026-10-17: in-game home button back to the Title (GDD v1.3), shipped.

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
| Tests | 191 unit + 50 e2e locally, +1 on the live site (+ `npm run tour`, 17 screenshot flows, not a gate) |
| Bundle (dist/) | 5.33 MB shipped (61 files); initial load before GameReady 3.15 MB (OGG) / 3.17 MB (M4A): bundle 1.23 + Bridge 0.29 + kitchen and beach atlases 1.05 (beach unlocks at level 4, so it preloads at boot) + UI 0.03 + backgrounds + audio 0.16 (`docs/size-report.md`) |
| Atlases | 2048×2048 per theme, 112 frames at 208 px; UI 1024×512 |
| Level 80 generation | ≈ 0.4 ms; with the shuffle twist (two extra layouts) still well under 50 ms per scene |
| Asset build | atlases ≈ 7 s, reproducible (CI diff check); sprite/background contrast gate: least contrasting sprite per theme has 39–50 % of its area at ≥ 3:1; audio ≈ 3 s with ffmpeg (presence checked, not bytes) |
| CI | 8/8 runs green on main before this epic |

## Next steps (in order)
0. **Phone check of the pause menu** (Hasan): any scene, tap the bottom-left pause button → Sound/Music toggles, Resume continues the same scene, Home exits: `https://kriptoloca.github.io/peek-and-find/test/?level=12`.
0. **Phone pass of the twists** (Hasan): `https://kriptoloca.github.io/peek-and-find/test/?level=40&twist=shuffle` (board slides every ~10 s, marker pulses before), `https://kriptoloca.github.io/peek-and-find/test/?level=46&twist=memory` (prompt hides at 3 s, tap the "?" to peek), then a natural run from `https://kriptoloca.github.io/peek-and-find/test/?level=30` for ten scenes: pressure or help? Knobs in `src/gen/twist.ts`.
1. **Phone pass of the whole loop** (Hasan): sound on iPhone Safari after the first tap, music toggle, interstitial flow with `?fakeads=1&adfast=1`, rotation. Report in 3 lines.
2. **Epic 10 remainder (Hasan):** 10 scenes at level 80 on the iPhone without drops; `https://kriptoloca.github.io/peek-and-find/test/?level=80` and read `fps` in the dev state if it stutters. Haptics: does an Android phone buzz on correct/wrong?
3. **Drop-ins when they exist:** art per `assets/README.md` (`npm run assets`), sounds per the audio section (`npm run audio`); commit `assets/` + `public/` together. No code change expected.
4. Uploads (Hasan): Playgama account → `npm run zip` → QA tool → listing + thumbnails (`docs/store/`; `npm run thumbnails` regenerates them from the real art). Code side of Epics 11 and 12 is done. With Hasan's computer linked, the upload and the QA tool can run through the browser skills (docs/skills.md).
5. Open tuning items (density/overlap, mirror decoys, empty taps, frame size) stay here until Hasan's feedback on L30/L60. Decided 2026-10-17: second theme at level 4, Odd cells at ±3°.
6. Visual: when the real pack lands, re-run `npm run tour` and re-check the contrast gate output; recommendations for the pack are in docs/visual-review.md §4.

Dev shortcuts: `?level=N`, `?mode=find|odd|spot`, `?twist=shuffle|memory|none`, `?daily=1`, `?today=YYYYMMDD`, `?reset=1`, `?fakeads=1`, `?adfast=1`, `?debug=true` (SDK logs), `?renderer=canvas` (Canvas renderer, e2e on GPU-less machines), `?audiodebug=1` (audio state drawn on screen for phone tests), triple-tap top-left for the dev menu, `/#gen` (M cycles modes). `__peekDebug.state().atlasKeys` lists the loaded atlases, `.audio` the sound state (locked, music, last SFX).
