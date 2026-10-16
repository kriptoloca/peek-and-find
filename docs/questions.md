# Open questions and decisions taken

Format: date · question · decision taken (simplest reading) · needs confirmation?

## 2026-10-16 (Epic 1)

- **"Scale.FIT + RESIZE" in the original brief.** Phaser scale modes are exclusive. Decision: `FIT` with a design size that follows the viewport aspect (short side 1080, long side clamped to [1080, 2400]); `scale.setGameSize()` on viewport change. All gameplay math stays in design px. Documented in GDD §10 and CLAUDE.md rule 5. No confirmation needed.
- **Build < 1 MB (original Epic 1).** Phaser 3.90 alone is ≈ 1.2 MB uncompressed and the platform forbids compression. Budget restated as ≤ 1.5 MB code (GDD §13). Measured value is in the Epic 1 commit message.
- **Near-square aspects (e.g. 1080×1200).** Bands would be < 120 px each; decision: overlay HUD like 1:1 whenever the free space per band is below `HUD_BAND_MIN`. Same rule for landscape columns (< 160 px each).
- **Spot 5 hosting rule.** `canHost = scale ≥ 0.8`. 9:16 → 1.0 stacked, 16:9 → ≈ 0.87 side by side, 1:1 → 0.51 → not hosted. Tablets 3:4 land at ≈ 0.78 stacked, so Spot is skipped there too; acceptable for v1, revisit if tablet traffic matters.
- **Playgama Bridge script host in `audit-dist.mjs` allowlist.** Placeholder `playgama.com`; confirm the exact host from the docs in Epic 8.
- **Viewport source on iOS.** Using `visualViewport` when available, `innerWidth/innerHeight` otherwise; orientation change re-measured after 60 ms and 300 ms. Verify on a real iPhone (Epic 1 phone check).
- **Tall phones (19.5:9, 20:9).** A 1920 clamp letterboxed 75 px bars top and bottom on a 390×844 phone in the headless check. Decision: clamp the long side at 2400 (20:9) instead; bands and the Spot stack are centered, so the extra height becomes background. Verify on the real phone that nothing looks stretched out.
- **`ScaleManager.resize()` vs `setGameSize()`.** `resize()` keeps the display aspect ratio fixed at boot value (Phaser 3.90 source, comment "which doesn't then change"), so 1:1 and 16:9 rendered inside a 9:16 canvas. `setGameSize()` updates the aspect; that is what main.ts uses. Found by the headless smoke check, not by unit tests: layout math was right, the Phaser call was wrong.

## 2026-10-16 (Epic 2)

- **Scene margin 40 vs sprite sizes.** Front-band sprites reach 170 × 1.15 × 1.1 ≈ 215 px, so a 40 px margin lets them hang off the square. Decision: 100 px margin for centers plus a per-object size cap of twice the distance to the nearest edge. Spec updated in GENERATOR.md §4.
- **Rounded coordinates vs spacing guarantee.** Rounding slots to integers can shorten a distance by √2 px, which broke `≥ 2 × hitRadius` at level 80 (spacing exactly 80). Decision: round once right after sampling and keep a 2 px cushion on the hard minimum (82 at the plateau). All later checks and the validator use the same integers.
- **Mirror decoys (same frame, flipped, 0.85×) feel unfair?** Implemented as specified (20% of decoys). A mirrored cat is still a cat to most players; watch the wrong-tap rate on mirror decoys in the Epic 3/4 phone tests and drop the kind or reduce its weight if it dominates fails.
- **Prompt icon.** The prompt shows the exact target frame instead of a separate `_icon` frame, so what you see is what you tap. `_icon` assets stay optional in ASSETS.md.
- **Targets never flip; singletons never targets.** Keeps the prompt an exact match and guarantees color decoys exist. Not in the original spec; now in GENERATOR.md §6.
- **Big scenes at the plateau (78 objects, spacing 82 in 880²).** Poisson yields ≈ 75–85 slots there, so some seeds regenerate (seed+1, deterministic). The scene-gen test asserts the average stays < 5.
- **Size tell.** With `targetScale` applied to targets only, the level-80 preview made targets the smallest teapots on screen. Decision: same-family decoys (color, mirror) use `targetScale` too; tag decoys keep natural size. GENERATOR.md §5 updated.

## 2026-10-16 (Epic 3)

- **Tap on empty background.** GDD §3 only defines wrong taps on objects. Decision: empty taps do nothing (no heart lost, no feedback). Revisit after the phone test if players spam-tap.
- **Retry overlay hit area.** The retry button is a 200 px circle at the scene center +40 px; taps elsewhere on the fail overlay are ignored so a stray tap cannot restart the round. Continue (rewarded) arrives with Epic 8; until then only Retry is shown.
- **Progress is in memory and the seed salt is shared.** `state.ts` holds level/attempt; every player sees the same scenes until Epic 6 persists a per-player `seedSalt`.
- **Overlay timing uses the Phaser clock.** Auto-advance (1.2 s + star reveal) is a `delayedCall`; Phaser clamps per-frame delta at 200 ms, so under the headless software renderer (≈1–2 fps) the overlay stayed ≈ 10 s instead of 1.6 s. On a phone at 60 fps this is exact. Not changed; noted so nobody chases it as a bug in headless runs.
- **Hit circles are independent of sprite size.** A level-80 target of 50 px still has an 80 px tap diameter (CLAUDE.md rule); the placeholder sprites show the circle only on the `#gen` page.
- **Placeholder art.** Shapes are generated at runtime from `previewColor` with hue shifts of ±25° for `_c1`/`_c2`, the same shift the real recolor pipeline will use, so the color-decoy difficulty can already be judged on the phone.
