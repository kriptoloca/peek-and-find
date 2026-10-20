# Pebblit Game Factory — plan v2 (2026-10-20)

**Hasan's request** (2026-10-20, translated): a system of agents that plans games from the best 10
games of a top list (the closest and the most creative ideas), has a coder agent build them, has
an AI gamer-auditor play, test and judge them with a gamer's taste and send them back for fixes
until it approves, and has a deploy bot fill in the Playgama developer-account fields and deploy.
"Plan completely how we do it."

**Hasan's decisions later the same day:** no paid boost for any game; one game a day, not three;
every day the project manager presents three demos, Hasan picks one, and that one is deployed the
same day. From the review he shared we also keep "many prototypes, few releases, grow the winner
with updates".

v1 of this plan (commit a1dfcb4) assumed three games a day on Hasan's PC. v2 replaces it. Lines
marked "fact" were checked on 2026-10-20 against the source named next to them; everything else
is a design decision or an estimate and says so. Nothing is built yet.

---

## 0. Verdict

1. **Buildable, and the simplest version runs without the PC.** Claude Code's cloud scheduled
   tasks run in Anthropic's cloud while the PC is off, draw down the Claude subscription, may
   publish private pages (artifacts) without asking, and every run can be opened later as a
   normal session and continued (fact, §2). That is the loop Hasan asked for: the night run builds
   three demos and stops; Hasan answers "B" in the Claude app in the morning; the same session
   finishes B and deploys it.
2. **One game a day out of three demos.** The night run builds three playable demos and a report
   page; Hasan plays them on his phone and picks one; the day's work finishes the pick, puts it
   through the AI gamer's full audit and up to three fix rounds, and deploys it to the Playgama
   sandbox.
3. **Without paid traffic, the catalog is the distribution decision.** The sandbox brings some
   organic players from the Playgama network (how many is unknown; measured from day one); the
   free share bonus works for three games per organisation, ever; the catalog after moderation is
   where the free players are. So each week Hasan sends the best one or two sandbox games to
   moderation, and a winner grows by updates rather than look-alike new games, because Playgama
   refuses a developer's duplicates of their own games.
4. **Taste has two gates.** The AI gamer is the floor (bugs, confusion, dead time, weak feedback);
   Hasan's daily pick is the taste gate; players decide what is a hit.
5. **No separate bill on the subscription; the limit is usage.** Scheduled tasks draw down the
   same usage as our interactive sessions, Munch Pixels included, and a run over the limit is
   rejected unless usage credits are on (fact, §2). The pilot week measures whether the plan's
   limits carry one game a day.

---

## 1. A day in the factory (Europe/Istanbul)

| When | Who | What |
| --- | --- | --- |
| 02:07 | night run (cloud scheduled task) | the PM writes three demo briefs; three coder subagents build the demos; the gamer gives each a quick pass (smoke test, 3-minute impression, 15-second muted clip, scores); a private report page is published; all work is pushed; Hasan is notified |
| morning, by 12:00 | Hasan, 5–10 min | opens the run in the Claude app, plays the three demos from the report page, replies A, B or C (one sentence of why is welcome) |
| after the reply | the same session | finish → build gates → gamer full audit, up to three fix rounds → store pack → Playgama sandbox → final report with the link, the share text and a vertical clip |
| evening | Hasan, 1–2 min | opens the sandbox link; posts the clip if he wants |
| no reply by 12:00 | — | no deploy that day [D3]; the demos go to the shelf |
| Monday | weekly tasks | the scout refreshes the top lists; the analyst reads the week's numbers and proposes the moderation shortlist and updates for winners |

Runs start a few minutes past the hour because runs scheduled on the full hour can start several
minutes late (fact, scheduled tasks page). The notification is a push from the session, to be
verified in phase 3; if it does not reach the phone, Hasan opens the task at a fixed time.

---

## 2. Facts that shape the design (checked 2026-10-20)

