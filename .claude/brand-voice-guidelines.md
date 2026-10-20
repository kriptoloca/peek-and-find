# Pebblit Brand Voice Guidelines

## Generation Metadata
- Created: 2026-10-20
- Version: 1.1 (quality check fixes, same day; version 1 is in git history)
- Replaces: version 1
- Sources: the Peek & Find store listing, its copy review and the store test, the brand philosophy, README and critique, the 15-second video script, the GDD's progression terms, the launch plans, the social-trends report, the Shy Ghosts brief and evaluation, the house skill `pebblit-game-craft`, the rules of the game-trend skills, the project rules in both game repositories' `CLAUDE.md`, the decision log and the creator profile (Appendix)
- Documents processed: 18 (15 Appendix rows; some rows group related files)
- Conversations analyzed: 0 (no call recordings or transcripts exist)
- Discovery report used: No
- Overall confidence: Medium (strong, explicit rules for store copy and banned words; little published social or community writing yet)

---

## Executive Summary

Pebblit is a one-person studio (with Claude Code as the build agent) that makes small, text-free
puzzle games for web game portals and YouTube Playables. The games are played with one finger and
no reading, so words appear in only a few places: store pages, the occasional line on a short
video, community posts, and e-mails to platforms and publishers. Every word in those places has
to work as hard as a game's first tap.

The voice is calm, plain and warm. It leads rather than pushes, the way the studio's visual
identity, "Field & Signal", leads the eye to the one form that has been found instead of shouting.
It states what you do in the game in a few words, names the facts a browsing player checks, and
lets the characters carry the humour: ghosts too shy to be seen, munchers that eat a picture
pixel by pixel. It never hypes, never talks down, and never aims at a young audience.

Underneath the warmth sits honesty. Pebblit's method treats every number as something that needs
a source and a date, and its games are generated and checked so every level can be solved. The
voice carries the same promise: no inflated claims, no fake urgency, no player counts we cannot
show. Content should feel like a well-made puzzle box handed over with one sentence about how it
opens.

---

## We Are / We Are Not

| We Are | We Are Not |
|--------|------------|
| **Plain**: the action first, in everyday words | **Jargon-heavy**: "hyper-casual", "core loop", "addictive gameplay" in public copy |
| **Calm and confident**: no exclamation marks, no superlatives | **Hype**: "BEST GAME EVER!!!", "you won't believe", countdowns and fake urgency |
| **Playful through characters**: the joke lives in the ghost, the muncher, the situation | **Cutesy**: nursery words, sing-song spelling, emoji confetti, anything aimed at a young audience |
| **Honest**: true facts, real numbers with a source, limits admitted | **Inflated**: invented player counts, fake reviews, unsourced "99 % fail" claims, health or brain-training claims |
| **Respectful of attention**: short sessions named plainly, help when asked | **Manipulative**: guilt about streaks, "don't miss out", pressure to watch ads or pay |
| **Crafted**: few words, each chosen; the cairn of small stones stacked with care | **Generic**: "Embark on an epic journey", filler that could describe any game |
| **Global and inclusive**: English for everyone, 13+, no in-jokes or borrowed fame | **Borrowed**: third-party characters, brands, songs or memes; regional slang |

### Voice Attributes Detail

#### Plain
- **What it means**: say what the player does, in the words a player would use.
- **How it shows up**: pitches open with the repeated action ("Find the icon in the picture, tap it, next scene."); genre names stay genre names ("spot the difference").
- **What to avoid**: industry terms, abstract benefits ("unlock your potential"), "endless" next to "puzzles" (reads as grind).
- **Evidence**: the copy review in `docs/store/listing.md` (2026-10-18): the pitch "leads with the action the player repeats", and "endless" moved out of the pitch because next to "puzzles" it "read as grind".
- **Confidence**: High

#### Calm and confident
- **What it means**: the copy trusts the game; it states, it does not shout.
- **How it shows up**: zero exclamation marks in store text; facts instead of adjectives; short sentences.
- **What to avoid**: superlatives, capitals for emphasis, countdowns, "FREE!!!".
- **Evidence**: "Tone: plain and friendly, no exclamation marks, no superlatives, no age cues" (listing copy review, 2026-10-18); "Nothing announces itself; the eye is led, not pushed" and "No taglines" (brand philosophy "Field & Signal").
- **Confidence**: High

