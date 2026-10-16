# PROGRESS.md — where we are

Single source of truth for "where did we leave off". Update at the end of every epic and whenever a decision changes the plan. Read this first at the start of every session.

## Status
Epic: 3 done, 4 in progress · Last update: 2026-10-16 · Branch: main (CI green)
Repo: https://github.com/kriptoloca/-peek-and-find (name has a leading dash; rename on GitHub when convenient, old name redirects)

## Epic board
| # | Epic | State | Gate |
|---|---|---|---|
| 0 | Design docs v1.1 (GDD, GENERATOR, ASSETS, TASKS, CLAUDE) | done | reviewed, 8 corrections applied |
| 1 | Project skeleton, layout, dist audit | done | 10 layout tests, headless 4 aspects |
| 2 | Generator core (Find) | done | 41 tests, L80 ≈ 0.4 ms, #gen preview |
| 3 | Find mode playable | done (code) | headless full round; **phone test pending** |
| 3b | Teaching tweaks (hide ×1, prompt pulse, front-band targets L1–5, ?level= dev param) | in progress | |
| 4 | Odd One Out | next | |
| 5 | Spot 5 | | |
| 6 | Progression, saves, difficulty tuning, theme preload, dev menu | | |
| 7 | Daily Find | | |
| 8 | Playgama Bridge (read docs first), ad gating | | |
| 9 | Real assets pipeline (SVG recolor, atlas), HUD polish, audio | | needs the art pack |
| 10 | Size & performance budget | | |
| 11 | Playgama QA tool, certification checklist | | |
| 12 | Store assets, submission ZIP | | |

## Hasan's steps (outside the code)
- [ ] Phone test of Epic 3: play ≥ 10 scenes on iPhone Safari via LAN, send 3 lines (first-scene clarity, tap feel on small targets, color/mirror decoy fairness after L20, rotation/iOS toolbar).
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
| Tests | 59 |
| Bundle | 1.18 MB (Phaser 1.21 MB of it) |
| Level 80 generation | ≈ 0.4 ms |
| CI | 2/2 green |

## Next steps (in order)
1. Epic 3b teaching tweaks → commit, push.
2. Epic 4 Odd One Out: jittered grid, one odd attribute, corner rule < L15, rotation from L6, ≠ prompt icon, tests, headless check → commit, push.
3. Epic 5 Spot 5: own 1080×840 scene, 5 mutations, stacked/side layout, layout gate → commit, push.
4. Epic 6 progression + saves (needs Bridge storage interface stub) → then Epic 7 Daily.
5. Epic 8 Bridge: read wiki.playgama.com first, write docs/bridge-notes.md.
