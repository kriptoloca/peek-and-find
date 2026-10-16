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

## 2026-10-16 (Epic 3b, after the first desktop look)

- **"×1" badge.** Shown only when the prompt count is ≥ 2; a lone ×1 was visual noise. GDD §3 says "icon + count badge"; reading: the count is implied when it is one.
- **Teaching.** Levels 1–5 put targets in the front band; levels 1–3 add a ×1.3/×1.2/×1.1 size boost; the prompt icon breathes three times after pop-in on levels 1–3. No text, per GDD.
- **`?level=N`** starts at that level in dev builds only, so the curve can be judged without replaying 40 scenes.

## 2026-10-16 (Epic 4)

- **Odd One Out grid.** `cols = ceil(√n)`, `rows = ceil(n / cols)`, cells centred in the playable rect; the unused cells are holes, so the layout reads as "grid-ish" rather than a perfect grid. Jitter is half of the spacing budget, which keeps neighbours ≥ 82 px apart without a validator exception.
- **Regular items never flip.** The base orientation is always unflipped; "flip" as the odd attribute therefore always means the one mirrored item. Simpler than a random base flip and identical to the player.
- **Attribute weights.** < L15: color 60 / flip 25 / scale 15; L15–39: 35 / 30 / 30 / odd 5; L40+: 20 / 30 / 35 / odd 15. The `odd` frame kind is skipped while the theme has no `_odd` frames (placeholder theme has none).
- **Mode per level** is seeded by level and salt only (not attempt), so Retry keeps the mode and changes the scene. Spot stays gated off until epic 5.
- **Odd prompt** shows the ≠ icon with no count badge (count is implicitly one).

## 2026-10-16 (Epic 5)

- **Misses in Spot 5 cost a heart.** A tap inside either image that hits no difference circle is a wrong guess; taps outside both images are ignored. Without this, spam-tapping would solve every Spot scene. Find/Odd keep free empty taps (the objects are the guesses there).
- **Difference hit circle** is `max(60, objectSize / 2)` per GENERATOR.md §6, so a big object counts wherever it is tapped. These circles may overlap each other; a tap resolves to the nearest center. Objects themselves are spaced like Find (≥ 82 px): the first draft spaced them ≥ 122 px and could not fit 30 objects into 880×640 at level 80.
- **Mutations never touch objects hidden more than 50%,** and each kind appears at most twice per scene, so the five differences stay varied and visible. `add` places the new object in a free Poisson slot, so spacing holds in image B too.
- **Layout gate.** The mode is chosen when a level starts, from the current layout. Rotating to 1:1 mid-round keeps the Spot round at the smaller scale; the next level picks a different mode.
- **Pop-in** animates both images together; the star timer starts after the longer of the two.

## 2026-10-16 (phone test, bug 1)

- **HUD drawn inside the top Spot image at level 21 (iPhone).** Cause: rebuilding the prompt items re-applied the layout through the square-scene path, which uses the Find band; the Spot band path was only used on resize, so the first Safari toolbar resize "fixed" it. Fix: the HUD remembers which band set is active and re-applies the same one. The dev state now exposes `hudInBand`, and the headless check walks a Find → Spot transition without reload.

## 2026-10-16 (Epic 6)

- **Save backend.** `platform/storage.ts` defines `StorageBackend { get, set }` (async, like the Bridge storage API); dev builds use localStorage, failures degrade to defaults. `migrate()` coerces every field and starts fresh on an unknown version while keeping the salt, so a player's scene sequence survives a schema bump.
- **What a reload shows.** The save holds level and salt but not the attempt, so a reload replays the first attempt of the current level (same seed). Two different saves see different scenes. Original Epic 6 wording ("different scenes than before") read as "different per player".
- **Themes.** Five placeholder themes carry the real family names, tags and base sizes from ASSETS.md; only the preview palette is fake. Preload = texture generation for now; it becomes a loader job when atlases arrive (Epic 9).
- **Dev menu** opens on three taps in the top-left 160 px square within 0.7 s, dev builds only; the early `import.meta.env.DEV` return keeps its chunk out of production.
- **Spot in retries.** A Retry counts toward `scenesPlayed` (it is a played scene) and is persisted like a win.

## 2026-10-16 (Epic 7)

- **Daily retry replays the same scene.** The daily seed has no attempt component (GENERATOR.md §1), so Retry after a fail shows the identical scene. Intended: the chain is the same for everyone, including its failures.
- **Daily mode choice** is seeded by date and chain index (`daily-mode:YYYYMMDD:i`) with the layout gate, so a 1:1 player can get Find where a 9:16 player gets Spot on the same day. The scene seed is still shared; only the mode weights differ. Acceptable for v1; log it if the leaderboard idea ever returns.
- **Streak display.** Title shows the flame + number while the streak is alive (completed today or yesterday) and nothing after a missed day; `bestStreak` is kept in the save for later use.
- **Title toggles** flip and persist `sound`/`music` now; audio itself arrives in Epic 9.
- **Dev:** `?daily=1` starts the chain directly, `?today=YYYYMMDD` overrides the date key (dev builds only) so streak transitions can be exercised without waiting a day.
