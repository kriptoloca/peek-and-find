# Peek & Find

Text-free hidden-object game for YouTube Playables, published through Playgama Bridge. Studio: Pebblit.

Design docs: [GDD.md](GDD.md) · [GENERATOR.md](GENERATOR.md) · [ASSETS.md](ASSETS.md) · [TASKS.md](TASKS.md) · rules for coding agents: [CLAUDE.md](CLAUDE.md).

## Commands

```
npm install
npm run dev      # Vite dev server on 0.0.0.0:5173 (open http://<your-lan-ip>:5173 on the phone)
npm run check    # tsc + eslint + prettier
npm test         # vitest
npm run build    # tsc + vite build + dist audit (no external URLs, no compressed files)
npm run size     # dist/ total and 10 largest files vs the 8 MB target / 30 MB hard limit
```

## Test links (GitHub Pages, published from `main` by `.github/workflows/pages.yml`)

| Link | What it is |
| --- | --- |
| https://kriptoloca.github.io/peek-and-find/ | production build, exactly what the submission ZIP will contain |
| https://kriptoloca.github.io/peek-and-find/test/ | development-mode build with the dev shortcuts below |

Both run on the Bridge "mock" platform (the host is not YouTube): no real ads, saves in localStorage. Use the `/test/` link with these query strings:

| Test | Open |
| --- | --- |
| Fresh start, level 1 | `https://kriptoloca.github.io/peek-and-find/test/?reset=1` |
| Jump to a level | `https://kriptoloca.github.io/peek-and-find/test/?level=30` |
| Force a mode | `…/test/?level=12&mode=spot` (`find`, `odd`, `spot`) |
| Ad flows (fake ads, first interstitial after 3 scenes) | `https://kriptoloca.github.io/peek-and-find/test/?fakeads=1&adfast=1` |
| Daily chain | `https://kriptoloca.github.io/peek-and-find/test/?daily=1` |
| Daily on another date (streaks) | `…/test/?daily=1&today=20261017` |
| Generator preview | `https://kriptoloca.github.io/peek-and-find/test/#gen` |
| Dev menu | triple-tap the top-left corner in the `/test/` build |

Pages must be enabled for the repository (Settings → Pages → Source: GitHub Actions). A private repository needs a paid GitHub plan for Pages; otherwise make the repository public.

## Phone test (every epic)

1. Phone and laptop on the same Wi-Fi. `npm run dev`, note the LAN URL Vite prints.
2. Open it in Safari/Chrome on the phone. Rotate; the layout must re-flow without distortion.
3. Send 3 lines of feedback plus any console output.

Dev-only pages (not in production builds): `/#gen` generator preview (tap left/middle/right thirds for level −/+ and new seed), `/#layout` aspect-ratio placeholder.
