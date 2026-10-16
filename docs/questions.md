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
