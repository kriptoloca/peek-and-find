# Submission package

`npm run zip` builds the production bundle and writes `release/peek-and-find-<version>.zip`:
`dist/` without the `/test/` development build, `index.html` at the root, every path relative,
no pre-compressed files. The same tree gives the same bytes on every machine (sorted entries,
fixed timestamps), and the command prints the SHA-256 of the archive: note it in the release.

## Limits applied by the script

| Limit | Source | Value | This build |
| --- | --- | --- | --- |
| Single file | YouTube Playables certification page, hard | 30 MB | largest 1.23 MB (`assets/index-*.js`) |
| Single file | same page, recommendation | 512 KB | 6 files above (the bundle and the five theme atlases); warning only |
| Initial load (until GameReady) | same page: under 15 MB, target 5 MB; CLAUDE.md: ≤ 8 MB target | | 3.15 MB (`docs/size-report.md`) |
| Total package | same page: under 250 MB, target 15 MB | | ≈ 5.4 MB |
| Save data | same page | 3 MB | one JSON string well under 1 KB |
| Pre-compression | CLAUDE.md rule 2, audit-dist | none | none |

The YouTube figures come from the certification requirements page as found on 2026-10-17
(the page itself was not reachable from the build machine); confirm them on the live page before
uploading. Playgama's own blog quotes 30 MB initial / 200 MB total; the stricter YouTube numbers
are the ones enforced here.

## Upload steps (Hasan; developer account opened 2026-10-18)

1. `npm run zip` on a clean checkout of `main`; keep the printed SHA-256 (2026-10-18:
   `peek-and-find-0.1.0.zip`, 3.99 MB, `cadf90ac…2bb5`, built from 09d7b41; 2026-10-18 evening:
   `peek-and-find-0.1.1.zip` (host focus fix), SHA `a8583104…1a43` (full: `a85831042737265347f129a14cdc30ed3bc2b7527653b0fed135e5f0fe181a43`), 3.99 MB, built from 8389d46, through "Update Game": same game, numbers and saves kept; night: `peek-and-find-0.1.2.zip` (hearts carry
   over, GDD v1.7), SHA `cd6f3620…7058` (full: `cd6f3620ff3e14fdd9902663691dc29789b6b474234fe156a2450ca898897058`), 3.99 MB, built from e6defb3; 2026-10-19: `peek-and-find-0.1.3.zip` (feel pass, GDD v1.8; includes 0.1.2), SHA `4e699aa3…7615` (full: `4e699aa335aacfc4534ce2d0bb59a686e0bd7b18d66449e93d74619a0aa47615`), 3.98 MB, built from 2c2cf22; 2026-10-19 later: `peek-and-find-0.1.4.zip` (one mode rhythm for every player, GDD v1.9; includes 0.1.3), SHA `e831359f…7885` (full: `e831359fb56f1eb76a9ef780ee0d42d89047da38255b82218ed7862e445f7885`), 3.98 MB, built from dba6866).
2. developer.playgama.com → **Add Game** → fill the required fields from the "Facts for the
   console" list in `docs/store/listing.md` (title, engine, archive, description, how to play,
   devices, languages, distribution); orientation both; media from `docs/store/brand/` and
   `npm run screenshots`.
3. Playgama tests the build and sends recommendations (their pages say within 24 hours);
   forward the feedback here, fixes come as a new `npm run zip`. `docs/certification-checklist.md`
   rows 10 and 11 stay open until the QA feedback and the phone profile are in.
4. Distribution: all partner platforms, non-exclusive; Playgama forwards the game to YouTube
   Playables through its own partner account (their pages: most titles live in 2–4 weeks).
5. In parallel, YouTube's own route: the Playables interest form (linked from Google's
   Playables support/contact page) with the Pebblit channel; the Developer Portal itself is
   invitation-only, so this is a second door, not the plan.

Sources read 2026-10-18 (through search summaries; the pages do not open from the build
machine): wiki.playgama.com "Quick start", "Submitting a game", "Technical Requirements";
playgama.com "Publish your game on YouTube Playables" and the business FAQs;
developers.google.com Playables developer portal and support pages. Revenue share and timing
figures on those pages are Playgama's own claims.

What is not in the ZIP: `docs/`, `tests/`, sources, the `/test/` build, `.map` files (none are
emitted).

## Screenshots

`npm run screenshots` (test build served on 4173): five portrait 1080×1920 and five landscape
1920×1080 PNGs in `docs/store/screenshots/` (git-ignored): Title, Find level 9, Odd One Out
level 13, Spot 5 level 18 (levels where the v1.9 rhythm plays those modes; before 0.1.4 the shots
used 12 and 15), Find level 40 with the shuffle marker. Rerun after the real art pack.

## Brand files (2026-10-18)

Icon 512 / 1024 and the wordmark: `docs/store/brand/` (`npm run brand` regenerates them).
Studio profile photo: `docs/store/brand/pebblit-profile-1024.png` (square; the platform crops
the circle) or `pebblit-profile-circle-1024.png`. Thumbnails: `docs/store/thumbnails/`
(`npm run thumbnails`, after the real art pack).
