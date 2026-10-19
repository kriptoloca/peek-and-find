# Idea set — next game after Peek & Find (2026-10-19, `brainstorming-game-ideas` + `pebblit-game-craft`)

Prompt (Hasan): "Peek & Find is out; what game do we make next?" Earlier the same day: "why don't
we make a game at the level of Bus Fever Party?" This set looks for a **new** game; the earlier
set (`reports/2026-10-19-ideas.md`) held Peek & Find extensions, and its top idea is carried
forward as C.

## Assumptions

From `game-trend-profile.md`: solo (Hasan) + Claude Code, Phaser 3 + TypeScript + Vite, budget 0,
no paid UA, Playgama web portals first and YouTube Playables (text-free, 13+, no third-party IP,
no off-platform links). Reusable from Peek & Find: the Bridge wrapper (pause, mute, ads gate,
storage), the release pipeline (ZIP, audit, thumbnails, screenshots), the Vitest + Playwright
harness and the `pebblit-game-craft` feel standards. Art is the weak spot.

## Evidence (live pass, 2026-10-19)

The build machine's network policy blocks opening these pages (proxy 403), so every line below
comes from search-result text, not from the opened page: treat them as leads, **page not
opened**. Download figures are AppMagic model estimates.

| Fact | Value | Source |
| --- | --- | --- |
| Trending (growth) chart, September 2026 | 1 Food Hunt: Pixel Puzzle, 2 Bulldozer Master, 3 Moto Wheelie, 4 Colony Flow!, 5 嘎嘎特攻 | Global Games Forum, Sep 2026 (snippet) |
| Food Hunt: Pixel Puzzle | each level is a pixel-art image; tap a stack to load ants of a colour, they eat every matching block; limited holding slots, a full row of stuck slots fails; no timer; launched 14 May 2026; 200+ levels | game-solver.com review, 2026 (snippet) |
| Colony Flow! (ABI Games) | tap a cube → ants eat the tiles of that colour they can reach; buried tiles first; five waiting slots; pixel art revealed; updated 9 Oct 2026; reviews: "an ad after every level", hard levels "unless you use your bonus items or spend money, you can struggle" | Google Play / AppBrain listings, Oct 2026 (snippets) |
| Pixel Flow! (Loom Games, Istanbul) | conveyor of colour shooters clears pixel art; US top-20 grossing; Scopely bought a majority stake in Feb 2026 | Scopely press release, Feb 2026 (snippet) |
| Publisher pipelines | ant-sort prototypes (Rollic "Ant Bite Jam", inspired by the bus sort jams); Colony Flow! overtook Pixel Flow! in weekly IAP revenue | Carlos Pereira's newsletter, Oct 2026 (snippet; one source) |
| Downloads, September 2026 | Block Out! Color Sort Puzzle 12.35 M (#6), Meowdoku 11.59 M (#7), Arrow Puzzle 11.11 M (#9, Easybrain), Color Block: Combo Blast 10.54 M (#10) | GamingonPhone from AppMagic, Sep 2026 (snippet) |
| Bus Fever Party | still in the September 2026 download charts | mobilegamer.biz headline, Sep 2026 (snippet) |
| Playgama "trending now" | Block Blast Master, Arrow Puzzle, Cake Slice Sort 3D, Hexa Village: Sort & Match | playgama.com, Oct 2026 (snippet) |
| Already on the web | Pixel Flow: Color Blast (a Pixel Flow! clone, cannons) on Playgama; Colony Flow on bubbleshooter.net; Ant Flow on 1games.io; a Food Hunt review on Google Play: "way too many interstitial ads"; no CrazyGames or Poki listing found | search results, 2026-10-19 (snippets; CrazyGames and Poki not checked directly) |
| YouTube Playables | catalogue 788 → 1,477 titles between 1 Jul and 4 Sep 2026; top new performer Tricky Twist: Brain Puzzle at 394 k plays a day | Mediacube blog, Sep 2026 (vendor; snippet) |

Reading (estimate): the bus jam (Bus Fever Party and its clones) is **peaking**: big titles in
the download charts, a flood of clones, and publishers already moving to its next form. That
next form is the **pixel-art eating sort** (Food Hunt, Colony Flow!): two of the top five on the
September trending chart, prototypes in publisher pipelines, so **rising**, with a clone wave
expected within months. It keeps exactly what Hasan felt in Bus Fever: one tap releases a stream
of small units that land one by one with a tick, the board goes from chaos to order, and a few
slots make a few moves critical. Arrow / tap-away puzzles are rising in downloads too (Easybrain
in the top ten), and cats sell (Meowdoku in the top ten).

## Generation and cut

15 ideas generated privately. Cut:
- **A straight bus jam** ("Bus Fever with our art"): Competition 1 (the leaders are in the
  download charts, clones everywhere) and Timing 2 (peaking). That fails the GO gate whatever
  the total, so the answer to "why not a Bus Fever-level game" is: take its *feel* in the form
  that is rising now, not its theme.
- Third-party IP or memes (YouTube rules out both), hand-made trick puzzles like Tricky Twist
  (content cost 1 for us), Block Blast and hexa sort (saturated, big publishers), multiplayer
  (out of profile), a cat logic grid (Meowdoku-like; Feel 2, fails the craft gate).

Scored with `evaluating-game-ideas/scoring-rubric.md`, plus Face and Feel from
`pebblit-game-craft` (each needs ≥ 3 for GO).

| Idea | Simplicity | Content | Virality | Monetization | Competition | Timing | Fit | Total /35 | Face | Feel |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A · Munch Pixels (critters eat a pixel picture to reveal the one under it) | 3 | 5 | 5 | 4 | 3 | 4 | 4 | **28** | 4 | 5 |
| B · Cat Exit (tap-away cats, smallest possible) | 5 | 5 | 4 | 3 | 2 | 4 | 5 | **28** | 4 | 4 |
| C · Find Me (carried from the earlier set; a Peek & Find mode, not a new game) | 4 | 5 | 5 | 3 | 4 | 3 | 5 | **29** | 4 | 4 |

All three are GO candidates (≥ 24, no score of 1, Face and Feel ≥ 3). They differ in mechanic and
risk: A bets on a rising mechanic with our face on it, B is the one-week warm-up, C reuses the
engine we have.

### Idea: Munch Pixels (A) — working title, name to check before release

| Field | Content |
| --- | --- |
| **Core loop** | Tap a critter in the queue → it runs into the pixel picture and eats every pixel of its colour it can reach, swelling with each bite → full, it waddles off; the next layer shows → clear the picture to win; fail when every waiting slot holds a critter with nothing reachable. |
| **Why now** | Food Hunt: Pixel Puzzle #1 and Colony Flow! #4 on the September 2026 trending chart (Global Games Forum, Sep 2026, snippet); ant-sort prototypes in publisher pipelines (newsletter, Oct 2026, snippet); Pixel Flow! in the US top-20 grossing and bought by Scopely (Feb 2026, snippet). |
| **Lifecycle stage** | Rising; the clone wave has started on the web too (a Pixel Flow! clone on Playgama, ant versions on small portals; snippets, 2026-10-19), none found on CrazyGames or Poki. Window estimate 2–4 months, so speed matters: MVP in about three weeks. |
| **Twist** | A muted 3-second clip: tap a pink blob → it zips in and gobbles 14 pink pixels tick-tick-tick, getting rounder and rounder, waddles off with a burp, and under the eaten pixels a second, funnier picture **peeks through**. Every level hides a picture under the picture; the last bite reveals it whole. |
| **Keep vs change** | Keep: colour queue, reachability (outer pixels first), a few waiting slots, no timer, pixel-art levels. Change: a cast of greedy critters with a want (food) instead of anonymous ants; the reveal layer as the payoff; every level verified solvable without boosters (the Colony Flow! complaint, our Fair pillar); ads only behind our gate (≥ 3 levels and ≥ 120 s), not "after every level" (the Colony Flow! and Food Hunt complaint). |
| **Automation lever** | Levels from pixel images: about 30 pictures drawn as data or taken from CC0 pixel packs, recoloured and cropped into variants. A generator builds each level's critter queue, and a solver (search over tap orders with the slot limit) proves it solvable without boosters and measures difficulty (dead ends, critical taps), as Peek & Find's validators do. |
| **Social hook** | The hidden picture: "guess what was under it" as an image (a share button on web portals, none on YouTube); Shorts of the gobble-and-reveal. A daily picture in v2. |
| **Monetization** | Rewarded: +1 waiting slot, undo the last critter, shuffle the queue. Interstitial between pictures behind the existing gate (≥ 3 levels and ≥ 120 s). No IAP on YouTube or Playgama. Meta v2: an album of revealed pictures. |
| **MVP scope** | Grid sim and reachability, queue + 5 slots, critter feel cascade (`pebblit-game-craft`), generator + solver, 40 levels from 12 pictures, reveal layer, two rewarded boosters, the Peek & Find platform layer reused; ~3 weeks (estimate); Playgama web first, then the YouTube Playables build. |
| **Not in MVP** | Album, daily picture, leaderboard, more than two boosters, level editor. |
| **Kill switch** | Playgama sandbox targets (100 plays, 5:00 average; Playgama dashboard, 2026-10-18); then average session against Peek & Find's own numbers and the like ratio against the leaderboard top (≥ 50 % on 2026-10-19, estimate). Thresholds set live by `tracking-game-metrics`. |
| **Risks** | (1) The clone wave is already reaching the web portals → ship the MVP inside the window; the face, the reveal, boosters never required and fewer ads are what the clones lack. (2) Art: pictures and critters must look good at 128 px → pixel art is the cheapest style to make well; one critter sheet with colour variants baked at build time. |
| **Scores** | 3 · 5 · 5 · 4 · 3 · 4 · 4 = 28/35; Face 4, Feel 5 |

### Idea: Cat Exit (B) — smallest possible

| Field | Content |
| --- | --- |
| **Core loop** | Cats nap in a heap, each facing a direction; tap one → it dashes off that way if the path is clear, or bumps and hisses if a cat is in the way (a wasted move); empty the sofa within the move limit. |
| **Why now** | Arrow Puzzle (Easybrain) #9 in September 2026 downloads, 11.11 M, and on Playgama's trending list; Meowdoku #7 shows cats sell (GamingonPhone from AppMagic, Sep 2026; playgama.com, Oct 2026; snippets). |
| **Lifecycle stage** | Rising in downloads, many clones (Competition 2); window estimate 2–4 months. |
| **Twist** | The arrows are cats with moods: a cleared path sends a chain of cats dashing off in a row, each one a rising tick; the last cat leaves with a stretch and the sofa sighs. |
| **Keep vs change** | Keep the tap-away rule and the move limit. Change: characters instead of arrows, chain exits as the cascade, a funny bump instead of a silent fail. |
| **Automation lever** | Reverse construction: place cats one by one so each can leave once the later ones are gone, which guarantees a solution; the solver counts the dead ends to set difficulty. |
| **Social hook** | The chain clip; a daily heap with a moves-used card. |
| **Monetization** | Rewarded hint and +3 moves; interstitial between levels. |
| **MVP scope** | Grid, rule, generator, feel, 60 levels; about 1 week; Playgama then YouTube. |
| **Not in MVP** | Daily, cat collection, obstacles. |
| **Kill switch** | Same sandbox targets; it also tests the shared release pipeline on a second title. |
| **Risks** | (1) A crowded niche → the cats are the only moat; keep it as a warm-up, not the main bet. (2) Thin depth → a few obstacle types in v2 if numbers justify them. |
| **Scores** | 5 · 5 · 4 · 3 · 2 · 4 · 5 = 28/35; Face 4, Feel 4 |

### Idea: Find Me (C) — carried forward

Unchanged from `reports/2026-10-19-ideas.md`: your own avatar hidden in a generated crowd, a "can
you find me?" image, about two weeks on the Peek & Find engine. Strongest on reuse and share, but
it is a Peek & Find mode in a genre that is not rising, so it answers "make Peek & Find
better", not "the next game".

## Recommendation

Build **A (Munch Pixels)** next. It is the honest answer to the Bus Fever question: the same
hand-feel (one tap, a stream of units landing one by one, chaos to order, a few critical moves)
in the form that is rising this autumn instead of the one that is peaking. It plays to our
strengths (a generator with a solver turns any picture into fair levels, and the Fair complaint
in the leaders' reviews is our opening), it reuses the whole Peek & Find platform layer, and it
has a face (the critters) and a payoff to share (the hidden picture). Do B only as a one-week
warm-up if a quick second title is wanted; C stays the Peek & Find upgrade.

Checked during this pass: a Pixel Flow! clone is already on Playgama and ant versions sit on
small portals, so the window is shorter than the mobile charts suggest (Competition stays 3:
several competitors, clear complaints about ads and boosters). Still to do before the brief:
look at CrazyGames, Poki and YouTube Playables directly from a browser, and pick the name.

Open question for Hasan: take A to `evaluating-game-ideas` in depth, or straight to
`writing-game-agent-briefs` with its Feel spec?
