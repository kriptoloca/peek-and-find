# Evidence behind the Hold rules

Collected on 2026-10-20. Most portal pages do not open from the cloud machine, so several entries
come from search summaries and say so. Re-check a number before quoting it to anyone outside the
team.

## Portal gates and benchmarks

| Source | What it says | How we read it |
| --- | --- | --- |
| Our Playgama sandbox dashboard, 2026-10-18; an older Playgama post (search summary) | a game reaching 100 plays and a 5:00 average play time can be submitted for review | 5:00 is the floor of every Pebblit game |
| Playgama wiki "Platform-Specific Requirements" (search summary) | some partner platforms ask for ≥ 5 minutes average play time, others ≥ 10 | 10:00 is the goal |
| Playgama Playables pages (search summary) | Playgama picks its best-performing titles for YouTube Playables; about 10 minutes average play time is the bar its guide names | same |
| CrazyGames docs, "Basic Launch Guide" (official, search summary) | Full Launch depends on average play time (per session), conversion (playing ≥ 1 minute after starting) and retention, benchmarked against other games; successful titles often see 10+ minutes; top titles convert 80 %+, load in under 10 seconds and stay under 20 MB; Basic Launch lasts ≥ 7 days and 500 plays, at most 21 days | conversion and play time are judged together |
| CrazyGames docs, "Action" page (official, undated, search summary) | action games average about 13 minutes of play time; D1 8.1 % against a platform average of 6.7 % | web D1 is low; play time per session is the lever |
| Defold's Poki guide, summarised on GameDev.net (search summary) | targets: under 20 MB, 65 %+ conversion to play, 5+ minutes average play time, 7–10+ very strong; the best games are "instant fun"; avoid long intros, heavy tutorials, complex menus and slow unlock systems; prefer continuous, replayable loops; rewarded ads for revives and second chances; Poki may reject more games in a crowded genre | rules 1, 2, 5, 6 |
| GameAnalytics 2025 mobile benchmarks (search summary) | median D1 about 22 %, top quartile on iOS 31–33 %; puzzles among the best genres for medium and long-term retention; average session 5–6.85 minutes by region | puzzles with level ramps are a sound default |

## Design patterns

| Source | What it says | Rule |
| --- | --- | --- |
| Deconstructor of Fun, hybrid-casual puzzles (2025, search summary) | the casual-puzzle "roller coaster": levels rise to a hard or super-hard level, then an easier breather; each new mechanic gets a gentle introduction, a harder test, then a rest; each world brings a new mechanic or theme; rewarded continues get players past hard levels | 3, 4, 6 |
| Hybrid-casual guide (2026, search summary) | a meta layer should appear within the first 3–5 sessions; a claim that sawtooth curves keep players 20–40 % longer than linear ones (studio data, not published, unverified) | 3, 5 |
| Playgama monetization guide (search summary) | introduce mechanics gradually to avoid early abandonment; reward schedules; light leaderboards and sharing; dynamic difficulty to keep players in flow; idle and incremental games linked to longer sessions (a pattern table, not data) | 3, 4, 7 |
| Playgama blog on ads (search summary) | interstitials at natural pauses, never a full-screen ad in the first seconds; rewarded as optional bonuses | 8 |

## Our own data

- Peek & Find, day 2 in the sandbox (2026-10-20): 550 launches, 101 plays (18 %), 3:31 average,
  82 % of launches gone before a play counted (`metrics/peek-and-find.md`). The first leak is the
  first minute, then depth.
- A devlog of four Playgama games (search summary): 1,897 sessions, 179 plays (about 9 %).