**Claude Code cloud scheduled tasks**, formerly routines (code.claude.com/docs/en/routines; a
research preview, so behaviour and limits may change):
- They run as full Claude Code sessions on Anthropic-managed cloud infrastructure, also when the
  computer is off; each run clones the repository fresh.
- Available on Pro, Max, Team and Enterprise; they need a claude.ai login, not an API key; created
  at claude.ai/code/routines or with `/schedule`.
- They run autonomously with no permission prompts and can use every tool of the connectors
  included in the task, writes included. A run started by the schedule or by Run now may publish
  a new private artifact without asking; in other cases Claude asks first.
- They draw down subscription usage like interactive sessions. Over the limit, runs are rejected
  until the usage window resets, unless usage credits are on (then overage is metered). Limits:
  100 scheduled runs an hour per account; minimum interval one hour.
- Connectors are the claude.ai integrations of the account (or a server declared in a committed
  `.mcp.json`); servers added locally with `claude mcp add` are not visible to them.
- A cloud environment sets network access (Trusted: package registries and common development
  domains; Custom: added domains; Full), environment variables and a cached setup script.
  Connector traffic does not need allow-listing.
- Any run can be opened as a full session to read what happened and to continue the
  conversation. Work goes to `claude/` branches unless the prompt names another branch.

**Local alternatives** (desktop-scheduled-tasks and scheduled-tasks pages): Desktop scheduled
tasks run on the PC only while the app is open and the PC is awake, with local files, local MCP
config and a permission mode per task; `/loop` needs an open session.

**Billing rules** (legal-and-compliance, authentication and agent-sdk/overview pages): the
advertised Pro and Max usage limits assume ordinary, individual use of Claude Code and the Agent
SDK; subscription sign-in is meant for ordinary use of Claude Code and Anthropic's own apps, and
products built on the Agent SDK should use API keys; `claude setup-token` makes a one-year
subscription token for scripts and CI that can only make model requests (no claude.ai connectors,
no Remote Control).

**Playgama Developer Console MCP** (README v1.8.0, github.com/Playgama/developer-cabinet-mcp):
- OAuth 2.1 at `https://developer.playgama.com/api/mcp`; connected agents can be revoked at
  developer.playgama.com/mcp.
- Tools: create the game, fill the form, upload the build and the three covers (exactly 800×800,
  1080×1920 and 1920×1080, all required), QA Tool links (local and archive), publish the sandbox,
  read the share post, read telemetry, check the submission state. Every write tool is marked
  destructive.
- Human-only: submitting to moderation, deleting, rolling back, payouts, uploading screenshots and
  videos. Paid traffic is bought in the console only.
- `start_sandbox_traffic` runs on a referral bonus (3 USD campaigns) or on the share bonus (once
  per game, up to three games per organisation over its lifetime, after a public post).
- A game live in the catalog can take an update without moderation, after the developer's
  explicit yes for that update.
- Limits: zip ≤ 300 MB, cover ≤ 10 MB, 15 sandbox publications per rolling hour per game, one
  publication in progress at a time; Bridge ≥ 2.2.0.

**Playgama content rules** (wiki "Content Requirements", read through search summaries because
the page does not open from the cloud machine): copies of catalog games are refused, and so are
duplicates of another game by the same developer (a sequel counts as new only if its graphics and
mechanics are redesigned); low-quality games made wholly with generative AI that bring nothing
fresh may be rejected; repeated non-compliance can restrict the account. Moderation is manual
(wiki: usually 3–5 business days).

**Our data point:** Peek & Find on day 2 had 550 launches, 101 plays, a 3:31 average, 11 likes and
2 dislikes, from a mix of a 25 USD boost, organic and friends' traffic (`metrics/peek-and-find.md`).
How many players the sandbox brings with no boost at all is unknown.

---

## 3. Architecture

