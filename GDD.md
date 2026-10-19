# Peek & Find — Game Design Document v1.1

Studio: Pebblit (@pebblitgames) · Working title: **Peek & Find** (no duplicate found on app stores as of 2026-10-16; nearest is "Seek & Find" by Felicity Games. Re-check YouTube Playables catalog and Google Play before submission; fallbacks: "Find 3!", "Hidden Hunt")
Platform: YouTube Playables (via Playgama Bridge), then CrazyGames + GameDistribution with the same build.
Language: text-free gameplay. ≤10 UI strings, English by default, i18n-ready.

## 1. One-liner
A crowded, colorful scene. Find what the icon at the top asks for. Tap it. Next scene. Infinite, procedurally generated, one finger, understood in 10 seconds.

## 2. Why this will work on Playables (constraints → design)
- Discovery is a thumbnail game → every scene *is* a "can you find it?" thumbnail.
- One-finger mechanic, no tutorial → first scene teaches itself (1 target, huge, unoccluded).
- No external calls allowed → all content procedural, all assets bundled.
- Progress syncs via YouTube account → daily chain + streak work with zero backend.
- Must not target kids, must suit 13+ → ageless design: no text, no reading, cartoon-safe, no violence, no nursery look.
- 10-minute average session target → scenes are 20–45 s; seamless chain; no menus between scenes.

## 3. Core loop (Find mode)
1. Scene pops in (0.3 s). Top bar shows target icon(s) with count badges (e.g. cat ×3).
2. Player taps objects.
   - Correct: a short hit stop and a screen kick, the object flashes, leaves the board and flies into its prompt icon, the badge counts down when it lands; the sound rises with every find in a row (§3a).
   - Wrong: the object wobbles, one soft "nope", lose 1 heart; no screen shake (hearts carry over from scene to scene, §6).
3. All targets found → the last find lands first, then a beat later confetti, stars by speed, auto-advance after 1.2 s (tap to skip).
4. Hearts = 0 → Fail overlay: **Continue** (rewarded ad → three hearts, same scene) or **Retry** (new seed, same level, one heart; §6).

Stars: 3★ if solved under `t3`, 2★ under `t2`, else 1★. `t3/t2` scale with difficulty (see GENERATOR.md).

## 3a. Feel spec (v1.8, `pebblit-game-craft`)
Rule: the right move is the loudest moment; failure stays local and soft. Values are starting points behind named constants in `src/game/feel.ts`, tuned on Hasan's phone.

| Action → outcome | Visual | Sound | Screen | Haptic (Android) |
|---|---|---|---|---|
| Correct tap, Find / Odd | hit stop 45 ms; the object flashes white, pops 1.2×, leaves the board and flies to its prompt icon in 380 ms (shrinking, ease-in); ring and sparks where it stood | `tap_correct_1` at gain 1.4, +2 semitones per find in a row (cap 3 steps) | shake 80 ms, intensity 0.0025, +25 % per step | 15 ms |
| …arrival in the HUD | the icon bounces 1.25×, the badge counts down now | `sparkle` at gain 0.6, same pitch step | none | none |
| Correct tap, Spot 5 | rings stay on both images (the comparison needs them); a green ring token flies from the tapped image to the Spot icon | as Find | as Find | 15 ms |
| Wrong tap | the object wobbles ±8 px, 3 × 40 ms; the lost heart bumps 1.25× | `tap_wrong` at gain 0.5 | none | 8 ms |
| Losing tap | as wrong, then the fail overlay | `tap_wrong` + `heart_lose` at gain 0.45 (the heart file is the loudest; together they stay under one correct tap) | none | 30 ms |
| Last find | its full find cascade first; once every flight has landed, a 200 ms beat, then: shake 120 ms at 0.0045 (at least the strongest combo kick), `scene_complete` + `confetti`, confetti, stars (about 0.7 s after the last tap) | | | 20-40-40 ms |

