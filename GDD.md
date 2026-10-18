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
   - Correct: object pops + sparkle + rising "ding", badge count decrements.
   - Wrong: small shake, soft "nope", lose 1 heart (3 hearts per scene).
3. All targets found → confetti, stars by speed, auto-advance after 1.2 s (tap to skip).
4. Hearts = 0 → Fail overlay: **Continue** (rewarded ad → refill hearts, same scene) or **Retry** (new seed, same level).

Stars: 3★ if solved under `t3`, 2★ under `t2`, else 1★. `t3/t2` scale with difficulty (see GENERATOR.md).

## 4. Modes (rotate automatically, player never chooses)
| Mode | Prompt (icon-only) | Win | Rotation |
|---|---|---|---|
| **Find** | target icon + ×N | tap all N targets | 60% of scenes |
| **Odd One Out** | "≠" icon | tap the single different item among near-identical ones; every cell sits at a seeded ±3° angle (v1.4) so the grid never reads as wallpaper, and the angle is never the tell | 20% |
| **Spot 5** | "5 ⟷" icon, two images stacked (portrait) or side by side (landscape) | tap all 5 differences on either image | 20% |

First 5 levels are Find only. Odd One Out appears at level 6, Spot 5 at level 11.
Spot 5 is only scheduled when the current layout can show both images at ≥ 0.8 design scale (true for 9:16 and 16:9, false for 1:1). When it cannot, its 20% goes to Find (Find 80 / Odd 20). The decision is made per scene from the current layout.

## 5. Difficulty (level N → params, all in GENERATOR.md)
- Object count: 12 → 60
- Target count: 1 → 5 (Find), 1 (Odd), 5 (Spot)
- Target scale: 1.0 → 0.6
- Decoy ratio (look-alikes): 0 → 0.5
- Occlusion: none → partial (target ≥ 60% visible)
- Theme rotates every 3 levels; the second theme unlocks at level 4 (v1.4: variety inside the first session), the others every 10 levels (20, 30, 40). The next theme's atlas is preloaded in the background 3 levels before it unlocks, so the chain never stalls.
- Every 25th level is a "big scene": 7 targets, max density, 2× star time, bonus confetti.
Levels are infinite. The first ramp plateaus at level 80 ("medium" on a phone, phone test 2026-10-18); a gentle second ramp runs to 150 (v1.5: 66 objects, 6 targets, 60 % look-alikes, sprites never below the 0.6 floor). Past that, the pressure comes from the twists (§5a), not from density.

## 5a. Twists (v1.5)
Late-game modifiers that change how a scene is played without changing what counts as a find. Each scene has at most one, picked from the scene seed (same seed → same twist), shown by an icon, never by text, never by a visible timer.
- **Shuffle** (from level 30; Find and Odd One Out): 8 s after the pop-in, and every 8 s after that, every object slides to a new place (0.45 s, found ones travel dimmed). The marker next to the prompt beats three times 0.9 s before each slide and spins during it; taps are ignored while the board moves. Every layout is generated and validated like the main one (spacing, occlusion, spread), so a target is never hidden by the move. A 3-star player sees at most one slide; a slow one rescans a fresh board instead of staring at the same one.
- **Memory** (from level 45; Find only): the prompt icons show for 3 s after the pop-in, then hide behind "?" (the count badges stay). A tap on a "?" peeks for 1 s; every find peeks too. Never a penalty, only time.
- **Chance**: 25 % of eligible scenes at level 30, rising linearly to 50 % at level 80, flat after that; shuffle and memory are equally likely where both are eligible.
- **Never**: on Spot 5 (a comparison task), on big scenes (already the event), in the daily chain (a level-5 player meets its level-30 scene), before the levels above. The shuffle waits under the fail overlay and during an ad, and its clock pauses with the platform pause.
- Tuning knobs live in `src/gen/twist.ts`; phone feedback on level 30–60 decides whether the chance or the 8 s cadence moves.

## 6. Hearts, hints, ads
- 3 hearts per scene, reset every scene. No global lives, no timers.
- **Hint** button (bottom right): rewarded ad → one target glows for 2 s. Shown only when `rewarded` is supported by the platform.
- **Interstitial**: requested only when both conditions hold: ≥ 3 scenes completed since the last interstitial (or session start) AND ≥ 120 s since the last interstitial (or session start). Never a countdown timer (platform rule). Skip silently if unsupported. Rationale: early levels last ~10 s, so a scene-count rule alone would show an ad every 30–40 s; Playgama's guidance for web games is 120–240 s between interstitials.
- All ad calls check platform support first; the game must be fully playable with ads disabled.

## 7. Daily Find
- Seed = `YYYYMMDD` (UTC). Everyone gets the same 5-scene chain.
- Daily difficulty is fixed per chain position, not the player's level: scenes use levels **10, 20, 30, 40, 50**. This is what makes the chain identical for every player.
- Daily scenes have no player salt (see GENERATOR.md §1).
- Completing the chain = daily badge + streak +1. Missing a day resets streak.
- Daily uses the normal mode rotation for its level (Odd from level 6, Spot from level 11, subject to the layout rule in §4).
- Title screen shows "DAILY" button with a check mark when done and the streak number.

## 8. Progression & saves (Bridge storage, dev fallback to localStorage)
```
{ version: 1, level, totalStars, bestStreak, streak, lastDailyDate, dailyDone,
  sound: bool, music: bool, scenesPlayed, seedSalt }
```
`seedSalt` is a random 32-bit value created on first run and never changed; it salts non-daily scene seeds so that two players at the same level see different scenes and a reload does not repeat them.
Save after every scene. Never block gameplay on save errors. `version` enables migrations.

## 9. Screens
1. **Boot**: load atlas for current theme + UI; call GameReady only when input works.
2. **Title**: logo, PLAY (big), DAILY (streak badge), sound/music toggles. No settings screen.
3. **Game**: scene area + HUD (targets bar, hearts, level number, hint button, home button; v1.5: the shuffle marker after the prompt, "?" badges in a memory scene). Home (v1.3): back to the Title from anywhere in play, no confirmation and no menu; the abandoned scene keeps its seed, so PLAY returns to the same scene; a daily chain restarts from its first scene. The platform's own pause/exit control stays the primary way out on YouTube.
4. **Scene Complete** overlay: stars, +score, auto-advance.
5. **Fail** overlay: Continue (rewarded) / Retry.
6. **Daily Complete** overlay: badge, streak, back to title.
Pause: platform pause → freeze tweens/physics/audio, dim overlay; resume on platform resume. Platform mute overrides in-game sound settings.
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
