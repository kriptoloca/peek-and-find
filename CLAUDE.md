# CLAUDE.md — Peek & Find (Pebblit)

You are building a YouTube Playables game published via Playgama Bridge. Read GDD.md, GENERATOR.md, ASSETS.md and TASKS.md before any work. Platform rules below are hard constraints; violating them fails certification.

## Stack
- Phaser 3 (exact version pinned in package.json, never `latest`), TypeScript (strict), Vite. No React, no UI frameworks.
- Package manager: npm. Node ≥ 20. Every dependency is pinned to an exact version (no `^`, no `~`).
- Tests: Vitest for pure logic (generator, difficulty, layout math, save model, ad gating). Playwright smoke test for boot → first scene → tap (optional, after epic 9).
- Commands: `npm run dev` (Vite dev server, LAN exposed for phone testing), `npm run build` (dist/ + post-build bundle audit), `npm test`, `npm run check` (tsc + eslint + prettier --check), `npm run size` (reports dist size and 10 largest files).

## Platform hard constraints (YouTube Playables)
1. **No external network calls.** No fetch/XHR/WebSocket/beacon, no analytics SDKs, no external fonts, no CDN scripts. Everything is bundled. ESLint forbids `fetch(`, `XMLHttpRequest`, `WebSocket`, `navigator.sendBeacon` in `src/`. The post-build audit (`scripts/audit-dist.mjs`) fails the build if `dist/` contains any `http://` or `https://` URL other than the allowlisted Playgama Bridge script, or any `.gz`/`.br`/`.zip` file.
2. **Size:** initial load (everything before GameReady) ≤ 30 MB hard, ≤ 8 MB target. No single file > 30 MB. No build-time compression (no gzip/brotli plugins, no .br/.gz assets). Vite config: `build.assetsInlineLimit = 0`; chunks may be loaded lazily only from the same origin with relative paths.
3. **GameReady** fires only when the player can actually interact (title screen interactive, assets loaded). FirstFrameReady when the first frame is drawn.
4. **Pause/mute:** on platform pause → stop all tweens, timers, audio, input; show dim overlay. On resume → restore. On platform mute → silence everything regardless of in-game sound settings; in-game toggles never override platform state.
5. **Aspect ratios:** 9:16 (primary), 1:1, 16:9 must all be correct. Portrait is required. Implementation: Phaser Scale mode `FIT` with a design size that follows the window aspect. The short side is always 1080 design px; the long side is `1080 × aspect` clamped to [1080, 2400]. On every window resize call `scale.setGameSize(w, h)` (not `resize()`, which keeps the old FIT aspect) and then `layout()`. All gameplay coordinates and hitboxes are in design px. `computeLayout(w, h)` in `src/game/layout.ts` is pure and unit-tested.
6. **Ads:** an interstitial is requested only when BOTH hold: ≥ 3 scenes completed since the last interstitial (or since session start) AND ≥ 120 s elapsed since the last interstitial (or since session start). Never a countdown. Configure Bridge `setMinimumDelayBetweenInterstitial(120)` as a second guard. Rewarded only for Hint and Continue. Always check `isInterstitialSupported` / `isRewardedSupported` (or the equivalent in current Bridge docs) before calling; the game must be fully playable with ads unsupported or failing.
7. **Saves:** through Bridge storage API. Dev fallback: localStorage behind the same interface. Never throw on save/load failure. Save model carries `version` for migrations.
8. **Content:** no text in gameplay, no copyrighted characters/brands/music, no violence beyond cartoon, nothing "made for kids". General audience 13+. Avoid a kids look: no nursery palette, no baby-faced characters, no toddler-style UI. Store text never uses "kids", "children", "toddler", "baby".
9. **No timers before interstitials, no banners, no IAP, no off-platform links of any kind.**

## Rendering rule that follows from the platform
- **Color variation is baked at build time, never produced with runtime tint.** Phaser `setTint` is multiplicative: it can only darken channels and cannot shift hue, so look-alike decoys, odd items and recolor differences must exist as separate atlas frames (`_c1`, `_c2`, see ASSETS.md). Runtime `setTint`/`setTintFill` is allowed only for feedback flashes (white/red) and the hint glow.

## Playgama Bridge SDK
Do NOT implement Bridge integration from memory. Before epic 8, fetch and read the current docs:
- https://wiki.playgama.com (Bridge SDK, platform "YouTube Playables" requirements, monetization best practices)
- https://github.com/Playgama (Bridge repo, JS core integration)
Follow the documented integration for plain JS/TypeScript (not Unity/Godot). Confirm: how the SDK is loaded, config file name/location, lifecycle calls (game ready, in-game loading start/stop, gameplay start/stop), advertisement API names and the minimum-delay setting, storage API names, and the QA tool. Record the exact API names you used in `docs/bridge-notes.md`.

## Project structure
```
src/
  main.ts              # Phaser game config, scale, scene registration
  platform/
    bridge.ts          # thin wrapper over Playgama Bridge: ready/pause/mute/ads/storage, with dev stubs
    storage.ts         # typed save model + fallback
    ads.ts             # interstitial gating (pure, tested) + rewarded helpers
  gen/
    rng.ts             # seeded PRNG (mulberry32), string→seed hash
    difficulty.ts      # level → params (pure)
    poisson.ts         # Bridson sampling with spatial grid (pure)
    scene-gen.ts       # scene composition (pure, no Phaser)
    modes/             # find.ts, odd-one-out.ts, spot5.ts (pure)
    validate.ts        # invariants (pure)
  game/
    scenes/            # Boot, Title, Game, overlays
    layout.ts          # aspect-ratio layout (pure math + Phaser applier)
    hud.ts, audio.ts, fx.ts
  data/
    themes.ts          # theme → object families, palettes, background
    strings.ts         # ≤10 UI strings, i18n map
scripts/               # audit-dist.mjs, size.mjs, recolor.mjs, pack-atlas.mjs
assets/                # source SVG, not shipped raw
public/                # atlases + audio shipped as-is
tests/                 # vitest
docs/                  # questions.md, bridge-notes.md, size-report.md
```
Keep generator and modes **pure** (no Phaser imports) so they are unit-testable and deterministic.

## Coding rules
- TypeScript strict, no `any`. ESLint + Prettier, 100-col.
- Determinism: all randomness goes through `Rng` created from a seed. Same seed → identical scene. Tests assert this.
- No magic numbers in gameplay code; constants live in `difficulty.ts` / `config.ts` with comments.
- Hitboxes: circle; radius 40 design px in Find and Odd One Out, 60 in Spot 5, independent of sprite size. The generator guarantees center distance ≥ 2 × radius between any two hit-testable objects, so circles never overlap. A tap resolves to the nearest center among circles containing the point.
- Every epic ends with: `npm run check` clean, `npm test` green, `npm run build` succeeds, `npm run size` within budget, and a manual check on a phone via LAN dev server.
- Commit per epic: `feat(epic-N): <summary>`; small fix commits allowed.
- Do not add features not in GDD.md. If something is ambiguous, write the question in `docs/questions.md` and choose the simplest reading.
- Performance: object pooling for sprites, one atlas per theme, no per-frame allocations in update loops.

## Definition of done (whole project)
- Playgama QA tool: all checks pass.
- All three aspect ratios screenshot-verified.
- 10 consecutive scenes playable on iPhone 11 without frame drops.
- `docs/size-report.md` shows initial load < 8 MB.
- Platform pause/mute/resume verified with the Bridge test harness.
