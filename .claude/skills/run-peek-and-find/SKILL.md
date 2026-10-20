---
name: run-peek-and-find
description: Build, run and drive Peek & Find, the Phaser hidden-object game, in headless Chromium. Use when asked to start or run Peek & Find, play or win a level, jump to a level or mode, take a screenshot of the game, check the title, a scene, the menu, hearts or pause, reproduce a bug in the running game, or run its unit and e2e tests.
---

Peek & Find is a Phaser 3 canvas game (Vite, TypeScript). An agent runs the Vite dev server and
drives the game with the Playwright REPL `.claude/skills/run-peek-and-find/driver.mjs`. The game
draws everything on one `<canvas>`, so the driver never clicks selectors: it taps the screen
positions that the development build's hooks report (`window.__peekTitle` on the title,
`window.__peekDebug` in a scene). `chromium-cli` is not installed in this environment.

All paths are relative to the repository root (`peek-and-find/`).

## Prerequisites

Node 22 and npm; Playwright's Chromium (revision 1194, the one `@playwright/test` 1.56.1 wants)
is preinstalled under `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`. Never run
`npx playwright install`.

```bash
node -v        # v22.22.0
npm ci
```

## Run (agent path)

Start the dev server (port 5173, development mode, so the hooks exist) and wait for it:

```bash
(nohup npm run dev > /tmp/peek-dev.log 2>&1 &) ; timeout 60 bash -c 'until curl --noproxy "*" -sf http://127.0.0.1:5173/ >/dev/null; do sleep 0.5; done' && echo SERVER_UP
```

Run the representative flow (fresh save, title, play, win level 1, wait for level 2) and check
the screenshots it writes to `/tmp/shots/` (override with `SCREENSHOT_DIR`):

```bash
timeout 240 node .claude/skills/run-peek-and-find/driver.mjs <<'EOF'
smoke
targets
wrong
menu
ss 05-menu
quit
EOF
```

It prints one line per command, `ok …` or `ERROR …`, then `driver>`. Expect
`ok won level=1 …`, `ok next level=2 …`, `ok no console errors or page errors`, hearts dropping
from 3 to 2 after `wrong`, and `menuOpen=true` after `menu`. Look at the PNGs: `01-title.png`
(Play, Daily, sound, music), `02-scene.png` (the prompt icon at the top, objects on the board),
`03-won.png`, `04-next-scene.png`, `05-menu.png`.

| command | what it does |
| --- | --- |
| `open [query]` | launch Chromium (390×844) once, go to `PEEK_URL` + query, wait for the hooks; adds `renderer=canvas` unless `PEEK_RENDERER=webgl`. Useful queries: `reset=1` (fresh save), `level=12`, `level=12&mode=odd` (modes: find, odd, spot), `fakeads=1&adfast=1`, `daily=1`, `salt=7` (pins the seed) |
| `title` / `tap-title <play\|daily\|sound\|music>` / `play` | title hooks; tap a title button; `play` taps Play and waits for a scene in play |
| `state` | one line: level, mode, theme, status, remaining, hearts, stars, overlay, twist, menuOpen, paused, inputEnabled, adsShown, renderer, fps |
| `targets` / `find` / `win` / `wrong` | list targets; one correct tap; tap every target and wait for `won`; one wrong tap (costs a heart) |
| `next` | wait for the next scene after a win (the game advances by itself) |
| `menu` | tap the HUD pause button and wait for the in-game menu |
| `hide on` / `hide off` | the host hides or shows the page (the Bridge pause path) |
| `wait <js over s>` | poll the state until true, e.g. `wait s.status === "playing"` |
| `tap <x> <y>` / `eval <js>` / `sleep <ms>` / `ss [name]` / `errors` / `quit` | raw tap in CSS px; evaluate in the page; wall-clock pause; screenshot; console and page errors so far; close |

For step-by-step work, run the driver in tmux and poll for its result lines (`^ok`, `^ERROR`),
not for the command you typed:

