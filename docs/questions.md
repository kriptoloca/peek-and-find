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
- **Ad results.** An ad call that produces no state within 4 s is treated as finished (a fallback; the SDK normally reports `FAILED` when its delay guard blocks, which the wrapper also treats as finished); an open ad is capped at 120 s. Rewarded = `rewarded` state seen before `closed`/`failed`.
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

## 2026-10-17 (phone test 2 — Spot differences and taps)

- **Invisible fifth difference (root cause: grey color variants).** A Spot "recolor" (and a Find color decoy) swaps a sprite for its `_c1`/`_c2` frame. Those frames are hue rotations of the main fill, and a hue rotation of a grey is the same grey; dull colors moved only ~25 RGB units, which the 18 % shade overlay flattened further. Fix in the pipeline: `variantColor` tints greys cool (`_c1`) / warm (`_c2`), lowers very light fills, lifts dark ones, and pushes saturation, lightness and the rotation angle until at least one channel moves by 48; `scripts/assets.mjs` then measures every `_c1`/`_c2` against its base on the rendered pixels and fails the build when fewer than 8 % of the sprite's pixels change noticeably, so a real pack cannot ship invisible variants either. Runtime placeholders mirror the tint rule. Consequence: some decoys are now more obviously different than the ±25° the GDD describes; tune per theme when real art is in.
- **"The tap on a shape did not register."** Find/Odd hit circles were a fixed 40 px around the center while sprites run up to 170+ px; a tap on the rim of a big ring or pentagon missed and counted as an empty tap, the next tap closer to the center worked. Now `hitRadius = max(base, size / 2)` in every mode; spacing keeps centers ≥ 82 px apart so circles overlap only where sprites overlap, and the nearest center still decides. CLAUDE.md and GDD §6 updated (v1.2).
- **Taps during the pop-in** (first ~0.65 s of a level) were ignored; a fast player who taps right after the auto-advance saw the same "did not register". The first tap now starts the round and counts; the star timer starts at that tap.
- **E2E `rules.spec.ts`** plays these rules: for Spot levels 12/30/55 it reads the five difference centers in both images, crops them from a screenshot and requires ≥ 2 % of the crop's pixels to differ, then finds all five; it taps the rim of the biggest target in a Find scene and expects it found; it taps a level-1 target as early as the state exists and expects the win.

## 2026-10-17 (haptics, audio review, Epic 10)

- **Haptics** (product owner request, GDD v1.2): `src/platform/haptics.ts` fires short Vibration API patterns on correct / wrong / won / lost. Works on Android Chrome and the Android WebView after a gesture; iOS WebKit has no Vibration API, so iPhones get nothing and the game is unchanged. Off while platform-paused. No settings toggle (GDD: no settings screen). Inside the YouTube app on Android it depends on the WebView honouring `navigator.vibrate`; verify on a device.
- **Audio review** for YouTube: compliant (own synthesized material, platform mute wins, nothing before the first gesture, OGG + M4A, within budget). Quality verdict: SFX shippable as a fallback, the 16 s loop is placeholder-grade and should be replaced before launch. Details and measured levels in `docs/audio-review.md`.
- **Epic 10, object pooling.** CLAUDE.md asks for sprite pooling and no per-frame allocations. The scenes have no `update()` loop at all; per level ≤ 40 images are created and destroyed, confetti creates 60 short-lived images per win. At this scale a pool would add code without a measurable gain, so none was added; revisit only if the phone profile shows GC hitches. `fps` and `renderer` are in the dev state (`__peekDebug.state()`) for the phone profile at level 80.
- **Size script** now measures the initial load (everything Boot fetches before GameReady) separately from the whole folder and writes `docs/size-report.md` with `--report`; the budget check applies to the initial load, the hard limit to both.

## 2026-10-17 (visual review — docs/visual-review.md)