```
 Monday 01:07  SCOUT task (web, no connectors) ──► research/<week>/top10.json
 Monday 09:07  ANALYST task (Playgama read tools) ─► metrics/, shortlist, lessons.md
 daily  02:07  NIGHT task ─┬─ PM ──► 3 demo briefs (A closest · B creative · C our strength or an update)
                           ├─ 3 × CODER (demo mode) ──► demos/<date>-{a,b,c}
                           ├─ 3 × GAMER (quick pass) ──► clips, scores, issues
                           └─ report page (private artifact) + push + notify ──► waits
 Hasan replies "B" in the run's session
                           ┌─ CODER (finish mode) ⇄ GAMER (full audit, ≤ 3 fix rounds)
                           ├─ store pack (listing.json, covers, clip)
                           └─ DEPLOYER (Playgama connector) ──► sandbox link ──► final report
```

- **Runtime:** three cloud scheduled tasks on Hasan's claude.ai account, all on the private
  repository `kriptoloca/pebblit-factory`. The night task's environment has Trusted network
  access (package registries only) and the Playgama connector; the scout's environment allows the
  top-list domains and has no connectors; the analyst uses the Playgama connector's read tools.
- **One run, one thin orchestrator:** the main session follows `factory/NIGHT.md`, and
  `factory/DAY.md` after the pick, and starts subagents whose tools are limited in
  `.claude/agents/*.md`. Agents talk only through files that match JSON schemas.
- **State lives in the repository:** every stage commits and pushes `games/<date>/state.json` and
  its outputs, because a cloud container is reclaimed after inactivity and a continued session
  may start in a new one.
- **Monorepo, one install:** `kit/`, `template/` and every game are workspace packages sharing one
  `node_modules`, installed by the environment's cached setup script. Demos add no dependencies,
  so three of them fit the session's disk allowance and can be built in parallel.
- **Guardrails as code** (`.claude/settings.json`, which cloud sessions load from the repository):
  PreToolUse hooks block the Playgama tools the factory must never call (§4.4) and destructive
  shell commands; only the deployer's tool list contains Playgama tools.
- **Plan B, only if a check in phase 0 or 3 fails:** the same repository runs on the PC, as a
  Desktop scheduled task or with headless `claude -p` driven by a small runner. It applies when
  the Playgama connector cannot be added on claude.ai (then only the deploy step runs on the PC),
  or when the subscription's limits do not carry the factory and Hasan chooses metered billing
  with an API key.

### State per day

`BRIEFED → DEMOS_BUILT → DEMOS_CHECKED → OFFERED → PICKED | SKIPPED → FINISHING → BUILT (G3) →
AUDIT_n ⇄ FIX_n → APPROVED (G4) → PACKED (G5) → UPLOADED → SANDBOX_LIVE (G6) → REPORTED`, with
`PARKED` when a gate fails three times or a run hits the usage limit. A parked game never reaches
Playgama; the report says why, and its demo goes back to the shelf.

---

## 4. The agents

Every agent is a subagent with only the tools it needs; it writes its result as schema-valid
files and never sees another agent's reasoning. Model: the most capable Claude model for every
role in the pilot; after the pilot Hasan may move the scout, analyst and deployer to a lighter
model to save usage [D7].

### 4.1 PM (every night)
- Reads the latest `research/<week>/top10.json`, `catalog/catalog.json`, `lessons.md`, the shelf,
  and Hasan's past picks with his reasons.
- Generates at least 12 candidates with four operators: **mutation** (closest: one top game's
  proven pleasure with a new face, theme and one new rule), **crossover** (creative: one game's
  verb with another's goal or session shape), **transplant** (a top pattern on one of our
  strengths: generated levels with a solver, pixel boards, hidden objects), **wildcard** (the
  smallest possible idea).
- Scores them: the 35-point rubric of `game-trend-skills:evaluating-game-ideas`; Face and Feel
  from `pebblit-game-craft` (both ≥ 3); originality; buildable as a demo in one session; testable
  by a solver or a bot; Playables fit (text-free, 13+, quick load, room for long sessions).
