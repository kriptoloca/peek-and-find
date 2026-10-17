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

## 2026-10-16 (Epic 8)

- **SDK shipped with the game, not from the CDN.** `@playgama/bridge@2.3.1` via its Vite plugin in `local` mode: `playgama-bridge.js` (≈ 300 KB) lands in dist next to `index.html`; no `bridge.playgama.com` tag. YouTube blocks external calls, and CLAUDE.md rule 1 asks for everything bundled.
- **Audit exemption.** The SDK file embeds the hosts of every platform adapter it supports (CrazyGames, Poki, AdSense …); on YouTube only `ytgame` is used. `scripts/audit-dist.mjs` skips that one file by name and still scans `index.html` and our bundle. Allowlisting the hosts individually would have hidden real regressions.
- **Wiki unreachable from the cloud session.** All API names come from the SDK source at 2.3.1 (docs/bridge-notes.md cites the files). If the wiki disagrees, the source wins until the package is bumped.
- **Interstitial gate uses the wall clock** (`performance.now()`), not Phaser's clock, so a pause or a slow frame never shortens the 120 s. The SDK's own minimum delay is set to 120 as the second guard.
- **Ad results.** An ad call that produces no state within 4 s is treated as finished (the SDK declines silently when its delay guard blocks); an open ad is capped at 120 s. Rewarded = `rewarded` state seen before `closed`/`failed`.
- **`game_ready`** is sent once, when the Title is up (rule 3); `in_game_loading_*` wraps boot and each scene generation; `gameplay_started/stopped` and `level_*` follow the round.
- **Pause** (platform pause, hidden tab, open ad — the SDK aggregates them) pauses tweens and timers, dims the screen and ignores input; resume reverses it. Audio arrives in Epic 9 and will read `platform.isAudioEnabled()`.
- **Fail overlay** shows Continue (heart + play) left and Retry right when rewarded ads are supported; only Retry otherwise. The hint bulb exists only when rewarded ads are supported.
- **Dev levers:** `?fakeads=1` (DOM overlay stands in for ads, rewards always earned), `?adfast=1` (first interstitial allowed right after three scenes), `__peekDebug.simulatePause/tapHint/tapContinue`.

## 2026-10-16 (Epic 9a — asset pipeline)

- **Placeholders are generated in memory, not committed as SVG files.** `scripts/assets.mjs` builds every frame that has no file under `assets/svg/` from `scripts/lib/placeholder-svg.mjs`, so `assets/` stays empty until the pack arrives and a theme can be replaced family by family (`index.json` says `svg` / `mixed` / `placeholder`). The same script is the only producer of `public/atlases` and `public/backgrounds`.
- **Generated atlases are committed** (≈ 2.6 MB of PNG for the placeholder set) so `npm run build` and the submission ZIP need no sharp at deploy time. CI rebuilds them and fails on any diff, which is the "atlases reproducible" gate of Epic 9. Caveat: rasterization is byte-identical on the same sharp/libvips build (linux-x64 here and in CI); a Mac may differ by a pixel — if that ever bites, rebuild on CI only.
- **Packer is our own MaxRects (best short side fit)** instead of free-tex-packer-cli: ~100 lines, deterministic, unit-tested, no extra dependency. Output is Phaser JSON-hash. Frames are trimmed to their opaque bounding box with 2 px padding; `sourceSize` equals the trimmed size.
- **Frame size falls back from 256 px in steps of 16** until a theme fits 2048². With 112 frames per theme (12 × 3 variants × 3 colors + 4 singletons) it lands at 208 px; a 170-design-px sprite on a 1170-px-wide phone draws at ≈ 184 device px, so no upscaling. Mipmaps are on (`mipmapFilter: LINEAR_MIPMAP_LINEAR`, atlases are power-of-two) for the downscaled small ones.
- **`size` now means the longest side of the visible sprite.** Atlas frames are not square, so `setDisplaySize(size, size)` would distort them; `fitImage()` scales uniformly by the longest side. With placeholders this makes sprites ≈ 15 % bigger than before (the old square texture had a 20 px margin). Hit radius is unaffected (fixed 40 px).
- **Recolor "auto" heuristic** when a pack has no `fill-main` classes: every fill with saturation ≥ 0.2 and lightness in [0.12, 0.9] rotates; strokes never do. Saturated shadows rotate with the main fill, which keeps the shading coherent — ASSETS.md's "shadows unchanged" assumes neutral (gray/black) shadows, which the heuristic leaves alone. The checker warns when a supplied SVG has no recolorable fill (its `_c1`/`_c2` would equal the base).
- **No `_icon` frames.** The prompt shows the exact target frame (variant + color), which color decoys require; a clean family icon would hide the color. Dropped from the frame list; themes.json has no icon entries.
- **Backgrounds** are palette PNGs (`palette: true`, no dither) — the placeholder gradients come out at ≈ 4 KB. The Spot image uses a center 1080×840 crop of the same file, loaded as a second texture (`<theme>_bg_spot`) so no runtime cropping is needed.
- **UI icons are SVG placeholders too** (heart, star, flame, calendar, bulb, speaker, note, home, ≠, compare). They keep their full canvas (no trim) so existing `setDisplaySize` calls keep the old proportions. If the pack brings no UI icons these may stay.
- **Loading model.** Boot loads `atlases/index.json`, then UI + the saved level's theme (+ the one unlocking within 3 levels) before the Title (rule 3). `GameScene.startLevel()` is async and awaits `ensureThemes()`; a generation counter drops a stale load when a newer level started or the scene shut down. A theme missing from the index, or a failed file, falls back to the runtime placeholders with a console error.
- **`src/data/themes.json` is the single source of truth** for families/tags/sizes; `themes.ts` and the pipeline both read it, and a test checks `ui-frames.json` against `ui-keys.ts`.