- **Frame follows the theme.** The canvas outside the scene (portrait bands, landscape columns) was one navy for every level. It now takes the theme's hue at saturation 0.22 / lightness 0.095 (`src/game/frame-color.ts`); Title and boot keep the navy. Reason: the genre guidance is "fixed structure, varying palette", and a shared hue softens the luminance edge around the scene. White HUD text keeps ≥ 7:1 on every frame (tested).
- **Palette lifted, contrast gated.** Four dark palette entries had 1.0–1.3:1 luminance contrast against the placeholder backgrounds (found by measuring the shipped PNGs); objects were findable by hue alone. Lightness lifted, hues kept; `npm run assets` now fails when less than 35 % of a base sprite's area reaches 3:1 against the background mean (`SPRITE_CONTRAST_MIN_SHARE`). The first metric tried, the sprite's mean color, was too harsh (outlines and shade bands pulled every mean below 3:1 and the fix would have been nursery pastels, GDD §11), so the gate counts area instead. The real pack is held to the same rule. Beach and space backgrounds moved by a few hue degrees because their tone colors were lifted.
- **1:1 HUD backing.** In the overlay placement the HUD bars get a 45 % dark strip; the generator keeps scenes identical across aspects, so the strip, not the layout, separates HUD from scene.
- **Canvas renderer has no tint.** Phaser 3.90's Canvas renderer never reads `tint`; the fail overlay discs are now drawn with Graphics so Retry/Continue look the same on a device without WebGL (and in the Canvas e2e runs). Feedback flashes stay tinted (white on Canvas, fine).
- **Theme cadence** (levels 1–9 all kitchen) and **Odd grid jitter** are open questions for Hasan (visual-review.md §5); GDD rules, not changed.
- **`npm run tour`** (tests/tour) screenshots the whole game in three aspects and builds contact sheets; it is a review tool, not a CI gate (4 minutes).

## 2026-10-17 (phone test 3 — vibration, music, pause/menu)

- **No vibration on the iPhone: expected, not a bug.** iOS WebKit has no Vibration API (`navigator.vibrate` is undefined), so the haptics module is a silent no-op there; Android Chrome and the Android WebView vibrate. Documented in GDD v1.2 and `docs/audio-review.md`; nothing to fix on our side.
- **Music still not heard on iPhone Safari.** The code path is sound in theory (first gesture → Phaser unlock → `refresh()` on `UNLOCKED` starts the loop) and the e2e proves it on Chromium, where the context starts unlocked; the iOS-specific steps (context resume on the gesture, the silent-loop ringer trick, M4A decoding) have never been observed on a device. Instead of guessing, the dev build now draws the audio state on screen: `/test/?audiodebug=1` shows the formats the device accepts, the context state, locked/unlocked, the Title toggles, music wanted/playing, files that failed to decode, the master-bus level and the iOS silent-loop state. One screenshot after tapping PLAY answers which step fails. Also worth checking: the music toggle on the Title is persisted, so a toggle tapped during an earlier test stays off.
- **No pause or menu button in play: by design (GDD §3 "no menus between scenes", §5 "no settings screen", §11 "pause = platform pause").** On YouTube the host app draws its own pause/exit control over the game and sends pause/resume to the Bridge; the game dims and freezes on it (e2e `fx-pause`). The only in-game controls are the Title toggles; the fail overlay has Retry/Continue, Daily Complete returns to the Title. In a plain browser there is therefore no way back to the Title mid-chain without reloading. **Decided (Hasan, 2026-10-17): yes.** GDD v1.3: a home button in the HUD's secondary bar (opposite the hint; top of the right column in landscape) returns to the Title at any time without confirmation. The abandoned scene keeps its seed (same attempt), so PLAY comes back to the same scene; a daily chain restarts from its first scene. `gameplay_stopped` is sent when a round was in progress. Ignored while paused or during an ad. E2E: `player.spec` "home button" in 9:16 and 1:1.

## 2026-10-17 (iPhone audio diagnostics, phone test 3b)

- **What the iPhone screenshot said** (`/test/?audiodebug=1`, iOS 26 Safari): `formats ogg=true m4a=true`, every file decoded (`missing: –`), context `running`, music `wanted=true playing=true`, bus RMS 0.02, silent-loop element `playing` after 13 gestures, 7 button taps played. So the whole audio chain works on the phone; the analyser sits before the hardware, so what it cannot see is the speaker: either the mix was too quiet for a phone speaker (loop ≈ −30 dBFS) or the output was muted (ringer switch / volume). Decision: raise the loop (peak 0.5 → 0.85) and `MUSIC_VOLUME` (0.35 → 0.5), ≈ +8 dB, and ask whether the button clicks (−4 dBFS peaks) were audible; if not, the output is muted, not the game.
- **iOS 26 reports Ogg Vorbis support** and decodes it, so Phaser's `[ogg, m4a]` order picks OGG there too; M4A stays the fallback for older iOS. No change.