- **Combo step** = finds in a row in this scene since the last wrong tap, first find = step 0, cap 3. A wrong tap resets it quietly.
- **Board empties**: found objects leave the board (Find, Odd); the shuffle twist slides only what is left. Spot 5 keeps its objects. A found object's tap circle goes with it 0.3 s after the find (until then its flyer still covers the spot, so a double tap stays free); after that a tap there lands on whatever is visible underneath, or on nothing.
- **The star timer stops at the last tap**, so the win beat costs no stars; taps during the beat are ignored and the pause menu stays closed, as over the win overlay. If a flight never lands, a 1.5 s safety net (scene clock, from the last tap) starts the win anyway.
- **Input stays open** during flights; a second find while the first flies is fine. A rotation or resize during a flight lands it at once (the HUD icon has moved).
- **Pause and menu** freeze flights, the beat and the hit stop (tweens and the scene clock); a pending hit stop never resumes a paused game; camera effects are reset when the game freezes.
- **Failure never outweighs success**: haptics and the sounds as played (file level plus gain, `SFX_FILE_DB` in `src/game/feel.ts`) are unit-tested for it; the pipeline test re-measures the files, so new sounds must come with new levels.

## 4. Modes (rotate automatically, player never chooses)
| Mode | Prompt (icon-only) | Win | Rotation |
|---|---|---|---|
| **Find** | target icon + ×N | tap all N targets | 6 of every 10 levels (60 %) |
| **Odd One Out** | "≠" icon | tap the single different item among near-identical ones; every cell sits at a seeded ±3° angle (v1.4) so the grid never reads as wallpaper, and the angle is never the tell | 2 of every 10 (20 %): levels 6, 13, 16, 23, 26, … |
| **Spot 5** | "5 ⟷" icon, two images stacked (portrait) or side by side (landscape) | tap all 5 differences on either image | 2 of every 10 (20 %): levels 11, 18, 21, 28, 31, … |

**One fixed rhythm for every player (v1.9).** The mode of a level depends on the level alone: a ten-level cycle anchored at level 11, **Spot, Find, Odd, Find, Find, Odd, Find, Spot, Find, Find**, where a slot whose mode is not unlocked yet is Find (Odd unlocks at level 6, Spot at level 11). So levels 1–5 are Find, level 6 is the first Odd One Out, level 11 the first Spot 5, and from there every ten levels hold two Spots, two Odds and six Finds; the next Spot or Odd is always 3 to 7 levels away, Spot and Odd never follow each other, and the big scenes of the normal chain (every 25th level) always fall on a Find. Ten, not five: the themes rotate in 3-level blocks over five themes (a 15-level period), and an even 5-level cycle would land every theme on the same slots forever (forest would never get Odd One Out, space never Spot 5); with this cycle every theme meets both modes in any 30 levels from level 40 (when all five are unlocked) and within 30 levels of its own unlock. The trade-off: no cycle that covers every theme can split the shares evenly over five themes, so from level 40 the kitchen blocks get about twice the Spot and Odd share of the others (about a third each against about a sixth). A Retry or a reload keeps the mode (unless the layout in between can no longer host Spot, below); the scene itself still differs per player (the salt, §8).
Spot 5 is only scheduled when the current layout can show both images at ≥ 0.8 design scale (true for 9:16 and 16:9, false for 1:1). When it cannot, that level is Find (Find 80 / Odd 20). The decision is made per scene from the current layout.

## 5. Difficulty (level N → params, all in GENERATOR.md)
- Object count: 12 → 60 (level 80) → 66 (level 150)
- Target count: 1 → 5 (Find, level 80) → 6 (level 150), 1 (Odd), 5 (Spot)
- Target scale: 1.0 → 0.6 (the floor; never smaller)
- Decoy ratio (look-alikes): 0 → 0.5 (level 80) → 0.6 (level 150)
- Occlusion: none → partial (target ≥ 60% visible at level 80, ≥ 55% at level 150)
- Theme rotates every 3 levels; the second theme unlocks at level 4 (v1.4: variety inside the first session), the others every 10 levels (20, 30, 40). The next theme's atlas is preloaded in the background 3 levels before it unlocks, so the chain never stalls.
- Every 25th level is a "big scene": 7 targets, max density, 2× star time, bonus confetti.
Levels are infinite. The first ramp plateaus at level 80 ("medium" on a phone, phone test 2026-10-18); a gentle second ramp runs to 150 (v1.5: 66 objects, 6 targets, 60 % look-alikes, sprites never below the 0.6 floor). Past that, the pressure comes from the twists (§5a), not from density.