#### Playful through characters
- **What it means**: humour comes from a character with a want or a situation people recognise, not from jokey copy.
- **How it shows up**: one light character line where it helps ("The ghosts are shy."), hooks that show the joke ("Every ghost wants to be alone."), never a pun in every sentence.
- **What to avoid**: cutesy words, a nursery look described in words, emoji as decoration.
- **Evidence**: `pebblit-game-craft` pillar 1 ("Face: the game has a *who* or a *joke*"); the Shy Ghosts brief §4.3 ("too shy to be seen, even by each other"); the social-trends report ("make our own meme-able cast").
- **Confidence**: Medium (planned for the new games; Peek & Find has no character yet, and the creator profile lists "no humor or identity in the current game" as a weakness)

#### Honest
- **What it means**: every claim can be checked; estimates are called estimates.
- **How it shows up**: the bot win-rate hook carries its source in its own words: "About 1 % of random players beat this level." The figure (≈ 1 %, Munch Pixels level 70) comes from random play, not from people, so the line says *random players*, and "about" keeps the ≈. Partner e-mails state what we know and ask about the rest.
- **What to avoid**: invented scale ("millions of players"), fake scarcity, claims about health or intelligence.
- **Evidence**: the hook note in `reports/2026-10-20-launch-pebblit.md` §4 ("The number is true for random play, not for people, so the text says "random players""); `pebblit-game-craft` ("Be honest about our own game."); the first rule of the game-trend skills ("Live evidence only": in short, every number needs a current source with its date, or the label "estimate").
- **Confidence**: High (three explicit sources)

#### Respectful of attention
- **What it means**: we tell people what a session asks of them and never trick them into more.
- **How it shows up**: "A scene takes seconds, so play for a minute or an hour"; "keep your streak alive" as an invitation, with a forgiving streak behind it.
- **What to avoid**: guilt, nagging, "your streak will be LOST".
- **Evidence**: the listing's third line (session length and the return reason as an action); the Shy Ghosts streak, which covers one missed day a week on its own (the brief's shield) and offers a rewarded save that still works when the ad fails (launch plan §5).
- **Confidence**: Medium

#### Crafted
- **What it means**: few words, each placed; the same care as the marks.
- **How it shows up**: three-line descriptions, pitches of 90 characters or fewer, alternatives for shorter fields prepared in advance.
- **What to avoid**: filler phrases, padded descriptions, copy that could describe any game.
- **Evidence**: the brand philosophy ("made slowly, by a hand that placed each form"); the cairn mark ("small stones stacked with care", `docs/questions.md`); the listing's structure, which `tests/store.test.ts` enforces (pitch ≤ 90 characters, three description lines, five tags).
- **Confidence**: High

#### Global and inclusive
- **What it means**: written for a general 13+ audience anywhere, in simple English.
- **How it shows up**: no idioms that need a native speaker, genre terms that translate, text-free gameplay.
- **What to avoid**: words aimed at a young audience, third-party names, region-only slang.
- **Evidence**: `CLAUDE.md` rule 8 in both game repositories (13+, banned words, no third-party IP); the listing's localisation note.
- **Confidence**: High

---

## Brand Personality

- **Archetype**: the quiet craftsperson with a sense of humour: a puzzle maker who leaves one small joke in every piece.
- **If our brand were a person**: someone in a small workshop who hands you a well-made puzzle box, tells you in one sentence how it works, and smiles when you find the trick on your own.
- **Core values expressed in voice**: care, fairness (every level can be solved), honesty, respect for attention, play.

---

## Messaging Framework

### Primary Value Proposition
Small, fair puzzle games you can play with one finger and no reading, made with care.

Variations observed:
- "No reading, no timer, one finger." (Peek & Find pitch, `docs/store/listing.md`)
- "Every scene is freshly generated." (Peek & Find description)
- "Every ghost wants to be alone." (Shy Ghosts hook, `reports/2026-10-20-launch-pebblit.md` §4)
- "What was under the snack?" (Munch Pixels hook, same section)

### Key Message Pillars

1. **Play in a second**
   - Core idea: one finger, no reading, the first tap already plays.
   - When to use: store pitches, clip hooks, the hub page.
   - Example phrasing: "Find it, tap it, next scene."

