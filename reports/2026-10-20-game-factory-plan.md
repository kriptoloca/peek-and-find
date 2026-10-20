# Pebblit Game Factory — plan v4 (2026-10-20)

**Hasan's request** (2026-10-20, translated): a system of agents that plans games from the best 10
games of a top list (the closest and the most creative ideas), has a coder agent build them, has
an AI gamer-auditor play, test and judge them with a gamer's taste and send them back for fixes
until it approves, and has a deploy bot fill in the Playgama developer-account fields and deploy.
"Plan completely how we do it."

**Decided by Hasan on 2026-10-20:** no paid boost for any game; one game a day; every night the
project manager presents three demos, Hasan picks one in the morning, and the pick is deployed the
same day; every open decision as recommended. Later the same day: design the process to be
flawless and to earn as much as possible, audit that it is smart, leave nothing unforeseen; every
agent works for play time above 5 minutes; top games are decoded by playing them.

History: v1 (a1dfcb4) three games a day on Hasan's PC; v2 (d611045, e3af580) cloud, three demos a
night; v3 (277fcf4 … 8c8d80b) revenue funnel, growth engine, kit standards, the two house skills
`pebblit-retention` and `pebblit-game-dna`; **v4 closes the 24 findings of an independent
adversarial audit (§18)**: three KRİTİK (no free supply of first plays, no memory between runs,
irreversible Playgama actions guarded only by hooks) and nine YÜKSEK. Lines marked "fact" were
checked on 2026-10-20 against the named source; the rest are design decisions or estimates and say
so. Nothing is built yet.

---

## 0. Verdict

1. **Buildable on Claude Code cloud scheduled tasks, with four runtime rules the audit made
   explicit:** the factory's memory lives on a `factory-state` branch, never on `main`; the day
   phase is its own autonomous task, fired after Hasan's pick, because a session he continues
   by hand may stop and ask for permission; Playgama's irreversible tools are blocked in the
   account's connector settings and in the permission rules, with hooks only as a backstop
   (the hooks docs say hooks are not a hard gate); uploads run on a Custom network that allows
   Playgama's upload hosts.
2. **Money comes from a few games that hold players.** Sandbox → 100 plays with a 5:00 average
   (unlocks the review) → manual moderation → catalog and partner distribution → YouTube Playables
   for the best performers. Ads already run in the sandbox through Bridge (Peek & Find: 0.91 ad
   shows per play on day 2).
3. **The binding constraint is a game's first 100 plays, and their free supply is unmeasured.**
   Phase 0 measures it before anything is built. Strategy whatever the number: the daily games are
   exploration; **one game of the week** gets every promotion lever we have (§7), so at least one
   game a week gets a real reading.
4. **Minutes are designed, not hoped for.** Every agent works to the ten Hold rules of
   `pebblit-retention`: 5:00 is the floor, 10:00 the goal, no game ships with an estimated session
   under 7:00, and approval rests on numbers the bot measures, not on the model's taste.
5. **The factory itself can fail cheaply.** Reviews on day 14, 30, 60 and 90 with thresholds that
   can actually fail, including a revenue floor (§14).
6. **Before phase 1, Hasan decides or does six things** (§17): send one e-mail to Playgama about
   the cadence; buy GitHub Pro; agree that an improvement release counts as the day's game; split
   the three lifetime share bonuses across our games; set the day-90 revenue floor; pick a payout
   method that works in Türkiye and ask an accountant one question.

---

## 1. How the factory earns money

**The funnel** (Playgama pages do not open from the cloud machine; facts come from the MCP README,
our dashboard or search summaries, as marked):

| Step | Gate | Source |
| --- | --- | --- |
| Sandbox | public link, no moderation; first players from the Playgama network | MCP README |
| Ads in the sandbox | rewarded and interstitial already serve through Bridge: Peek & Find showed 0.91 ad shows per play and 0.07 USD a day on day 2 | our metrics, 2026-10-20 |
| Submit for review | 100 plays and 5:00 average play time | our sandbox dashboard, 2026-10-18; an older Playgama post says the same |
| Catalog and partner sites | manual moderation (usually 3–5 business days); some partner platforms ask for ≥ 5 or ≥ 10 minutes average play time | Playgama wiki via search |
| More ad demand | the README's "session threshold, access by request" sentence is about Playgama Ad, a separate SDK; what changes for a Bridge game in the catalog is asked in the Playgama e-mail (§17) | MCP README; audit F13 |
| Developer share | 70–90 % to the developer, tiered (70 % up to 1,000 USD monthly net, 80 % to 3,000, 90 % above); payouts from 100 USD | Playgama developer page and comparisons via search (marketing; the terms did not open) |
| YouTube Playables | Playgama picks its best performers with YouTube; developer keeps 75 %; initial load < 30 MB, portrait, Bridge, no external calls, original | Playgama Playables pages via search |
| Other portals | Playgama is non-exclusive; CrazyGames is non-exclusive and gives an accepted game a Basic Launch of ≥ 7 days and up to 500 plays; Poki is web-exclusive by default | Playgama blog, CrazyGames docs, comparisons via search |

**What follows for the design:**
- **Conversion is the first multiplier** (every point of it multiplies all free traffic): the
  first level starts on the first tap and teaches by doing; bytes before the first input ≤ 1.5 MB;
  interactive within 3 s under CPU and network throttling (numbers in §9).
- **Play time is the second:** the ten Hold rules (§9), 5:00 floor, 10:00 goal.
- **Promotion is concentrated:** the game of the week (§7).
- **Ads are designed:** interstitials only between levels after ≥ 3 levels and ≥ 120 s, never in
  the first minute, never after a loss; rewarded only as optional help. The Playables build keeps
  this; the web build's cadence is A/B-tested on one game before it changes (audit F12).