## 5a. Twists (v1.5)
Late-game modifiers that change how a scene is played without changing what counts as a find. Each scene has at most one, picked from the scene seed (same seed → same twist), shown by an icon, never by text, never by a visible timer.
- **Shuffle** (from level 30; Find and Odd One Out): on a cadence of half the level's 3-star time (9 s at level 30, 13 s at 80, 14 s at 150; never under 8 s) every object slides to a new place (0.45 s, found ones travel dimmed, a hint ring follows its target). The marker next to the prompt beats three times 0.9 s before each slide and spins during it; taps are ignored while the board moves. Every layout is generated and validated like the main one (spacing, occlusion, spread) and every remaining target moves on every slide, around the whole cycle, so the move can neither hide a target nor leave it where it was. A 3-star solve meets the first slide halfway and the second right at the 3-star boundary; a slower one rescans a fresh board every half t3 instead of staring at the same one.
- **Memory** (from level 45; Find only): the prompt icons show for 3 s after the pop-in, then hide behind "?" (the count badges stay). A tap on a "?" peeks for 1 s; every find peeks too. Never a penalty, only time.
- **Chance**: 25 % of eligible scenes at level 30, rising linearly to 50 % at level 80, flat after that; shuffle and memory are equally likely where both are eligible.
- **Never**: on Spot 5 (a comparison task), on big scenes (already the event), in the daily chain (a level-5 player meets its level-30 scene), before the levels above. Under the fail overlay and during an ad the shuffle waits a whole cadence (a slide never comes without its warning), and its clock pauses with the platform pause.
- Tuning knobs live in `src/gen/twist.ts`; phone feedback on level 30–60 decides whether the chance or the cadence fraction moves.

## 6. Hearts, hints, ads
- **Hearts carry over (v1.7):** three at the start; a scene begins with the hearts the previous one ended with. One heart comes back on entering every 20th level (20, 40, 60 …), never above three, so a player who spent none gets nothing. Hearts are a run resource: they are written on every change (a reload or Home mid-scene keeps the mistakes of the scene), a loss leaves one heart for the Retry, and the only ways back are the 20th-level return and the rewarded Continue (three, in place). The daily chain carries hearts across its five scenes, starts every chain with three and leaves the normal chain's hearts untouched. No timers.
- **Hint** button (bottom right): rewarded ad → one target glows for 2 s. Shown only when `rewarded` is supported by the platform.
- **Interstitial**: requested only when both conditions hold: ≥ 3 scenes completed since the last interstitial (or session start) AND ≥ 120 s since the last interstitial (or session start). Never a countdown timer (platform rule). Skip silently if unsupported. Rationale: early levels last ~10 s, so a scene-count rule alone would show an ad every 30–40 s; Playgama's guidance for web games is 120–240 s between interstitials.
- All ad calls check platform support first; the game must be fully playable with ads disabled.

## 7. Daily Find
- Seed = `YYYYMMDD` (UTC). Everyone gets the same 5-scene chain.
- Daily difficulty is fixed per chain position, not the player's level: scenes use levels **10, 20, 30, 40, 50**. This is what makes the chain identical for every player.
- Daily scenes have no player salt (see GENERATOR.md §1).
- Completing the chain = daily badge + streak +1. Missing a day resets streak.
- Daily draws each scene's mode from the date seed with the §4 shares (Find 60 / Odd 20 / Spot 20, Odd from level 6, Spot from level 11), so every player gets the same chain that day; the fixed rhythm of §4 would make all five daily levels (10, 20, …, 50) Find. A layout that cannot host Spot plays that day's Spot scenes as Find and changes nothing else (v1.9; before, the gate re-weighted the draw and also turned some Odd scenes into Find and some Spot scenes into Odd).
- Title screen shows "DAILY" button with a check mark when done and the streak number.

## 8. Progression & saves (Bridge storage, dev fallback to localStorage)
```
{ version: 1, level, totalStars, bestStreak, streak, lastDailyDate, dailyDone,
  sound: bool, music: bool, scenesPlayed, seedSalt }
```
`seedSalt` is a random 32-bit value created on first run and never changed; it salts non-daily scene seeds so that two players at the same level see different scenes and a reload does not repeat them. It never picks the mode (v1.9: the mode follows the level, §4).
Save after every scene. Never block gameplay on save errors. `version` enables migrations.

