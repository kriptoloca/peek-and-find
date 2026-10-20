# Launch plan — Pebblit games on zero budget (2026-10-20, `launching-on-zero-budget`)

Scope: one launch path for the studio's games: Peek & Find (live in the Playgama sandbox since
2026-10-18), Munch Pixels (Epics 4–6 left) and Shy Ghosts (GO today,
`reports/2026-10-20-eval-shy-ghosts.md`). The channels and terms are shared, so each game enters
the same sequence when it is ready. Profile: solo, budget 0, no paid traffic or boosts (Hasan,
2026-10-20), Phaser + Playgama Bridge 2.3.1, resident in Türkiye (`game-trend-profile.md`).
Terms come from live search on 2026-10-20. Store and portal pages do not open from the build
machine, so every line is a search summary (page not opened) unless it says otherwise.

## 1. Verdict

**Stay web-first and non-exclusive.** Playgama is the base and the gate; CrazyGames is the free
second front, only for games that already pass Playgama's targets; YouTube Playables comes
through Playgama's selection; every other channel waits. Two things decide the money more than
any channel: the 5:00 average play time (no channel takes a game below it) and a payout path that
works from Türkiye (PayPal has no service there, and Wise no longer gives Türkiye addresses lira
receiving details). Both are settled before the first 100 USD.

## 2. Verified terms

