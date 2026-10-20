# Pebblit Game Factory — plan v3 (2026-10-20)

**Hasan's request** (2026-10-20, translated): a system of agents that plans games from the best 10
games of a top list (the closest and the most creative ideas), has a coder agent build them, has
an AI gamer-auditor play, test and judge them with a gamer's taste and send them back for fixes
until it approves, and has a deploy bot fill in the Playgama developer-account fields and deploy.
"Plan completely how we do it."

**Decided by Hasan on 2026-10-20:** no paid boost for any game; one game a day; every night the
project manager presents three demos, Hasan picks one in the morning, and the pick is deployed the
same day; every open decision as recommended (§17). His last brief: design the process to be
flawless and to earn as much as possible, audit that it is smart, leave nothing unforeseen.

History: v1 (commit a1dfcb4) assumed three games a day on Hasan's PC; v2 (d611045, e3af580) moved
to the cloud with three demos a night; v3 adds how the factory earns money and the gate that
decides it, the growth engine without paid traffic, the kit standards for conversion and play
time, factory-level reviews, and the findings of an independent audit (§18). Lines marked "fact"
were checked on 2026-10-20 against the named source; the rest are design decisions or estimates
and say so. Nothing is built yet.

---

## 0. Verdict

1. **Buildable without the PC.** Claude Code cloud scheduled tasks run in Anthropic's cloud while
   the PC is off, draw down the subscription, may publish private pages without asking, and any
   run can be continued from the Claude app (fact, §3). A night run builds three demos; Hasan
   answers "B" in the morning; the same session finishes, audits and deploys B.
2. **Money comes from a few games that hold players, never from the count.** The path to revenue
   is: sandbox → **100 plays with a 5:00 average play time** (unlocks submitting for review) →
   manual moderation → catalog and partner distribution → ads once the game clears a session
   threshold → YouTube Playables for the best performers (facts, §1). Every design choice below
   serves that path.
3. **Without paid traffic, the binding constraint is reaching 100 plays.** The free share bonus
   works for three games per organisation, ever; organic sandbox traffic is thin. So the factory
   needs (a) a far better launch-to-play conversion than Peek & Find's 18 %, (b) play time above
   5:00, (c) a daily social clip to bring free players, and (d) the three share bonuses spent only
   on games whose first plays already prove they hold players. Every agent works to the ten Hold
   rules of the new `pebblit-retention` skill: 5:00 is the floor, 10:00 the goal, and no game ships
   with an estimated session under 7:00.
4. **Capacity follows evidence.** Every day Hasan picks between new ideas and improving the best
   live game; once a game holds players, more days go to it (§7). New games are exploration;
   winners are where the money is.
5. **Taste has two gates and a floor.** The AI gamer is the floor (bugs, confusion, dead time,
   weak feedback); Hasan's daily pick is the taste gate; the numbers decide hits, and the
   factory itself is reviewed on day 14, 30, 60 and 90 with a stop-loss (§14).
6. **No separate bill on the subscription; the limit is usage**, shared with our Munch Pixels work
   (facts, §3). The pilot week measures it.

---

## 1. How the factory earns money (facts, then the design)

**The funnel** (sources in brackets; Playgama pages did not open from the cloud machine, so
Playgama facts come from the MCP README, our dashboard or search summaries, as marked):

| Step | Gate | Source |
| --- | --- | --- |
| Sandbox | public link, no moderation; first players from the Playgama network | MCP README |
| Submit for review | 100 plays and 5:00 average play time | our sandbox dashboard 2026-10-18; an older Playgama post says the same |
| Catalog and partner sites | manual moderation (usually 3–5 business days); some partner platforms ask for ≥ 5 or ≥ 10 minutes average play time | Playgama wiki via search |
| Ads | switch on once the game clears a session threshold, access by request; a recent Playgama post names ≥ 100 daily sessions and clear moderation | MCP README; Playgama blog via search |
| Developer share | 70–90 % to the developer, tiered (70 % up to 1,000 USD monthly net, 80 % to 3,000, 90 % above); payouts from 100 USD by PayPal, Wise, crypto or bank | Playgama developer page and comparisons via search (marketing; the terms did not open) |
| YouTube Playables | Playgama picks its best performers with YouTube; developer keeps 75 %; HTML5, initial load < 30 MB, portrait, Bridge, no external calls, original (no reworks of famous games); puzzle, simulation, racing, action or arcade with a hypercasual feel | Playgama Playables pages via search |
| Other portals | Playgama is non-exclusive; CrazyGames is non-exclusive; Poki is web-exclusive by default | Playgama blog and comparisons via search |

**What follows for the design:**
- **Conversion is the first multiplier.** Peek & Find turned 18 % of launches into plays; a
  devlog of four Playgama games shows about 9 %. Every point of conversion multiplies all free
  traffic. Kit standard (§9): the first level starts on the first tap, teaches by doing, and the
  game is interactive within 3 seconds on a throttled mid-range phone profile.
