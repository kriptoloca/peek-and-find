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