2. **Fair, and never runs out**
   - Core idea: levels are generated and machine-checked before they ship, so there is always a next one and no unfair wall.
   - When to use: descriptions, partner and publisher e-mails, community posts about how the games are made.
   - Example phrasing: "Every house has exactly one solution." (Shy Ghosts brief §3.2; use only once the build is live)

3. **A face and a joke**
   - Core idea: each game has a character with a want, readable at thumbnail size.
   - When to use: thumbnails, clip hooks, social posts, the second line of a description.
   - Example phrasing: "The ghosts are shy. Don't let them see each other."

4. **Respect for the player** (for partners and publishers, not for store copy)
   - Core idea: interstitials only between levels, at least 3 levels and 120 s apart, never after a loss and never with a countdown; rewarded ads only when the player asks. Shy Ghosts waits longer: 5:00 of play and house 4 before the first interstitial (brief §7).
   - When to use: publisher pitches and platform e-mails; never as a public "fewer ads" promise, because portals may add their own.
   - Example phrasing: "Interstitials only between levels: at least 3 levels and 120 seconds apart, never after a loss, never with a countdown."

### Competitive Positioning
- vs. ad-heavy puzzle apps: we never name them; we state our facts (every level generated and machine-checked, help when you ask for it, ads only between levels).
- vs. look-alike clones: our own characters and rules; the originality check is part of every game.
- vs. the status quo (scrolling): "a minute or an hour", a game that fits the gap.

---

## Tone-by-Context Matrix

Voice is constant. Tone flexes by context.

| Context | Formality | Energy | Technical Depth | Key Principle | Example |
|---------|-----------|--------|-----------------|---------------|---------|
| Store listing (Playgama, CrazyGames, Playables) | Medium-low | Medium | Low | Lead with the repeated action; name the facts a browsing player checks | "Find the icon in the picture, tap it, next scene." |
| Clip hooks (Shorts, TikTok, Reels) | Low | Medium-high (pace, not volume) | None | One line, payoff first; most clips need no words at all | "What was under the snack?" |
| Community posts and devlogs (itch.io, subreddits that allow it) | Low | Medium | Medium | Show the work honestly and ask one real question | "Here is the first house of Shy Ghosts. Does the rule read without any text?" (illustrative) |
| Platform and support e-mails (cold outreach) | Medium-high | Low (calm) | Medium | Who we are in one line, then numbered questions, one ask each | "Before we release more games, could you help with a few questions?" |
| Publisher pitch (proposal) | High | Medium | High | Measured numbers first, each with its source and date; estimates labelled | "[Game] in one line. Average play time [value] over [period] (Playgama dashboard, [date])." (template) |
| Replies to players (comments, reviews) | Medium-low | Medium (warm) | Low | Thank, fix or explain, say when | "Thanks for telling us. We found the bug, and the fix comes with the next update." (illustrative) |
| In-game | n/a | n/a | n/a | Text-free: no words in play, digits only, at most ten UI strings | none (text-free) |

### Context-Specific Guidelines

#### Store listing
- **Overall tone**: plain and friendly, like a short note on the box.
- **Opening approach**: the action the player repeats, then the browsing facts.
- **Do's**: three-line description (how to play, variety, session length and the return reason); five genre tags; a shorter pitch ready for small fields.
- **Don'ts**: exclamation marks, superlatives, age cues, third-party brand or character names, "endless puzzles".
- **Example**: "Find the icon in the picture, tap it, next scene. No reading, no timer, one finger." (Peek & Find)

#### Clip hooks
- **Overall tone**: curious, light, true.
- **Opening approach**: movement in the first second; the payoff shown first; a hook line only when it adds.
- **Do's**: questions the clip answers ("What was under the snack?"); our own characters; numbers that are true as stated (say "about" when a figure is rounded).
- **Don'ts**: "99 % fail" bait, borrowed sounds or characters, reaction-face thumbnails, links in Shorts descriptions (not clickable since 31 Aug 2023, launch plan §4).
- **Example**: "Every ghost wants to be alone."

#### Platform and support e-mails
- **Overall tone**: polite, direct, organised.
- **Opening approach**: one line on who we are and what is live, then the questions.
- **Do's**: numbered questions; give the facts we already have; one decision per question.
- **Don'ts**: long backstory, pressure, vague asks.
- **Example**: "I'm Hasan from Pebblit Games (developer account since 18 Oct 2026; Peek & Find is in the sandbox). Before we release more games, could you help with a few questions?" (Playgama draft, `reports/2026-10-20-launch-pebblit.md`; "Pebblit Games" is the account name, see Open Question 1)

