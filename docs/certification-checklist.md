# Certification checklist (YouTube Playables via Playgama Bridge)

Status per rule with the evidence that backs it. "auto" = checked on every push by CI and on the
live Pages site after each deployment (`tests/e2e`, `scripts/audit-dist.mjs`, unit tests).
"device" = needs a phone or the Playgama QA tool, which needs the Playgama developer account.

| # | Rule (CLAUDE.md) | Status | Evidence |
| --- | --- | --- | --- |
| 1 | No external network calls | auto | `links.spec` requires every request on the live site to be same-origin; `audit-dist` fails the build on any external URL outside the Bridge runtime; Bridge analytics off (`sendAnalyticsEvents: false`) and the YouTube adapter reports `isPlatformExternalCallsSupported = false`; ESLint forbids fetch/XHR/WebSocket/beacon in `src/`; no `window.open`, no anchors |
| 2 | Size: initial load ≤ 8 MB target, ≤ 30 MB hard, no file > 30 MB, no compression (YouTube page: initial < 15 MB, target 5; total < 250 MB; files < 512 KB recommended) | auto | `docs/size-report.md`: initial load 2.24 MB (OGG) / 2.26 MB (M4A), largest file 1.22 MB; `npm run size` fails above the limits; audit rejects .gz/.br/.zip; `npm run zip` re-checks the package (docs/store/submission.md) |
| 3 | GameReady only when the player can interact | auto | Boot awaits UI atlas, first theme, backgrounds and audio before starting the Title; Title sends `in_game_loading_stopped` then `game_ready` once; `links.spec` reads the sent messages and requires `game_ready` exactly once, last, after `in_game_loading_started/stopped` |
| 4 | Pause: tweens, timers, audio, input stop; dim overlay; resume restores. Mute: platform wins | auto + device | `GameScene.setPaused` (tweens/timers/input/haptics), `audio.setPaused`; `audio.spec` "platform pause silences the music, resume restores it"; `player.spec` fake-ad pause blocks taps; platform mute precedence in `audio.ts` (`isAudioEnabled` / `onAudio`). Device: the Bridge test harness pause/mute buttons on a phone |
| 5 | Aspect ratios 9:16, 1:1, 16:9 | auto + device | `layout.test.ts` (pure layout), `player.spec` rotation 9:16 → 16:9 → 1:1 with HUD outside the images, screenshots as CI artifacts; `setGameSize` on resize. Device: rotation on the phone (first test OK on 2026-10-16) |
| 6 | Ads: interstitial only after ≥ 3 scenes AND ≥ 120 s, no countdown, Bridge min delay 120, rewarded only Hint/Continue, support checks, playable without ads | auto | `ads.test.ts` (AdGate), `player.spec` fake-ads flow, config `minimumDelayBetweenInterstitial: 120`, `rewardedSupported` gates the hint bulb and Continue; mock platform (no ads) plays through every e2e test |
| 7 | Saves through Bridge storage, never throw, versioned | auto | `storage.test.ts` (migrate, failures), save via `bridge.storage` (docs/bridge-notes.md), `player.spec` reload keeps the level, daily streak persisted |
| 8 | Content: no text in gameplay, no brands, 13+ look | review | HUD shows numbers and icons only; the only text is the wordmark and PLAY/DAILY; placeholder art and sound are generated in-repo (no third-party material yet). Visual review 2026-10-17 (`docs/visual-review.md`, `npm run tour`): one font, one icon set, fixed HUD, theme-tinted frame, every object ≥ 3:1 against its background (pipeline gate). Re-review when the real pack is in; store text rule applies in Epic 12 |
| 9 | No timers before interstitials, no banners, no IAP, no off-platform links | auto | `grep` for `window.open`/anchors is empty; no banner or IAP code paths; the interstitial starts immediately when the gate allows |
| 10 | Playgama QA tool: all checks pass | device | needs the Playgama developer account (Hasan's step); upload `release/peek-and-find-<version>.zip` from `npm run zip` (docs/store/submission.md) |
| 11 | 10 consecutive scenes on iPhone 11 at level 80 without frame drops | device | `https://kriptoloca.github.io/peek-and-find/test/?level=80`; `__peekDebug.state().fps` in the dev build |
| 12 | Bridge lifecycle messages | auto | `in_game_loading_started/stopped` around boot and each scene generation, `gameplay_started/stopped`, `level_started/completed/failed` (docs/bridge-notes.md); e2e reads the sent list |

Open items before submission: 10 and 11 (device), 8 (re-review with real art), the music loop
(`docs/audio-review.md`).