- **Originality rule.** Against our own catalog: a candidate with the same core mechanic (verb
  and board structure) is not a new game; it can only be offered as an update of that game.
  Against other games: at least two of verb, board structure, theme and art style differ, and no
  level layout, UI or name is copied.
- Offers three with different verbs and risk: **A** closest (mutation), **B** creative
  (crossover), **C** our strength (transplant), or **C = update of live game X** when the analyst
  flags a winner. A shelf demo with a high score may come back once instead of a new build.
- Writes a one-page demo brief per offer: hypothesis, exact rules and numbers, the Feel spec of
  the key moment (success louder than failure), the generator and its check, art direction
  (procedural shapes, pixel art or CC0 sets; one accent colour; readable at 128 px), the
  character or joke, and the one-line test (a muted 3-second clip shows a face, a cascade after
  one tap and something worth sending to a friend).

### 4.2 Coder
- **Demo mode (night):** the core loop on the template, the generator and its validator, five
  levels, the key success moment with sound, play from the first tap. The kit brings the
  platform layer (Bridge, saves, pause and mute, layout, audio).
- **Finish mode (after the pick):** the full level ramp, the complete Feel spec, synthesised
  sounds, saves, pause and mute, rewarded and interstitial hooks behind the ad gate, Playgama
  telemetry events, the debug contract, covers from gameplay frames, `listing.json`, the release
  ZIP; `npm run gates` green. Fix rounds take the gamer's list, KRİTİK and YÜKSEK first.
- **Rules:** the template's CLAUDE.md (YouTube Playables platform rules, no magic numbers, a bug
  fix starts with a red test); `code-review` on its own diff before handing over.
- **Tools:** file edits and shell in its own folder, npm, Playwright for its own tests; no
  Playgama tools.

### 4.3 Gamer-auditor
- **Quick pass (each demo, night):** a mechanical smoke test (loads, no console errors, no
  external requests, the bot or solver finishes the five levels, a 9:16 screenshot); a 3-minute
  first-time play through screenshots and taps (Playwright: screenshot → decide → tap at
  coordinates); a 15-second muted clip; scores for clarity in 10 seconds without text, Feel,
  Flow, Face and the one-line test; the top three issues.
- **Full audit (after the finish):**
  - Mechanical: load time, console, network, size, the three aspect ratios, pause, mute and
    resume with the dev pause simulator, completability through the solver or bot, frame-time
    sampling, the Playgama QA Tool on the uploaded archive (`get_archive_qa_tool_link`, through
    the deployer).
  - Play: 10 minutes as two personas (a casual adult and an impatient teenager, 13+), with
    objective numbers from the debug contract's event log (time to first input and to first
    success, successes per minute, longest stretch without one, failure versus success feedback
    strength, frame-time p95), the anchored rubric of `pebblit-game-craft`, bugs with severity,
    repro steps and screenshots.
  - Verdict: **APPROVE** (no KRİTİK or YÜKSEK bug; clarity, Fair and polish ≥ 4; Feel, Flow and
    Face ≥ 3; both personas would keep playing), **FIX** with a ranked list, or **REJECT**.
- **Honest limits:** a model playing through screenshots cannot feel 60 fps juice in the hand;
  it reads feel from timings, the event log and frames. It is the floor.
- **Calibration before the pilot:** it plays Peek & Find, Munch Pixels and a build with five
  planted bugs (it must find at least four, and two runs must agree on the verdict). Every week
  its demo scores are compared with Hasan's picks and with the sandbox numbers.
- **Tools:** browser and its own `playtests/` folder; no code edits, no Playgama write tools.

### 4.4 Deployer
- Follows `get_launch_steps` and reads it again after each step: `create_application` (or the
  existing game for an update) → `get_game_categories` → `update_application_form` from
  `listing.json` → archive upload, confirm, poll until `PASSED` (a `PROBLEM` message goes to the
  coder word for word) → the three covers → the archive QA Tool link for the gamer →
  `get_sandbox_state` → `publish_sandbox` → poll `get_publications` until `PUBLISHED` → record
  the URL in `catalog/` → `get_sandbox_share` text for Hasan.
