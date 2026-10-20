# Session model (a heuristic for comparing designs and finding leaks)

Players decide the real average play time. This model is a way to make the inputs explicit, to
compare two designs, and to point at the level where most players would leave. Its coefficients
are starting guesses: calibrate them with the telemetry of our own live games before trusting the
absolute number, and always report the estimate together with its inputs.

## Inputs (from the minute map, the bot and the build)

For each level i = 1 … N in the order a first-time player meets them:
- `d_i`: median duration of one attempt (bot with a human-like error model, or the gamer's play);
- `f_i`: fail rate per attempt (same source); expected attempts `a_i = 1 / (1 − f_i)`, capped at 4;
- `g_i`: seconds of friction after the level (win beat, loads, ads);
- `novel_i`: true when level i brings something new;
- `hard_i`: true for a hard level; `breather_i`: true when level i+1 is clearly easier;
- `goal_i`: levels to the next visible goal after level i;
- `ad_i`: the interstitial shown after level i, if any, and whether it follows a loss.

Time on level i: `t_i = d_i × a_i + g_i`.

## Quit hazard per level (starting coefficients, to calibrate)

`h_i = base_i + spike_i + boredom_i + friction_i + ad_i_pen − pull_i`, clamped to [0.01, 0.6]:
- `base_i`: 0.12 for level 1 (the first-minute drop), 0.06 for levels 2–3, then 0.03;
- `spike_i`: +0.04 × (a_i − 1) when `hard_i` and not `breather_i`;
- `boredom_i`: +0.02 for every minute since the last novelty beyond 2 minutes;
- `friction_i`: +0.01 for every second of `g_i` above 1.5;
- `ad_i_pen`: +0.03 for an interstitial after a win, +0.08 after a loss;
- `pull_i`: −0.01 when `goal_i` ≤ 2.

Survival: `S_1 = 1 − h_0` (h_0 = the share who leave during the load and the first seconds; use
1 − conversion when known, else 0.3), then `S_{i+1} = S_i × (1 − h_i)`.

Estimated average session for players who started: `Σ_i S_i × t_i / S_1`, summed until the
content horizon or until `S_i` < 0.01.

## Using it

- **In a brief:** fill the inputs from the minute map and the difficulty sketch; the estimate must
  be ≥ 7:00. If it is not, the biggest terms of `h_i` say what to change.
- **In an audit:** fill the inputs from the bot and the gamer's play; compare with the brief's
  estimate; any level with `h_i` ≥ 0.08 is a finding.
- **After launch:** the telemetry funnel gives the real `S_i` (starts of level i ÷ starts of level
  1) and real `d_i`, `f_i`. Fit `base`, `spike` and `boredom` so the model's `S_i` match, record the
  fitted values per game in the analyst's calibration table, and use the portfolio median as the
  new starting coefficients.
