# TASKS.md — Epics for Claude Code (paste one at a time)

Each epic: paste the prompt into Claude Code at the repo root. Done = `npm run check` clean, `npm test` green, `npm run build` ok, `npm run size` reported, and the "Done when" list verified. Commit as `feat(epic-N): ...`. After each epic, play on your phone via the LAN dev server and send 3 lines of feedback.

---

## Epic 1 — Project skeleton
**Prompt:** Read CLAUDE.md and GDD.md. Set up Vite + TypeScript (strict) + Phaser 3 (exact pin) + ESLint/Prettier + Vitest. Add scripts: dev (host 0.0.0.0), build (+ post-build `scripts/audit-dist.mjs`: fail on external URLs except the allowlisted Bridge script, fail on .gz/.br/.zip), test, check, size (prints dist/ total and 10 largest files). Add the no-network ESLint rules from CLAUDE.md. Implement the layout model from GDD §10: Scale.FIT with a design size that follows the window aspect (short side 1080, long side clamped to [1080, 2400]); pure `computeLayout(w, h)` returning scene rect(s) and HUD rects for 9:16, 1:1, 16:9 and whether Spot can be hosted; unit tests for it. Render a placeholder scene square, HUD placeholders and a dev-only aspect label. Add `docs/questions.md`.
**Done when:** dev server reachable from phone; rotating the phone / resizing the browser re-layouts without distortion; build ≤ 1.5 MB with the audit passing; layout tests green.

## Epic 2 — Generator core
**Prompt:** Implement `src/gen/` per GENERATOR.md: rng (mulberry32 + hashSeed), difficulty params with the table values and plateau at 80, Poisson-disc placement with spatial grid, depth bands, family assignment with ≤ 25% per family, occlusion pass with AABB visible fraction, validate.ts (including the `≥ 2 × hitRadius` spacing invariant), and Vitest tests for determinism (200 seeds) and invariants (levels 1, 5, 10, 25, 50, 80, 200). Use placeholder families (12 families × 3 variants × 2 colors, baseSize values, tags) in `data/themes.ts` for ONE theme. No Phaser imports in gen/.
**Done when:** tests green; `generate(seed, level, "find")` runs < 50 ms on laptop for level 80; a dev page renders colored rectangles for a generated scene.

## Epic 3 — Find mode playable
**Prompt:** Implement Find mode end to end in Phaser: scene pop-in, prompt bar with family icon + count badge, tap handling with circular hitboxes (r = 40 design px, nearest-center resolution), correct/wrong feedback (pop, shake), 3 hearts per scene, star timing, Scene Complete overlay with auto-advance (1.2 s, tap to skip), Fail overlay with Retry (new seed, same level). Use placeholder sprites (colored shapes with distinct silhouettes and 2 color variants each). Level advances on completion; level persisted in memory for now.
**Done when:** 10 consecutive scenes playable on phone; wrong taps cost hearts; stars shown; no timer visible.

## Epic 4 — Odd One Out mode
**Prompt:** Implement Odd One Out per GENERATOR.md §6 (jittered grid with spacing guarantee, exactly one odd by color frame/flip/scale/odd-frame, corner rule before L15) with tests. Wire into mode rotation (L6+). Prompt bar shows the "≠" icon.
**Done when:** tests assert exactly one odd; playable on phone; difficulty visibly increases.

## Epic 5 — Spot 5 mode
**Prompt:** Implement Spot 5 per GENERATOR.md §6: own 1080×840 base scene, half objects, ×1.3 scale, minSpacing ≥ 120, r = 60; clone with exactly 5 mutations on distinct objects above the 1600 px² / 40 px threshold; stacked layout in portrait, side-by-side in landscape, never scheduled when `canHostSpot` is false (1:1); taps on either image resolve to difference ids; found differences get a ring on both images. Tests for mutation count/distinctness/threshold and for the layout gate. Wire into rotation (L11+).
**Done when:** 9:16 and 16:9 lay out both images without overlap and with hit circles ≥ 48 design px effective; 1:1 never shows Spot; tests green.

