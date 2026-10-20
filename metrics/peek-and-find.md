# Peek & Find — metrics log

Read by `game-trend-skills:tracking-game-metrics`. Newest entry at the bottom; compare deltas.

## 2026-10-20 · build: 0.1.2 or 0.1.4 (unconfirmed) · cohort 101 plays / 550 launches · source: mixed (Playgama $25 boost + organic/friends) · geo: unknown

Day 2 in the Playgama Sandbox; dashboard screenshot from Hasan's phone.

| Metric | Value | Threshold (source, month) | Status |
| --- | --- | --- | --- |
| Launch → play (play = session over 30 s) | 101 / 550 = 18 % | none published; one developer saw ~10 % on Playgama (itch.io devlog "Four games on an ad portal", search summary, Oct 2026, anecdotal) | weak, but typical of paid portal traffic |
| Average play time | 3:31 | 5:00 sandbox target (Playgama dashboard, 2026-10-18); ~10 min per session for YouTube Playables (Playgama blog guide, search summary, Oct 2026; page not opened) | below both |
| Likes / dislikes | 11 / 2 → 11 % of plays, 85 % positive | none published; leaderboard 2026-10-19: most games 5–13 %, top two 54–63 % (our screenshot) | typical portal, not community-driven |
| Ad shows per play | 0.91 | none; our gate: interstitial after ≥ 3 scenes and ≥ 120 s | as designed |
| Revenue | $0.07 / day | — | negligible; the $25 boost is a data cost, not a return |

Decision: ITERATE — because the cohort is small and mixed (directional only), and the first
weak stage is the first 30 seconds (82 % of launches leave before a play counts), with average
play time (3:31) the second gap against the 5:00 sandbox target and the ~10 min Playables bar.
Not a KILL: the like ratio among players is healthy for a portal (85 % positive) and nothing
was iterated yet on the first 30 seconds.

Actions: 1) first 30 seconds: measure load-to-first-tap on a mid phone and cut it (first scene
starts from the first tap, no extra screen), 2) make sure 0.1.4 (feel pass + mode rhythm) is the
live build before reading playtime again, 3) no more paid boost until 1) ships; use the free
share-bonus run and compare cohorts.

Next check: 2026-10-24, after 0.1.4 is live and ≥ 300 plays, with launches split by source.