#### Publisher pitch
- **Overall tone**: precise and modest; the numbers speak.
- **Opening approach**: the game in one sentence, then average play time, conversion and return rate, each with its source and period.
- **Do's**: label estimates; name the cohort size; say what the next build changes.
- **Don'ts**: projections presented as results; adjectives where a number exists.
- **Example (template, no real pitch yet)**: "[Game] in one line. Average play time [value] over [period] (Playgama dashboard, [date]); [n] players in the cohort."

#### Community posts and devlogs
- **Overall tone**: open and practical, maker to makers and players.
- **Opening approach**: what we made or changed, one picture or clip, one question.
- **Do's**: share what we learned, including what did not work; credit tools and assets.
- **Don'ts**: disguised ads, posting where self-promotion is not allowed.
- **Example (illustrative, not yet published)**: "We make small text-free puzzle games. Here is the first house of Shy Ghosts. Does the rule read without any text?"

#### Replies to players
- **Overall tone**: warm, short, specific.
- **Opening approach**: thank the player for the exact thing they reported.
- **Do's**: say what changes and when, if we know; admit a mistake plainly; one reply per thread.
- **Don'ts**: arguing with a rating, promising dates we cannot keep, copy-paste replies.
- **Example (illustrative, not yet used)**: "Thanks for telling us. We found the bug, and the fix comes with the next update."

---

## Terminology Guide

### Must-Use Terms
| Term | Usage | Instead Of | Example |
|------|-------|------------|---------|
| Pebblit | the studio in public copy | "Pebblit Studio", "we at Pebblit Games" (exception: "Pebblit Games" where an account or legal name requires it, such as the Playgama developer account) | "A Pebblit game." |
| Peek & Find | with the ampersand | "Peek and Find", "Peek&Find" | "Peek & Find is in the sandbox." |
| scene, level, house | the unit of play: Peek & Find plays in scenes and counts progress in levels ("from level 30"); Munch Pixels plays levels; Shy Ghosts plays houses | mixing units within one game | "A scene takes seconds." |
| one finger, no reading, no timer | the browsing facts, where true | "easy controls" | "No reading, no timer, one finger." |

### Preferred Terms
| Term | Usage | Example |
|------|-------|---------|
| daily, streak | the return reason, as an action | "Keep your streak alive." |
| hint | help the player asks for | "Stuck? Ask for a hint." |
| freshly generated | instead of "endless" | "Every scene is freshly generated." |
| genre names (hidden object, spot the difference, logic puzzle, color sort) | tags and descriptions | "A logic puzzle with shy ghosts." |

### Avoid These Terms
| Term | Reason | Alternative |
|------|--------|-------------|
| addictive | manipulative, and a red flag for platforms and parents | "one more house" |
| endless (next to puzzles) | reads as grind (listing review) | "freshly generated", "a new one every time" |
| epic, ultimate, amazing, best | superlatives break the calm voice | a concrete fact |
| hyper-casual, core loop, retention | industry jargon | what the player does |
| brain training, improves memory | health claims we cannot back | "a logic puzzle" |

### Never-Use Terms
| Term | Reason |
|------|--------|
| kids, children, toddler, baby, preschool (and their plurals) | platform rule for a general 13+ audience; `tests/store.test.ts` fails on them in `docs/store/` |
| third-party brand, character, song or meme names | IP risk and takedowns (`CLAUDE.md` rule 8) |
| invented numbers ("millions of players", "99 % fail") | dishonest; every number needs a source |
| "download our app", "visit our site" on YouTube Playables | off-platform links and calls to action are not allowed there |

---

## Content Examples

### Excellent Examples

**Peek & Find store listing** (`docs/store/listing.md`; in the Playgama sandbox since 2026-10-18, not yet in the catalog)

> Find the icon in the picture, tap it, next scene. No reading, no timer, one finger.
>
> One icon at the top, one busy picture below: find what the icon shows and tap it.
> Three ways to play (find the targets, pick the odd one out, spot five differences) across kitchens, beaches, city streets, forests and space. Every scene is freshly generated, and from level 30 the board starts moving.
> A scene takes seconds, so play for a minute or an hour, then come back for the five-scene daily chain and keep your streak alive.