## Epic 6 — Progression, saves, difficulty tuning
**Prompt:** Implement `platform/storage.ts` with the save model from GDD §8 (including `version` and `seedSalt`) behind an interface; dev fallback localStorage; never throw; migration hook keyed by `version`. Save after every scene. Implement theme rotation/unlock with background preload of the next theme 3 levels before unlock, big scene every 25th level, mode weights by level and layout gate. Add a hidden dev menu (triple-tap top-left in dev builds only) to jump to a level and a mode.
**Done when:** reload resumes at the same level with different scenes than before (salt works); level 25 shows a big scene; theme switch at level 10 has no visible stall; dev menu works and is stripped from production builds.

## Epic 7 — Daily Find
**Prompt:** Implement Daily per GDD §7: UTC date seed, fixed chain levels 10/20/30/40/50, no salt, streak logic (consecutive days), daily badge, Title button state (done/not done, streak number), Daily Complete overlay. Tests for seed stability, chain identity across two different save states, and streak transitions (same day, next day, skipped day).
**Done when:** two devices on the same day with different levels get identical chains; streak increments correctly in tests.

## Epic 8 — Playgama Bridge integration
**Prompt:** First fetch and read https://wiki.playgama.com and https://github.com/Playgama for the current Bridge SDK (JS core). Write `docs/bridge-notes.md` with the exact API names and lifecycle you will use. Then implement `platform/bridge.ts`: SDK load per docs, GameReady / first-frame / loading / gameplay lifecycle, pause/resume, mute, storage adapter, interstitial gating per CLAUDE.md rule 6 (pure `platform/ads.ts` with tests: scene count AND 120 s, plus Bridge minimum delay 120), rewarded for Hint (one target glows 2 s) and Continue (refill hearts). Every ad call checks platform support and has a no-op fallback. Dev stubs when SDK is absent.
**Done when:** game runs identically with and without the SDK; pause/mute verified with the Bridge test tools; ad gating tests green; bridge-notes.md complete.

## Epic 9 — HUD, FX, audio, real assets
**Prompt:** Build the asset pipeline: `scripts/recolor.mjs` (SVG hue variants `_c1`/`_c2`, deterministic), `scripts/pack-atlas.mjs` (one atlas per theme + UI atlas, ≤ 2048², trimmed, 2 px padding), background crops for Spot. Replace placeholders with the real atlases from ASSETS.md (UI atlas + first theme; other themes preloaded from the bundle). Implement HUD polish, confetti, sparkle, pop tweens, star reveal, hint glow. Integrate audio (OGG + M4A), platform mute precedence, no audio before first interaction. Verify decoy readability on a phone.
**Done when:** screenshots at 9:16, 1:1, 16:9 look finished; audio works on iPhone Safari after first tap; color decoys are distinguishable but not obvious; atlases reproducible from `npm run assets`.

## Epic 10 — Size and performance budget
**Prompt:** Run `npm run size`; get initial load ≤ 8 MB (hard 30 MB), no file > 30 MB, no compression plugins. Object pooling, no per-frame allocations, one atlas per theme. Profile on phone: 10 scenes at level 80 without drops. Write `docs/size-report.md`.
**Done when:** size report committed; 60 fps on iPhone 11 at level 80.

## Epic 11 — Playgama QA tool and certification checklist
**Prompt:** Run the Playgama QA tool against the build. Fix every failing item. Verify: GameReady only when interactive, pause/mute/resume, aspect ratios, no external calls (inspect network tab: zero requests after load except SDK-documented ones), save/restore, ads with support checks, no timers before interstitials, interstitial spacing ≥ 120 s observed in a 10-minute session. Produce `docs/certification-checklist.md` with evidence (screenshots, network log).
**Done when:** QA tool all green; checklist complete.

## Epic 12 — Store assets and submission package
**Prompt:** Produce the submission ZIP per Playgama docs (structure, size). Draft store listing (English, never the words kids/children/toddler/baby): title, 1-line pitch, 3-line description, 5 tags. Thumbnail brief for 1280×720 and 1080×1080 (single scene, one obvious target circled, optional "FIND?"). Script for a 15 s gameplay video (no voice/text).
**Done when:** ZIP builds reproducibly; listing + briefs in `docs/store/`.

---

## After launch (not epics)
- Day 1–14: record plays/day daily in `docs/metrics.md`.
- Day 14 decision per GDD §14.
- Same build → CrazyGames and GameDistribution via Bridge (Poki excluded: exclusivity).