## 2026-10-17 (Epic 12 — submission package and store text)

- **`fflate` 0.8.2 (dev dependency)** packs the ZIP: pure JS, tiny, and it lets every entry carry a fixed timestamp, so `npm run zip` gives byte-identical archives on every machine (the `zip` CLI is not on Windows by default and writes local mtimes). The printed SHA-256 identifies a build.
- **The ZIP never contains `dist/test/`** (the development build published for the phone tests) or dotfiles; `index.html` sits at the root; the script fails on `.gz/.br/.zip` inside, on a file above 30 MB or a total above 250 MB, and warns above 512 KB per file (six files do: the bundle and the five atlases; a recommendation, not a limit).
- **Limits.** The YouTube Playables certification page (as found through search on 2026-10-17; the page itself is not reachable from the build machine) states initial bundle under 15 MB (target 5), total under 250 MB (target 15), single file ≤ 30 MB, save data ≤ 3 MB. CLAUDE.md keeps ≤ 8 MB target / ≤ 30 MB hard for the initial load; the stricter YouTube target already holds (2.24 MB). Confirm on the live page before uploading.
- **Store text.** English, text-free game so no localisation; `tests/store.test.ts` fails on any young-audience wording in `docs/store/` and checks the listing structure (title, ≤ 90-char pitch, three-line description, five tags). Thumbnails and the icon wait for the art pack; the brief fixes composition, safe area and palette.

## 2026-10-17 (two tuning decisions, approved by Hasan)

- **Second theme at level 4** (GDD v1.4, `THEME_SECOND_UNLOCK_LEVEL`). Levels 1–3 kitchen, 4–6 beach, 7–9 kitchen, then the usual rotation; city/forest/space keep 20/30/40. Reason: the first session is where churn is highest and the research favours early palette variety with a fixed structure (docs/visual-review.md). Consequence: the preload lookahead (3 levels) now loads the beach atlas at boot for a new player, so the initial load grows by the beach atlas and backgrounds (`docs/size-report.md`, counted by `npm run size`); still far under the 5 MB target.
- **Odd One Out rotation jitter** (GDD v1.4, `ODD_ROTATION_JITTER_DEG = 3`). Every cell, the odd one included, carries a seeded angle within ±3° (`Placed.rotation`, radians); frame, size and flip stay the only attributes that can differ, so the angle is never the tell (validator and test). Scale jitter was considered and dropped: it would blur the `scale` kind (odd item at 0.8×) and break "all regular items identical". Seeds now draw one more random number per cell, so Odd layouts differ from earlier builds (no saved scenes depend on them).

## 2026-10-17 (adversarial audit — two independent reviews, all findings answered)

Two fresh-context auditors reviewed HEAD dcfa024: one the system against CLAUDE.md/GDD/GENERATOR, one the Playwright suite from the player's side. Counts: system KRİTİK 0 · YÜKSEK 2 · ORTA 6 · DÜŞÜK 17; e2e KRİTİK 2 · YÜKSEK 5 · ORTA 10 · DÜŞÜK 7. Every KRİTİK and YÜKSEK is fixed with a test; ORTA/DÜŞÜK are fixed or recorded here. Summary table in docs/PROGRESS.md.