Why it is on-brand: the action comes first; the three browsing facts follow; each description line has one job (how to play, variety, session and return); no exclamation marks, superlatives or age cues; themes named as places, not brands. "Level 30" counts progress, while each round is a scene (Terminology).

**Shy Ghosts hook** (`reports/2026-10-20-launch-pebblit.md` §4): "Every ghost wants to be alone." It names the rule and the character's want at once, in five calm words.

### Examples to Avoid

> 🔥 The most ADDICTIVE puzzle game EVER!!! Kids love it. Download now and beat level 99 like only 1 % of players can!

What is off-brand: hype and capitals, "addictive", a banned audience word, an off-platform call to action, and an unsourced claim about players (our own 1 % figure is for random play, and our hook says so). A fixed version: "Place one ghost in every room. The ghosts are shy: none may see another."

---

## Confidence Scores

| Section | Confidence | Basis | Sources |
|---------|------------|-------|---------|
| Executive Summary | Medium | a synthesis of all sources; the store-copy parts are explicit, the character and community parts are planned | 18 |
| We Are / We Are Not | High for plain, calm, honest, crafted, global; Medium for playful and respectful | explicit rules in the listing review, the store test, the brand philosophy and the project rules; playfulness and respect come from plans not yet published | 10 |
| Voice Attributes | as the row above | each attribute cites its own sources | 10 |
| Brand Personality | Medium | inferred from the brand philosophy, the house method and the profile; no source states it outright | 3 |
| Messaging Framework | Medium | one listing in the sandbox plus hooks and briefs for unreleased games | 6 |
| Tone Matrix | High for store copy; Medium for clips and e-mails; Low for publisher pitches, community posts and player replies | one reviewed listing, a video script and one e-mail draft; nothing published yet in the other contexts | 6 |
| Context Guidelines | as the Tone Matrix | the same sources; the publisher pitch and the reply are a template and an illustration | 6 |
| Terminology | High for never-use terms (tested); Medium for preferred terms | enforced by the store test and the project rules; preferred terms from one listing | 5 |
| Content Examples | High for the Peek & Find listing; Medium for the hooks; Low for illustrative lines | the listing passed a copy review and the store test; the hooks are drafts; illustrative lines are marked | 4 |
| Open Questions | Medium | each question rests on a conflict or a gap found in the sources | 7 |

---

## Open Questions for Team Discussion

### High Priority (blocks guideline completion)
1. **"Pebblit" or "Pebblit Games" in public copy?**
   - What was found: the listing ("Studio: Pebblit"), the wordmark and the YouTube channel say "Pebblit"; the Playgama account and the e-mail draft say "Pebblit Games".
   - Agent recommendation: "Pebblit" everywhere players see it; "Pebblit Games" only where an account or legal name is required.
   - Need from you: confirm or override.
2. **US or UK spelling?**
   - What was found: internal documents mostly use UK spelling ("colour", "monetisation", "localisation"), the GDD also uses "color", and portals and search use US terms ("color sort").
   - Agent recommendation: US English in all public copy; internal documents stay as they are.
   - Need from you: confirm or override.

### Medium Priority (improves quality)
3. **How much humour in store text?**
   - What was found: the Peek & Find listing is plain; the house method wants a face and a joke.
   - Agent recommendation: one light character line in the description's second line; never in the pitch's first words, which state the action.
   - Need from you: confirm.
4. **Whose voice speaks: "we" or Hasan?**
   - What was found: the Playgama e-mail draft opens in the first person ("I'm Hasan…", "I live in Türkiye"), uses "we" for the studio's games and plans, and signs "Hasan, Pebblit Games".
   - Agent recommendation: "we" for the studio, "I" only for personal facts, signed with Hasan's first name; no personal details beyond that.
   - Need from you: confirm you are comfortable being the visible face.
5. **Fallback title "Find 3!"**
   - What was found: `docs/store/listing.md` keeps "Find 3!" and "Hidden Hunt" as fallback titles in case "Peek & Find" is taken; the copy rules ban exclamation marks.
   - Agent recommendation: drop the mark ("Find 3"), or make "Hidden Hunt" the first fallback; if the mark is meant as part of a name, record it as the one exception.
   - Need from you: pick one.

