---
name: pebblit-game-craft
description: Pebblit's game approach and style for small casual web and mobile games that feel good in the hand and earn likes, built on five pillars (Face, Feel, Flow, Fair, Share). Use it whenever a game is being designed, polished, reviewed or compared - a new game idea or GDD, "why isn't this fun", "make it feel better / juicier / more satisfying", phone-test feedback about how a tap or a win feels, screen shake, haptics, sounds and animations on success or failure, a competitor or leaderboard teardown (Playgama, YouTube Playables, CrazyGames, Poki, app stores), choosing what to build next, or before writing a build brief. Use it next to the game-trend skills, which bring market evidence; this skill brings the design taste they lack. Trigger it even when the user only names a game they admire and asks what makes it good.
---

# Pebblit Game Craft

Pebblit makes small games for web portals and YouTube Playables. This skill is the house
approach, learned the hard way on 2026-10-18/19 from three sources: the Playgama AI Challenge
leaderboard, a teardown of Bus Fever Party!, and the mistakes in our own Peek & Find. The
details and evidence live in `references/`; this file is the working method.

## The one-line test

> A muted 3-second clip shows **a face**, **a satisfying cascade after one tap**, and ends
> with **something a player would send to a friend**.

A game that passes this test can still fail, but a game that fails it will not be liked,
however solid its engine is. Peek & Find failed all three parts while being technically sound:
validated generator, difficulty ramp to level 150, ads, saves, a daily chain. Correct is not
the same as fun, and the gap is what this skill exists to close.

## The five pillars

Feel and Flow decide whether people stay. Face and Share decide whether they come and press
like. Fair decides whether they come back after losing.

### 1. Face: the game has a *who* or a *joke*

The Playgama AI leaderboard ranks by likes, and every top thumbnail on 2026-10-19 showed a
character, a face or a joke; the top two had like ratios above 50 % while the rest sat at
5–13 % (see `references/leaderboard.md`). A board of abstract shapes reads as a utility, not
as something to root for.

- Give the game a character with a want (a cat that hides, a bus that is late for the party)
  or a situation a community recognises (on-call developers, office life, a rigged claw
  machine).
- The thumbnail tells the joke at 128 px: one character, one action, one accent colour.
- Quick check: describe the game in one sentence *without* the mechanic. If only the mechanic
  is left ("find the shapes"), there is no face yet.
- Platform limits shape the face, they don't remove it: YouTube Playables gameplay is
  text-free and 13+, and no third-party IP or memes are allowed anywhere. So the face must be
  original, and the joke lives in the character, the situation and the store title.

### 2. Feel: the right move is the loudest moment

In Bus Fever Party one correct tap sends the bus out, the passengers board one by one with a
tick and a small shake, and the full bus leaves. The shake says *heavy, real, right*. Peek &
Find had it backwards: its only camera shake and its longest vibration were on the **wrong**
tap, so players felt the weight of their mistakes and the lightness of their wins.

- **Success outweighs failure.** Failure stays local and soft: the object wobbles, a heart
  cracks, a low short sound, no camera shake. Success gets the stack: a short hit stop, a
  camera kick, squash and stretch, a bright sound, particles, a haptic tick where the platform
  allows it.
- **One input, a cascade.** One tap should release about a second or more of satisfying motion
  that the player does not have to drive (an estimate to tune on a phone). While it plays out,
  the player is already planning the next move, so there is no dead time.
- **Rhythm.** When a success produces several units (passengers, coins, stars, found items),
  deliver them as evenly spaced ticks with a rising pitch and give the last one the biggest
  payoff. Counting along is part of the pleasure.
- **Escalation.** Consecutive successes get a little stronger each time (pitch step, shake
  step), capped after three or four steps so it never gets loud.
- **Know the hardware.** Safari on iPhone has no Vibration API, so a web game's hand-feel on
  iPhone is visual and audio only. Native apps can use the haptic engine; we can't on the web.

Starting values, the Phaser calls and the feel-audit procedure are in `references/juice.md`.

### 3. Flow: one rule, everything visible, tension saved for a few moves

Bus Fever has one rule (colour plus arrow), shows everything on screen, makes most moves easy
and a few moves critical (limited waiting spots; a rushed first move clogs the end of the
level). That rhythm, calm with short spikes of thought, is what keeps people in.