- **Play time is the second.** 5:00 opens review; 10:00 opens the best partners and Playables.
  The `pebblit-retention` skill (written 2026-10-20 from the portal guidance in its
  `references/evidence.md`) turns this into ten Hold rules, each with a check: playing on the
  first tap; short levels with the next one instantly; a sawtooth ramp with breathers; something
  new every few minutes; a goal beyond the level from the first minute; rescue at the fail point;
  content that never runs out; ads that never cut a session; stability over 15 minutes; a reason
  to come back.
- **Ads are designed, not sprinkled.** Interstitials only between levels after ≥ 3 levels and
  ≥ 120 s, never in the first minute; rewarded only as optional help (continue, hint, booster);
  every game Playables-ready from day one, so a selection needs no rework.
- **In-app purchases** can earn more on web portals (Playgama developer page), but YouTube
  Playables forbids them; factory games ship without them, and a catalog winner may add them on
  web portals only (Hasan's call, §7).

---

## 2. A day in the factory (Europe/Istanbul; Turkey has no daylight-saving change)

| When | Who | What |
| --- | --- | --- |
| 02:07 | night run (cloud scheduled task) | the PM writes three demo briefs (or two and an improvement of the best live game); coder subagents build the demos; the gamer gives each a quick pass; a private report page is published; all work is pushed; Hasan is notified |
| morning, by 12:00 | Hasan, 5–10 min | opens the run in the Claude app, plays the demos on his phone (a real-device check every day), replies A, B or C, with one sentence of why if he likes |
| after the reply | the same session | finish → build gates → gamer full audit, up to three fix rounds → store pack → Playgama sandbox → final report with the link, the share text and the vertical clip |
| evening | Hasan, 2–3 min | posts the clip on the Pebblit social accounts (§7) and opens the sandbox link |
| no reply by 12:00 | — | no deploy that day; the demos go to the shelf |
| Monday 09:07 | analyst run | reads the week's telemetry, asks Hasan in the run for a dashboard screenshot, proposes moderation submissions, share-bonus games, ad-access requests and updates |
| Monday 01:07 | scout run | refreshes the top lists and the catalog title snapshot |

Runs start a few minutes past the hour because runs on the full hour can start late (fact). The
morning notification is a push from the session, verified in phase 3; if it does not reach the
phone, Hasan opens the task at a fixed time.

---

## 3. Facts about the runtime and the platform (checked 2026-10-20)

**Claude Code cloud scheduled tasks**, formerly routines (code.claude.com/docs/en/routines;
research preview, so behaviour and limits may change):
- Full Claude Code sessions on Anthropic-managed cloud infrastructure, also when the computer is
  off; each run clones the repository fresh; available on Pro, Max, Team and Enterprise; need a
  claude.ai login, not an API key; created at claude.ai/code/routines or with `/schedule`.
- Autonomous, with no permission prompts; every tool of the included connectors is usable, writes
  included. A run started by the schedule or Run now may publish a new private artifact without
  asking; in other cases Claude asks first.
- They draw down subscription usage like interactive sessions; over the limit, runs are rejected
  until the window resets unless usage credits are on (then billed at API rates). 100 scheduled
  runs an hour per account; minimum interval one hour.
- Connectors are the claude.ai integrations of the account (or servers in a committed
  `.mcp.json`); servers added locally with `claude mcp add` are invisible to them.
- A cloud environment sets network access (Trusted: package registries and common development
  domains; Custom; Full), environment variables and a cached setup script; connector traffic
  needs no allow-listing.
- Any run opens as a full session that can be continued; work goes to `claude/` branches unless
  the prompt names a branch. If the GitHub connection lapses, runs are skipped for up to 72 hours
  and then the task turns off.

**Local alternatives:** Desktop scheduled tasks run only while the app is open and the PC awake;
`/loop` needs an open session (desktop-scheduled-tasks and scheduled-tasks pages).

**Billing and limits** (legal-and-compliance, authentication, agent-sdk/overview pages; support
article "Using Claude Code with your Pro or Max plan"; claude.com/pricing): Pro and Max limits
assume ordinary, individual use and give no number for it; subscription sign-in is for ordinary
use of Claude Code and Anthropic's apps, and products built on the Agent SDK use API keys; Pro and
Max have a rolling five-hour limit and a weekly limit shared across Claude and Claude Code;
`claude setup-token` makes a one-year token for scripts that can only make model requests; a
`claude -p` or Agent SDK run does not wait for a limit to reset.

**Playgama Developer Console MCP** (README v1.8.0, github.com/Playgama/developer-cabinet-mcp):
OAuth 2.1 at `https://developer.playgama.com/api/mcp`, revocable at developer.playgama.com/mcp;
create the game, fill the form (`FORM_INCOMPLETE` names missing fields), upload the build and the
three covers (exactly 800×800, 1080×1920, 1920×1080, all required), QA Tool links, publish the
sandbox, read the share post, telemetry, submission state and moderation comments; every write
tool is marked destructive; human-only: submit to moderation, delete, roll back, payouts,
screenshots and videos; paid traffic only in the console; the share bonus works once per game for
up to three games per organisation ever; a catalog game takes an update without moderation after
the developer's explicit yes; limits: zip ≤ 300 MB, cover ≤ 10 MB, 15 sandbox publications per
rolling hour per game, one publication at a time, Bridge ≥ 2.2.0.

**Playgama content rules** (wiki "Content Requirements" via search summaries): copies of catalog
games and duplicates of the same developer's games are refused (a sequel is new only with
redesigned graphics and mechanics); low-quality games made wholly with generative AI may be
rejected; repeated non-compliance can restrict the account.

