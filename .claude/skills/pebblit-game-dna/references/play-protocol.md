# Play protocol (capture for one game)

## Before playing: is this source allowed?

| Source | How we capture | Why |
| --- | --- | --- |
| YouTube Playables | never automated; Hasan's screenshots of the rows and his notes from playing on the phone; if the same game exists on a web portal, play it there | YouTube's terms forbid accessing the service by automated means except search engines following robots.txt or with prior written permission |
| Playgama catalog | automated at human pace once its terms are checked (phase 0); until then, Hasan's screenshots | we publish there; we do not want an account problem |
| CrazyGames, Poki and other portals | automated at human pace after reading each site's terms; otherwise screenshots | same |

Always: one session per game per week; block requests to ad networks (route-abort the known ad
and analytics hosts) and never click an ad, so the scout creates no ad impressions for anyone; no
login; no download of game code or assets; nothing stored but our notes, the timing log and the
key frames.

## The session (5–8 minutes)

1. **Open and wait.** Load the game page in a 540×960 portrait viewport. Note the time to the
   first interactive frame. Do nothing for 10 seconds; save the frame: what does the game teach
   with no input?
2. **First minute.** Play like a first-time player: screenshot → decide → tap at coordinates.
   Log every input with a timestamp and what happened.
3. **Write the rules.** After the first minute, write the mini-spec: objects, the verb, what an
   input does, how a level is won and lost, the constraint that makes it hard.
4. **Prediction check.** Before each of the next three moves, write what you expect to happen.
   Make the move. A mismatch means the spec is wrong: fix it and run three more predictions.
5. **Keep playing to minute 5–8,** filling the minute map of `pebblit-retention` (wins, new
   things, the visible next goal, friction, the moments you would stop).
6. **Key frames:** first frame, first input, first win, a success cascade (3–4 frames in a burst
   about 150 ms apart), a failure, a meta or map screen, an ad slot (blocked: note where it would
   be), minute 5. About twelve in total, each ≤ 540×960.
7. **Write the DNA card** (`dna-card.md`), marking each field `observed`, `inferred` or
   `not reached`.

Run the analysis of frames in batches of at most 12 images, in a fresh subagent per game, so
earlier screenshots do not pile up in one request.

## Assisted mode (screenshots only)

When a game cannot be played (YouTube, or a site that forbids automation), build the card from
Hasan's screenshots and notes plus the store page text. Most Core and Texture genes can be read
from a few frames; Tempo and Hold stay `not reached` unless Hasan's notes give them. A card in
assisted mode is labelled as such, and the PM weighs it lower.

## Caching

A card is reused week after week. A game is played again only when it enters a list for the
first time, when its title or thumbnail changes (a new version), or when a card has more than
three `not reached` fields that matter for a derivation.