| Channel | Terms that matter | For us now | Source (date) |
| --- | --- | --- | --- |
| Playgama | 70 % of net revenue up to 1,000 USD a month, 80 % to 3,000, 90 % above; one Playgama post says a fixed 50 % for plays on playgama.com itself; non-exclusive; payouts from 100 USD by PayPal, Wise, crypto or bank transfer; sandbox → 100 plays and 5:00 → review → manual moderation (3–5 business days) → catalog and partner sites, some of which ask for a ≥ 5 or ≥ 10 min average | base channel; Peek & Find live | Playgama blog and developer page via search, Oct 2026; our dashboard, 2026-10-18 |
| CrazyGames | Basic Launch: 2 weeks with a limited audience, SDK not required, no monetization; Full Launch only when average play time, conversion to gameplay and retention beat the platform's benchmarks, then full QA and revenue share; the split is not published (third-party figures conflict, 60–70 % on ads); payout monthly via Tipalti from 100 EUR (third-party); non-exclusive; games published elsewhere are accepted if you hold the rights | second front, one shot per game | docs.crazygames.com overview and FAQ via search, Oct 2026; cinevva guide, 2026 |
| Poki | 100 % when the developer brings the player, 50 % when Poki does; web-exclusive by default for 5 years (an older version of the page says 7); YouTube Playables and Discord count as web; the non-exclusive deal is a one-time flat fee without revenue share | no: it conflicts with Playables and Playgama | sdk.poki.com/deals via search, Oct 2026 |
| GameDistribution | 33 % of net revenue, 100 EUR threshold, non-exclusive | not now: low share; first ask whether Playgama's catalog already reaches it | Playgama blog citing the GameDistribution agreement (a competitor's source), Oct 2026 |
| Yandex Games | 50 M+ monthly players; developers' in-app revenue +75 % in 2025; share and payout terms for non-Russian developers not found | not verified; later | wnhub.io, 2026 |
| YouTube Playables | ads only (pre-roll, interstitial, rewarded), revenue sharing piloted with selected creators; no in-app purchases (report of 29 Sep 2026; tests reported for 2027); through Playgama: Playgama picks its best performers, developer 75 % / Playgama 25 %, HTML5 under 30 MB, portrait, Bridge, no external calls, original games | our interest form of 2026-10-18 (invitation only); Playgama's path needs a top performer | Google's Playables monetization page; shattered.io; Playgama blog via search, Oct 2026 |
| TikTok Minis | business verification is mandatory (company registration, ID, proof of representation), then an industry qualification review; no path for individuals found | no: needs a company | TikTok for Developers docs (updated 4 Aug 2026) via search |
| Google Play | 25 USD once; ID and a credit card in the legal name, no prepaid cards; personal accounts need a closed test with ≥ 12 testers for 14 continuous days before production (third-party, 2026; organization accounts exempt per one source); the account type cannot be changed later | later: the day 60–90 decision | Play Console Help via search; testerscommunity.com, extendsclass.com, 2026 |
| Apple App Store | 99 USD a year; no current lira price found (a 2019 post: 679 TL with VAT) | no | search summaries; donanimhaber, 2019 |
| Ads on our own site | Google H5 Games Ads is a closed beta with eligibility criteria | no: the hub page links out instead | Google developers page (updated 2025-07-24) via search |
| Publishers | Playgama opens publishing for web games with strong retention in H2 2026; mobile publishers test CPI and D1 (Homa ≈ 10 min of core play, Kwalee ≈ 15 min, Supersonic D1 ≥ 38 % on Android); nothing found on HTML5 builds | Playgama publishing once a game is in the catalog; mobile later | Playgama blog; Homa, Kwalee, Supersonic pages via search, dates vary |
| Payout from Türkiye | PayPal: no service in Türkiye since 6 June 2016; Wise: lira account details withdrawn for Türkiye addresses on 31 March 2023 (USD or EUR receiving not confirmed); Payoneer: available in Türkiye per 2022 forum posts (anecdotal) | ask Playgama (bank transfer to a USD account, or crypto) | paypal.com/tr; Diken; Wise help; itch.io forum, 2022 |
| Tax | GVK mükerrer 20/B: individuals only; mobile app developers since 1 Jan 2022, internet content since 1 Jan 2024; banks withhold 15 %; the 2026 ceiling is ≈ 5.3 M TL (a blog's estimate); web games are not named | accountant question before the first payout (D16) | vergimerkezi, muhasebetr, fatiharas via search, 2026 |

**Engine fit (checked in our code, not a search):** the pinned Playgama Bridge 2.3.1 has
platform ids for Playgama, CrazyGames, GameDistribution, Yandex, Poki, YouTube, TikTok,
Telegram, Discord, MSN, Y8, Lagged and 15 more
(`node_modules/@playgama/bridge/dist/constants.esm.mjs`, 2026-10-20). A new channel is a config
and a QA pass, not a port.

**Lock-in flags, before anyone signs:**

- Poki's default deal is web exclusivity for years and counts YouTube Playables as web: no.
- CrazyGames' Basic Launch decides Full Launch; if most metrics fall short, the game cannot
  proceed. Only games that already pass Playgama's targets go there.
- Google Play's account type is permanent: decide personal or company once, with the accountant.
- Playgama's Playables publishing keeps 25 %; whether it is exclusive is unknown (ask).

## 3. Sequence

**Rule:** every free play goes to the one counter that unlocks the next gate, the game's
Playgama sandbox page. No copies on other sites until a game is in the catalog.

| When | Step | Who | Gate to the next step |
| --- | --- | --- | --- |
| this week | Update Game to Peek & Find 0.1.4 | Hasan | 0.1.4 live |
| this week | One e-mail to Playgama support (appendix): D13's questions plus the launch questions | Hasan sends | answers |
| this week | Accounts: TikTok as a Business account (bio link from day one; a personal account needs 1,000 followers; the cost is the full music library, which our own sounds don't need), Instagram for Reels, the YouTube channel's profile links; a CrazyGames developer account (free), no submission yet | Hasan, ≈ 30 min | done |
| this week | Hub page in a separate public repository with GitHub Pages (free for public repositories): the games, game of the week on top, links to their Playgama pages | Claude builds; Hasan approves the new repository | its URL in every bio |
| 2026-10-24 | Peek & Find metrics (≥ 300 plays, launches by source); its share bonus once 0.1.4 is live, with the first public post | Hasan + Claude | `tracking-game-metrics` verdict |
| ≈ 2026-10-30 (estimate) | Munch Pixels Epics 4–6 → sandbox; its share bonus with its first clip | Claude; Hasan uploads | 100 plays, 5:00 |
| ≈ 2026-11-06 (estimate) | Shy Ghosts brief → build → sandbox | Claude; Hasan uploads | 100 plays, 5:00 |
| when a game passes | submit for review → catalog; then that game's CrazyGames Basic Launch; Playgama publishing and Playables asked by e-mail | Hasan | catalog; CrazyGames' verdict |
| ≈ 2026-11-20 (estimate) | winter reskin of the best performer into the sandbox (moderation alone takes 3–5 business days) | Claude | live before December |
| 2026-12-19 to 2027-01-18 | mobile decision, only if a game is in the catalog at ≥ 5:00 with returning players: then a Google Play personal account (25 USD) and 12+ testers from our followers | Hasan | 14-day closed test |

Not in the sequence: Poki (exclusive), TikTok Minis (needs a company), the App Store (yearly fee,
no iOS build), GameDistribution and Yandex until Playgama says whether its catalog already
reaches them. Halloween (31 Oct) is too close for a catalog game; Shy Ghosts is evergreen and
does not chase it.

## 4. Organic plan

- **Cadence:** one 10–15 s vertical clip every weekday, the same MP4 to YouTube Shorts, TikTok
  and Reels (Hasan, about 10 min a day; nothing on YouTube is automated). Until the factory's
  frame-stepped renderer exists, a phone screen recording of the dev build. One community post a
  week where self-promotion is allowed (an itch.io devlog, a subreddit whose rules permit it);
  each share bonus needs one public post.
- **Links:** Shorts descriptions and comments are not clickable (since 31 Aug 2023,
  third-party sources), so the path is the YouTube channel's profile links, the TikTok Business
  bio link and the Instagram bio link, all to the hub page.
- **Listing basics (Playgama):** an icon with the character readable at 128 px, a first
  screenshot that shows the payoff, the genre words in the title or first line ("color sort",
  "logic puzzle", "hidden object"), a clip wherever the listing takes one.
- **Three hooks** (movement in the first second, payoff first, then the process):
  1. *Munch Pixels: "What was under the snack?"* Open on the face revealed by the last bites,
     cut back to the full snack, let the munchers eat it, end on the face again so the clip
     loops.
  2. *Shy Ghosts: "Every ghost wants to be alone."* Open on the lights-on cascade, cut back to
     the empty house; a ghost placed in sight of another shivers and hides its face; the last
     placement lights the house.
  3. *"About 1 % of random players beat this level."* Munch Pixels level 70 (random-player win
     rate ≈ 1 %, `levels.json` metrics, 2026-10-19) played to a win; text: "Can you?". The
     number is true for random play, not for people, so the text says "random players".
- **Creative bank:** every clip is kept with its views and follows; the best one becomes the
  listing video.

## 5. Monetization placements

| Game | Interstitial | Rewarded |
| --- | --- | --- |
| all | between levels only: ≥ 3 levels and ≥ 120 s since the last one, none in the first minute or after a loss; Bridge `setMinimumDelayBetweenInterstitial(120)` as a second guard; never banners, in-app purchases (Playables has none) or a countdown | only when the player asks |
| Peek & Find | between scenes | hint, continue |
| Munch Pixels | between levels | +1 slot, undo |
| Shy Ghosts | between houses, never before or inside the daily | hint (shows one forced cell); a streak save that still works when the ad fails (Meowdoku's broken streak video was a top complaint) |

Ads per play by format come from the Playgama dashboard (Peek & Find: 0.91, 2026-10-20) and feed
`tracking-game-metrics`.

## 6. Spend rules

- Ads and traffic boosts: zero (Hasan, 2026-10-20).
- Before a game proves retention, money only for what saves build time (the art pack, after
  Playgama's first feedback).
- 25 USD for Google Play only at the mobile decision, and only for a catalog game.
- GitHub Pro (D12) only for the factory's protected branch; the hub page is free in a public
  repository.
- No company before revenue justifies it: TikTok Minis and a Play organization account need one,
  and GVK 20/B covers individuals only (accountant, D16).

## 7. Open items carried forward

- D13 e-mail (appendix), D14 share bonuses (Peek & Find, Munch Pixels, one factory game), D16
  payout and tax: PayPal is now confirmed out, so the payout question goes to Playgama first.
- Confirm on the live pages when a browser can open them: CrazyGames' split, Poki's term (5 or 7
  years), the tester rule in the Play Console.
- Next: `tracking-game-metrics` for Peek & Find on 2026-10-24; `writing-game-agent-briefs` for
  Shy Ghosts.

## Appendix: e-mail to Playgama developer support (draft for Hasan)

> **Subject:** Developer questions from Pebblit Games (payouts from Türkiye, catalog, Playables)
>
> Hi Playgama team,
>
> We're Pebblit Games (developer account since 18 Oct 2026; Peek & Find is in the sandbox).
> Before we release more games, could you help with a few questions?
>
> 1. Payouts: we are based in Türkiye, where PayPal does not operate. Which payout methods work for a
>    developer resident in Türkiye: a bank transfer to a USD account at a Turkish bank, Wise or
>    crypto? Are there fees beyond the 100 USD minimum?
> 2. Revenue share: does the 70/80/90 % tier also apply to plays on playgama.com, or is there a
>    different share for those plays?
> 3. Catalog: after moderation, which partner sites does the catalog reach (for example
>    CrazyGames, GameDistribution, Yandex Games)? We don't want to list a game twice on a site
>    you already cover.
> 4. YouTube Playables: how do you choose games for Playables, and is that deal exclusive in any
>    way?
> 5. Volume: we build small games with AI help and may put up to one game a day into the
>    sandbox. Is that acceptable, and do unsubmitted sandbox games or a refused submission
>    affect our organization?
> 6. Do the account owner's own plays count toward the 100 sandbox plays?
> 7. Our games use Bridge ads (interstitial and rewarded). Does anything change for them once a
>    game is in the catalog?
>
> Thank you,
> Pebblit Games

## Sources (search summaries, 2026-10-20, pages not opened)

- Playgama: [revenue share comparison](https://playgama.com/blog/business-faqs/poki-vs-crazygames-vs-gamedistribution-revenue-share/), [payment thresholds](https://playgama.com/blog/business-faqs/what-are-typical-payment-thresholds-for-game/), [developers](https://playgama.com/developers)
- CrazyGames: [docs](https://docs.crazygames.com), [FAQ](https://docs.crazygames.com/faq/), [cinevva guide](https://app.cinevva.com/guides/publish-game-crazygames)
- Poki: [deals](https://sdk.poki.com/deals)
- Yandex Games: [wnhub](https://wnhub.io/news/monetization/item-47819)
- YouTube Playables: [monetization](https://developers.google.com/youtube/gaming/playables/reference/monetization), [shattered.io](https://shattered.io/youtube-playables-50-markets-zero-iap-2026/)
- TikTok Minis: [verify your business](https://developers.tiktok.com/docs/en/verify-your-business), [integration workflow](https://developers.tiktok.com/docs/en/tiktok-minis-integration-workflow)
- Google Play: [Play Console Help](https://support.google.com/googleplay/android-developer/answer/6112435), [12-tester rule](https://www.testerscommunity.com/blog/google-play-closed-testing-requirements-2026), [extendsclass](https://extendsclass.com/blog/google-plays-closed-testing-requirement-what-developers-need-to-know-in-2026)
- Apple: [donanimhaber](https://www.donanimhaber.com/Apple-Turkiyede-gelistirici-hesaplarinin-fiyatini-uce-katladi--103278)
- H5 Games Ads: [beta](https://developers.google.cn/ad-placement/docs/beta?hl=fa)
- Publishers: [Homa](https://support.homagames.com/knowledge/prototyping-for-hyper-casual), [Kwalee](https://www.kwalee.com/blog/how-get-your-game-published-kwalee-guide), [Supersonic](https://is.com/community/academy/hyper-casual/how-to-run-marketability-tests-for-your-prototypes)
- Payouts: [PayPal Türkiye](https://www.paypal.com/tr), [Diken](https://www.diken.com.tr/?p=295227), [Wise TRY details](https://www.wise.com/help/articles/2978080/how-do-i-receive-money-with-my-try-account-details), [itch.io forum](https://itch.io/post/5470870)
- Tax: [vergimerkezi](https://vergimerkezi.com.tr/?p=4673), [muhasebetr](https://www.muhasebetr.com/yazarlarimiz/firatinsel/091/), [fatiharas](https://www.fatiharas.com/gvk-mukerrer-madde-20-b-sosyal-icerik-ureticiligi-istisnasi/)
- Social: [TikTok bio link](https://www.outfy.com/blog/how-to-add-a-link-to-your-tiktok-bio/), [Shorts links](https://lindseygamble.com/blog/youtubes-link-changes-what-it-means-for-creators)