**Data points:** Peek & Find on day 2: 550 launches, 101 plays, 3:31 average, 11 likes and 2
dislikes, from a 25 USD boost plus organic and friends' traffic (`metrics/peek-and-find.md`). A
devlog of four games on Playgama: 1,897 sessions, 179 plays, 0.43 USD, with nearly all sessions
from Playgama's free boosts (smokeyai on itch.io, via search). How much traffic a sandbox game gets
with no bonus at all is unknown; the pilot measures it.

---

## 4. Architecture

```
 Monday 01:07  SCOUT run (web, no connectors) ──► research/<week>/top10.json, catalog-titles.json
 Monday 09:07  ANALYST run (Playgama read tools) ─► metrics/, funnel table, proposals ─► Hasan
 daily  02:07  NIGHT run ─┬─ PM ──► offers A · B · C (C may be "improve live game X")
                          ├─ CODER × 3 (demo mode) ──► demos/<date>-{a,b,c}
                          ├─ GAMER × 3 (quick pass) ──► clips, scores, issues
                          └─ report page (private artifact) + push + notify ──► waits
 Hasan replies "B" in the run's session
                          ┌─ CODER (finish mode) ⇄ GAMER (full audit, ≤ 3 fix rounds)
                          ├─ store pack (listing.json, covers, clip, licenses)
                          └─ DEPLOYER (Playgama connector) ──► sandbox link ──► final report
```

- **Runtime:** three cloud scheduled tasks on Hasan's claude.ai account on the private repository
  `kriptoloca/pebblit-factory`. The night task: Trusted network (package registries only) and the
  Playgama connector. The scout: a Custom network with the top-list domains, no connectors. The
  analyst: the Playgama connector, read tools only.
- **Thin orchestrator:** the main session follows `factory/NIGHT.md` and `factory/DAY.md` and
  starts subagents limited in `.claude/agents/*.md`; agents talk only through schema-checked
  files. Phase 2 decides whether the orchestration stays a prompt or becomes a Claude Code
  workflow script with fixed phases, whichever is more reliable in the dry run.
- **State in the repository:** every stage commits and pushes `days/<date>/state.json` and its
  outputs, because a container is reclaimed after inactivity and a continued session may start
  in a new one; any stage can be resumed from the last push.
- **No build outputs in git:** release ZIPs are reproducible from the commit (fixed timestamps,
  as in Munch Pixels) and identified by SHA-256 in `catalog.json`; clips live in the report
  artifacts; only covers and source are committed. This keeps a year of daily games small.
- **Monorepo, one install:** `kit/`, `template/` and every game share one `node_modules`,
  installed by the environment's cached setup script; demos add no dependencies.
- **Guardrails as code** (`.claude/settings.json`, loaded by cloud sessions from the repository):
  PreToolUse hooks block the forbidden Playgama tools (§5.4) and destructive commands; only the
  deployer's tool list holds Playgama tools; every subagent has a `maxTurns` cap; the environment
  caps subagent depth and concurrency.
- **Protected paths:** factory agents can never edit `.claude/**`, `.mcp.json` or `factory/**`
  (deny rules plus a hook), and the orchestrator refuses to push a commit that touches them,
  because a new run loads the repository's hooks and MCP servers without asking. Only an
  interactive session with Hasan changes them.
- **Factory self-tests in CI:** schemas, the hook block list (a test calls each forbidden tool
  name and expects a block), the state machine, the report generator, `npm run gates` on the
  template.
- **Plan B, only if a phase-0 or phase-3 check fails:** the same repository on the PC, as a
  Desktop scheduled task or headless `claude -p` with a small runner; used when the Playgama
  connector cannot be added on claude.ai (then only the deploy step runs on the PC) or when Hasan
  chooses metered billing with an API key. Notes: the Playgama sign-in happens once in an
  interactive session (`claude -p` cannot run OAuth); `--bare` never reads OAuth credentials, so
  the deployer uses `--strict-mcp-config`; an `ANTHROPIC_API_KEY` in the environment always wins
  in `-p` runs; the command sandbox needs WSL2 on Windows; a Desktop task needs "Keep computer
  awake".

