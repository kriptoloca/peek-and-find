# Store listing (English)

Rules: no wording that targets a young audience (CLAUDE.md rule 8 lists the banned words);
general audience 13+; no brand names; `tests/store.test.ts` checks the wording and the structure
of this file. Title duplicate check (GDD §1): re-check the YouTube
Playables catalog and Google Play right before submission; fallbacks "Find 3!", "Hidden Hunt".

## Title

Peek & Find

## One-line pitch

Find the icon in the picture, tap it, next scene. No reading, no timer, one finger.

## Description

One icon at the top, one busy picture below: find what the icon shows and tap it.
Three ways to play (find the targets, pick the odd one out, spot five differences) across kitchens, beaches, city streets, forests and space. Every scene is freshly generated, and from level 30 the board starts moving.
A scene takes seconds, so play for a minute or an hour, then come back for the five-scene daily chain and keep your streak alive.

## Tags

hidden object, spot the difference, puzzle, casual, relaxing

## How to play (required field of the Playgama form)

The icon at the top shows what to find: tap it in the picture. A wrong tap costs a heart; you have three per scene.
Odd One Out: tap the one item that differs from the rest. Spot 5: tap the five differences between the two images, on either one.
Pause with the button at the bottom left (sound, music, home). Lost all hearts? Watch a short ad to continue, or retry with a fresh scene.

## Copy review (2026-10-18, `/ux-copy`)

- The pitch leads with the action the player repeats and names the three facts a browsing player checks (no reading, no timer, one finger); "endless" moved to the description because "endless" next to "puzzles" read as grind.
- The description keeps the three-line shape the test enforces: line 1 = how to play, line 2 = variety (modes, themes, the moving board from level 30, GDD v1.5), line 3 = session length and the daily hook. "Keep your streak alive" states the return reason as an action.
- Alternatives kept for the console if a field is shorter: pitch B (≤ 60) "Spot the icon, tap it, next scene. One finger, no reading." pitch C (≤ 40) "Find it, tap it, next scene."
- Tone: plain and friendly, no exclamation marks, no superlatives, no age cues (CLAUDE.md rule 8); the words "kitchen, beach, city, forest, space" carry the theme list without brand or character names.
- Localisation: the game is text-free; only the store text needs translating. "Odd one out" and "spot the difference" are genre names, translate to the local genre term rather than literally.

## Facts for the console

- Studio: Pebblit. Game: Peek & Find. Category: Puzzle / Casual.
- Audience: general, 13+. Not directed at a young audience (no reading required, no cartoon violence, no nursery look; GDD §11).
- Orientation: portrait first, landscape and square supported.
- Monetisation: interstitial after at least 3 scenes and 120 s, rewarded ads only for Hint and Continue; no purchases.
- Offline: yes, no network calls; saves through the platform.
- Languages: none needed in play (text-free); the Title shows PLAY and DAILY in English.
- Playgama form (wiki "Submitting a game", read 2026-10-18 through search summaries): Title (2–4 words) → "Peek & Find"; Game Engine → Plain JS (the "New Game" form seen 2026-10-18 lists Unity, Construct 3, Cocos Creator, Defold, Godot, GDevelop, Game Maker, Scratch and Plain JS; Phaser is not listed and the build is plain JS); AI agent → Claude Code, exact version → the model named in the Co-Authored-By trailer of the commits; Archive → `release/peek-and-find-<version>.zip` (index.html at the root; ≤ 300 MB, ≤ 500 files; ours 61 files, 3.99 MB); Description → the three lines above; How to play → the section above; Supported Devices → mobile and desktop; Game Languages → English; Distribution → all partner platforms including YouTube Playables (non-exclusive); Screen Orientation → portrait and landscape both supported (do not restrict); Media → icon `docs/store/brand/peek-and-find-icon-1024.png` (512 also there), cover `docs/store/brand/pebblit-banner-2048x1152.png` or a 16:9 thumbnail from `docs/store/thumbnails/`, screenshots from `npm run screenshots` (five portrait 1080×1920, five landscape 1920×1080).
