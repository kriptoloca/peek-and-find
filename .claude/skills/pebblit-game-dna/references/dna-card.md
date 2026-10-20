# DNA card

One JSON file per game in `research/dna/<slug>.json`, with its key frames next to it. Every gene
carries `value`, `status` (`observed`, `inferred`, `not reached`) and, when it helps, `evidence`
(a key-frame name or a log line).

## Schema (fields)

```
identity:   title, source_url, platform, developer, captured_on, capture_mode (played | assisted)
signals:    list, rank, rank_history[{date, rank}], plays, likes, like_ratio, notes
core:       verb, objects, board_structure, goal, lose_condition, key_constraint, cascade_per_input
tempo:      load_to_first_input_s, first_win_s, level_duration_s{median,p90}, inputs_per_min,
            wins_per_min, longest_gap_s
hold:       novelty_cadence, meta, rescue, never_run_out, ad_pacing, minute_map[10]
feel:       success_stack, failure_stack, rhythm_escalation
face:       character_or_joke, community, thumbnail_128px
texture:    palette_hex[], shape_language, line_and_fill, animation_style, ui_density, text_use,
            sound (only if heard)
business:   rewarded_placements, interstitial_placements, interstitial_frequency, share_object
verdict:    pillars{face, feel, flow, fair, share, hold} (1-5), principle_to_take, never_copy[]
```

## Worked example (from our 2026-10-19 teardown; not played by us, so most fields are inferred)

```json
{
  "identity": { "title": "Bus Fever Party!", "platform": "iOS/Android", "developer": "Lumi Games",
    "captured_on": "2026-10-19", "capture_mode": "assisted" },
  "core": {
    "verb": { "value": "tap a bus whose path is clear", "status": "inferred" },
    "objects": { "value": "buses with colour and arrow, a queue of passengers, waiting spots", "status": "inferred" },
    "board_structure": { "value": "jammed parking lot, a limited row of waiting spots, one passenger queue", "status": "inferred" },
    "goal": { "value": "every passenger boards a bus of their colour", "status": "inferred" },
    "lose_condition": { "value": "all waiting spots filled with buses nobody can board", "status": "inferred" },
    "key_constraint": { "value": "few waiting spots; a rushed early move clogs the end", "status": "inferred" },
    "cascade_per_input": { "value": "drive out, park, passengers board one by one with a tick and a shake, the full bus leaves", "status": "observed", "evidence": "Hasan's play" }
  },
  "feel": {
    "success_stack": { "value": "per-passenger tick plus a small shake; departure as the release", "status": "observed", "evidence": "Hasan's play" },
    "failure_stack": { "value": "deadlock visible in hindsight", "status": "inferred" }
  },
  "hold": {
    "rescue": { "value": "boosters that sort the queue or shuffle the cars", "status": "inferred" }
  },
  "verdict": {
    "principle_to_take": "one input releases several seconds of rhythmic, weighted success; chaos to order; all information visible",
    "never_copy": ["the name", "the bus and passenger art", "level layouts", "the UI"]
  }
}
```