### State per day

`BRIEFED → DEMOS_BUILT → DEMOS_CHECKED → OFFERED → PICKED | SKIPPED → FINISHING → BUILT (G3) →
AUDIT_n ⇄ FIX_n → APPROVED (G4) → PACKED (G5) → UPLOADED → SANDBOX_LIVE (G6) → REPORTED`, with
`PARKED` when a gate fails three times or a run hits the usage limit. A parked game never reaches
Playgama; the report says why, and its demo goes back to the shelf.

---

## 5. The agents

Every agent is a subagent with only the tools it needs, writes schema-valid files and never sees
another agent's reasoning. The most capable Claude model runs every role in the pilot; afterwards
the scout, analyst and deployer may move to a lighter model if quality holds (§17).

### 5.1 PM (every night)
- **Reads:** the latest research, the catalog, `lessons.md`, the funnel table from the analyst,
  the shelf, Hasan's past picks with his reasons.
- **Generates ≥ 12 candidates** with four operators: mutation (closest: a top game's proven
  pleasure with a new face, theme and one new rule), crossover (creative: one game's verb with
  another's goal or session shape), transplant (a top pattern on our strengths: generated levels
  with a solver, pixel boards, hidden objects), wildcard (the smallest possible idea).
- **Scores:** the 35-point rubric of `game-trend-skills:evaluating-game-ideas`; Face and Feel from
  `pebblit-game-craft` (both ≥ 3); originality; **first-10-seconds clarity without text**; **Hold**
  from `pebblit-retention` (≥ 4 required); buildable as a demo in one session;
  testable by a solver or bot; Playables fit (portrait, text-free, 13+, preferred genres).
- **Originality rule:** against our catalog, the same core mechanic (verb and board structure) is
  never a new game, only an update of that game; against other games, at least two of verb, board
  structure, theme and art style differ, and no level layout, UI or name is copied; the name is
  checked against the scout's catalog title snapshot and avoids trademarks.
- **Offers three:** A closest, B creative, C our strength; C becomes "improve live game X" under
  the capacity rule (§7). A high-scoring shelf demo may return once instead of a new build.
- **Writes a one-page demo brief per offer:** hypothesis, exact rules and numbers, the first level
  that teaches by doing, the Feel spec of the key moment (success louder than failure), the
  generator and its check, art direction (code-drawn shapes or CC0 packs vendored in the kit;
  one accent colour; readable at 128 px; no AI-look raster art), the character or joke, the cover
  idea, the one-line test (a muted 3-second clip shows a face, a cascade after one tap and
  something worth sending), and the **Hold plan** of `pebblit-retention`: the minute map of the
  first 10 minutes, the difficulty and novelty schedule of levels 1–50, the meta, rescue, the
  never-run-out mode, ad pacing and a session estimate ≥ 7:00.

### 5.2 Coder
- **Demo mode (night):** the core loop on the template, the generator and its validator, five
  levels, the key success moment with sound, play on the first tap.
- **Finish mode (after the pick):** builds the brief's Hold plan with the kit's Hold modules, and
  the kit standards (§9) in full: generated ramp to level 100 or endless with breathers, the complete Feel spec, synthesised sounds, saves, pause and mute,
  daily seeded level and streak, rewarded and interstitial hooks behind the ad gate, Playgama
  telemetry (progression, performance sample, uncaught errors), the debug contract, covers from
  the game's own art, `listing.json`, `licenses.json`, the reproducible ZIP; `npm run gates` green.
- **Improve mode (C = improve live game X):** works from the analyst's funnel numbers (first 30
  seconds, drop-off level, play time) on a branch of that game; the update keeps the game's id.
- **Rules:** the template's CLAUDE.md (YouTube Playables platform rules, no magic numbers, a bug fix
  starts with a red test); `code-review` on its own diff; no new dependencies.
- **Tools:** file edits and shell in its own folder, npm, Playwright for its own tests; no
  Playgama tools; no edits to protected paths.

### 5.3 Gamer-auditor
- **Quick pass (each demo, night):** smoke (loads, no console errors, no external requests, the
  bot finishes five levels); load and first-input timing under 4× CPU throttling; a 3-minute
  first-time play through small screenshots and taps; a 15-second muted clip; scores for
  first-10-seconds clarity, Feel, Flow, Face, depth outlook and the one-line test; top three
  issues.
