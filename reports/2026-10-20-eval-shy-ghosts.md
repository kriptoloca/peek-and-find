# Evaluation — Shy Ghosts (2026-10-20, `evaluating-game-ideas` + house skills)

Prompt: Hasan ran `/game-trend-skills:evaluating-game-ideas` after the idea set
(`reports/2026-10-20-ideas.md`) recommended Shy Ghosts and asked whether to evaluate it in depth or
go straight to a brief. Evidence is from live search on 2026-10-20; store and portal pages do not
open from the build machine, so every source line is a search summary, **page not opened**.

## 1. Verdict

**GO.** A logic daily with a new rule and a face sits on a rising habit (LinkedIn's daily games,
Meowdoku's climb), its leaders' reviews complain about exactly what our generator and ad gate fix
(unsolvable levels, an ad after every level), and the web portals show no clear leader for it.

## 2. Core loop

Tap a cell to place a ghost so that every haunted room holds one → a ghost that can see another
along a row or column with no wall between them shivers at once → when every ghost is calm the
house lights up room by room and the next house starts; no fail state, a personal-best clock, one
daily house with a streak.

## 3. Scorecard

| Criterion | Score | Reason (evidence) |
| --- | --- | --- |
| Simplicity | 5 | one scene, one mechanic, 2D shapes; the kit already has layout, saves, pause, ads and the debug contract; a demo in one session |
| Content cost | 5 | a generator with a uniqueness solver makes every puzzle and grades difficulty by the deduction steps needed; we already run validated generators in Peek & Find and Munch Pixels (profile) |
| Virality | 4 | the daily-plus-streak loop is LinkedIn Games' proven habit (secondary blogs report ~3.5 M daily players in 2026, unverified); a text-free daily result card; the lights-on finale reads in a muted clip, though logic clips are calmer than action clips |
| Monetization | 3 | rewarded hint and interstitials between puzzles behind our gate; no in-app purchases on Playables; our gate earns less per session than competitors' "ad after every level" (Meowdoku reviews) but should keep sessions longer |
| Competition gap | 3 | mobile is crowded with Queens and Star Battle apps and Meowdoku is big; on the web the search found standalone Queens and Star Battle sites but no CrazyGames, Poki or Playgama listing (not checked on the portals directly) |
| Trend timing | 4 | rising: Meowdoku launched May 2026 and reached #7 in global downloads in September (GamingonPhone from AppMagic, Sep 2026) with ~300 k ratings (aggregators, Oct 2026); new Star Battle apps and itch.io releases in Oct 2026; Glowdoku added to YouTube Playables on 6–7 Oct (TubeGames, Oct 2026); an evergreen genre, so the window is long |
| Creator fit | 5 | plays to the profile's strengths (procedural generation with validated difficulty, automation); simple shapes suit an art-weak team; text-free logic suits Playables |
| **Total** | **29 / 35** | no score of 1 |

House checks (`pebblit-game-craft`, `pebblit-retention`, `pebblit-game-dna`):

| Check | Result | Note |
| --- | --- | --- |
| Face | 4 | a cast of shy ghosts with one joke: they are too shy to be seen by each other; readable at 128 px |
| Feel | 3 | placement puzzles are quiet; the feel rests on the instant shiver, the sigh when a ghost is safe and the lights-on cascade |
| Hold | 5 | puzzles of 45–120 s on a ramp, something new every 8 levels, costumes per chapter, endless generated houses, a daily with a forgiving streak |
| Originality distance | 9 to a queens-style puzzle, 9 to Meowdoku | the rule combines two public puzzle genres (one per region from Star Battle, sight lines blocked by walls from Akari / Light Up) with a face; no level, UI or name is taken |
| Name | no app or game called "Shy Ghosts" found; an itch.io jam entry "Shy Ghost" and a puzzle "Shy" exist | keep as a working title; check again before release |

## 4. Comparables

| Title | Publisher | Launch | Chart or trend | Monetization | Top complaints (1–3 stars) |
| --- | --- | --- | --- | --- | --- |
| Queens (LinkedIn) | LinkedIn | 2024 | the hardest of LinkedIn's daily games; ~3.5 M daily players across LinkedIn Games (secondary blogs, 2026, unverified) | free inside LinkedIn | one puzzle a day, which is why clone sites with large libraries keep appearing |
| Meowdoku! | Oakever Games | May 2026 | #7 global downloads, Sep 2026 (GamingonPhone from AppMagic); 4.8 from ~300 k ratings (aggregators) | ads; a rewarded streak save | an ad after every level; leaderboards that look fake; the streak-save video broken; three unsolvable levels before level 14 ("over-reliance on AI generators"); no support reply |
| Star Battle: Logic Puzzles | brennerd | 2025 or earlier | 4.7–4.8 from ~6,200 reviews (Google Play) | ads plus a paid tier | unskippable double ads, even for paying players (Jan 2026 review) |
| Queens: Logic Puzzle Game | FREEDOM LLP | 2025 or earlier | 3.6 from 308 reviews (Google Play) | ads plus ad removal | ads after paying for ad removal; no notes tool; a placement bug (Jun 2026 reviews) |
| Web daily sites (playqueensgame.com, starbattle.gg, tryhardpuzzles.com and others) | independent | 2024–2026 | many small sites with daily puzzles and large libraries (self-reported up to 1,800 puzzles) | ads (unverified) | — |

## 5. Gaps to exploit

1. **Fairness:** Meowdoku's reviewers hit unsolvable levels; our uniqueness solver proves one
   solution for every puzzle, and the difficulty is measured, not guessed.
2. **Ad overload:** an ad after every level (Meowdoku), double unskippable ads (Star Battle), ads
   after paying (Queens). Our gate: none in the first minute, none after a loss, ≥ 3 levels and
   ≥ 120 s apart, rewarded only when asked.
3. **Limits and missing tools:** LinkedIn gives one puzzle a day and one Queens app lacks a notes
   tool; we give endless generated houses plus the daily, and a mark tool from the first release.

## 6. Sharpen (the single change that raises the score most)

**Make the rule itself the juice.** Feel is the weakest score (3). The rule is taught and felt
through the ghosts: a placed ghost glances along its row and column; a ghost that sees another
shivers, turns pale and peeks behind its hands; a safe ghost sighs and glows; the last placement
fires the lights-on cascade with a rising chord, room by room. This one change also teaches the
rule without text (the riskiest unknown) and gives the share clip its moment. The brief's Feel
spec starts here.

## 7. Kill switch (handed to `tracking-game-metrics`)

| Outcome | Rule | Threshold source |
| --- | --- | --- |
| Scale | ≥ 100 plays not by Hasan and a ≥ 5:00 average → submit for review and make it the game of the week | Playgama sandbox dashboard, 2026-10-18 |
| Iterate | conversion to play under 65 % or an average of 3:00–5:00 → fix the first minute, then the biggest level drop | Poki target via Defold's guide (search summary, 2026); `pebblit-retention` |
| Kill | after ≥ 300 plays not by Hasan, an average under 3:00 or a conversion under 40 % with two fix releases behind it | estimate (no published logic-puzzle benchmark was found) |
| Watch | the share of players who return for the next day's puzzle | CrazyGames' platform D1 average of 6.7 % as a floor (CrazyGames docs, undated) |

## 8. Assumptions and unknowns

- Profile: solo developer with Claude Code, Phaser 3 + TypeScript, budget 0, no paid traffic,
  Playgama first and YouTube Playables later (`game-trend-profile.md`, 2026-10-20).
- The portals were not checked directly; "no CrazyGames, Poki or Playgama listing" comes from a
  search and must be confirmed by the scout.
- No published benchmark for logic-puzzle session length was found; the Hold score rests on the
  session model and the genre's daily habit.
- LinkedIn Games' player numbers come from secondary blogs; Meowdoku's ratings from aggregators.
- A new rule set must teach itself without text; the first three puzzles and the shiver feedback
  carry that, and the gamer's first-10-seconds check must pass.
- Ad revenue per session will be lower than in competitors that show more ads; the bet is longer
  sessions and the catalog.
- Glowdoku's presence on YouTube Playables rests on one tracker snippet from 2026-10-19; a second
  search on 2026-10-20 did not find it again.

Next step: `writing-game-agent-briefs` with the Hold plan (`pebblit-retention`) and the Feel spec
above; the brief is the factory's first finish-mode input, or a manual build if the factory is not
ready.
