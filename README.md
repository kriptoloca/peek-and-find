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

## Phone test (every epic)

1. Phone and laptop on the same Wi-Fi. `npm run dev`, note the LAN URL Vite prints.
2. Open it in Safari/Chrome on the phone. Rotate; the layout must re-flow without distortion.
3. Send 3 lines of feedback plus any console output.

Dev-only pages (not in production builds): `/#gen` generator preview (tap left/middle/right thirds for level −/+ and new seed), `/#layout` aspect-ratio placeholder.