- **Full audit (after the finish):** load time, initial size, console, network, the three aspect
  ratios, pause, mute and resume with the dev simulator, completability through the solver or
  bot, frame-time sampling under throttling, the Playgama QA Tool on the uploaded archive
  (`get_archive_qa_tool_link`, through the deployer), the Playables checks; then 10 minutes as two
  personas (a casual adult and an impatient teenager, 13+) with objective numbers from the event
  log (time to first input and first success, successes per minute, longest stretch without
  one, failure versus success feedback strength, frame-time p95), the anchored rubric, the
  minute-map audit of `pebblit-retention` (the checks of all ten Hold rules, a 15-minute soak
  run, the session estimate), bugs with severity, repro steps and screenshots. Verdict: APPROVE
  (no KRİTİK or YÜKSEK bug; clarity, Fair and polish ≥ 4; Feel, Flow and Face ≥ 3; minute-map
  PASS with an estimate ≥ 7:00; both personas reach 10 minutes and would keep playing), FIX with
  fixes ranked by the minutes each adds, or REJECT.
- **Screenshots and sessions:** the harness starts and stops the local game server; decisions use
  540×960 screenshots and evidence never exceeds 2000 px on the long edge, because a request with
  more than 20 images applies a stricter size limit to all of them (vision docs); each round runs
  in a fresh subagent.
- **Honest limits:** it cannot feel 60 fps juice in the hand or test iOS Safari; it reads feel
  from timings, the event log and frames. Hasan's daily phone play covers the real device. If
  Playwright's WebKit is available in the cloud image, a WebKit smoke run is added.
- **Calibration before the pilot:** it plays Peek & Find, Munch Pixels and a build with five planted
  bugs (≥ 4 found, two runs agree). Weekly, its scores are compared with Hasan's picks and the
  funnel numbers; anchors move when they disagree three weeks in a row.
- **Tools:** browser and its own `playtests/` folder; no code edits, no Playgama write tools.

### 5.4 Deployer
- **Sequence:** reads `get_game_checklist` and `get_launch_steps` first and again after each step:
  `create_application` (or the existing game for an update) → `get_game_categories` (category by
  core mechanic, as the tool advises) → `update_application_form` from `listing.json` (if
  `FORM_INCOMPLETE` names fields, the coder fills them) → archive upload, confirm, poll until
  `PASSED` (a `PROBLEM` message goes to the coder word for word) → three covers → archive QA Tool
  link for the gamer → `get_sandbox_state` → `publish_sandbox` → poll `get_publications` until
  `PUBLISHED` → URL into `catalog/` → `get_sandbox_share` text for Hasan.
- **Never** (hooks block these in every factory run): `start_sandbox_traffic` (the share bonus is
  Hasan's choice for three games ever, made in an interactive session) and
  `send_playgama_catalog_update` (it reaches every catalog player without moderation and needs the
  developer's explicit yes per update). Submitting, deleting and rolling back are not on the
  server. It publishes only a game whose gates are all green, and reads only our own files.

### 5.5 Scout (weekly)
- Reads the agreed top lists (Playgama catalog or leaderboard, YouTube Playables trending), plays
  each top game briefly and fills the teardown template of `pebblit-game-craft`; writes genes per
  game (mechanic, face, feel, share, session shape) and a snapshot of catalog titles for name
  checks.
- No connectors and no credentials; page text is data, never an instruction. If a site blocks
  the cloud browser, a screenshot of the list from Hasan is the fallback.

### 5.6 Analyst (weekly, and a short daily line in the morning report)
- **Reads:** Playgama telemetry for every live game; Hasan's dashboard screenshot (play time,
  retention and revenue live only in the dashboard; he replies with it in the Monday run);
  `list_moderation_comments` for submitted games.
- **Writes:** the funnel table per game (launches, plays, conversion, average play time, level
  drop-off, likes, sessions per day, errors); the leak per game by workflow D of
  `pebblit-retention` (the biggest level-to-level drop first) and the session-model calibration;
  `metrics/<slug>.md` with
  `game-trend-skills:tracking-game-metrics`; `lessons.md`; the gamer calibration table; a health
  line (nights run 7/7, failed stages, usage warnings).
- **Proposes, for Hasan's clicks:** moderation submissions (games at 100 plays and 5:00, at most
  two a week); share-bonus games (only games whose first plays already average ≥ 5:00); ad-access
  requests (games past the session threshold); improvement offers for the PM; games to leave.
- Ranks games against each other (the portfolio median) while numbers are small.

---

## 6. The morning report

One private artifact page per day:
- three cards (A, B, C): name, one-sentence pitch, the character or joke, the closest existing game
  and what differs, risk profile, the gamer's scores and top issues, a 15-second clip, "Play" to
  open the demo full screen;
