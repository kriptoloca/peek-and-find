---
name: pebblit-game-dna
description: How Pebblit decodes a top or trending game into its DNA by watching and playing it - the verb, board, goal, constraint, cascade, tempo, hold mechanics, feel stack, face, art texture, monetization and share object - and how it derives new, original games from those DNA cards with mutation, crossover, transplant and wildcard operators, an originality distance and a recorded lineage. Use it whenever a top-10 list, a trending row, a leaderboard or a chart (Playgama, YouTube Playables, CrazyGames, Poki, app stores) is being studied, when someone asks to analyse, play or tear down a game, asks "what makes this game work", or wants new game ideas from the games at the top, and whenever an idea needs an originality check against existing games or our own catalog. Use it with pebblit-game-craft (pillars and taste), pebblit-retention (the minute map) and the game-trend skills (market evidence); this skill owns the decoding and the derivation.
---

# Pebblit Game DNA

Titles and thumbnails say what is popular; only playing says why. This skill turns a game at the
top of a list into a **DNA card** (what it is made of and why it holds players), mines the cards
for patterns, and derives new games that keep the proven pleasure while changing enough to be
ours. Playgama refuses copies of catalog games and duplicates of a developer's own games, and
YouTube Playables refuses reworks of famous games, so originality is designed in, not hoped for.

## 1. Capture: see, play, understand

Follow `references/play-protocol.md`. In short:
- **Allowed sources only.** Never automate YouTube (its terms forbid automated access): Playables
  come in as Hasan's screenshots and notes, or as the same game's web version on a portal. On
  other portals play at human pace, one session per game per week, with ad requests blocked and
  no ad ever clicked, no login, no download of code or assets. Check each site's terms once.
- **Watch first, then play.** Record the first 10 seconds untouched (what the game teaches with no
  input), then play 5–8 minutes through screenshots and taps.
- **Prove the rules.** Write the rules as a mini-spec after the first minute, then predict the
  result of the next three moves before making them. A wrong prediction means a wrong rule:
  correct the spec and predict again. Mark every field `observed`, `inferred` or `not reached`.
- **Time everything.** Load to first input, first win, level durations, inputs and wins per
  minute, the longest stretch without a win, friction between levels, where ads appear.
- **Key frames, not a film.** Keep about twelve 540×960 frames: first frame, first input, first
  win, a success cascade (three or four frames in a burst), a failure, a meta or map screen, an ad
  slot, minute 5. More frames break the image limits of one request; analyse in batches.
- **Fill the minute map** of `pebblit-retention` for what the game does to hold players.

## 2. The DNA card

Schema and a worked example: `references/dna-card.md`. The genes:

| Group | Genes |
| --- | --- |
| Core | verb · objects · board structure · goal · lose condition · key constraint · cascade per input |
| Tempo | time to first input · first win · level duration · inputs per minute · wins per minute · longest gap |
| Hold | novelty cadence · meta · rescue · never-run-out mode · ad pacing (from the minute map) |
| Feel | success stack · failure stack · rhythm and escalation |
| Face | character or joke · community it speaks to · thumbnail read at 128 px |
| Texture | palette (hex) · shape language · line and fill · animation style · UI density · text use · sound (only if heard, from Hasan) |
| Business | rewarded placements · interstitial placements and frequency · share object |
| Signals | list, rank history, plays, likes, like ratio, dates |
| Verdict | pillar scores (Face, Feel, Flow, Fair, Share, Hold; 1–5) · the principle to take · what must never be copied |

"What must never be copied" always lists the name, characters, art and sound assets, level layouts
and UI of the source game.

## 3. Patterns (weekly)

From all cards and the rank history in `research/`:
- **Rising:** new entries and jumps of three or more places; their genes weigh double this week.
- **Shared genes:** genes that appear in most of the top 10 (the table stakes) versus genes only
  the top three have (the edge).
- **White space:** genes rising on one platform but absent on another, and genes no top game uses
  with our strengths (generators with solvers, pixel boards, hidden objects).
- **Our overlap:** which of our own games share genes with the risers.

## 4. Derivation

Follow `references/derivation.md`. Four operators on DNA cards:
- **Mutation (closest):** keep the pleasure genes of one parent (verb, cascade, tempo); change the
  face, theme and art, and at least one rule or the board structure.
- **Crossover (creative):** the verb of one parent with the goal or constraint of another, and
  optionally the session shape of a third.
- **Transplant:** a top gene grafted onto one of our proven systems.
- **Wildcard:** the smallest idea that could work, to keep exploring.
- **Overlay:** a seasonal or social theme (`game-trend-skills:scouting-social-trends`), always with
  an original face and no third-party IP.

Every candidate carries its **lineage**: the parent cards, the genes kept and the genes changed.

## 5. Originality gate

Compute the originality distance of `references/derivation.md` against every card (the lists and
our own catalog). A candidate passes only when:
- against any external game, the distance is at least 6 and no level layout, UI, character or name
  is taken;
- against our own catalog, the verb and board structure are not both the same (if they are, it is
  an update of that game, not a new game);
- the name is not in the latest catalog title snapshot and contains no trademark.

## Honesty

The model does not hear sound and cannot feel 60 fps in the hand; rules can be inferred wrong,
which is why the prediction check exists and why every field is marked observed or inferred. A DNA
card explains a game's design, not its traffic: a game can top a list because of a feature slot or
a paid campaign, so rank history and like ratio go next to the card, never instead of it.