```bash
tmux new-session -d -s peek -x 200 -y 50
tmux send-keys -t peek 'cd /home/user/peek-and-find && node .claude/skills/run-peek-and-find/driver.mjs' Enter
timeout 20 bash -c 'until tmux capture-pane -t peek -p | grep -q "^driver>"; do sleep 0.2; done'
tmux send-keys -t peek 'open level=12&mode=odd' Enter
timeout 60 bash -c 'until tmux capture-pane -t peek -p | grep -qE "^ok opened|^ERROR"; do sleep 0.2; done'
tmux send-keys -t peek 'wait s.status === "playing"' Enter
timeout 60 bash -c 'until tmux capture-pane -t peek -p | grep -qE "^ok level=12|^ERROR"; do sleep 0.2; done'
tmux send-keys -t peek 'ss 06-odd-level12' Enter
timeout 20 bash -c 'until tmux capture-pane -t peek -p | grep -q "^ok screenshot"; do sleep 0.2; done'
tmux send-keys -t peek 'quit' Enter
```

To drive the build the e2e suite and the published `/test/` page use instead of the dev server:

```bash
npm run build:test
(nohup npx vite preview --port 4173 --strictPort > /tmp/peek-preview.log 2>&1 &); timeout 30 bash -c 'until curl -sf http://127.0.0.1:4173/test/ >/dev/null; do sleep 0.5; done' && echo PREVIEW_UP
PEEK_URL=http://127.0.0.1:4173/test/ timeout 240 node .claude/skills/run-peek-and-find/driver.mjs <<'EOF'
smoke
quit
EOF
```

Stop the servers by port (npm does not pass SIGTERM on to Vite):

```bash
lsof -ti:4173 -sTCP:LISTEN | xargs -r kill
lsof -ti:5173 -sTCP:LISTEN | xargs -r kill
```

## Run (human path)

`npm run dev` prints LAN links for a phone on the same Wi-Fi (fake ads, fresh start, a level,
the daily chain) and serves on port 5173. Useless headless: use the agent path.

## Test

```bash
npm test                                      # 29 files, 219 tests, about 6 s
npx playwright test tests/e2e/rules.spec.ts   # one e2e file, 7 tests, about 40 s; needs dist/test/ from npm run build:test
```

`npm run e2e` builds and runs the whole e2e suite the same way.

## Gotchas

- **The production build has no hooks.** `dist/` at the root (what the ZIP ships) contains no
  `__peekTitle` or `__peekDebug`; `open` stops after 30 s with "no dev hooks". Use the dev
  server or `dist/test/`.
- **WebGL is slow headless.** SwiftShader WebGL ran at 43 fps falling to 22 in a few seconds,
  and Phaser's clock (intro, auto-advance, stars) lags the wall clock with it. The driver adds
  `renderer=canvas` (about 60 fps); set `PEEK_RENDERER=webgl` only to test WebGL itself.
- **A win moves on by itself:** `won` → `intro` → `playing` about 1.6 s of game time later.
  Anything read after a screenshot may already be the next scene, so `win` records the scene
  counter and `next` waits from it (reading the counter late made `next` wait forever).
- **Taps right after a resume are ignored on purpose.** After `hide off`, `inputEnabled` stays
  false for the resume grace (350 ms of wall clock, `src/game/resume-grace.ts`), then returns by
  itself. `wait s.inputEnabled` before tapping.
- **`open level=…` skips the title** and lands in a scene (status `intro`, then `playing`);
  `play` and `tap-title` work only on the title screen.
- **Tap coordinates are CSS px of the 390×844 viewport,** the same viewport as
  `playwright.config.ts`.
- **tmux echoes what you type.** Polling for the command text matches the echo at once; poll
  for the driver's `^ok` or `^ERROR` line, and let `quit` return before killing the session, or
  a pending screenshot is lost.
- **Every `node` and `npx` run prints `[UNDICI-EHPA] Warning: EnvHttpProxyAgent is experimental`**
  in this cloud environment (`NODE_USE_ENV_PROXY=1`). Harmless.

## Troubleshooting

- **`ERROR smoke: timeout waiting for the next scene`**: the old `next` read the scene counter
  after the game had already advanced. Fixed in the driver (`win` keeps the counter); if it
  returns, run `state` to see where the game is.
- **`ERROR open: no dev hooks after 30 s`**: `PEEK_URL` points at a production build or nothing
  is listening. Check `curl -sf http://127.0.0.1:5173/` and the `PEEK_URL` value.
- **A screenshot named in a tmux session is missing**: the session was killed before `ss`
  finished. Wait for `^ok screenshot` before `quit`.