**Fixed in code**
- Platform pause now reaches every scene: the audio manager subscribes to `onPause` itself and reads `isPaused()` at attach; the Title dims, pauses tweens and disables input on pause; the Game reads the initial pause state at create. E2E: the host path (`document.visibilityState` → SDK → pause + audio off) in play and on the Title.
- Mirror visibility: flippable placeholder sprites carry a bar on one side; `npm run assets` fails when fewer than 8 % of a flippable sprite's pixels change under a horizontal mirror (`MIRROR_MIN_CHANGED`, `scripts/lib/frames.mjs`); unit test over every flippable placeholder.
- Bridge init: inside the YouTube host (`ytgame` global or `*.usercontent.goog`) the SDK gets 60 s instead of 6 s before the stub fallback, so a slow handshake cannot lose GameReady.
- `startLevel()` failures no longer freeze the game: loading message closed, one retry with a new attempt, then the Title; a failed boot still opens the Title.
- Fail overlay tweens (`repeat: -1`) are killed with the overlay; the prompt badge pulse uses the frame name (it was a no-op with atlases); daily Retry no longer bumps the attempt; the hint ad is wrapped in `gameplay_stopped/started`; the dev tap zone no longer swallows the first two taps; `game_ready` is sent once per page load on the stub too and the Title sends it only on its first create.
- First-tap SFX: a click requested while the context is still locked plays on unlock instead of being dropped (iOS PLAY click).
- Atlas memory: at most three theme atlases stay loaded (current, next scene/block, upcoming unlock); the rest are released (`releaseThemes`); e2e asserts ≤ 4 atlas keys through the daily chain.
- Theme rotation uses the unlock count of the block's first level: no one-level theme islands at level 30 (forest first appears at 34).
- iOS silent-loop trick is not installed inside the YouTube host. `audit-dist` also rejects `ws://`/`wss://`. The fake ad overlay lets taps through so the game's own ad guard is what the test exercises. The submission ZIP is built and uploaded as a CI artifact.

**E2E suite rebuilt from the player's side**
- A guard fixture puts same-origin and no-console-error checks on every test. Production link: SDK `?debug=true` log shows `game_ready` once, PLAY is tapped at the layout's own position, `gameplay_started` follows and ≥ 20 % of the screen changes. Full loop in 9:16, 16:9 and 1:1; once on WebGL (`?fpsmin=1`). Hint, Continue, Retry, DAILY, toggles, home are real taps at hook-reported positions; the interstitial is shown to block taps; no interstitial before 120 s; Odd One Out played; hearts step 3→2→1→lost; stars; big scene; daily chain started from the Title, Daily Complete tapped, streak 1 → 2 → reset; a tap after rotating counts. Spot pixel test: integer image offset (540×960 viewport), a noise floor from the unchanged objects farthest from any difference (median), threshold = 3 × that median; scenes pinned with `?salt=`; the early-tap test demands the intro state.

**Recorded, not changed**
- Spot "changed area" is the mutated object's visible area; pixel visibility per kind comes from the asset gates (GENERATOR.md updated).
- Feedback effects (hint ring, Spot ring, sparkle, confetti) use runtime tint; CLAUDE.md wording updated to name them. On the Canvas renderer they draw white.
- The daily key is fixed when the chain starts (a chain begun at 23:59 completes under that day), the Title reads the key once per create; both intended.
- Save version change resets instead of migrating: there is only version 1; a migration lands with version 2 (`storage.ts`).
- Theme props (GENERATOR §4 step 8) and mirror-decoy occlusion are not implemented; both wait for the real art pack (ASSETS.md props).
- `hudInBand` is a layout self-check, screenshots are "something drawn": no pixel-level visual regression yet (needs a fixed salt and real art; `npm run tour` is the human review).
- Level 50 (daily scene 5) is always a big scene by the difficulty curve; acceptable as the finale.
- The SDK counts its interstitial delay from the previous ad's close; docs/bridge-notes.md says so.

## 2026-10-17 (adversarial audit, second round on 3259086)

System re-audit: first-round findings 14 closed, 5 partial, 1 open, 5 recorded as intended; new findings KRİTİK 0 · YÜKSEK 0 · ORTA 1 · DÜŞÜK 11. Answered here:
- **Preload vs. eviction (ORTA).** Keeping three atlases by awaiting the next block's theme at every block start re-introduced a loader wait every three levels. Now only the current theme is awaited; the next block's theme and the upcoming unlock load in the background after the scene is up, and the eviction runs when that load completes (`ensureThemes` tracks in-flight loads, so an awaited load and a background one never queue the same atlas twice). E2E: at level 19 the city atlas is already in memory.
- Scene restarts: `init()` resets paused/ad/loading flags; `create()` resumes the tween and clock managers before syncing the platform pause (a Title fallback while paused could have left a frozen scene).
- Loading messages are paired (`sendLoading`), the prompt pulse takes the frame from the generated object (placeholder textures have no frame name), daily scenes never touch `attempt` (no reset after a daily scene, no retry on a daily generation failure), dev-menu taps are counted only on empty background, a failed boot draws UI placeholders before the Title.
- Recorded: the mirror gate's 8 % floor is a smoke test for the asset pack, not a per-object 1600 px² guarantee (small Spot objects with a flip rely on the pack's asymmetry; the real pack has far more than the placeholder bar); `//host/` paths are not scanned by `audit-dist` (every JS comment would match); in 1:1 the HUD strip can cover the top 10 px of an object centred at y ≈ 100, the dim strip and the untouched hit circle keep it playable; `hostedByYoutube()` decides by the frame domain in practice.

