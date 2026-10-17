# Playgama Bridge integration notes

Source of truth read on 2026-10-16: the SDK repository `github.com/Playgama/bridge` at version **2.3.1** (npm `@playgama/bridge@2.3.1`). `wiki.playgama.com` was not reachable from the cloud session; every name below was taken from the source files quoted in brackets.

## How the SDK is loaded
- npm package `@playgama/bridge`, pinned `2.3.1`. The runtime is `dist/playgama-bridge.js` (≈ 300 KB UMD, all platform adapters inlined, sets `window.bridge`). The ESM entry is only a typed proxy to `window.bridge` plus constants.
- Vite plugin `@playgama/bridge/vite` with `{ mode: 'local' }` [vite/index.cjs]: injects `<script src="./playgama-bridge.js">` into `index.html` (head-prepend), serves the file in dev and emits it into `dist/` on build. No CDN tag is produced in local mode, so CLAUDE.md rule 1 holds.
- Config file `playgama-bridge-config.json` next to `index.html` (we keep it in `public/`). The SDK fetches it with a same-origin relative `fetch('./playgama-bridge-config.json')` [lib/bridge-config/BridgeConfig.ts]. Our config: `platforms.youtube: {}`, `advertisement.minimumDelayBetweenInterstitial: 120`, `advertisement.useAdvertisementErrorPopup: false` (otherwise the SDK shows its own "ad failed" popup; we only read the `failed` state).
- `bridge.initialize()` [PlaygamaBridge.ts]: loads config → detects platform → creates the platform bridge → initialises modules → resolves. Platform detection: YouTube when `location.hostname` includes `usercontent.goog` [platformDetectors.ts]; anything unknown falls back to `PLATFORM_ID.MOCK`, which uses `PlatformBridgeBase` (ads unsupported, storage → localStorage) [platformImports.ts].
- `?debug=true` (constant `DEBUG_QUERY_PARAM`) enables SDK logging [lib/logger/constants.ts].

## Constants and events used
`import bridge, { EVENT_NAME, PLATFORM_MESSAGE, INTERSTITIAL_STATE, REWARDED_STATE } from '@playgama/bridge'`
- `EVENT_NAME.PAUSE_STATE_CHANGED` → `(isPaused: boolean)`; `EVENT_NAME.AUDIO_STATE_CHANGED` → `(isEnabled: boolean)`; `EVENT_NAME.VISIBILITY_STATE_CHANGED` → `'visible' | 'hidden'`; `EVENT_NAME.INTERSTITIAL_STATE_CHANGED` → `'loading' | 'opened' | 'closed' | 'failed'`; `EVENT_NAME.REWARDED_STATE_CHANGED` → `'loading' | 'opened' | 'rewarded' | 'closed' | 'failed'` [constants/eventName.ts, modules/advertisement/constants.ts].
- Subscription: `bridge.on(eventName, cb)` / `bridge.off(eventName, cb)` (the root is an EventEmitter; module events are forwarded to the global bus) [PlaygamaBridge.ts, modules/ModuleBase.ts].
- The pause state aggregates platform pause, hidden visibility and open ads: while an interstitial or rewarded ad is open the SDK reports paused [platform-bridges/PlatformBridgeBase.ts `_pauseStateAggregator`].

## Platform module
- `bridge.platform.id`, `.language`, `.isAudioEnabled`, `.isPaused` [modules/platform/PlatformModule.ts].
- `bridge.platform.sendMessage(PLATFORM_MESSAGE.X)` with `GAME_READY`, `IN_GAME_LOADING_STARTED/STOPPED`, `GAMEPLAY_STARTED/STOPPED`, `LEVEL_STARTED/COMPLETED/FAILED` [modules/platform/constants.ts]. On YouTube `GAME_READY` calls `ytgame.game.gameReady()`; `firstFrameReady()` is called by the SDK itself at the end of its own initialisation [platform-bridges/YoutubePlatformBridge.ts].
- `bridge.setGameLoadingProgress(percent)` drives the SDK loading screen.

## Advertisement module
- `bridge.advertisement.isInterstitialSupported`, `.isRewardedSupported` (both `true` on YouTube, `false` on the mock platform).
- `bridge.advertisement.setMinimumDelayBetweenInterstitial(seconds)` (default 60; we set 120, and our own `AdGate` also requires 3 completed scenes).
- `bridge.advertisement.showInterstitial()`; `showRewarded(placement?)`; results arrive through the state events above. YouTube maps them to `ytgame.ads.requestInterstitialAd()` and `ytgame.ads.requestRewardedAd(placement)`; a resolved rewarded promise with `true` yields `REWARDED` then `CLOSED`, a rejection yields `FAILED`.
- Placements we use: `hint`, `continue`.

## Storage module
- `bridge.storage.get(key, tryParseJson)` and `bridge.storage.set(key, value)` [modules/storage/StorageModule.ts]. We pass `tryParseJson = false` and store the save as a JSON string under one key, which the YouTube adapter folds into `ytgame.game.saveData` / `loadData` [YoutubePlatformBridge.ts]. On the mock platform the module writes localStorage itself. Calls before `initialize()` throw `SDK_NOT_INITIALIZED`, so BootScene initialises the bridge first.

## Our wrapper (`src/platform/bridge.ts`)
- `initPlatform()` resolves to a `Platform` object: `platformId`, `interstitialSupported`, `rewardedSupported`, `showInterstitial()`, `showRewarded(placement)`, `sendMessage(name)`, `storage` (a `StorageBackend`), `isAudioEnabled()`, `onPause(cb)`, `onAudio(cb)`. If `window.bridge` is missing or `initialize()` fails or exceeds 6 s, it resolves to a stub with the same shape (ads unsupported, localStorage) — the game is always playable.
- Dev builds: `?fakeads=1` makes the stub simulate ads (1.5 s overlay, rewarded always earned) so the hint/continue/interstitial flows can be tested without a platform.

## Still to verify on the real platform (Epic 11)
- ~~Whether YouTube certification wants `disableLoadingLogo: true`~~ Decided 2026-10-17: off; the game draws its own boot screen (docs/questions.md, Epic 9d). Revisit only if Playgama requires the logo.
- Behaviour of `useAdvertisementErrorPopup: false` on YouTube when an ad fails.
- The Playgama QA tool platform (`PLATFORM_ID.QA_TOOL`) is selected by the tool itself; our build needs no special handling.
