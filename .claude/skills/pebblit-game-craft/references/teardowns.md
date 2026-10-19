# Teardowns so far

## Bus Fever Party! (Lumi Games; package `gridplus.busjam.carpuzzle`), 2026-10-19

Sources: App Store (apps.apple.com/us/app/bus-fever-party/id6746743297), Google Play
(play.google.com/store/apps/details?id=gridplus.busjam.carpuzzle), genre rules from similar
bus-jam listings, and "BusOut is NP-complete" (arxiv.org/html/2505.09165v1). Not played by us;
Hasan described the boarding shake from his own play.

**Loop.** A jammed parking lot; tap a bus whose path is clear and it drives out to a limited
row of waiting spots; passengers queue and board only a bus of their colour, front of the
line first; a full bus leaves at once and frees its spot; filling every spot with the wrong
buses deadlocks the level. Boosters sort the queue or shuffle the cars.

**Why it flows.**
- One tap releases several seconds of motion: drive out, park, passengers board one by one, the
  full bus departs. The game plays itself for a moment after each decision.
- Micro-wins every few seconds: each departing bus.
- Chaos to order: the lot empties as you play, progress needs no counter.
- One rule, all information visible: colour and arrow.
- Tension saved for a few moves: most taps are easy, the waiting spots make a few critical; a
  rushed first move clogs the end.
- Losses are your own: no timer, no randomness in the core, the deadlock is visible in
  hindsight, so "one more try".
- **The boarding shake** (Hasan, 2026-10-19): each passenger boards with a tick and a small
  shake. It gives weight (the bus is really filling), rhythm (the brain counts along and the
  last passenger plus the departure is the release), several rewards from one decision, and a
  text-free "you were right".

**Where it breaks.** Google Play reviews call the difficulty "completely arbitrary": levels
that need a booster or luck break the sense that losses are your own. A solver-checked
generator fixes this.

**What we take.** Cascade after one input, rhythmic ticks with weight on success, chaos to
order, solver-checked fairness, rescue boosters as the rewarded moment.

## Playgama AI Challenge leaderboard, 2026-10-19

See `leaderboard.md`: likes over plays, community jokes, character thumbnails, share objects.

## Peek & Find (our own), 2026-10-18/19

**Strong:** a generator with validated spacing, occlusion and decoys; a difficulty ramp to
level 150 with twists (shuffle, memory); ads gated by scenes and time; saves; a daily chain;
hearts carried across levels (v1.7); a release pipeline that ships a fix the same day.

**Weak, and why:**
- Built to a certification brief (text-free, 13+, no memes, no IP, no links). Those rules are
  right for YouTube, but nobody wrote "a face, a feel, a share" next to them, so the design had
  none.
- Placeholder shapes for art, so the thumbnail, our best pitch on a likes leaderboard, shows
  geometry.
- Hidden object is a proven but faceless genre; without a character or a joke it reads as a
  utility.
- Feedback inversion: the wrong tap had the camera shake and the longest vibration; the right
  tap was lighter (see `juice.md`).
- No share object.
- Ops lesson: the QA tool's fake ad never took the focus, so the post-ad freeze and the
  heart-costing wake tap only showed up in the real Playgama host on an iPhone. Test ad flows in
  a real host page.

**Feel audit, 2026-10-19** (first run of this skill, checked in the code; re-check before
acting): the wrong tap shakes the camera and vibrates longest; the last find and the level win
fire in the same frame, so the final "found it" is masked by the win; found items stay on the
board at 45 % opacity, so the board never empties; the correct-tap sound cycles through three
pitches and falls back to the first on the fourth find. Proposed order: soften failure, give
the last find its own beat, add hit stop and a camera kick to success, then collect to HUD and
a rising combo.

**Feel pass shipped in 0.1.3 (GDD v1.8 §3a, 2026-10-19):** all five changes are in, behind
constants in `src/game/feel.ts`; the phone judgement is Hasan's. Three lessons from building it,
now in `juice.md`: tie the win to the last landing, not to a timer from the tap (a fixed beat
lost the race against the flight); when an object leaves the board, its tap circle has to go
too (an invisible circle swallowed taps on the visible neighbour); compare sounds as played,
file level plus gain (the heart sound was as loud as the success sound until the gain carried
the file's +4 dB).

**Directions on the table (reports/2026-10-19-ideas.md):** Find Me (your own avatar hidden in a
crowd, with a "can you find me?" image), Odd One Daily (a result card for the daily chain),
Find the Cat (one character that hides better every level). Plus the feel fixes: collect to
HUD, rising combo, softer failure.