- **In-app purchases** stay out of factory games (YouTube Playables forbids them); a catalog
  winner may add them on web portals only, behind the Playables build flag (Hasan's call).

---

## 2. A day and a week (Europe/Istanbul; Turkey has no daylight-saving change)

| When | Who | What |
| --- | --- | --- |
| 02:07 | night task (scheduled) | preflight and guardrail canary (§11); the PM writes three demo briefs (or two and an improvement of the best live game); coder subagents build the demos one after another; the gamer gives each a quick pass; the report page is published; state is pushed to `factory-state`; Hasan is notified |
| morning, by 12:00 | Hasan, 5–10 min | opens the night run in the Claude app, plays the demos on his phone, replies A, B or C (one sentence of why is welcome) |
| right after the reply | night session, 1 min | writes `days/<date>/pick.json`, pushes, fires the **day task** with the pick (`fire_trigger`) and stops |
| after the pick | day task (autonomous) | finish → build gates → bot audit and ≤ 2 fix rounds (3 only for a KRİTİK bug) → store pack → upload → sandbox → final report; the report artifact asks Hasan for one tap |
| evening | Hasan, 5–10 min | a 2-minute check of the finished build on the QA Tool link (not the live link); posts the clip if it is the game of the week or he likes it |
| no reply by 12:00 | — | no deploy that day; the demos go to the shelf; a reply after 12:00 deploys the next morning |
| 08:30 | GitHub Actions (dead-man's switch) | if `days/<today>/state.json` is missing on `factory-state`, opens an issue, which notifies Hasan's phone through the GitHub app |
| Monday 01:07 | scout task | lists, rank history, DNA cards for new entries, patterns; writes `research/<week>/DONE`; asks Hasan in the run for Playables screenshots |
| Monday 02:07 | night task | waits up to 30 minutes for the scout's `DONE`, then proceeds with last week's research |
| Monday 09:07 | analyst task | the weekly read (§5.6), the game of the week, proposals; asks Hasan in the run for one console screenshot |

Runs start a few minutes past the hour because runs on the full hour can start late (fact).

---

## 3. Facts about the runtime and the platform (checked 2026-10-20)

**Cloud scheduled tasks**, formerly routines (code.claude.com/docs/en/routines; research preview):
full Claude Code sessions in Anthropic's cloud, also with the PC off; each run clones the default
branch fresh and pushes to a `claude/` branch unless the prompt names another; runs started by the
schedule or Run now are autonomous with no permission prompts and may publish a new private
artifact without asking, while runs started by an API trigger or `fire_trigger` ask before
publishing; connectors are the account's claude.ai integrations, all included by default and each
usable with writes; network access is set by the cloud environment (Trusted, Custom, Full);
subscription usage is drawn like interactive sessions and runs over the limit are rejected unless
usage credits are on; 100 scheduled runs an hour; minimum interval one hour; a lapsed GitHub
connection skips runs for up to 72 hours, then the task turns off; any run can be continued as a
session.

**Permissions in a continued cloud session** (cloud documentation, 2026-10-20): the modes are
Accept edits, Plan and Auto; bypass is not offered and `defaultMode` bypass or dontAsk in settings
is ignored; file edits never ask; Auto runs most other tool calls without asking; `permissions.allow`
rules committed in `.claude/settings.json` stop prompts for named commands, and only a session with
one repository reads that file.

**Hooks** (hooks docs): not a hard gate; a timed-out PreToolUse hook does not block; for hard rules
the docs point to the permission system. **Connector tools** can be allowed or blocked one by one
at claude.ai/customize/connectors.

**Billing and limits:** Pro and Max limits assume ordinary, individual use and give no number;
products built on the Agent SDK use API keys; Pro and Max have a rolling five-hour limit and a
weekly limit shared across Claude and Claude Code; a `claude -p` or SDK run does not wait for a
reset.

**Playgama MCP** (README v1.8.0): OAuth 2.1, revocable at developer.playgama.com/mcp; create the
game, fill the form (`FORM_INCOMPLETE` names missing fields), upload the archive and the three
covers (exact 800×800, 1080×1920, 1920×1080) by PUT to returned upload URLs, QA Tool links, publish
the sandbox, read the share post, telemetry, submission state and moderation comments; archive
states include `PASSED`, `PROBLEM`, `NOT_CHECKED`, `BRIDGE_VERSION_OUTDATED`, `BRIDGE_VERSION_UNKNOWN`
and processing `FAILED`; every write tool is marked destructive; human-only: submit to moderation,
delete (games, archives, covers, leaderboards), roll back, payouts, screenshots and videos; the
share bonus works once per game for up to three games per organisation, ever; a catalog game takes
an update without moderation after the developer's explicit yes; 15 sandbox publications per hour
per game, one at a time; Bridge ≥ 2.2.0.

**Content rules** (Playgama wiki via search): copies and duplicates of the same developer's games
are refused (a sequel is new only with redesigned graphics and mechanics); low-quality games made
wholly with generative AI may be rejected; repeated non-compliance can restrict the account.

**Data points:** Peek & Find day 2: 550 launches, 101 plays (18 %), 3:31 average, from a 25 USD boost
plus organic and friends' traffic. A devlog of four Playgama games: 1,897 sessions, 179 plays,
0.43 USD, nearly all sessions from Playgama's free boosts (search summary). Playgama's AI showcase:
500+ AI-built games and 25,000 gameplays in five days, about 50 per game on average (search
summary). Free traffic per new game without promotion: **unknown, measured in phase 0**.

---

## 4. Architecture

```
 Mon 01:07  SCOUT task (Custom web, no connectors) ──► research/ on factory-state
 Mon 09:07  ANALYST task (Playgama read tools) ─────► metrics/, game of the week, proposals
 daily 02:07 NIGHT task ─┬ preflight + canary
                         ├ PM ──► offers A · B · C
                         ├ CODER (demo) × 3 ─► demos/   GAMER (quick) × 3 ─► scores, clips
                         └ report page ─► Hasan replies "B" ─► pick.json ─► fire DAY task
 DAY task (autonomous) ──┬ preflight + canary + Playgama docs saved for the coder
                         ├ CODER (finish) ⇄ GAMER (bot audit), ≤ 2 fix rounds
                         ├ store pack (listing, covers, clip MP4, media pack, licences)
                         └ DEPLOYER ─► upload ─► sandbox ─► final report
```

- **Tasks:** night, day (no schedule; fired with the pick), scout and analyst, each with its own
  cloud environment: night and day on a Custom network (package registries plus the Playgama
  upload, QA Tool and sandbox hosts captured in phase 0), scout on a Custom network with the list
  sites (no connectors), analyst on Trusted. Each environment sets `FACTORY_ROLE`.
- **Connectors per task, set explicitly:** night none (it only fires the day task), day Playgama,
  analyst Playgama (read tools only in its permissions), scout none. A preflight at the start of
  every run lists the tool names and aborts on any unexpected `mcp__` server.
- **Branches and memory** (audit F02): runs start from `main`, which holds `kit/`, `template/`,
  `factory/` and `.claude/` and changes only through pull requests Hasan merges; branch protection
  ("require a pull request", "do not allow bypassing") needs GitHub Pro on a private repository.
  Every run output lives on the `factory-state` branch, checked out as a worktree; only the
  orchestrator commits, and before each push it fetches, rebases and retries. Runs never push to
  `main`; CI on `factory-state` fails if `.claude/`, `.mcp.json` or `factory/` appear there; coders
  do not use `isolation: worktree` (it branches from `main`).
- **Thin orchestrator:** follows `factory/NIGHT.md`, `DAY.md`, `SCOUT.md`, `ANALYST.md` and starts
  subagents whose `tools` lists are explicit in every agent file; agents talk only through
  schema-checked files. Phase 2 picks a prompt or a Claude Code workflow script, whichever is more
  reliable in the dry run.
- **State machine per day:** `BRIEFED → DEMOS_BUILT → DEMOS_CHECKED → OFFERED → PICKED | SKIPPED →
  FINISHING → BUILT (G3) → AUDIT_n ⇄ FIX_n → APPROVED (G4) → PACKED (G5) → UPLOADED → SANDBOX_LIVE
  (G6) → REPORTED`, plus `BLOCKED_LIMIT` (a usage limit stopped the stage; the next run finishes it
  first) and `PARKED` (a gate failed after the allowed rounds or a deploy failed after retries; the
  runner-up demo is offered the next morning).
- **No build outputs in git:** ZIPs are reproducible from the commit and identified by SHA-256;
  covers are regenerated by the covers script; clips live in report artifacts and in the phone
  download; `catalog.json` keeps every game's last `PASSED` archive id for recovery.
- **Kit versioning:** `kit/` is a versioned workspace package; each game pins its kit version and
  upgrades on purpose, so a kit change never silently changes old games.
- **CI on GitHub Pro minutes:** on pull requests to `main` and nightly on `factory-state`, with path
  filters; the dead-man's switch is a one-minute scheduled job.
- **Plan B (only if a phase-0 or phase-3 check fails):** the same repository on the PC, as a
  Desktop scheduled task or headless `claude -p`; the Playgama sign-in happens once in an
  interactive session; `--bare` never reads OAuth credentials, so the deployer uses
  `--strict-mcp-config`; an `ANTHROPIC_API_KEY` in the environment always wins in `-p` runs; the
  command sandbox needs WSL2 on Windows. Rehearsed once in phase 3 so it is not paper.

---

## 5. The agents

Every agent is a subagent with an explicit `tools` list, a `maxTurns` cap, schema-valid outputs and
no view of another agent's reasoning. Models: the most capable model for the PM, the finish coder
and the bot-audit analysis; demo coders and quick-pass gamers move to a lighter model if the phase-2
dry run shows the demos hold quality (audit F09).

### 5.1 PM (every night)
- **Reads** the latest research only through `factory/sanitize` (enums and capped short strings,
  no free text from web pages; audit F18), the catalog, the mechanic map, `lessons.md`, the funnel
  table, the shelf, Hasan's past picks with reasons.
- **Generates ≥ 12 candidates** with the operators of `pebblit-game-dna` (mutation, crossover,
  transplant, wildcard, seasonal or social overlay, and Playgama's monthly showcase theme when there
  is one), each with its lineage; uses `game-trend-skills:brainstorming-game-ideas`.
- **Scores:** the 35-point rubric of `game-trend-skills:evaluating-game-ideas`; Face and Feel
  (`pebblit-game-craft`, ≥ 3); Hold (`pebblit-retention`, ≥ 4); first-10-seconds clarity; buildable
  as a demo in one session; testable by a solver or a scripted bot.
- **Originality gate, as code** (`factory/check-originality`, audit F10): weighted distance ≥ 6 of
  12 against every external DNA card; the same verb and board as one of ours is an update, never a
  new game; names checked against the catalog title snapshot. The **mechanic map**
  (`research/mechanic-map.json`: verbs × boards × goals, each cell feasible, testable, used) counts
  the weeks of new ideas left; under 8 weeks, new games become sequels with redesigned graphics and
  mechanics (Playgama's own test of "new") or the day becomes an improvement day.
- **Offers three:** A closest, B creative, C our strength, or C = "improve game X" under the
  capacity rule (§7); a high-scoring shelf demo may come back once.
- **Writes a one-page brief per offer:** rules and numbers, the teaching first level, the Feel spec
  of the key moment, the generator and its check, art direction from the rotating **art kit**
  (palette family, shape language, character kit; recorded as genes so 30 games do not look alike;
  each CC0 pack used in at most 5 games), the character or joke, the cover idea, the one-line
  test, and the **Hold plan** with its minute map and a session estimate ≥ 7:00.

### 5.2 Coder
- **Demo mode (night):** the core loop on the template, the generator and its validator, five
  levels, the key success moment with sound, play on the first tap; demos are built one after
  another (the container has 4 vCPUs) and stay small.
- **Finish mode (day):** the Hold plan with the kit's Hold modules; the kit standards (§9) in full;
  Playgama telemetry from the guide the deployer saved to `days/<date>/playgama-docs/` (with the
  checklist and the Bridge docs; audit F17); the store pack: `listing.json`, covers, `licenses.json`,
  a frame-stepped clip, and for a first submission the moderation media pack (screenshots and a
  short video for the console); `npm run gates` green.
- **Improve mode (C = improve game X):** from the analyst's leak (biggest level-to-level drop, then
  the first minute, then novelty); the update keeps the game's id.
- **Rules:** the template's CLAUDE.md; a bug fix starts with a red test; `code-review` on its own
  diff; no new dependencies; no edits to protected paths; no Playgama tools.

### 5.3 Gamer-auditor (bot first, model second; audit F15)
- **Quick pass (each demo):** smoke (loads, no console errors, no external requests, the bot
  finishes five levels); bytes before first input and time to first input, measured one build at a
  time under 4× CPU and network throttling; scores for clarity, Feel, Flow, Face and Hold outlook
  from a capped set of screenshots (≤ 40 per subagent); a frame-stepped 15-second clip.
- **Bot audit (finish), the gate:** a scripted bot plays through the debug contract with the game
  loop paused between actions, so nothing real-time is missed; it measures time to first input,
  first win (≤ 20 s), wins per minute, the longest stretch without a win, success-versus-failure
  feedback strength from the event log, fail rates per level with a human-like error model,
  friction between levels, the ad schedule, frame-time p95 and a 15-minute soak; it fills the
  minute map of `pebblit-retention` from a frame-stepped run and runs the session model. APPROVE
  needs every check in §9 and a session estimate ≥ 7:00.
- **Persona note (not a gate):** 3 minutes as a first-time player, written as notes for Hasan and
  the coder.
- **Calibration:** planted bugs and planted feel inversions (failure louder than success) in known
  builds, plus games with known outcomes; two runs must agree; recalibrated whenever the model
  changes.
- **Honest limits:** no WebKit in the cloud image (only Chromium is preinstalled), so every report
  says "iOS untested" unless the WebKit CDN can be allow-listed; Hasan's evening 2-minute check is
  the real-device test.

### 5.4 Deployer
- **Order:** creates the application only after all local gates pass and reuses an existing draft
  on retry (drafts can only be deleted by a human); `get_game_checklist`, then `create_application`,
  then `get_launch_steps` for that game and again after each step; category via
  `get_game_categories`; form from `listing.json`; archive upload by PUT, confirm, poll; covers;
  QA Tool link; sandbox publish; poll until `PUBLISHED`; URL and archive id into `catalog.json`;
  `get_sandbox_share` text for Hasan.
- **Archive states:** `PASSED` continues; `PROBLEM` and `NOT_CHECKED` go to the coder and to the
  report word for word; `BRIDGE_VERSION_OUTDATED` or `UNKNOWN` means a kit Bridge update; processing
  `FAILED` means a corrected ZIP. Outages: retries at +30 minutes and +2 hours, then `PARKED`.
- **Writes only to today's game:** a hook and the permissions reject any Playgama write whose
  application id is not the one in `state.json`, and always reject Peek & Find's and Munch Pixels'
  ids.
- **Never:** `start_sandbox_traffic`, `send_playgama_catalog_update`, `replace_in_app_products`,
  leaderboard writes, `apply_referral_code`: blocked in the account's connector settings, denied in
  `permissions.deny` by their exact runtime names, and blocked by a hook as a backstop (§11).

### 5.5 Scout (weekly) with `pebblit-game-dna`
- Lists: Playgama (popular, trending, new, the AI showcase and its likes), YouTube Playables (top
  and trending, from Hasan's screenshots only: YouTube's terms forbid automated access), CrazyGames
  and Poki as a second opinion; rank history; new entries and risers played into DNA cards at human
  pace, one session per game per week, ad hosts blocked, no clicks, no logins, no downloads, after
  each site's terms were read in phase 0; patterns and the mechanic map updated; output written in
  the enum schema the sanitizer accepts.

### 5.6 Analyst (weekly)
- Reads Playgama telemetry, Hasan's one console screenshot of the games list, and moderation
  comments; tracks only the top 10 games and the last 14 days' games (audit F19).
- **Statistics** (audit F14): no ranking under 30 plays not made by Hasan; averages shrunk toward
  the portfolio median with a 20-play prior; intervals with `data:statistical-analysis`.
- **Writes** the funnel table, the leak per game (`pebblit-retention` workflow D), the session-model
  calibration, `lessons.md`, the gamer calibration table and the health line (runs 7/7, failed
  stages, usage share, Hasan's minutes).
- **Picks the game of the week** (first-48-hour conversion, play time, gamer score, Hasan's pick)
  and **proposes**, for Hasan's clicks: moderation submissions (≥ 100 plays and ≥ 5:00), the
  share bonus within the budget, a CrazyGames submission, cover tests, improvement offers, games to
  retire (no updates, no attention after 30 days without a signal).

---

## 6. The morning report

One private artifact page per night: three cards (name, pitch, character or joke, closest existing
game and what differs, risk, scores, top issues, clip, "Play"); the funnel strip; the health line
with "guardrails verified" from the canary; Hasan's one-tap to-dos; "reply A, B or C". The night
run publishes it without asking. To verify in phase 1: a multi-file Phaser demo runs with sound and
touch inside an artifact in the Claude app. Fallback: clips only (no second repository, so the
repository's permission rules always load; audit F06).

---

## 7. Growth engine without paid traffic

**The game of the week** gets every lever, in this order of expected value (audit F12):
1. **Playgama's AI showcase (playgama.ai):** ranked by likes, with monthly themes per a search
   summary (to confirm); the PM can fit the week's theme.
2. **CrazyGames Basic Launch:** a free evaluation of ≥ 7 days and up to 500 plays for an accepted
   game, non-exclusive; Bridge supports CrazyGames; Hasan submits from his account after the terms
   are read in phase 0.
3. **Share bonus** within the organisation's budget (§17 D14).
4. **Cover test:** two cover sets swapped after 7 days, launches compared.
5. **In-game share card** on web builds (hidden on YouTube by the Playables build flag).
6. **Social:** a public hub page listing all Pebblit games with the game of the week on top, served
   by GitHub Pages from the factory repository (possible on GitHub Pro); the Shorts and TikTok
   profiles link to it, because links in Shorts descriptions are not clickable and a TikTok bio
   link needs 1,000 followers on a personal account (search summary; to confirm); daily clips stay,
   but community posts and the profile link point at the game of the week.

**Clips:** rendered frame by frame (pause the loop, step, screenshot) and encoded to an H.264 MP4 at
1080×1920 if the cloud image's ffmpeg can (checked in phase 1), delivered to Hasan's phone as a
file; never a jerky real-time WebM.

**Listings:** keyword titles; the text translated into the largest audience languages if the form
accepts them.

**Capacity rule:** the first two weeks are all new games; then, when a game leads on conversion and
play time below 100 plays, offer C is "improve it"; a catalog game with daily sessions gets update
offers at least two days a week until its growth flattens. Hasan still picks every day, and an
improvement release counts as the day's game (§17 D11).

**Catalog releases (audit F08):** an improvement of a catalog game is uploaded and checked by the
day task, which writes `release.md` (what players will notice, the previous archive id for
rollback, risks, `get_submission_state` with review type AUTO). Hasan then opens an interactive
session outside the factory repository, switches `send_playgama_catalog_update` on in the connector
settings, says "yes, update X with archive Y", and switches it off again. First submissions go
through the console with the media pack and a 5-minute checklist.

**Winners go wide:** Playables readiness confirmed and a note to Playgama; Playgama's publishing
programme (it says it looks for web games with strong retention); CrazyGames; web-only in-app
purchases if Hasan wants them; never Poki without a deal.

---

## 8. Gates (each one a script with a pass or fail; numbers from §9)

| Gate | When | Script and pass rule |
| --- | --- | --- |
| G0 Offers | after the PM | `check-offers`: three schema-valid briefs with different verbs; `check-originality`; Face and Feel ≥ 3; Hold ≥ 4 with a minute map and an estimate ≥ 7:00; testable |
| G1 Demo | after each demo | `check-demo`: loads; no console errors or external requests; the bot finishes five levels; bytes before first input and time to first input within §9 |
| G2 Pick | morning | `pick.json` written from Hasan's reply |
| G3 Build | each finish round | `npm run gates`: check, unit, e2e, build, sizes, dist audit, ZIP, covers, telemetry events against the saved guide, `licenses.json`, generator range and ramp, content horizon, friction, ad schedule, Playables build flag |
| G4 Audit | each audit | the bot audit of §5.3: every §9 check and an estimate ≥ 7:00, within 2 fix rounds (3 for a KRİTİK bug) |
| G5 Store | before upload | `check-store`: `listing.json` valid (no age cues, brand list, lengths, category by mechanic); covers at exact sizes; cover readable at 128 px (a fresh subagent shown the 128 px cover names the subject and the joke of the brief) |
| G6 Playgama | deploy | checklist met; archive `PASSED`; `PUBLISHED`; QA Tool run clean (moves to Hasan's evening check if the QA Tool needs a console login) |
| G7 Market | weekly | the analyst's table with minimum samples; Hasan's clicks |

---

## 9. Numbers table and kit standards

One table; every section cites it.

| Number | Value |
| --- | --- |
| Bytes before the first input | ≤ 1.5 MB |
| Initial download | ≤ 5 MB target, ≤ 8 MB hard (Playables allows 30 MB) |
| Time to first input | ≤ 3 s under 4× CPU and a 9 Mbps, 150 ms network profile, one build at a time |
| First win | ≤ 20 s |
| Friction between levels | ≤ 1.5 s; retry ≤ 1 s |
| Fail rate (bot, human-like errors) | levels 1–10 ≤ 10 %; no level > 50 %; a breather after every hard level |
| Novelty | something new at least every 2 minutes to minute 10 |
| Next goal | never more than 3 levels away |
| Content horizon | ≥ 60 minutes of non-repeating play |
| Interstitials | none in minute 1, none after a loss, ≥ 3 levels and ≥ 120 s apart, ≤ 4 in 10 minutes |
| Soak | 15 minutes: frame-time p95 within budget, heap flat |
| Session estimate | ≥ 7:00 (`pebblit-retention` session model) |
| Originality distance | ≥ 6 of 12 |
| Analyst samples | ≥ 30 plays not by Hasan before any ranking; 20-play shrinkage prior |
| Screenshots per gamer subagent | ≤ 40, each ≤ 2000 px on the long edge |

**Kit** (`kit/`, versioned; extracted from Munch Pixels and Peek & Find): Bridge wrapper, storage
with late-save merge, ad gate (platform-aware), resume grace, pause and mute, layout for 9:16, 1:1
and 16:9 with portrait required, audio synthesis, the Hold modules (auto-advance, one-tap retry,
sawtooth ramp scheduler, novelty scheduler, meta bar, rewarded continue, generated levels behind
the tuned first 20–30, daily level with a forgiving streak, endless mode, session-milestone
telemetry), the share card (web builds), the **Playables build flag** (text-free, no links, no share
button, no in-app purchases; web builds may show minimal text), the debug contract in dev builds,
covers generator, frame-stepped clip renderer, reproducible ZIP, `npm run gates`. In factory games
GameReady fires when level 1 is interactive, because there is no title screen before it (the
template's CLAUDE.md says so; our two current games keep their own rule).

---

## 10. Usage and cost

- **No separate bill** on the subscription unless usage credits are on; the factory shares the
  five-hour and weekly limits with Hasan's other work (Munch Pixels, the GeriAl app).
- **Budget:** the factory may use at most half of the weekly meter. The phase-2 dry run records the
  meters per stage (the usage page before and after each stage) and sets the pilot's shape from
  it; Hasan's plan tier is read in phase 0.
- **Where the cost is:** three demo coders and three quick passes a night, and the audits. Cuts, in
  order: smaller demos (three still, as Hasan asked); a lighter model for demo coders and quick
  passes if quality holds; bot audits instead of long persona play; two fix rounds; screenshot caps.
- **Usage credits and an API key are not on the ladder** while revenue does not cover them.
- **A stage stopped by a limit** writes `BLOCKED_LIMIT`; the next run finishes it before starting
  anything new; a rejected scheduled run is not re-fired, so the report shows the gap.
- **Terms:** Anthropic's own scheduled-task feature is the sanctioned route for unattended runs on
  a subscription; the risk is throttling, not a breach; all of Hasan's Claude work sits on one
  account, which the budget protects.

---

## 11. Security and safety

- **Three layers for irreversible Playgama actions** (audit F03): (1) the account's connector
  settings block `start_sandbox_traffic`, `send_playgama_catalog_update`, `replace_in_app_products`,
  leaderboard writes and `apply_referral_code`; one is switched on only for a deliberate
  interactive session outside the factory repository, with the factory tasks paused, then switched
  off; (2) `permissions.deny` in `.claude/settings.json` names the same tools by their exact runtime
  names (captured in phase 0); (3) a PreToolUse hook matches them by pattern, exits with code 2 and
  blocks on failure, plus the hook that rejects writes to any game but today's.
- **Canary at the start of every run:** call `list_leaderboards`, which is deny-listed on purpose,
  and abort unless it is refused; the report then says "guardrails verified".
- **Blast radius** (audit F06): explicit connectors per task; a tool-list preflight; deny
  `mcp__claude-code-remote__*` except `fire_trigger` in the night task (a hook checks the day task's
  trigger id); explicit `tools` in every agent file; `FACTORY_ROLE` per environment, and the hooks
  deny every Playgama write unless the role is `day`; single-repository sessions only.
- **Protected paths:** `main` is protected on GitHub (no direct pushes, no bypass, admins
  included); runs work on `factory-state`, whose CI rejects `.claude/`, `.mcp.json` and `factory/`.
  Edit deny rules cannot stop a Bash write, which is why the branch rules carry the weight.
- **Prompt injection:** the scout has no connectors; research reaches the PM only through the
  sanitizer; page text is data.
- **Privacy:** the account's model-training privacy setting is checked in phase 0, since
  unreleased code and ideas pass through every run; no personal data in telemetry or saves; a
  privacy note if a portal form asks for one (GDPR, KVKK).
- **Kill switch:** each task's toggle at claude.ai/code/routines, or revoking the Playgama agent;
  after a pause, one Run now smoke test before the schedule goes back on.

---

## 12. Repository layout and skills

```
main (protected; pull requests only)
  kit/                    versioned engine package (§9)
  template/               game skeleton, template CLAUDE.md, tests
  factory/                NIGHT.md, DAY.md, SCOUT.md, ANALYST.md, schemas, sanitize, check-* scripts
  .claude/                agents (explicit tools), skills, settings.json (allow, deny, hooks)
  .github/workflows/      CI (pull requests; nightly on factory-state), dead-man's switch, Pages hub
  PLAN.md
factory-state (run output; only the orchestrator commits)
  days/<date>/            state.json, pick.json, briefs, audits, playgama-docs/, report source
  demos/<date>-{a,b,c}/   demos (shelf: 14 days)
  games/<slug>/           one folder per game for its whole life
  research/               dna/, <week>/, rank-history.json, mechanic-map.json
  catalog/catalog.json    genes, status, Playgama id, URLs, archive ids, ZIP SHA-256, gate results
  metrics/                funnel tables, weekly reports
  lessons.md
```

Skills by stage (Hasan's enabled skills reviewed on 2026-10-20; house skills live in the repository;
whether plugin skills load in scheduled runs is checked in phase 0, and if not, the needed ones are
vendored):

| Stage | Skills |
| --- | --- |
| Scout | `pebblit-game-dna`, `game-trend-skills:scanning-game-trends`, `game-trend-skills:scouting-social-trends`, `pebblit-game-craft`, `anthropic-skills:deep-research` |
| PM | `pebblit-game-dna`, `game-trend-skills:brainstorming-game-ideas`, `evaluating-game-ideas`, `writing-game-agent-briefs`, `pebblit-game-craft`, `pebblit-retention`, `design:ux-copy` |
| Coder | `pebblit-retention`, `pebblit-game-craft`, `code-review`, `engineering:debug`, `engineering:testing-strategy`, `product-tracking-skills:product-tracking-instrument-new-feature`, `anthropic-skills:algorithmic-art` |
| Gamer | `pebblit-retention`, `pebblit-game-craft`, `design:design-critique`, `design:accessibility-review`, `product-tracking-skills:product-tracking-audit-current-tracking` |
| Deployer | `engineering:deploy-checklist`, Playgama's live checklist and launch steps |
| Analyst | `game-trend-skills:tracking-game-metrics`, `pebblit-retention`, `data:statistical-analysis`, `data:validate-data`, `data:create-viz`, `data:build-dashboard`, `design:research-synthesis` |
| Growth | `game-trend-skills:launching-on-zero-budget`, `small-business:social-content-engine`, `marketing:content-creation`, `brand-voice:*`, `marketing:performance-report`; `postiz` later |
| Build and operate | `skill-creator`, `session-start-hook`, `update-config`, `security-review`, `engineering:architecture`, `operations:runbook`, `operations:risk-assessment`, `workflow-authoring` |
| Once | `legal:review-contract` on Playgama's, CrazyGames' and Poki's terms |

Also available: `run-peek-and-find` (a tested Playwright driver for a Phaser canvas game; the
template's driver starts from it). Not used: Canva, Adobe and Figma (their connectors do not
connect from the cloud today), Unity and Unreal (another stack), and the sales, finance and other
plugins with no step here. New skills to write in phase 2 with `skill-creator` and evals:
`factory-brief`, `pebblit-kit`, `gamer-audit`, `playgama-deploy`, `store-copy`, `portfolio-analyst`.

---

## 13. Rollout (each phase ends with a check a person can run)

| Phase | Who | Contents | Done when |
| --- | --- | --- | --- |
| 0a. Questions | Hasan, ≈ 30 min | the decisions of §17; the Playgama e-mail; GitHub Pro; payout method; accountant question | answers written in PLAN.md |
| 0b. Accounts and probes | Hasan + Claude, ≈ 2 h | private repo with `main` protected; Playgama connector added and its destructive tools blocked; GitHub app access; social accounts; the house skills uploaded; terms of Playgama, CrazyGames and Poki read with `legal:review-contract`; the account's privacy setting checked; **probes:** Peek & Find launches by source for days 3–7; a canary draft game (reused for every test; drafts are human-deletable only) published with no promotion and counted at 24 and 72 hours; share bonuses left (`get_sandbox_traffic`); the connector's runtime tool names; a blocked tool refused in a Run now run; `permissions.deny` and hooks loading in a scheduled run; per-task connectors honoured; a push to `main` refused; upload hosts reached with a small PUT from a Run now run; the QA Tool opening without a console login; plugin skills visible in a scheduled run; the usage meters | every probe has a recorded result, and the pilot rule of §14 is set from the free-traffic numbers |
| 1. Kit and template | Claude, ≈ 2–3 days | §9 kit, template, scaffolds, `check-*` scripts, report page, clip renderer, hub page, CI | a demo runs inside an artifact on Hasan's phone with sound and touch; an MP4 clip saves to the phone; CI green |
| 2. Agents and bot audit | Claude, ≈ 3 days | agents, skills, prompts, sanitizer, permissions and hooks, bot audit, calibration | dry run: three demos, report, a fired day task, deploy to the canary; usage per stage recorded; planted bugs and feel inversions found; two runs agree |
| 3. First real day | together | create the four tasks with explicit connectors; Run now; Hasan picks; real deploy; Plan B rehearsed once | one game live with all fields, covers and a clean QA Tool run; the day task ran ≥ 3 hours with zero prompts; the notification and the dead-man's switch both reached the phone |
| 4. Pilot | factory, 7 days | the schedule on | a deployed game on ≥ 5 of 7 days with no code edited by hand; Hasan ≤ 30 minutes a day; usage ≤ half the weekly meter; no Playgama refusal |
| 5. Steady state | factory | weekly scout and analyst, game of the week, reviews (§14) | — |

---

## 14. Reviews, stop-loss and unit economics

**Pilot rule (from phase 0b):** if a new game gets under 100 launches in 72 hours without promotion,
daily games are exploration only and every promotion lever goes to the game of the week; at day 14
Hasan decides whether one new game a day still makes sense or whether some days become improvement
days by default.

| Day | Passes when | If not |
| --- | --- | --- |
| 14 | ≥ 10 deploys; usage ≤ half the weekly meter; calibration done; free traffic per game measured | fix the pipeline before more games |
| 30 | one factory game has ≥ 100 plays not by Hasan and a ≥ 5:00 average | shift the idea mix to what held players; three improvement days a week for the top two games |
| 60 | one factory game accepted into the catalog | new games drop to three a week; the best game gets a deep build |
| 90 | factory revenue ≥ the floor Hasan sets (default 3.3 USD a day, about one 100 USD payout a month) | pause the factory and re-plan with Hasan |

Every review lists the revenue, the factory's share of the weekly usage and Hasan's minutes, so the
decision weighs what the factory earns against what it costs.

---

## 15. Hasan's steps (realistic, audit F19)

- **Once:** phase 0a and 0b.
- **Daily (≈ 20–30 min):** morning: play the demos, reply A, B or C; evening: a 2-minute check of
  the finished build on the QA Tool link and, when it is the game of the week, the clip and the
  post; one-tap items on the morning page.
- **Weekly (≈ 1–1.5 h):** Playables screenshots for the scout; one console screenshot for the
  analyst; moderation submissions with the media pack; the CrazyGames submission and the cover test
  of the game of the week; share-bonus decisions; a glance at the usage page; for the promoted
  game, a name check on Google Play, the App Store and TÜRKPATENT/EUIPO/USPTO.
- **At reviews:** the decisions of §14.
- **Never:** testing on the live sandbox link (his plays would distort the numbers); use the QA
  Tool or artifact builds.

---

## 16. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| No free supply of first plays | phase-0 measurement; game of the week; CrazyGames Basic Launch; showcase likes; reviews that can fail |
| Games average under 5:00 | Hold rules in every brief, build and bot audit; estimate ≥ 7:00; leak loop |
| The factory forgets between runs | `factory-state` branch, rebase-and-retry pushes, `BLOCKED_LIMIT` resume |
| Irreversible Playgama action by a confused or injected run | account-level blocks, deny rules, hook backstop, id-scoped writes, canary |
| The day phase stalls on prompts | an autonomous day task fired with the pick; phase-3 zero-prompt check |
| Uploads blocked by the network | Custom network with captured hosts; phase-0 PUT probe |
| Organisation risk from many sandbox games | Playgama's written answer before phase 1; at most two submissions a week; originality as code |
| Mechanic space runs out | mechanic map, sequels with redesigned graphics and mechanics, improvement days |
| Social clips bring no clicks | hub page, game-of-the-week links, MP4 clips |
| Usage limits hit Hasan's other work | half-meter budget, cost cuts where the cost is, no credits or API key on the ladder |
| Noise drives decisions | minimum samples, shrinkage, no plays by Hasan on live links |
| A live game breaks on iOS | Hasan's 2-minute check before promotion; error telemetry; republish the last `PASSED` archive |
| A run never starts and nobody notices | the dead-man's switch at 08:30 |
| GitHub minutes run out | Pro minutes, path filters, nightly instead of every push |
| Payout or tax trouble | a method that works in Türkiye; an accountant before the first payout |
| Scheduled tasks or Playgama MCP change | logic in the repository; live checklists; Plan B rehearsed |
| Revenue stays near zero | the day-90 floor pauses the factory |

---

## 17. Decisions

Accepted on 2026-10-20: D1 top lists (Playgama + YouTube Playables, weekly); D2 cloud tasks on the
subscription; D3 no reply by 12:00 means no deploy that day; D4 at most two moderation submissions
a week; D5 share bonus only for proven games; D6 private repository; D7 models (now: the most
capable model where judgement matters, lighter for demos if the dry run allows); D8 social
accounts; D9 winners go wide; D10 paid traffic stays off.

**Needed before phase 1** (my recommendation in brackets):
- **D11** An improvement release of a live game counts as the day's game. [yes]
- **D12** GitHub Pro for the account (about 4 USD a month, to confirm): protected `main`, Pages for
  the hub from the private repository, more CI minutes. [yes]
- **D13** Hasan sends one e-mail to Playgama's developer support (I draft it): is one AI-built
  sandbox game a day acceptable; do unsubmitted sandbox games or refusals affect the organisation;
  what changes for Bridge ads in the catalog; do the owner's own plays count. [yes, before phase 1]
- **D14** The three lifetime share bonuses: Peek & Find 1, Munch Pixels 1, factory 1, after
  `get_sandbox_traffic` shows how many are left. [as written]
- **D15** The day-90 revenue floor. [3.3 USD a day]
- **D16** Payout and tax: the method Playgama confirms for Türkiye, a bank transfer to a USD
  account or crypto (PayPal has no service in Türkiye, confirmed 2026-10-20; Wise withdrew lira
  receiving details for Türkiye addresses in 2023; `reports/2026-10-20-launch-pebblit.md`); one
  question to an accountant (mali müşavir) about registration and whether the GVK 20/B regime
  covers web games. [before the first payout]

---

## 18. Independent audit (2026-10-20) and how each finding was closed

An independent subagent audited v3 against the Playgama MCP README, the Claude Code docs fetched
the same day, our data and the house skills. 24 findings; every KRİTİK and YÜKSEK is closed in this
version; the three claims that changed the design most were re-checked against the docs before
acting (hooks are not a hard gate; cloud-session permission modes; per-tool connector settings).

| ID | Severity | Finding | Closed in |
| --- | --- | --- | --- |
| F01 | KRİTİK | no free supply of first plays; the capacity rule could never get evidence | §0.3, §7 game of the week, §13 phase-0 traffic probes, §14 pilot rule and new thresholds, D11 |
| F02 | KRİTİK | no memory between runs; runs push to `claude/` branches; `main` unprotected | §4 branches, §11 protected paths, D12 |
| F03 | KRİTİK | irreversible Playgama actions guarded only by hooks | §5.4, §11 three layers and canary |
| F04 | YÜKSEK | a continued session is not autonomous | §2, §4: day task fired with the pick; §13 zero-prompt check |
| F05 | YÜKSEK | uploads need Playgama hosts on the network | §4 Custom networks; §13 PUT probe; G6 QA Tool fallback |
| F06 | YÜKSEK | default connectors, remote tools, inherited tools, multi-repo sessions | §4, §6, §11 |
| F07 | YÜKSEK | one organisation carries everything; share bonuses shared | D13, D14 |
| F08 | YÜKSEK | no path for catalog updates | §7 catalog releases, media pack in §5.2 |
| F09 | YÜKSEK | usage in Hasan's working hours; ladder breaks his rules | §10 |
| F10 | YÜKSEK | originality runs out | §5.1 mechanic map, art kit, originality as code; §9 build flag |
| F11 | YÜKSEK | social has no click-through | §7 hub page, MP4 clips |
| F12 | YÜKSEK | free levers missing or ranked low | §7 order, listings, ad cadence test |
| F13 | ORTA | the ads row contradicted our data | §1 funnel |
| F14 | ORTA | decisions on noise; a stop-loss that cannot fire | §5.6, §9, §14, §15 |
| F15 | ORTA | the AI gamer cannot judge fun; persona play impractical | §5.3 bot audit |
| F16 | ORTA | devices and performance not tested where it matters | §5.3, §9, §15 |
| F17 | ORTA | the coder cannot read the Playgama docs; deployer gaps | §5.2, §5.4 |
| F18 | ORTA | injected text, YouTube terms, ad impressions | §5.1 sanitizer, §5.5 |
| F19 | ORTA | Hasan's time underestimated | §5.6 caps, §15 |
| F20 | ORTA | failure handling gaps | §2 dead-man's switch, §4 states, §5.4 retries |
| F21 | ORTA | CI minutes, repo size, shared kit | §4 kit versioning, CI, no build outputs |
| F22 | ORTA | contradictions and unimplementable gates | §8 scripts, §9 one numbers table, GameReady rule, this section |
| F23 | DÜŞÜK | payout and tax for a Turkish resident | D16 |
| F24 | DÜŞÜK | names and look-alike assets | §5.1 art kit and pack cap, §15 name check |

Also from the audit's "missing pieces": unit economics (§14), retirement rule (§5.6), clean-up of
shelf demos and drafts (§4, §13), change control for prompts (they live on protected `main`), a
model-change watch (§5.3 calibration), privacy (§11), a second outlet (CrazyGames, §7).

Still open, by design, until phase 0 answers them: free traffic per game, Playgama's answer on
cadence, the share bonuses left, the connector's tool names, the QA Tool login, ffmpeg's H.264
support, and whether plugin skills load in scheduled runs.