- A micro-win every few seconds (a bus leaves, a target is collected), not one win at the end.
- The board visibly goes from chaos to order, so progress needs no counter.
- No hidden information unless hiding *is* the game; the next move should be readable.
- Check on a recording: count micro-wins per minute and flag any stretch of roughly ten
  seconds where nothing completes (a starting threshold, tune it per game).

### 4. Fair: every loss is the player's own mistake

Bus Fever's reviews complain that difficulty is "completely arbitrary", and the bus-jam
puzzle family is NP-complete, so a careless generator produces impossible or luck-based
levels. Our strength is generators with validators; use it.

- Every generated level is verified solvable without boosters (a solver, or invariants the
  generator checks), and difficulty is measured, not guessed.
- A loss has a visible cause the player can name ("I sent the red bus too early").
- Boosters and rewarded ads rescue at the critical moment; they never gate a level.
- Lives are a run resource, never a spiral: if one mistake at low lives sends the player
  into a loop of instant losses, soften the rule (Peek & Find v1.7 keeps this as an open
  question).

### 5. Share: the player leaves with something to send

High like ratios come from a community passing the link around; a game that produces
nothing to share depends on portal traffic alone, where like ratios were around 5 %.

- One share object per session: a daily result card, a "can you find me?" image, a short
  replay.
- On YouTube Playables off-platform links are not allowed: hide the share action there and
  keep the game complete without it; keep it on the web portals.
- Launch with a community post (Playgama's free traffic run also requires one).

## Workflows

### A. New game idea, GDD or build brief

1. Run the game-trend skills as usual (scan, brainstorm, evaluate).
2. Add two scores to their 7-criterion rubric, 1–5 each:
   - **Face**: 1 = abstract shapes, no who · 3 = a themed world with characters but no want
     or joke · 5 = a character or joke readable at 128 px that a community recognises.
   - **Feel**: 1 = success and failure feel the same, or failure is louder · 3 = success has a
     pop and a sound · 5 = success cascade with rhythm, escalation and a hit stop, failure
     clearly softer.
   A candidate needs at least 3 on both to be a GO, whatever its total.
3. Write a **Feel spec** section into the GDD or brief: every player action with its success
   and failure feedback (visual, sound, haptic, camera, duration), the cascade per input, the
   micro-win cadence, and the share object. Coding agents build what is written; if the feel
   is not specified it will not be built.

### B. "It isn't fun" or "make it feel better": the feel audit

Follow the procedure in `references/juice.md`: inventory every player action from the code,
fill the feedback table, flag inversions (failure louder than success) and dead time, then
propose changes with starting values behind named constants. Ship them, then let Hasan judge
on a phone; numbers on paper are only a start. Record the decision in the project's decision
log.

### C. A game someone admires, a leaderboard, a competitor

Use the teardown template in `references/leaderboard.md`: the thumbnail, the face or joke, the
verb, the cascade per input, the micro-win cadence, fairness complaints in reviews, the share
object, the like ratio. Extract the principle, never the IP. `references/teardowns.md` holds
the teardowns done so far (Bus Fever Party, the leaderboard top six, Peek & Find).

## How to answer

- Answer in the user's language (Hasan writes Turkish), verdict first, then the reasons.
- Any market number (plays, likes, retention, revenue) needs a live source with a date, or the
  label "estimate". Design values like durations and amplitudes are starting points to tune,
  and should be presented that way.
- Be honest about our own game. The useful finding on 2026-10-19 was uncomfortable: we had
  optimised for certification and correctness and never wrote "a face, a feel, a share" into
  the design.

## Platform facts that shape the style

- **YouTube Playables:** text-free gameplay, no off-platform links, 13+, no third-party IP,
  small initial load, host-driven pause and mute.
- **Playgama:** Bridge SDK required; sandbox targets of 100 plays and a 5:00 average play time
  before evaluation (dashboard, 2026-10-18); the AI Challenge leaderboard ranks by likes.
- **Web on iPhone:** no vibration; Bridge pauses the game when its window loses focus (an ad
  in the host page), and the tap that brings focus back must not count as a game tap. Test ad
  flows in a real host page, because a QA tool's fake ad may not take the focus.