## 9. Screens
1. **Boot**: load atlas for current theme + UI; call GameReady only when input works. v1.6: our own boot screen shows the brand wordmark (texture from `npm run brand`) over the progress bar; plain text if the texture failed.
2. **Title**: the wordmark (brand texture, v1.6), PLAY (big), DAILY (streak badge), sound/music toggles, and the Pebblit cairn as a small signature at the foot of the square. No settings screen.
3. **Game**: scene area + HUD (targets bar, hearts, level number, hint button, pause button; v1.5: the shuffle marker after the prompt, "?" badges in a memory scene). **Pause menu (v1.6)**: the pause button (bottom-left, where the v1.3 home button was) freezes the scene (tweens, the scene clock, the star timer, the shuffle cadence) under a dim and shows four icon buttons: Resume (large, play icon), Sound, Music, Home. Resume continues the very same round (finds, hearts, timer); the toggles are the Title's toggles and persist; Home abandons the scene like v1.3 (the scene keeps its seed, so PLAY returns to it; a daily chain restarts from its first scene). No text, no confirmation. Available over the fail overlay too (Home stays one tap away from a lost round), not over the win overlay (the scene advances by itself; the pause spot skips the auto-advance there like any tap), not under the platform pause or during an ad. A platform pause over the open menu dims on top and leaves the game frozen after the platform resumes. Music keeps playing in the menu so the Music toggle gives immediate feedback. The platform's own pause/exit control stays the primary way out on YouTube.
4. **Scene Complete** overlay: stars, +score, auto-advance.
5. **Fail** overlay: Continue (rewarded) / Retry.
6. **Daily Complete** overlay: badge, streak, back to title.
Pause: platform pause → freeze tweens/physics/audio, dim overlay; resume on platform resume. Platform mute overrides in-game sound settings. The host may hold its pause until the game's window has focus again (Bridge pauses on blur): after an ad the game asks for focus back, and the tap that brings focus back is never a game tap (350 ms grace after every resume, Title included).
Haptics (v1.2): short vibration on correct (12 ms), wrong (40-50-40), scene won, scene lost, through the Vibration API where it exists (Android); silent no-op on iOS and desktop, off while paused. No toggle, no feature depends on it.

## 10. Layout & aspect ratios
Design unit: the short side of the canvas is always 1080 design px; the long side follows the window aspect, clamped to [1080, 2400]. Phaser Scale `FIT` with that design size; `layout()` runs on every resize.
- **Find / Odd**: scene area is a 1080×1080 square.
  - 9:16: square + HUD bands above/below (as designed).
  - 1:1: HUD shrinks to thin bars inside the square's top/bottom edges.
  - 16:9: square centered, HUD moves to left/right columns.
- **Spot 5**: each image is a 1080×840 scene (see GENERATOR.md §6).
  - 9:16: two images stacked at scale 1.0 (2 × 840 = 1680) + thin HUD bands.
  - 16:9: side by side at scale ≈ 0.87, thin HUD bands top/bottom.
  - 1:1: not scheduled (scale would drop below 0.8; hit circles would become too small).
Minimum tap target 72×72 design px. Object hitboxes are circles with radius `max(40, size / 2)` design px (Find, Odd) or `max(60, size / 2)` (Spot), so the whole visible sprite is tappable. The generator keeps centers ≥ 2 × 40 px apart; where big sprites overlap, a tap resolves to the nearest center among circles containing the point. A tap during the pop-in starts the round and counts (v1.2, player feedback).

## 11. Art direction
Flat vector, cute but not childish, bold silhouettes, 2–3 tone shading, saturated but harmonious palette per theme, 0–2 px outlines. No text inside sprites. No AI-generated look (no smeared gradients, no inconsistent line weights). Backgrounds are simple, low-detail, lower contrast than objects.
Not "made for kids": no pastel nursery palette, no baby-faced characters, no toddler UI shapes. Think Monument Valley / Alto's palettes, not a preschool app.
Source art must be **SVG** so color variants can be generated at build time (ASSETS.md).
Themes (launch): Kitchen, Beach, City Street, Forest, Space. 40 objects each (see ASSETS.md).

## 12. Audio
15 SFX files (see ASSETS.md) + 1 short music loop (≤ 150 KB). Platform mute always wins. No audio before first user interaction (browser autoplay rules).

## 13. Performance & size budgets
- Initial load (before GameReady): ≤ 8 MB target, 30 MB hard limit. No file > 30 MB. No build-time compression plugins (platform rule); PNG, plain JS.
- Code budget ≤ 1.5 MB uncompressed; Phaser alone is ≈ 1.2 MB of that.
- 60 fps on iPhone 11 Safari; ≤ 80 sprites on screen; one texture atlas per theme (≤ 2048²).
- Scene generation ≤ 50 ms on mobile.