- **Never** (hooks block these in every factory run): `start_sandbox_traffic` (the share bonus
  is Hasan's choice for three games ever, made in an interactive session) and
  `send_playgama_catalog_update` (it reaches every catalog player without moderation, and the
  README requires the developer's explicit yes for each update). Submitting, deleting and rolling
  back are not on the server at all. It publishes only a game whose gates are all green.
- Reads only our own schema-checked files; it never reads web pages.

### 4.5 Scout (weekly task)
- Reads the agreed top lists [D1], plays each top game briefly and fills the teardown template of
  `pebblit-game-craft`: thumbnail, face or joke, verb, cascade per input, micro-win cadence,
  physical feedback, unfair spots, share object, likes and plays.
- Output: "genes" per game (mechanic, face, feel, share, session shape) in
  `research/<week>/top10.json`.
- Has no connectors and no credentials; everything on a page is data, never an instruction. If a
  site blocks the cloud browser, a screenshot of the list from Hasan is the fallback input.

### 4.6 Analyst (weekly task)
- Reads Playgama telemetry for every live game and any dashboard numbers Hasan shares (play time,
  retention and revenue are only in the dashboard), applies
  `game-trend-skills:tracking-game-metrics`, writes `metrics/<slug>.md`.
- Without paid traffic the numbers stay small, so games are ranked against each other (the
  portfolio median), not against fixed thresholds; the first two or three weeks set the baseline.
- Proposes the moderation shortlist (at most two a week), share-bonus candidates, updates for
  winners (they become a "C" offer) and games to leave alone; updates `lessons.md` and the gamer
  calibration table.

---

## 5. The morning report

One private artifact page per day:
- three cards (A, B, C): name, one-sentence pitch, the character or joke, the closest existing
  game and what differs, the risk profile;
- "Play" opens the demo full screen on the phone; a 15-second clip; the gamer's scores and top
  issues;
- at the bottom: "Reply in this session with A, B or C". Yesterday's game and its first numbers
  when there are any.

The night run publishes the page without asking; the final report after the pick may ask Hasan
for one tap before it publishes (fact, §2). To verify in phase 1: a Phaser demo runs inside an
artifact in the Claude app on Hasan's phone. Fallbacks: a public `pebblit-demos` repository on
GitHub Pages (unlisted links, but public), or clips only.

---

## 6. Players without paid traffic

- **Every game:** the sandbox link, Playgama's ready post text and a vertical 15–30 second clip
  for Shorts, TikTok and Reels; Hasan posts it when he wants.
- **Share bonus (three games, ever):** kept for the best games of the first month [D5]; Hasan
  posts, gives the post link in an interactive session, and the agent starts the campaign there.
- **Catalog:** each week Hasan submits the analyst's shortlist (at most two) to moderation [D4];
  never two games with the same core mechanic.
- **Grow the winner:** a game that leads the portfolio gets update offers (a level pack, a new
  theme) as a "C" option. A sandbox game is republished; a catalog game's update goes out only
  when Hasan says yes in an interactive session.

---

## 7. Gates (a red gate never ships)

| Gate | When | Passes when |
| --- | --- | --- |
| G0 Offers | after the PM | three schema-valid briefs with different verbs; originality rule; Face and Feel ≥ 3; testable |
| G1 Demo | after each demo | loads; no console errors or external requests; the bot or solver finishes five levels; clip recorded |
| G2 Pick | morning | Hasan's reply |
| G3 Build | after each finish round | `npm run gates` green (check, unit, e2e, build, initial load ≤ 8 MB, dist audit, ZIP, covers) |
| G4 Gamer | after each audit | APPROVE (§4.3) within three fix rounds |
| G5 Store | before upload | `listing.json` valid (no age cues, no brands, lengths); three covers at exact sizes; cover readable at 128 px |
| G6 Playgama | deploy | archive `PASSED`; QA Tool run clean; `PUBLISHED` |
| G7 Market | weekly | the analyst's ranking; Hasan's moderation clicks |

---

## 8. Usage and cost

- **Bill:** on the subscription, scheduled tasks add no separate bill unless usage credits are
  turned on. They draw down the same usage as interactive sessions, so the factory and our Munch
  Pixels work share one limit.
- **Load estimate** (API-price equivalent at the default model's prices, only to judge whether the
  plan's limits fit; the pilot measures the real share at claude.ai/settings/usage): three demos
  with quick passes ≈ 15–30 USD a night, one finish with audit and fixes ≈ 15–30 USD, the weekly
  tasks ≈ 5 USD a week; about 30–60 USD of usage a day.
- **If the limits do not carry it,** in this order, each one Hasan's call: two demos instead of
  three; a lighter model for the scout, analyst, deployer and demo builds; usage credits; Plan B
  with an API key.
- **Revenue reality:** Peek & Find earns 0.07 USD a day in the sandbox. The factory pays off only
  through a game that the catalog carries and that keeps players, which is why the weekly
  moderation pick matters more than the daily count.

---

## 9. Security

- The cloud design needs no access to Hasan's PC; nothing on his machine is touched.
- Credentials: the Playgama connector (OAuth held by claude.ai, revocable at
  developer.playgama.com/mcp) and the Claude GitHub app's access to `pebblit-factory`. No API key
  and no payment credential exist in the factory.
- Scheduled runs act without prompts, so the limits are in code: hooks block forbidden tools;
  only the deployer's tool list contains Playgama tools; the night task has no general web
  access; the scout, which reads the web, has no connectors.
- Kill switch: the on/off toggle of each task at claude.ai/code/routines, or revoking the
  Playgama agent.
- Playgama's human-only actions stay human; we do not automate around them with browser clicks.

---

## 10. Repository layout (`kriptoloca/pebblit-factory`, private)

```
kit/                     shared engine (from Munch Pixels and Peek & Find)
template/                game skeleton + template CLAUDE.md + tests
demos/<date>-{a,b,c}/    the night's demos (kept 14 days on the shelf)
games/<date>-<slug>/     the picked game: brief, src, tests, release/, store/, playtests/, state.json
research/<week>/         top10.json, thumbnails, teardowns
catalog/catalog.json     every game: genes, status, Playgama id, sandbox URL, gate results
metrics/                 per-game logs, weekly portfolio reports
factory/                 NIGHT.md, DAY.md, SCOUT.md, ANALYST.md, schemas, report page template
.claude/agents/          pm, coder, gamer, deployer, scout, analyst
.claude/skills/          new factory skills (below)
.claude/settings.json    hooks and permissions
lessons.md               what worked (PM input), Hasan's picks and reasons
PLAN.md                  this plan, kept current
```

New skills, written with `skill-creator` and tested with its evals before the pilot:
`factory-idea-synth` and `factory-brief` (PM), `pebblit-kit` (coder), `gamer-audit` (gamer),
`playgama-deploy` (deployer), `store-copy` (PM and coder), `factory-scout` (scout),
`portfolio-analyst` (analyst). Reused: `pebblit-game-craft`, `game-trend-skills:*`,
`design:ux-copy`, `code-review`.

The kit and template are extracted from Munch Pixels and Peek & Find: Bridge wrapper, storage with
late-save merge, ad gate, resume grace, layout patterns, audio pipeline, resume-safe timelines;
scripts for build, dist audit, size, ZIP, screenshots and the covers generator; `npm run gates`;
the debug contract every game implements in dev builds only (`state()`, `point(name)`,
`solution()` or `autoplay()`, `pause(bool)`, `events()`, `mismatches()`); Playgama telemetry
events; the `listing.json` schema with a test that bans age cues and brand names.

---

## 11. Rollout (each phase ends with a check a person can run)

| Phase | Who | Contents | Done when |
| --- | --- | --- | --- |
| 0. Accounts | Hasan, ≈ 30 min | decisions §14; create the private repo; add the Playgama MCP as a custom connector at claude.ai/customize/connectors; give the Claude GitHub app access to the repo | a cloud session lists the Playgama tools |
| 1. Kit and template | Claude (cloud), ≈ 2 days | §10 kit, template, demo and finish scaffolds, gates, report page | a demo runs inside an artifact on Hasan's phone; gates green in CI |
| 2. Agents and gamer | Claude (cloud), ≈ 2–3 days | subagents, skills, prompts, hooks, gamer harness (clips, metrics, rubric), calibration | dry run: three demos, report, finish, deploy stubbed; the gamer finds ≥ 4 of 5 planted bugs and two runs agree |
| 3. First real day | together, one day | create the three scheduled tasks; Run now; Hasan picks; real deploy | one game live in the sandbox with all fields and covers, QA Tool clean |
| 4. Pilot | factory, 7 days | the schedule on | a deployed game on ≥ 5 of 7 days with no code edited by hand; Hasan's time ≤ 15 min a day; usage within the plan; no Playgama refusals |
| 5. Steady state | factory | weekly scout and analyst; moderation picks; updates for winners | — |

---

## 12. Hasan's steps

- **Once:** the decisions in §14; the repository; the Playgama connector; GitHub access; in
  phase 3, switching on the scheduled tasks.
- **Daily (≈ 10 min):** in the morning, play the three demos and reply A, B or C; in the evening,
  open the sandbox link and post the clip if he wants.
- **Weekly (≈ 15 min):** submit the shortlist to moderation in the console (and upload
  screenshots there if the form asks; the server cannot); choose share-bonus games; skim
  `lessons.md`.

---

## 13. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| The Playgama connector does not work from claude.ai | phase 0 tests it first; Plan B runs only the deploy step on the PC |
| Usage limits do not carry the factory, or Munch Pixels work suffers | the pilot measures; two demos, a lighter model for light roles, usage credits or Plan B, in that order |
| Scheduled tasks are a research preview and may change | the factory's logic lives in the repo and runs the same in a local session (Plan B) |
| Demos do not run inside an artifact | public Pages repo with unlisted links, or clips only |
| Few organic players without paid traffic | rank games against each other; clips for social posts; share bonus for the best three; catalog through weekly moderation picks |
| Duplicates or low-quality refusals; account warnings | originality rule, distinct verbs every day, updates instead of look-alikes, at most two submissions a week, no AI-look art |
| Hasan does not reply | no deploy that day; nothing breaks; the demos wait on the shelf |
| The AI gamer approves boring games | Hasan's daily pick; weekly calibration against his picks and the numbers |
| Prompt injection from scraped pages | the scout is a separate task with no connectors and writes schema-checked data only |
| Playgama MCP changes | `get_launch_steps` drives the deployer; errors stop the deploy and go into the report |

---

## 14. Decisions

Decided by Hasan on 2026-10-20: no paid boost; one game a day; three demos a night, Hasan picks
one; the pick is deployed the same day.

Open, default in brackets:
- **D1 Top lists:** [Playgama catalog or leaderboard + YouTube Playables trending, refreshed
  weekly]
- **D2 Runtime and billing:** [cloud scheduled tasks on the subscription, usage credits off;
  Plan B only if a phase-0 or phase-3 check fails]
- **D3 No reply by 12:00:** [no deploy that day; the demos go to the shelf]
- **D4 Moderation:** [Hasan submits the analyst's shortlist, at most two a week]
- **D5 Share bonus:** [kept for the best games of the first month]
- **D6 Repository:** [private `kriptoloca/pebblit-factory`]
- **D7 Models:** [the most capable model everywhere in the pilot; then a lighter model for the
  scout, analyst and deployer if quality holds]
