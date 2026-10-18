# Launch plan — Peek & Find (`launching-on-zero-budget`, 2026-10-18)

Hasan opened the Playgama developer account and a YouTube channel on 2026-10-18. The game is
code-complete with placeholder art and sound; the real art pack and CC0 sounds are pending.

## Verified terms (search summaries of 2026-10-18; the pages do not open from the build machine)

| Channel | What the sources say | Source |
| --- | --- | --- |
| Playgama (web portal + partner distribution) | Upload at developer.playgama.com ("Add Game"); required: title, engine, ZIP with index.html at the root (≤ 300 MB; another page: build ≤ 200 MB, ≤ 500 files), description, how to play, devices, languages, distribution. Feedback "within 24 hours" (their claim). Revenue share tiers quoted as 70 % / 80 % / 90 % net; "no exclusivity required" (their claim). Distribution to partner platforms incl. YouTube Playables, MSN, Discord, Facebook. | wiki.playgama.com/playgama/quick-start, /playgama/submitting-a-game; playgama.com/developers; playgama.com/blog business FAQs |
| YouTube Playables (direct) | Developer Portal is private preview / invitation-only; an interest form (Google's Playables support/contact page) is the official way to ask; access needs channel-manager permission on an onboarded YouTube channel; save ≤ 3 MiB; peak JS heap < 512 MB. No published selection criteria or timeline. | developers.google.com/youtube/gaming/playables (developer_portal, support/contact); playables.in guides and portalready.world (third-party) |
| Playgama MCP | A Playgama MCP server exists for agents (game checklist, catalog); submitting a game is still done by a human in the cabinet. | wiki.playgama.com/playgama/mcp |

Lock-in check: Playgama's pages say non-exclusive; keep it so (choose the non-exclusive
distribution option, read the agreement text before accepting).

## Playgama Sandbox (live 2026-10-18)

The form was filled on 2026-10-18 and the game went live in the Playgama Sandbox: a public
link anyone can open, no moderation yet. The dashboard shows two targets before evaluation:
**100 plays** and **5:00 average play time**. What the sources add (Playgama's MCP README,
github.com/Playgama/developer-cabinet-mcp, read 2026-10-18; a developer's itch.io devlog for the
play rule):

- A play counts when the session loads and lasts over 30 s (the devlog, third-party; not on a
  Playgama page we could open). The same devlog saw about 9 sessions in 10 end before that.
- "Get More Players" starts a Playgama DSP campaign built from the three covers (beta). The
  **share bonus** makes one run free: publish a post about the game on any platform, paste its
  link (1–3 links); once per game, up to three games per organization. A run cannot be cancelled
  once started; a failed run returns the bonus. Paid traffic is also offered: not bought (spend
  rules below).
- The referral bonus ($3 of traffic) needed an invitation accepted before the first sandbox
  publication; that window has passed for this game. Hasan's own invitation link can still earn
  $3 when another studio publishes.
- Submitting to moderation stays a human action in the console.
- Sandbox republishing: up to 15 publications per rolling hour per game.

QA tool (console menu "QA tool", 2026-10-18): it asks for a game URL; give it the production GitHub Pages build `https://kriptoloca.github.io/peek-and-find/` (same game code as the uploaded ZIP; not `/test/`, which carries the dev hooks). In the tool: Play, a hint (rewarded), three wrong taps then Continue (rewarded), three scenes past 120 s (interstitial), a tab switch (pause).

Order: test the sandbox link on a phone and a desktop (load, sound, pause menu, a reload keeps
the level), run the console's QA tool, then the share post and the free run, then friends and
the channel. A 5-minute average needs about 20 scenes per player; the first scenes are the
lever if the average stalls (decide from the dashboard, not before).

## Sequence

1. **Done 2026-10-18 (sandbox live):** Add Game on developer.playgama.com with the fields in
   `docs/store/listing.md` ("Facts for the console"), the ZIP from `npm run zip`, the icon and
   banner from `docs/store/brand/`, the screenshots from `npm run screenshots`. Distribution:
   all platforms, non-exclusive. Orientation: both.
2. **Within a day:** Playgama's feedback → fixes → new ZIP → re-upload. Rows 10 and 11 of the
   certification checklist close here.
3. **In parallel:** the YouTube Playables interest form with the Pebblit channel; set the
   channel's profile photo (`pebblit-profile-1024.png`) and banner (`pebblit-banner-2048x1152.png`).
4. **Before or during review:** the real art pack and the CC0 sounds (`assets/README.md`),
   then `npm run assets`, `npm run audio`, `npm run thumbnails`, `npm run screenshots`,
   `npm run zip` again.
5. **After the first week live:** read Playgama's numbers with `tracking-game-metrics`
   (sessions, D1, scenes per session, ads per session); decide on tuning from there.

## Organic engine (no spend)

- **Cadence:** one Short / Reel / TikTok every other day from the channel, cut from real
  play captures (the `npm run tour` flows give the shots; a phone screen recording is enough).
- **Three hooks:** (1) "Find the one that moved" — a shuffle scene, the board slides, the ring
  lands; payoff in the first second. (2) "Spot the fifth one" — four differences ringed, the
  fifth found at the end. (3) "Level 1 vs level 80" — the same tap, two densities.
- **In-game sharing:** none in v1 (platform rule: no off-platform links); the daily chain's
  streak is the return hook instead.

## Monetization placements (already built)

Interstitial only after ≥ 3 scenes and ≥ 120 s (none in the first scenes); rewarded ads for
Hint and Continue only; no IAP, no banners (CLAUDE.md rules 6 and 9).

## Spend rules

Nothing on ads. Money only for the art pack if a commissioned set beats the CC0 options, and
only after Playgama's first feedback confirms the build passes.
