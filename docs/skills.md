# Skills in this project

Which of the enabled Claude skills (claude.ai Settings → Skills, plus the plugin skills of the
session) apply to Peek & Find, at which step, and which do not. Reviewed 2026-10-18 against the
list the session reports (`ListSkills`); the Canva skills shown in the Skills page need the Canva
connector, which is not connected, so they are listed under "when connected".

## Use at these steps

| Step | Skill | What it does here | Status |
| --- | --- | --- | --- |
| Phase end (every epic) | `code-review` (built-in) then the adversarial audit (`dusman-denetci` pattern: an independent subagent with the diff, GDD and CLAUDE.md rules; report with KRİTİK/YÜKSEK/ORTA/DÜŞÜK) | Correctness bugs first, then the fairness/platform-rule hunt; all KRİTİK and YÜKSEK closed before the push | in use (Epic 13: 0/1/1/10, all closed) |
| Phone test feedback (3-line reports, screenshots) | `product-management:synthesize-research` | Only when several reports pile up; a single 3-line report goes straight to `docs/questions.md` | when ≥ 3 reports |
| Store listing text | `design:ux-copy` | Review `docs/store/listing.md` for clarity, tone, 13+ rule; `tests/store.test.ts` keeps the structure | applied 2026-10-18 |
| Game design, feel and teardowns (new ideas, GDD changes, "it isn't fun", phone feedback about feel, competitors and leaderboards) | `pebblit-game-craft` (project skill, `.claude/skills/pebblit-game-craft/`) | Five pillars (Face, Feel, Flow, Fair, Share), Face and Feel scores added to the game-trend rubric, the feel audit with starting values, the leaderboard teardown template; learned 2026-10-18/19 from the Playgama AI leaderboard, Bus Fever Party! and Peek & Find's own gaps | in use from 2026-10-19 |
| Store thumbnails and icon | `npm run thumbnails` (`scripts/thumbnails.mjs`, Playwright + sharp) | Real generated scene, circled target, variants A/B, icon; layout check now, deliverable with the real art pack | in use |
| Logos: game icon + wordmark, studio profile mark | `canvas-design` | Design philosophy first (`docs/store/brand/philosophy.md`), then the marks as SVG rendered to PNG by `npm run brand`; original forms, OFL fonts, one accent per mark | applied 2026-10-18 |
| Visual pass after the real art lands; brand decisions | `design:design-critique`, `design:accessibility-review` | Second opinion on the tour sheets (`npm run tour`); contrast is already gated in the pipeline. Applied 2026-10-18 to the brand marks (`docs/store/brand/critique.md`: ground and signal colour decided) | applied / after the art pack |
| Market/positioning questions | `deep-research`, `product-management:competitive-brief` | Hidden-object titles on Playables, retention norms, listing wording; the 2026-10-17 visual research found no credible retention numbers, so run this only for a concrete decision | reserve |
| Submission day | `engineering:deploy-checklist` | Walk `docs/certification-checklist.md` and `docs/store/submission.md` once more before the upload | submission |
| Publishing and growth plan | `game-trend-skills:launching-on-zero-budget` (+ `tracking-game-metrics` after launch) | Verified terms, launch sequence, organic plan: `docs/store/launch-plan.md`; the Playgama MCP server (wiki.playgama.com/playgama/mcp) can run their game checklist when connected, submission stays manual | applied 2026-10-18 |
| Playgama console, QA tool, YouTube forms | `chrome-browser` / `built-in-browser` (needs Hasan's computer linked) | Claude drives the upload and the QA tool in Hasan's own browser session, Hasan approves each step | when linked |
| Post-launch (14 days, GDD §14) | `product-management:metrics-review` | Read the Playables numbers against the KPI targets | post-launch |
| Repeated project workflows | `skill-creator` | If a workflow repeats across sessions (asset drop-in, phone-test triage, release), package it as a project skill under `.claude/skills/` | when a workflow repeats |

## Not for this project

- `product-tracking-skills:*` (analytics instrumentation): the platform forbids external calls (CLAUDE.md rule 1), Bridge analytics is off, YouTube supplies the numbers.
- `dailydarksignal-pipeline`: Hasan's other project (YouTube Shorts pipeline).
- `docs`, `docx`, `pptx`, `xlsx`, `pdf`, `google-workspace`, `internal-comms`, `doc-coauthoring`: the project's documents live in the repo as Markdown; a store or pitch deck would be the only exception.
- `algorithmic-art`, `theme-factory`, `web-artifacts-builder`, `morning`, `learn`, `import-memory`, `mcp-builder`, `desktop-commander:*`, `finance:*`, `enterprise-search:*`, `productivity:*`: no step of this project needs them. (`algorithmic-art` could generate original theme backgrounds if the art pack ships without them; noted as a fallback in `assets/README.md` terms, not planned.)