## 14. KPIs (post-launch, 14 days)
- Plays/day: decision threshold 50K/day.
- Average session ≥ 8 min (target 10).
- Scene 1 completion ≥ 95%, scene 5 completion ≥ 70%.
- Rewarded hint usage ≥ 20% of sessions.
- Decision rule: ≥ 50K/day → second game in the same line ("Numara Var"); below → "Draw, Launch, Wreck".

## 15. Non-goals (v1)
No accounts, no leaderboards, no multiplayer, no IAP, no level editor, no localization beyond English UI strings, no narrative.

## 16. Changes from v1 (2026-10-16 review)
- Color look-alikes are baked atlas frames, not runtime tint (Phaser tint cannot shift hue).
- Daily chain uses fixed levels 10/20/30/40/50 so every player gets the same scenes; `seedSalt` added to the save model.
- Spot 5 has its own 1080×840 scene, half the objects, larger hit circles, and is skipped in 1:1.
- Interstitial rule is scene count AND ≥ 120 s.
- Hit radius unified (40 / 60) with a spacing guarantee instead of overlap handling.
- Spot 5 visibility threshold corrected to 1600 px² (40×40) or a 40 px shift.
- Next theme preloads 3 levels before unlock (the second theme therefore loads at boot for a new player).
- Code budget stated honestly at 1.5 MB.

## 17. Changes in v1.5 (2026-10-18, after phone test 4)
- Difficulty table: fifth column at level 150 (second ramp); plateau moves from 80 to 150.
- Twists (§5a): shuffle from level 30, memory from level 45, seeded per scene, never on Spot, big scenes or the daily chain.
- Hasan's brief: level 80 felt medium; the game should hook from level 1 to the end, neither frustrating nor trivial, with creative late-game variety ("objects change places after a while").

## 18. Changes in v1.6 (2026-10-18, pause menu)
- The in-game home button becomes a pause button that opens a frozen-scene menu with Resume, Sound, Music and Home (§9). Hasan's brief: changing the sound mid-scene went through the Title and restarted the scene.
- The star timer leaves frozen time out (platform pause and the menu alike); before, a platform pause of 30 s cost the stars of that scene.

## 19. Changes in v1.6.1 (2026-10-18, host focus)
- After an ad the game asks the host for focus back, and the first 350 ms after any resume take no taps (§9 Pause). Sandbox report: the board stayed dim after an ad until a tap, and that tap cost a heart; cause and decision in docs/questions.md (host focus).

## 20. Changes in v1.7 (2026-10-18, hearts carry over)
- Hearts are no longer reset every scene (§3, §6): they carry over, one returns on entering every 20th level, never above three; a loss leaves one heart for the Retry, the rewarded Continue gives three; the daily chain keeps its own hearts. Hasan's brief: "don't renew the hearts every level; every 20 levels give one back, never above three; nothing if none were spent".
- Brand in the game: the Title and the boot screen show the wordmark texture, the Title carries the studio mark (docs/store/brand).

## 21. Changes in v1.8 (2026-10-19, feel pass)
- §3 and the new §3a: the feel audit of `pebblit-game-craft` found the feedback inverted (the wrong tap had the only screen shake, the longest vibration and the two loudest sounds), the last find masked by the win in the same frame, found objects left on the board at 45 % opacity, and a correct-tap pitch that fell back on the fourth find. v1.8 moves the weight to success, gives the last find its own beat, empties the board into the HUD and makes the pitch rise. Audit and measurements in docs/questions.md (feel pass). Hasan's brief: Bus Fever's boarding shake, "make Peek & Find feel like that".

## 22. Changes in v1.9 (2026-10-19, one mode rhythm for everyone)
- §4: the mode of a level was drawn from the player's salt with the 60/20/20 weights, so every save (every device) had its own sequence: the first Spot 5 came anywhere from level 11 to past 20 (11 % of players after 20), and levels 11–40 held 0 to 16 Spots. Hasan read it as "iOS gets more Spot 5 than Android" (two devices, two saves). v1.9 replaces the dice with one fixed ten-level cycle from level 11 (Spot, Find, Odd, Find, Find, Odd, Find, Spot, Find, Find), the same shares for everyone, and keeps the per-player salt for the scenes. The first draft used five levels (Spot, Find, Odd, Find, Find); the audit found it locked themes and modes together (15-level theme period), so it was replaced before release. The daily chain keeps its date-seeded modes, and its layout gate now only turns Spot into Find (§7). Evidence and decision in docs/questions.md (same date).
