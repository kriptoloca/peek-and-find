# Design critique: the brand marks on the Playgama page (`/design-critique`, 2026-10-18)

Context: `brand-sheet.png` (first render) judged against the Playgama AI front page: near-black
page, rows of saturated, busy game tiles, 64–200 px icons, circular studio avatars.

## Overall impression

The icon's idea reads at every size (a field, one ring, one found form) and the cairn is the
only quiet mark on the row, which is an asset. The biggest opportunity: on a near-black page a
night-blue tile has no edge; it reads as a hole between loud tiles rather than a calm one.

## Usability

| Finding | Severity | Recommendation |
| --- | --- | --- |
| Night ground (#1b1f2a) is ~1.3:1 against the page's black; the tile boundary disappears at 64 px | 🟡 Moderate | Lift the ground to the game's own scene blue (#2e3650): still calm, 2.3:1 against the page, and it is the colour the player sees in play |
| Field tones drop below 2:1 on the lifted ground | 🟡 Moderate | One step lighter again; they are texture, not text, but must stay visible at 64 px |
| Base stone of the cairn (#566590) merges with a lighter ground | 🟡 Moderate | A stone grey (#7d88a8): three distinct values bottom → top (grey, teal, yellow) |

## Visual hierarchy

- **What draws the eye first**: the yellow ring, then the teal form inside it. Correct: the ring
  is the brand's one accent and the game's own hint ring.
- **Reading flow**: ring → form → field → tile edge. The field must stay secondary; it is.
- **Signal colour**: coral inside the yellow ring is a warm-on-warm pair and fuses into one blob
  at 64 px; teal keeps the ring distinct. Teal stays, one step brighter so it holds on the
  lighter ground.

## Consistency

| Element | Issue | Recommendation |
| --- | --- | --- |
| Icon ground vs. Title ground | The Title keeps night (#1b1f2a); the icon moves to scene blue | Acceptable: the icon lives on other people's pages, the Title on ours; both are the game's palette |
| In-game wordmark | The Title and the boot screen still set "Peek & Find" in Arial | Ship the wordmark as a texture; the same mark on the store page and the first screen |

## Accessibility

- Ring on scene blue: 7.4:1. Wordmark sand on night: 14:1. Field tones are decorative.
- The marks carry no text except the wordmarks; the icon and the profile mark need no alt text
  beyond the name.

## What works well

- One accent per mark, used once; nothing competes with the ring.
- The cairn reads at 64 px inside a circle crop: three stacked values, no detail to lose.
- The i-dot ring makes the wordmark the same object as the icon.

## Priority recommendations

1. **Ground → scene blue** for the icon and the profile; field tones and the base stone one
   step lighter.
2. **Keep teal**, brighter by one step.
3. **Put the wordmark and the studio mark in the game**: the Title and the boot screen show the
   wordmark texture, the Title carries the cairn as a small signature.
