# Derivation and originality

## Operators

| Operator | Keep | Change (at least) | Use it for |
| --- | --- | --- | --- |
| Mutation | the pleasure genes of one parent: verb, cascade per input, tempo | face, theme, art texture, and one rule or the board structure | the "closest" offer (A) |
| Crossover | the verb of parent 1 | the goal or key constraint from parent 2 (optionally the session shape of parent 3) | the "creative" offer (B) |
| Transplant | a top gene (a cascade, a constraint, a meta) | the body: one of our proven systems (generator with solver, pixel board, hidden objects) | the "our strength" offer (C) |
| Wildcard | nothing in particular | everything | one candidate a night, to keep exploring |
| Overlay | any of the above | the theme, from a seasonal or social trend, with an original face | timing (holidays, a trending situation) |

Rules for every candidate:
- It names its **lineage**: parent cards, genes kept, genes changed, and why the change should
  hold players (point to a Hold rule or a pillar).
- It passes the Hold plan of `pebblit-retention` and the Face and Feel scores of
  `pebblit-game-craft` before it is offered.
- It never takes a parent's name, characters, art or sound assets, level layouts or UI.

## Originality distance

Compare the candidate with every DNA card (the lists and our own catalog). Score each gene group
as 0 when it matches and its weight when it differs:

| Gene | Weight |
| --- | --- |
| verb | 3 |
| board structure | 3 |
| goal or key constraint | 2 |
| face (character or joke) | 2 |
| theme | 1 |
| art texture | 1 |

Maximum 12. A gene "matches" when a player would describe it with the same words. Pass rules:
- against any external game: distance ≥ 6, and no taken layout, UI, character or name;
- against our own catalog: if verb and board structure both match, it is an update of that game,
  not a new game;
- name: not in the latest catalog title snapshot (`research/<week>/catalog-titles.json`), no
  trademark, no near-spelling of a known title.

Distances are judgement calls; write the reason for every gene marked "differs".

## Example (lineage and distance)

Candidate "a critter that sorts stolen socks back into drawers":
- parents: Bus Fever Party (cascade per input: one tap, several rhythmic successes) and a
  ball-sort puzzle (verb: move the top item between containers);
- kept: rhythmic multi-success cascade (Bus Fever), top-item move (ball sort);
- changed: face (a guilty raccoon, a joke), board (drawers with a laundry chute that feeds new
  socks), constraint (the chute keeps adding; a full chute loses), theme, art;
- distance to Bus Fever: verb differs 3, board differs 3, goal/constraint differs 2, face 2,
  theme 1, art 1 = 12; to ball sort: verb matches 0, board differs 3, constraint differs 2, face
  2, theme 1, art 1 = 9. Passes.
