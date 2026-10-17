# Peek & Find

Text-free hidden-object game for YouTube Playables, published through Playgama Bridge. Studio: Pebblit.

Design docs: [GDD.md](GDD.md) · [GENERATOR.md](GENERATOR.md) · [ASSETS.md](ASSETS.md) · [TASKS.md](TASKS.md) · rules for coding agents: [CLAUDE.md](CLAUDE.md).

## Commands

```
npm install
npm run dev      # prints the phone links for this machine, then Vite dev server on 0.0.0.0:5173
npm run check    # tsc + eslint + prettier
npm test         # vitest
npm run build    # tsc + vite build + dist audit (no external URLs, no compressed files)
npm run size     # dist/ total and 10 largest files vs the 8 MB target / 30 MB hard limit
npm run build:test  # production build + development-mode build in dist/test/ (dev shortcuts, debug hooks)
npm run e2e      # build:test, then Playwright against a local preview (tests/e2e: links, player path, audio, rules)
npm run tour     # screenshot tour of every screen in 9:16, 16:9, 1:1 → test-results/tour/sheet-*.png (visual review, not a gate)
E2E_BASE_URL=https://kriptoloca.github.io/peek-and-find/ npm run e2e:only   # the same suite on the live site
```

## Test links (GitHub Pages, published from `main` by `.github/workflows/pages.yml`)

| Link | What it is |
| --- | --- |
| https://kriptoloca.github.io/peek-and-find/ | production build, exactly what the submission ZIP will contain |
| https://kriptoloca.github.io/peek-and-find/test/ | development-mode build (`scripts/build-test.mjs`) with the dev shortcuts below |

Both run on the Bridge "mock" platform (the host is not YouTube): no real ads, saves in localStorage. Use the `/test/` link with these query strings:

| Test | Open |
| --- | --- |
| Fresh start, level 1 | `https://kriptoloca.github.io/peek-and-find/test/?reset=1` |
| Jump to a level | `https://kriptoloca.github.io/peek-and-find/test/?level=30` |
| Force a mode | `…/test/?level=12&mode=spot` (`find`, `odd`, `spot`) |
| Ad flows (fake ads, first interstitial after 3 scenes) | `https://kriptoloca.github.io/peek-and-find/test/?fakeads=1&adfast=1` |
| Daily chain | `https://kriptoloca.github.io/peek-and-find/test/?daily=1` |
| Daily on another date (streaks) | `…/test/?daily=1&today=20261017` |
| Audio diagnostics on the phone (state drawn in a corner; screenshot it) | `https://kriptoloca.github.io/peek-and-find/test/?audiodebug=1` |
| Generator preview | `https://kriptoloca.github.io/peek-and-find/test/#gen` |
| Dev menu | triple-tap the top-left corner in the `/test/` build |

Pages has to be switched on once by a repository admin: Settings → Pages → Build and deployment → Source: **GitHub Actions**. A private repository needs a paid GitHub plan for Pages; on a free plan make the repository public first (Settings → General → Danger Zone → Change visibility). Until then the `pages` workflow builds and skips the deployment with a warning. After enabling, push any commit or run the `pages` workflow by hand (Actions → pages → Run workflow); the links go live within a minute.

LAN alternative without Pages: `npm run dev` on the laptop prints ready-to-type phone links with this computer's own Wi-Fi address (for example `http://192.168.0.14:5173/?fakeads=1&adfast=1`; `npm run dev:url` prints them again). Phone and laptop must be on the same Wi-Fi, and the firewall must allow Node.js on private networks. The dev server runs in development mode, so every shortcut above works on it too.

## End-to-end checks (tests/e2e, Playwright)

`links.spec.ts` opens every link of the table above and requires: no page or console errors, only same-origin requests, the Bridge runtime served next to the page, something drawn, the expected screen or scene behind the query, and no debug hooks in the production build. `player.spec.ts` plays Title → PLAY → scene → next level, the fake-ad flow (interstitial after three scenes, rewarded hint, Continue), rotation 9:16 → 16:9 → 1:1 and the daily chain. `audio.spec.ts` checks silence before the first tap, music and SFX after PLAY with a real signal measured on the master bus, the music toggle and the platform pause. CI runs the suite against a local preview on every push and against the live Pages site after each deployment (`pages.yml` → `e2e-live`, screenshots as artifacts).

## Phone test (every epic)

1. Phone and laptop on the same Wi-Fi. `npm run dev`, note the LAN URL Vite prints.
2. Open it in Safari/Chrome on the phone. Rotate; the layout must re-flow without distortion.
3. Send 3 lines of feedback plus any console output.

Dev-only pages (not in production builds): `/#gen` generator preview (tap left/middle/right thirds for level −/+ and new seed), `/#layout` aspect-ratio placeholder.
