---
name: pebblit-retention
description: Pebblit's method for keeping players in a small web or mobile game for 5 to 10+ minutes a session and bringing them back - conversion to play, average playtime, session length, retention and the "one more level" loop. Use it whenever session length, average playtime, play time, minutes per session, retention, D1, drop-off, a level funnel, "players leave after a minute", "make people play longer" or "it isn't sticky" comes up, and whenever the first minute, a difficulty curve or ramp, breathers, novelty, meta progression, unlocks, a daily challenge, streaks, an endless mode, a rewarded continue or ad pacing is being designed, built or reviewed. Use it when writing a GDD or build brief (the Hold plan), when finishing a game for release, when auditing a build before release (the minute-map audit), and when reading playtime or level-funnel numbers after launch. Use it next to pebblit-game-craft (feel and taste) and game-trend-skills:tracking-game-metrics (KPI verdicts); this skill owns the minutes.
---

# Pebblit Retention

Minutes are the gate to money. On Playgama a sandbox game can be submitted for review only after
100 plays with a 5:00 average play time; the best partner portals and YouTube Playables look for
about 10 minutes; CrazyGames says its successful titles often reach 10+ minutes. Peek & Find sat
at 3:31, and 82 % of its launches left before a play even counted. This skill is how every
Pebblit game earns its minutes. Sources and dates: `references/evidence.md`.

## Targets

| Metric | Floor | Goal | Why |
| --- | --- | --- | --- |
| Conversion to play (still playing after the first minute) | 65 % | 80 %+ | Poki target via Defold's guide; CrazyGames top titles |
| Average play time per session | 5:00 | 10:00 | Playgama review gate; CrazyGames successful titles; Poki "7–10+ very strong" |
| Load to first input | ≤ 3 s on a throttled mid-range phone | ≤ 2 s | every second before play loses launches |
| Initial download | ≤ 5 MB | ≤ 3 MB | CrazyGames top titles stay under 20 MB; Playables needs < 30 MB |

## The session equation

Average session ≈ Σ over levels of (time spent on level i) × (share of players still there at
level i). Only four things move it, so every rule below serves one of them:
1. **Keep them past the first minute**, where the steepest drop is.
2. **Short readable levels, the next one instantly**, so attention turns into levels without exit
   points.
3. **Remove the reasons to quit at each level:** walls, boredom, friction, confusion, an ad at the
   wrong moment.
4. **Never let the content end, and always show the next goal.**

## The ten Hold rules

Each rule has a check the gamer-auditor runs before release.

1. **Playing on the first tap.** No title screen, menu or text tutorial before level 1; levels 1–3
   teach by doing and are won within about 15 seconds each.
   *Check:* load to first input ≤ 3 s under 4× CPU throttling; first win ≤ 20 s.
2. **Short levels, instant next.** After the tutorial, a median level of 30–90 s; the win beat is
   short and the next level starts by itself (a tap may skip the beat); a retry after a loss is one
   tap; no screen between levels.
   *Check:* friction between levels ≤ 1.5 s; retry ≤ 1 s.
3. **Roller-coaster difficulty with breathers.** A sawtooth: a few levels rise, a hard one, then a
   breather. Each new element runs the teaching loop: introduce it easy, test it hard, then rest.
   No walls. Difficulty is measured by the solver or bot, never guessed.
   *Check:* the difficulty curve shows breathers after every hard level; with the bot's
   human-like error model, levels 1–10 fail ≤ 10 % and no level fails > 50 %.
4. **Something new every few minutes.** A new element (a rule twist, an obstacle, a character, a
   theme, a music layer) every 5–10 levels; a chapter with a new palette or setting every 10–20
   levels; the first novelty by minute 2.
   *Check:* the minute map shows something new at least every 2 minutes up to minute 10.
5. **A goal beyond the level from the first minute.** A progress bar toward the next unlock
   (a character, a theme, a chapter) visible after level 1; stars or a score per level; the next
   goal never more than 3 levels away. Keep the meta light and cosmetic: portals warn against slow
   or complex unlock systems.
   *Check:* meta visible by 60 s; next-goal distance ≤ 3 levels at every point of the minute map.
