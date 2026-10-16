# PROGRESS.md — where we are

Single source of truth for "where did we leave off". Update at the end of every epic and whenever a decision changes the plan. Read this first at the start of every session.

## Status
Epic: 7 done · Next: Epic 8 Bridge · Last update: 2026-10-16 · Branch: main
Repo: https://github.com/kriptoloca/-peek-and-find (name has a leading dash; rename on GitHub when convenient, old name redirects)

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
| 8 | Playgama Bridge (read docs first), ad gating | next | |
| 9 | Real assets pipeline (SVG recolor, atlas), HUD polish, audio | | needs the art pack |
| 10 | Size & performance budget | | |
| 11 | Playgama QA tool, certification checklist | | |
| 12 | Store assets, submission ZIP | | |

## Hasan's steps (outside the code)
- [x] Phone test started 2026-10-16 19:35–19:45: desktop 16:9 and iPhone 9:16 both render; first bug (HUD inside the Spot image) found and fixed. Still wanted: 3 lines on L30/L60 search feel, mirror decoys, Spot miss penalty, rotation.
- [ ] Art pack: 2–3 candidate links, **SVG sources required** (ASSETS.md). Flat, cute but not childish, no nursery palette.
- [ ] Playgama developer account (developer.playgama.com) and YouTube Playables interest form.
- [ ] Optional: rename the repo to `peek-and-find`.

## Open design questions (decide after the phone test)
- Density/overlap: generator keeps centers ≥ 80–150 px apart and occlusion ≤ 40%; real hidden-object "clutter" may need more overlap at high levels. Tap resolution (nearest center) already allows it; the spacing invariant would have to change to a hit-circle rule.
- Mirror decoys (same frame flipped, 0.85×): keep, reduce weight, or drop.
- Empty-background taps: currently free; penalise if players spam-tap.
- Desktop 16:9 side columns are empty; fill with theme décor in Epic 9.

## Decisions log
See `docs/questions.md` (every deviation from the spec with its reason).

## Measured
| Metric | Value |
|---|---|
| Tests | 109 |
| Bundle | 1.20 MB (Phaser 1.21 MB of it) |
| Level 80 generation | ≈ 0.4 ms |
| CI | 2/2 green |

## Next steps (in order)
1. Epic 8 Bridge: **fetch and read wiki.playgama.com and github.com/Playgama first** (the cloud session's proxy blocked playgama.com once; if it still does, Hasan pastes the Bridge JS quick-start and the advertisement/storage/platform API pages into docs/bridge-notes.md). Then: SDK load, GameReady / loading / gameplay lifecycle, pause/mute, storage adapter implementing `StorageBackend`, pure `platform/ads.ts` gating (3 scenes AND 120 s) with tests, interstitial after scene complete, rewarded Hint (one target glows 2 s) and Continue (refill hearts), dev stubs when the SDK is absent.
2. Epic 9 needs the art pack (SVG) — Hasan's step; everything before it runs on placeholders.
3. Open tuning items from the phone test (density/overlap, mirror decoys, empty taps) stay in docs/questions.md until Hasan's feedback on L30/L60.

Dev shortcuts: `?level=N`, `?mode=find|odd|spot`, `?daily=1`, `?today=YYYYMMDD`, `?reset=1`, triple-tap top-left for the dev menu, `/#gen` (M cycles modes).