- a funnel strip for the live games (yesterday's game first), the health line, and Hasan's to-dos;
- at the bottom: "Reply in this session with A, B or C".

The night run publishes it without asking; the final report after the pick may ask Hasan for one
tap (fact, §3). To verify in phase 1: a Phaser demo runs inside an artifact in the Claude app on
Hasan's phone. Fallbacks: a public `pebblit-demos` repository on GitHub Pages (unlisted links),
or clips only.

---

## 7. Growth engine without paid traffic

- **A Pebblit social channel (YouTube Shorts and TikTok, Reels optional):** every game ships a
  vertical 15–30 second clip built for short-form (the satisfying cascade in the first second, a
  loop, the share-worthy end) per `game-trend-skills:launching-on-zero-budget`; Hasan posts it in
  the evening with the ready caption. Posting stays manual until the channel works; scheduling
  tools can automate it later (Hasan's call). One clip a day is the cadence short-form channels
  reward, and it is also the public post the share bonus needs.
- **Share bonus (three games, ever):** only for a game whose first organic plays average ≥ 5:00
  and whose gamer scores are top of the portfolio; Hasan posts, gives the post link in an
  interactive session, and the agent starts the campaign there.
- **Referral bonus:** Hasan's invitation link brings 3 USD of traffic per developer who joins and
  publishes; shared where it fits, never spammed.
- **Catalog:** at 100 plays and 5:00, the analyst proposes the submission; Hasan clicks it (at most
  two a week, never two games with the same core mechanic); moderation comments feed the next
  improvement offer.
- **Ads:** when a catalog game passes the session threshold, Hasan requests ad access in the
  console.
- **Capacity rule (explore → exploit):** in the first two weeks all offers are new games. After
  that, when a live game leads the portfolio on conversion and play time but is below 100 plays,
  offer C is "improve its first 30 seconds or depth"; once a game is in the catalog with daily
  sessions, at least two days a week offer its updates (level packs, themes, feel, covers) until
  its growth flattens. Hasan still picks every day.
- **Winners go wide:** a catalog game that holds players gets, in order: Playables readiness
  confirmed and a note to Playgama; Playgama's publishing programme (it says it looks for web games
  with strong retention); CrazyGames (non-exclusive) after reading its terms, with Bridge already
  in place; web-only in-app purchases if Hasan wants them. Never Poki without a deal (web-exclusive
  by default). Each portal is Hasan's account and his submission.

---

## 8. Gates (a red gate never ships)

| Gate | When | Passes when |
| --- | --- | --- |
| G0 Offers | after the PM | three schema-valid briefs with different verbs; originality and name rules; Face and Feel ≥ 3; Hold ≥ 4 with a minute map and a session estimate ≥ 7:00; testable |
| G1 Demo | after each demo | loads; no console errors or external requests; the bot finishes five levels; interactive ≤ 3 s under 4× CPU throttling; clip recorded |
| G2 Pick | morning | Hasan's reply |
| G3 Build | after each finish round | `npm run gates` green: check, unit, e2e, build, initial load ≤ 5 MB (hard 8 MB), dist audit, ZIP, covers, telemetry events present, `licenses.json` valid, generator yields ≥ 100 valid levels with a rising difficulty metric (or a checked endless ramp), content horizon ≥ 60 minutes, friction between levels ≤ 1.5 s, ad schedule simulation (none in minute 1, none after a loss), Playables checks |
| G4 Gamer | after each audit | APPROVE (§5.3) within three fix rounds, including the minute-map PASS |
| G5 Store | before upload | `listing.json` valid (no age cues, no brands, lengths, category by mechanic); three covers at exact sizes; cover readable at 128 px |
| G6 Playgama | deploy | checklist met; archive `PASSED`; QA Tool run clean; `PUBLISHED` |
| G7 Market | weekly | the analyst's funnel table and proposals; Hasan's clicks |

---

## 9. Kit standards (every game inherits them)

Extracted from Munch Pixels and Peek & Find into `kit/` and `template/`:
- Platform: Bridge wrapper, storage with late-save merge, ad gate, resume grace, pause and mute,
  layout for 9:16, 1:1 and 16:9 (portrait required), audio synthesis, resume-safe timelines, no
  external calls.
- **Conversion:** no title screen before the first level; the first level teaches by doing;
  interactive within 3 s on a throttled mid-range profile; initial load ≤ 5 MB.
- **Play time (the Hold modules of `pebblit-retention`):** level flow with auto-advance and a
  one-tap retry; a sawtooth ramp scheduler with breathers and teaching loops; a novelty scheduler
  (a new element every 5–10 levels, a chapter every 10–20); a light meta bar toward the next
  unlock; a rewarded continue; generated levels behind the hand-tuned first 20–30; a daily seeded
  level with a forgiving streak and an endless mode with a personal best; session milestone
  telemetry at 1, 3, 5 and 10 minutes; progress saved after every level.
- **Ads:** interstitial only between levels after ≥ 3 levels and ≥ 120 s, never in the first
  minute; rewarded only as optional help; the game is fully playable when ads fail.
- **Telemetry:** the events `get_game_telemetry_guide` asks for, plus uncaught errors.
- **Art and sound:** code-drawn characters and CC0 packs vendored once with their licences; colour
  pairs checked for contrast (as Munch Pixels' ΔE test); synthesised sounds.
- **Tooling:** debug contract in dev builds only (`state()`, `point(name)`, `solution()` or
  `autoplay()`, `pause(bool)`, `events()`, `mismatches()`); covers generator; clip recorder;
  reproducible ZIP with SHA-256; `npm run gates`; `listing.json` schema test that bans age cues and
  brand names.

---

## 10. Usage and cost

- **Bill:** on the subscription, scheduled tasks add no bill unless usage credits are on. The
  factory and our Munch Pixels work share the five-hour and weekly limits; the night run uses a
  five-hour window while Hasan sleeps, so the weekly limit is the one to watch (Hasan glances at
  claude.ai/settings/usage on Mondays; the report shows the run health).
- **Terms:** Pro and Max limits assume ordinary, individual use without a number; the factory stays
  on Anthropic's own scheduled-task feature at one game a day; if usage grows beyond one person's
  work, an API key is the clean route.
- **Load estimate** (API-price equivalent, only to size the plan): three demos with quick passes ≈
  15–30 USD a night, one finish with audit and fixes ≈ 15–30 USD, the weekly runs ≈ 5 USD; about
  30–60 USD of usage a day. The pilot measures the real share.
- **If the limits do not carry it,** in this order (Hasan's call): two demos a night; a lighter
  model for the scout, analyst, deployer and demo builds; usage credits; Plan B with an API key.
- **A run that hits a limit stops;** its state is pushed, so it resumes after the reset and the
  report says what was lost.

---

## 11. Security

- No access to Hasan's PC; nothing on his machine is touched.
- Credentials: the Playgama connector (OAuth held by claude.ai, revocable at
  developer.playgama.com/mcp) and the Claude GitHub app's access to `pebblit-factory`. No API key,
  no payment credential, no social-account credential in the factory.
- Scheduled runs act without prompts, so the limits are code: hooks, tool lists, protected paths,
  CI self-tests; the night run has no general web access; the scout has no connectors.
- Kill switch: the on/off toggle of each task at claude.ai/code/routines, or revoking the Playgama
  agent. Vacation: switch the night task off; nothing is lost.
- Playgama's human-only actions stay human; no browser clicks around them.

---

## 12. Repository layout (`kriptoloca/pebblit-factory`, private)

```
kit/                     shared engine and standards (§9), CC0 packs with licences
template/                game skeleton + template CLAUDE.md + tests
demos/<date>-{a,b,c}/    the night's demos (shelf: 14 days)
games/<slug>/            one folder per game for its whole life (updates included)
days/<date>/             state.json, briefs, gamer reports, report page source
research/<week>/         top10.json, catalog-titles.json, teardowns
catalog/catalog.json     every game: genes, status, Playgama id, sandbox URL, ZIP SHA-256, gate results
metrics/                 funnel tables, per-game logs, weekly reports
factory/                 NIGHT.md, DAY.md, SCOUT.md, ANALYST.md, schemas, report template (protected)
.claude/                 agents, skills, settings.json with hooks (protected)
lessons.md               what worked, Hasan's picks and reasons
PLAN.md                  this plan, kept current
```

New skills, written with `skill-creator` and tested with its evals: `factory-idea-synth`,
`factory-brief`, `pebblit-kit`, `gamer-audit`, `playgama-deploy`, `store-copy`, `factory-scout`,
`portfolio-analyst`. Reused: `pebblit-game-craft`, `pebblit-retention` (written and validated on
2026-10-20; the PM, coder, gamer and analyst all apply it), `game-trend-skills:*`,
`design:ux-copy`, `code-review`.

---

## 13. Rollout (each phase ends with a check a person can run)

| Phase | Who | Contents | Done when |
| --- | --- | --- | --- |
| 0. Accounts | Hasan, ≈ 40 min | create the private repo; add the Playgama MCP as a custom connector at claude.ai/customize/connectors; give the Claude GitHub app access to the repo; check payout method and tax details in the Playgama console; open Pebblit accounts on YouTube and TikTok | a cloud session lists the Playgama tools |
| 1. Kit and template | Claude (cloud), ≈ 2 days | §9 kit, template, demo, finish and improve scaffolds, gates, report page, clip recorder, CI self-tests | a demo runs inside an artifact on Hasan's phone; gates and self-tests green in CI |
| 2. Agents and gamer | Claude (cloud), ≈ 2–3 days | subagents, skills, prompts, hooks, gamer harness, calibration | dry run: three demos, report, finish, deploy stubbed; the gamer finds ≥ 4 of 5 planted bugs and two runs agree |
| 3. First real day | together, one day | create the three scheduled tasks; Run now; Hasan picks; real deploy; first clip posted | one game live in the sandbox with all fields and covers, QA Tool clean, notification reached the phone |
| 4. Pilot | factory, 7 days | the schedule on | a deployed game on ≥ 5 of 7 days with no code edited by hand; Hasan's time ≤ 15 min a day; usage within the plan; no Playgama refusals |
| 5. Steady state | factory | weekly scout and analyst; the capacity rule; reviews (§14) | — |

---

## 14. Reviews and stop-loss for the factory itself (starting thresholds; Hasan decides)

| Day | Check | If it fails |
| --- | --- | --- |
| 14 | ≥ 10 deploys; usage within limits; gamer calibrated; organic plays per game measured | fix the pipeline before more games |
| 30 | at least one game averages ≥ 5:00 over its plays; share bonus spent on the best one or two | shift the idea mix to what held players; three days a week improve the top two games |
| 60 | at least one game submitted and accepted into the catalog | new games drop to three a week; the best game gets a deep build (Munch Pixels-style) |
| 90 | ad revenue started on at least one game | pause the factory and re-plan with Hasan (fewer, deeper games; other portals; a paid traffic test only if he wants it) |

---

## 15. Hasan's steps

- **Once (phase 0):** the repo, the Playgama connector, GitHub access, payout and tax details in the
  console, the Pebblit social accounts.
- **Daily (≈ 10–15 min):** morning: play the demos, reply A, B or C; evening: post the clip.
- **Weekly (≈ 15–20 min):** reply to the analyst with the dashboard screenshot; submit proposed
  games to moderation; request ad access when proposed; decide share-bonus games; glance at the
  usage page.
- **At reviews (day 14, 30, 60, 90):** the stop-loss decisions in §14.

---

## 16. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Games never reach 100 plays without paid traffic | conversion and play-time standards; the social channel; share bonus for proven games; capacity shifts to improving the best game; day-30 and day-60 reviews |
| Games average under 5:00 | the Hold rules in every brief, build and audit; no game ships with an estimate under 7:00; the analyst's leak loop fixes the biggest drop first, one release at a time |
| The Playgama connector does not work from claude.ai | phase 0 tests it first; Plan B runs only the deploy step on the PC |
| Usage limits, or Munch Pixels work suffers | night schedule; pilot measures; two demos, lighter models, usage credits or Plan B, in that order |
| Scheduled tasks are a research preview and change | the logic lives in the repo and runs the same in a local session |
| Demos do not run inside an artifact | a public Pages repo with unlisted links, or clips only |
| Duplicates, low-quality refusals, account warnings | originality and name rules; updates instead of look-alikes; at most two submissions a week; no AI-look art |
| A factory agent changes `.claude/` or adds `.mcp.json`, and the next run trusts it | protected paths: deny rules, a hook, a push check and a CI test |
| Prompt injection from scraped pages | the scout is a separate run with no connectors and writes schema-checked data |
| A live game breaks on a device we do not test | Hasan's daily phone play; error telemetry; the next morning's improvement offer; sandbox republish |
| GitHub connection lapses and runs stop silently | the health line in every report; the Monday check |
| The AI gamer approves boring games | Hasan's pick; weekly calibration against the funnel |
| Hasan's taste and the market disagree | the analyst compares his picks with the numbers monthly and says so |
| Asset or name trouble (licences, trademarks) | CC0 and OFL only with `licenses.json`; name check against the catalog snapshot; no brands |
| Playgama MCP or rules change | `get_launch_steps` and the checklist are read live on every deploy; errors stop the deploy |
| Revenue stays near zero | the stop-loss reviews end the experiment cheaply and say what to change |

---

## 17. Decisions

All accepted by Hasan on 2026-10-20 as recommended:
- **D1 Top lists:** Playgama catalog or leaderboard + YouTube Playables trending, refreshed weekly.
- **D2 Runtime and billing:** cloud scheduled tasks on the subscription, usage credits off; Plan B
  only if a phase-0 or phase-3 check fails.
- **D3 No reply by 12:00:** no deploy that day; the demos go to the shelf.
- **D4 Moderation:** Hasan submits the analyst's proposals, at most two a week.
- **D5 Share bonus:** only for games whose first plays already average ≥ 5:00.
- **D6 Repository:** private `kriptoloca/pebblit-factory`.
- **D7 Models:** the most capable model everywhere in the pilot; then a lighter model for the
  scout, analyst and deployer if quality holds.

Added in v3, applied unless Hasan objects:
- **D8 Social channel:** Pebblit accounts on YouTube Shorts and TikTok; Hasan posts the daily clip.
- **D9 Winners go wide:** Playgama first; then Playables readiness, Playgama's publishing
  programme and CrazyGames; never Poki without a deal.
- **D10 Paid traffic stays off.** At the day-30 review the analyst reports whether one proven game
  is stuck below 100 plays; whether to make an exception stays Hasan's decision.

---

## 18. Independent audit

(Filled in after the adversarial audit of this version: findings by severity and how each was
closed.)