E2E re-audit (same round): first-round findings 13 closed, 6 partial, 3 open, 2 recorded; new findings YÜKSEK 2 · ORTA 4 · DÜŞÜK 6. Answered:
- **Spot pixel metric rebuilt (YÜKSEK ×2).** The share is now measured inside the difference's own disc, with every other difference's disc masked out; the noise floor comes only from unchanged objects whose discs are clear of every difference (median of up to twelve), threshold = max(2 %, 3 × median); crop B sits at crop A plus the integer image offset; `devicePixelRatio` is asserted 1; half of the differences are tapped on image B. The placeholder variants now differ by an inner outline that follows the shape (solid white = b, dashed = c), and `npm run assets` fails when two variants of a family differ in fewer than 8 % of their pixels, because a Spot "swap" shows another variant (the old dot/stripe markers were clipped away on thin shapes: knife a vs b differed 0 %).
- **Mute alone**: the SDK's own `_setAudioState(false)` (the entry the YouTube adapter feeds) silences the game while play continues, taps still count and SFX are dropped; `_setAudioState(true)` brings the music back. The pause dim is measured (mean luminance drops by more than 25 %) in play and on the Title. During the interstitial the hint bulb is tapped as well and stays unused.
- Production link: the SDK log must show loading_started < loading_stopped < game_ready < gameplay_started and a `level_started`. The live run checks `version.json` against the workflow's commit (`E2E_EXPECT_SHA`) and reports flaky live tests as failures (`failOnFlakyTests`). Rotation, big scene, fake ad and 120 s tests are pinned with `?salt=`; the dead `simulatePause/tapHint/tapContinue` hooks are gone; navigation aborts are not counted as failed requests.
- Recorded: only one WebGL loop (Find level 1) runs on WebGL, Spot/Odd/hint rings run on Canvas (CI has no GPU; the rings draw white there); `loseScene` picks non-target centres, which spacing keeps outside every target circle; `waitForTimeout` remains where a tween must settle; console warnings fail tests on purpose (the one expected dev warning is allowed).

## 2026-10-18 (save persistence — what survives a reload, asked by Hasan)

- **Decision (as built, confirmed):** the save is one JSON record under `peek-and-find:save` (level, attempt, totalStars, streak, bestStreak, lastDailyDate, dailyDone, scenesPlayed, seedSalt, sound, music, `version`), written after every completed scene, on Retry, on every daily step and on the sound/music toggles; well under 1 KB against YouTube's 3 MB limit. On YouTube it goes through `bridge.storage` into `ytgame.game.saveData`, so it follows the YouTube account across devices; on the web test links (mock platform) it is the browser's localStorage; when the SDK is missing the stub uses localStorage with the same interface. A save or load failure never blocks play (rule 7).
- **In-scene state is not saved.** Found objects, the timer and the hearts of the running scene are lost on a reload; the scene restarts from its seed (`attempt` unchanged, so it is the very same scene) with full hearts. Reasons: a scene lasts 20–60 s, mid-scene resume adds a second save path for little gain, and a reload already costs more than a Continue would. A daily chain restarts at its first scene; the streak and "done today" flag survive.
- **Open (device):** YouTube's save behaviour for a signed-out viewer is documented account-first; whether a guest's save persists across sessions is to be checked in the QA tool / YouTube test environment (certification checklist row 7). The code is correct either way; the worst case is a guest starting at level 1 every visit.