### Low Priority (nice to have)
6. **Wording of the bot win-rate hook**
   - What was found: the launch plan's hook says "Only 1 % of random players beat this level."; the figure behind it is ≈ 1 % for random play.
   - Agent recommendation: "About 1 % of random players beat this level."
   - Need from you: confirm, then the launch plan's hook gets the same words.
7. **Emoji on social?**
   - What was found: no guidance; clips are mostly text-free.
   - Agent recommendation: none in store copy; at most one in a social caption when it carries meaning (a ghost for Shy Ghosts).
   - Need from you: confirm.

---

## Data Gaps & Recommendations

- [ ] No published social posts or community replies yet: review the tone matrix after the first ten posts and their numbers.
- [ ] No player reviews yet: replace the illustrative reply with a real one after the first reviews arrive.
- [ ] No publisher pitch exists: write the first one when a game passes Playgama's review gate (100 plays and 5:00 average play time, launch plan §2), and add it here as the example.
- [ ] The Munch Pixels and Shy Ghosts listings are not written: draft them with these guidelines and `design:ux-copy`, then promote the best lines to Content Examples.
- [ ] The launch plan's ad table (§5) does not carry the Shy Ghosts gates from the brief (§7: 5:00 of play before the first interstitial, never before house 4, never before or during the daily house); align it when Shy Ghosts ships.
- [ ] Copy in languages other than English is out of scope (an English listing for a global audience); add a section only if a channel in another language opens.

---

## Appendix: Sources

| # | Source | Platform | Type | Date | Key Sections Used | Confidence |
|---|--------|----------|------|------|-------------------|------------|
| 1 | `docs/store/listing.md` (Peek & Find listing and copy review) | this repo | AUTHORITATIVE | 2026-10-18 | voice, tone, terminology, examples, fallback titles | High |
| 2 | `tests/store.test.ts` | this repo | AUTHORITATIVE (test) | 2026-10 | banned words, pitch ≤ 90 characters, three description lines, five tags | High |
| 3 | `docs/store/brand/philosophy.md` ("Field & Signal") | this repo | AUTHORITATIVE (visual identity) | 2026-10-18 | calm voice, no taglines, craft | High |
| 4 | `docs/store/brand/README.md` and `critique.md` | this repo | AUTHORITATIVE | 2026-10-18 | mark meaning, palette | Medium |
| 5 | `docs/questions.md` (brand decisions) | this repo | OPERATIONAL | 2026-10 | the cairn ("small stones stacked with care") | Medium |
| 6 | `CLAUDE.md` of peek-and-find and munch-pixels (rule 8) | this repo and the munch-pixels repo | AUTHORITATIVE (policy) | 2026-10 | banned words, 13+, no IP, text-free | High |
| 7 | `docs/store/video-script.md` | this repo | OPERATIONAL | 2026-10-18 | clips: no voice, no text, the first second shows the game | Medium |
| 8 | `GDD.md` | this repo | AUTHORITATIVE (design) | 2026-10 | scene and level as units (twists from level 30, a heart every 20th level) | Medium |
| 9 | `.claude/skills/pebblit-game-craft/SKILL.md` | this repo | AUTHORITATIVE (house method) | 2026-10-19 | the Face pillar, honesty about our own game | High |
| 10 | game-trend skills, "The five rules" | installed plugin (not in the repo) | AUTHORITATIVE (method) | 2026-10 | live evidence only, estimates labelled | Medium |
| 11 | `reports/2026-10-20-launch-pebblit.md` | this repo | OPERATIONAL | 2026-10-20 | hooks and the bot-figure note (§4), Shorts links (§4), ad placements (§5), review gate (§2), Playgama e-mail draft | Medium |
| 12 | `reports/2026-10-20-social-trends.md` | this repo | OPERATIONAL | 2026-10-20 | the meme rule | Medium |
| 13 | `briefs/shy-ghosts.md` and `reports/2026-10-20-eval-shy-ghosts.md` | this repo | OPERATIONAL | 2026-10-20 | character (§4.3), one solution (§3.2), streak shield, ad gates (§7) | Medium |
| 14 | `docs/store/launch-plan.md` | this repo | OPERATIONAL | 2026-10-18 | channels, share post | Low |
| 15 | `game-trend-profile.md` | this repo | AUTHORITATIVE (facts) | 2026-10-20 | studio facts, accounts, audience, languages, weaknesses | High |
