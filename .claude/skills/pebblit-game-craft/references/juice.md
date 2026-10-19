# Juice: the feel audit and starting values

"Juice" is the abundant, physical feedback a game gives to every player action: motion,
sound, camera, particles, haptics. The classic references are the talks "Juice it or lose it"
(Martin Jonasson and Petri Purho, 2012) and "The Art of Screenshake" (Jan Willem Nijman,
Vlambeer); Kenney keeps both on his list of must-see videos for indie developers
(kenney.nl/learn/must-see-videos-for-indie-developers).

## Contents

1. The feel audit (procedure and table)
2. Starting values (tune on a phone)
3. Patterns
4. Phaser 3 notes
5. Guard rails

## 1. The feel audit

Use it when a game "isn't fun", after phone-test feedback about feel, and before every release
that touches gameplay.

1. **Inventory the actions.** List every player action and outcome: correct tap, wrong tap,
   empty tap, level won, level lost, combo, hint, continue, menu. Read them from the code, not
   from memory: grep for tweens, camera shake, sound plays and vibration calls.
2. **Fill the table**, one row per outcome:

   | Action → outcome | Visual | Sound (loudness, length) | Camera | Haptic | Duration | Intensity 0–3 |
   | --- | --- | --- | --- | --- | --- | --- |

   Intensity is how strongly it lands, not how many cues it has: weigh full-screen motion
   (camera) above local motion, longer and louder above shorter and softer, and a haptic above
   none. Two cues can outweigh four small ones. Compare the sounds by ear or by measuring the
   files (peak and RMS, length); a failure sound louder than the success sound is an inversion
   on its own.
3. **Flag the problems:**
   - an **inversion**: any failure row stronger than the main success row;
   - **dead time**: after a success, the screen goes still while the player thinks;
   - **flat repetition**: the fifth success feels exactly like the first;
   - a **lonely win**: the level ends with one big win but nothing on the way to it;
   - a **masked success**: a success that fires in the same frame as a bigger event (the last
     find and the level win together) is never felt on its own; give it its own beat first.
4. **Propose changes** with starting values from section 2, each behind a named constant so
   it can be tuned without hunting through code.
5. **Ship and test on a phone.** Hasan judges the feel on a device; record what changed and why
   in the project's decision log.

Peek & Find on 2026-10-19 is the reference example of an inversion: the wrong tap shook the
camera (90 ms) and vibrated longest (40-50-40 ms on Android), while the correct tap had a
110 ms pop, a ring, a sparkle, a rising ding and a 12 ms vibration.

## 2. Starting values (estimates; tune on a device)

| Effect | Success | Failure |
| --- | --- | --- |
| Hit stop (freeze of the game clock) | 40–60 ms | none |
| Camera | kick of 2–4 px, or Phaser shake intensity about 0.002–0.003 for 60–90 ms | none |
| Squash and stretch | scale to 1.15–1.25 and back over 80–120 ms | wobble ±8–12 px, 3 cycles of 40 ms, on the object only |
| Sound | bright, short, rising pitch per step | low, short, soft |
| Particles | 6–12 sparks or confetti | none, or one puff |
| Haptic (Android, native) | 10–15 ms per tick, 30–40 ms for a big win | never longer than the success tick |
| Multi-unit payoff | ticks every 60–90 ms, +1 semitone each, the last louder | n/a |
| Escalation | +1 step per consecutive success, cap after 3–4 | reset the chain |

## 3. Patterns

- **Collect to HUD.** The found item flies along a short curve to its HUD icon (300–450 ms,
  ease-in), the icon bounces on arrival and its counter ticks down. The board empties while the
  HUD fills: progress made visible, and a cascade from one tap. This is the cascade for games
  where one success is one unit: the flight, the arrival tick and the counter are the rhythm.
- **Input during a cascade.** Keep input open while a cascade plays unless the next move
  depends on its result; a cascade that blocks taps turns satisfaction into waiting.
- **Board clear.** When the last item goes, a sweep, a beat of silence, then the win sound.
- **Win sequence.** Stars appear one by one with rising sounds (Peek & Find already does this),
  then the next level starts without a menu in between.
- **Near-miss honesty.** A wrong tap next to the target shows where the target was only if
  the game wants to teach; otherwise it stays quiet and local.

## 4. Phaser 3 notes

- Camera: `this.cameras.main.shake(durationMs, intensity)`; for a directional kick, tween the
  camera's scroll by a few pixels and back.
- Hit stop: set `this.tweens.timeScale` and `this.time.timeScale` near zero for 40–60 ms, then
  restore them with a wall-clock timer; the scene clock is what you are stopping. Check what
  else runs on that clock: delayed calls and gameplay timers slip by the stop, a score timer
  that reads the clock may or may not count it, and a platform pause during the stop must not
  restore the time scale early.
- Pitch steps: Web Audio sounds accept `detune` in cents (100 cents = 1 semitone), or `rate`.
- Haptics: guard `navigator.vibrate` and treat it as absent on iPhone Safari.
- Every effect must freeze with the platform pause; tweens and the scene clock already do.

## 5. Guard rails

- Keep amplitudes small: juice is felt more than seen. No flashing faster than 3 times per
  second.
- The platform's mute and pause always win over our sounds and effects.
- Juice never hides information: shakes and particles must not cover the next target.
- Measure on the slowest supported phone; a hit stop that turns into a stutter is worse than
  none.
