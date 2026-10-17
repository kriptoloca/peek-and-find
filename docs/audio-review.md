# Audio self-review for YouTube Playables (2026-10-17)

Scope: the 15 placeholder SFX and the 16 s loop produced by `scripts/lib/synth.mjs`, encoded by
`scripts/audio.mjs`, played by `src/game/audio.ts`. Measured on the rendered buffers (before the
in-game gain) and in the headless e2e suite.

## Rules that matter on YouTube

| Rule | Status | Evidence |
| --- | --- | --- |
| No copyrighted music or sounds | OK | Everything is synthesized in the repo; chord progression Cmaj7 / Am7 / Fmaj7 / G6 is generic; no samples |
| Platform mute wins over in-game toggles | OK | `audio.ts` gates on `platform.isAudioEnabled()` / `onAudio`; e2e "platform pause silences the music" |
| Nothing plays before the first user gesture | OK | SFX dropped while the sound manager is locked; the loop starts on the PLAY/DAILY tap; e2e "silent before the first tap" |
| Pause stops audio | OK | `setPaused` pauses the loop; SFX refused while paused |
| Formats every device decodes | OK | OGG Vorbis first, M4A (AAC) fallback for Safari; `load.audio(key, [ogg, m4a])` |
| Size | OK | 161 KB OGG total, loop 65 KB OGG / 130 KB M4A (budget: loop ≤ 150 KB, all ≤ 1 MB) |
| No voice, no text in audio | OK | tones and noise only |
| iOS ringer switch | worked around | `src/platform/ios-unmute.ts`, relevant to Safari tests, not to the YouTube app |

Verdict: compliant. Nothing here can fail certification.

## Quality critique (honest)

Measured levels (full scale = 1.0):

| Clip | Length | Peak | RMS |
| --- | --- | --- | --- |
| music_loop (pre-gain, since phone test 3) | 16.0 s | 0.85 | ≈ −16 dBFS |
| music_loop in game (gain 0.5) | | | ≈ −22 dBFS |
| tap_correct_1 | 0.16 s | 0.80 | 0.13 |
| tap_wrong | 0.22 s | 0.80 | 0.17 |
| scene_complete | 0.87 s | 0.80 | 0.15 |
| heart_lose | 0.39 s | 0.80 | 0.20 |
| button | 0.05 s | 0.79 | 0.17 |

- **The loop is placeholder-grade.** Sine pads plus a triangle arpeggio, four bars of four seconds,
  repeating every 16 s. It is inoffensive at −22 dBFS, but after a few minutes the 16 s repeat is
  noticeable, and the texture reads as "chiptune demo", not as the mellow bed the GDD asks for.
  ASSETS.md wants 20–30 s; it is 16 s to stay under 150 KB in AAC. Replace with a licensed or
  CC0 loop before launch; the pipeline takes any `assets/audio/music_loop.wav`.
- **Loop seam.** Both ends fade over 12 ms, so there is no click, but there is a ~24 ms dip every
  16 s. A real loop should end on the bar with its tail folded into the start (crossfade). Low
  priority; invisible under the SFX.
- **SFX are consistent but thin.** All correct/wrong/star sounds are single or two-partial tones;
  they do their job (distinct, short, pitched feedback) and are honest about being synthetic.
  `heart_lose` is the loudest by RMS; `tap_wrong` immediately followed by `heart_lose` is the
  busiest moment. `sparkle` is loaded but unused.
- **Mix balance.** SFX peak −4 dBFS after gain versus the loop at −22 dBFS: feedback still cuts
  through the music, which is right for a tap game; if the real loop is denser, lower
  `MUSIC_VOLUME` rather than raising SFX. The first mix (loop peak 0.5, gain 0.35, ≈ −30 dBFS)
  was measured as "playing" on an iPhone 2026-10-17 (`?audiodebug=1`: context running, music
  playing, bus RMS 0.02) and still not heard on the speaker; raised by ≈ 8 dB.
- **What a reviewer would flag first:** the music, not the SFX. The SFX could ship; the loop
  should not.

## Recommendations (in order)

1. Replace `music_loop` with a 24–30 s mellow loop (Kenney "Music Jingles"/freesound CC0 or a
   licensed track), seamless, mono, ≤ 150 KB in both formats. Drop it into `assets/audio/` and
   run `npm run audio`.
2. Keep the synthesized SFX as the fallback; replace `tap_correct_1/2/3`, `scene_complete` and
   `star_*` with the CC0 pack when it is chosen so the win moment has more body.
3. Wire `sparkle` to the hint glow (currently `hint_reveal` only) or delete it from the manifest.