## 2026-10-16 (Epic 9b — audio)

- **Placeholder sounds are synthesized, not downloaded.** kenney.nl is unreachable from the cloud session, so `scripts/lib/synth.mjs` renders the 15 SFX and a 16 s loop (sine/triangle/bell tones, filtered noise) and `scripts/audio.mjs` encodes them with ffmpeg. Real CC0 files go to `assets/audio/<name>.*` and replace them one by one; `public/audio/index.json` records `file` vs `placeholder`.
- **Audio outputs are committed but not byte-gated in CI.** Vorbis/AAC encoders differ between ffmpeg builds, so CI only checks that every name exists in both formats and within budget (test `committed audio`). Encoding uses `-fflags +bitexact -map_metadata -1` so one machine rebuilds identically.
- **OGG first, M4A fallback.** `load.audio(key, [ogg, m4a])`: Phaser picks the first format the browser can decode (Safari takes the M4A). Mono 44.1 kHz; SFX Vorbis q3 / AAC 48 kbps, loop q0 / 64 kbps → loop 65 KB OGG, 130 KB M4A, everything 161 KB OGG total. ASSETS.md budget (loop ≤ 150 KB, all ≤ 1 MB) holds per format.
- **Music loop is 16 s, not 20–30 s,** to stay under 150 KB in AAC as well. Lengthen when the real loop arrives if its size allows.
- **Gating order:** platform audio enabled → not platform-paused → player's toggle → (SFX) not locked. The platform's `isAudioEnabled` / `onAudio` always win over `progress.sound` / `progress.music`; the toggles never re-enable sound the platform muted (CLAUDE.md rule 4).
- **First gesture.** Nothing is played while Phaser's sound manager is locked (SFX requests are dropped and counted in the debug state). The music starts in the PLAY/DAILY tap handler and keeps running across scenes and back to the Title; it pauses on platform pause and on the music toggle.
- **SFX mapping:** correct tap → `tap_correct_1/2/3` cycling per find; wrong tap → `tap_wrong` then `heart_lose` 150 ms later; round start → `pop` (once, not per sprite); win → `scene_complete` + `confetti`, `star_n` on each star's reveal; hint earned → `hint_reveal`; Retry/Continue/Title buttons and toggles → `button`; daily chain done → `daily_complete`. `sparkle` is loaded but unused for now (the win already layers three sounds); it is reserved for the real-art pass.
- **Pause and Phaser's own `pauseOnBlur`** both act; they agree in practice (hidden tab → both pause; our resume comes from the platform, Phaser's from focus). Left as is; revisit if a platform resumes without focus.

## 2026-10-17 (Epic 9d — e2e, boot screen, iOS audio, Pages)

- **Bridge loading logo is off** (`disableLoadingLogo: true`). The SDK's purple "BRIDGE playgama" splash showed for well under a second on the mock platform and then cut to our dark boot, which read as a glitch on the phone; the SDK option exists for this. Boot now draws the wordmark and a loader progress bar itself. If Playgama's publishing terms require their logo, flip the flag back (one line in `public/playgama-bridge-config.json`).
- **iOS ringer switch.** Safari routes Web Audio through the "ambient" session, which the silent switch mutes; a playing HTMLMediaElement moves the page to "playback". `src/platform/ios-unmute.ts` starts a looping, in-memory silent WAV on the first touch (iOS-like user agents only). Most likely reason the first phone test heard nothing. Inside the YouTube app the host owns the session, so this is for Safari testing.
- **`/test/` is a real development build.** `vite build --mode development` keeps `import.meta.env.DEV` false (NODE_ENV stays "production" for every build), so the first Pages deployment of `/test/` was a production copy without the shortcuts. `scripts/build-test.mjs` sets NODE_ENV explicitly through Vite's JS API, cross-platform.
- **A forced `?mode=spot` respects the layout gate**: in 1:1 it falls back to the normal mode choice with a dev console warning. The game never shows Spot where it cannot host two images, shortcut or not.
- **E2E design.** Playwright 1.56.1 pinned (matches the cloud session's browsers). Targets: local `vite preview` of dist/ (production at `/`, development build at `/test/`) or `E2E_BASE_URL` for the live site. Headless Chromium starts the AudioContext unlocked (`--autoplay-policy=no-user-gesture-required`), so "locked before the first tap" is not asserted; "nothing plays before PLAY" and a real signal on the master bus after PLAY are (an AnalyserNode on Phaser's master gain, exposed as `audio.level` in the dev state). Phaser's clock lags headless, so tests poll the dev state instead of sleeping.
- **CI.** `ci.yml` runs the suite on a local preview; `pages.yml` runs it against the deployed site after every deployment and uploads the screenshots. Triggering workflows through the API is not possible from the cloud session (403), a push is the trigger.

## 2026-10-17 (live-site e2e findings)

- **SDK analytics off** (`sendAnalyticsEvents: false`). The first live e2e run saw requests to `api.playgama.com` from the Bridge analytics module on the Pages site (mock platform). The YouTube adapter disables all SDK external calls itself, so this does not change the submission; it makes the test site behave like YouTube and keeps rule 1 verifiable there (docs/bridge-notes.md "Analytics").
- **Phaser timers on CI.** GitHub runners have no GPU; under SwiftShader WebGL the game drops to a few fps, Phaser caps the delta per frame (`fps.min` 5 → 200 ms), and a 1.6 s auto-advance takes tens of seconds of wall time. Timer-heavy e2e flows (player path, fake ads, daily, audio) therefore run with the dev-only `?renderer=canvas`, which draws the same scenes at full speed headless; the links suite stays on WebGL so both renderers are exercised. CI runs one worker. `fps` and `renderer` are in the dev state for diagnosis.