6. **Rescue at the fail point, never a spiral.** A loss offers a free retry and an optional
   rewarded continue (an extra move, a slot, an undo); no lives or energy that stop play; a loss
   never sends the player back more than one level.
   *Check:* three losses in a row on one level never end the session by design.
7. **Never run out.** Hand-tuned first 20–30 levels, then generated levels on the same ramp with
   the same validator, plus an endless or daily mode with a personal best and a streak.
   *Check:* content horizon ≥ 60 minutes of non-repeating play (valid levels × median duration).
8. **Ads that never cut a session.** No interstitial in the first minute or before level 3;
   interstitials only after a win (never after a loss, never mid-level), at least 120 s apart;
   rewarded only when the player asks for help.
   *Check:* the ad schedule over a simulated 10-minute session: none in minute 1, none after a
   loss, at most 4 in total.
9. **Stable for the whole session.** Steady frame time, no hitch between levels, memory flat over
   15 minutes (long sessions expose leaks), sounds never stack.
   *Check:* a 15-minute soak run: frame-time p95 within budget, heap growth flat.
10. **Leave with a reason to come back.** Progress saved after every level; on return the next
    unlock and today's daily level are in view; a streak that forgives one missed day.
    *Check:* a reload mid-session keeps progress; the return screen shows the next goal.

## Workflows

### A. A brief or GDD: write the Hold plan

Every brief gets a **Hold plan** section:
- the **minute map** of the first 10 minutes (`references/minute-map.md`): minute by minute, what
  the player does, wins, sees new, and which goal pulls them on;
- the level duration target and the difficulty shape of levels 1–50 (teaching loops, hard levels,
  breathers);
- the novelty schedule for levels 1–50;
- the meta: what unlocks when, and the progress bar;
- rescue: free retry, rewarded continue;
- never run out: the generator's range, the endless or daily mode;
- ad pacing.

Score **Hold** from 1 to 5: 1 = a fixed set of levels with menus between them; 3 = levels ramp
but nothing new after minute 3 and no goal beyond the level; 5 = the minute map shows something
new or a goal reached every 1–2 minutes for 10 minutes, with generated content, rescue and a
daily mode. A Pebblit game needs **Hold ≥ 4** to be built.

### B. Finishing a game

Build the Hold plan with the kit's modules (level flow with auto-advance, ramp scheduler, novelty
scheduler, meta bar, continue, daily and endless modes, ad pacer). Keep every number in one
constants file. Emit telemetry for `level_start`, `level_complete`, `level_fail` (level, duration,
attempt), `unlock`, `continue_offered` and `continue_used`, and session milestones at 1, 3, 5 and 10
minutes; the analyst needs them to find the leak.

### C. Before release: the minute-map audit

Play 10 minutes as a first-time player (two personas: a casual adult, an impatient teenager) and
fill the minute map: per minute, what happened, what was new, the visible next goal, friction
seconds, and any moment you wanted to stop and why. Run the checks of rules 1–10. Estimate the
average session with `references/session-model.md`. Verdict: **PASS** only when every check passes
and the estimate is ≥ 7:00 (a margin over the 5:00 gate). Otherwise list fixes ranked by the
minutes each is estimated to add.

### D. After launch: find the leak

Read the level funnel (starts per level), fail rates and durations from telemetry, and the
average play time from the dashboard. Fix in this order: the biggest drop between two consecutive
levels; then the first-minute drop; then the minute where novelty stops. One fix per release,
then measure again. Calibrate the session model with the real numbers.

## Anti-patterns (each one has cost us or the portals warn about it)

- A title screen, a settings menu or a text tutorial before the first tap.
- A win screen that waits for a tap, a map or menu after every level.
- A hard level with no breather after it; a fail rate that climbs with no rescue.
- Lives or energy that stop play.
- Twenty handmade levels and then nothing.
- The same layout in a new colour, minute after minute.
- An interstitial in the first minute or after a loss.
- Unlocks that take an hour to earn.
- A long load between levels; memory that grows.

## Honesty

Players decide the average play time, not this checklist. The rules raise the odds and make the
cause of a short session visible; the real number comes from telemetry. The session model is a
heuristic calibrated on our own games: present its output as an estimate, with the inputs it used.
