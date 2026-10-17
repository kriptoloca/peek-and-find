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
| Initial load (until GameReady) | same page: under 15 MB, target 5 MB; CLAUDE.md: ≤ 8 MB target | | 2.81 MB (`docs/size-report.md`) |
| Total package | same page: under 250 MB, target 15 MB | | ≈ 4.6 MB |
| Save data | same page | 3 MB | one JSON string well under 1 KB |
| Pre-compression | CLAUDE.md rule 2, audit-dist | none | none |

The YouTube figures come from the certification requirements page as found on 2026-10-17
(the page itself was not reachable from the build machine); confirm them on the live page before
uploading. Playgama's own blog quotes 30 MB initial / 200 MB total; the stricter YouTube numbers
are the ones enforced here.

## Upload steps (Hasan)

1. `npm run zip` on a clean checkout of `main`; keep the printed SHA-256.
2. developer.playgama.com → the game → Builds → upload `release/peek-and-find-<version>.zip`.
3. Run the Playgama QA tool against the uploaded build (`docs/certification-checklist.md`
   rows 10 and 11 stay open until then).
4. Fill the listing from `docs/store/listing.md`; upload the icon, the two thumbnails and the
   screenshots (3 per aspect, 9:16 and 16:9, taken from the production link after the art pack).
5. Target platform YouTube Playables; wait for the test feedback (the blog promises 24 h).

What is not in the ZIP: `docs/`, `tests/`, sources, the `/test/` build, `.map` files (none are
emitted).
