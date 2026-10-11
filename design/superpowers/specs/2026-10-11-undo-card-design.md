# Undo card: take back a played card — design

2026-10-11. A player who played the wrong command card can take it back and choose again, as long as nothing has
happened with it yet.

## Decisions (asked up front)

- **Until the first move.** "Undo card" is offered while the player orders units with it (or names a command for it)
  and until the first unit moves or the first battle is fought. One click returns the card to the hand and clears the
  orders it gave.
- **Publish** as v1.6.1 "Dyrrhachium" once tests, type-check and a browser check pass. (Caesar pulled back after his
  setback at Dyrrhachium and fought again at Pharsalus.)

## What may be taken back

The undo already in the game replays the battle without the last answer (`GameDriver.undo`). It is offered only while
the side that gave the answer is still deciding and no die has been rolled since, so it can never re-roll dice or
reveal a card from the deck. The card follows the same rule, as one **undo step**:

- the last answer, when it was a move (not "End movement"), a leader placement (117, 308) or a forced placement (308);
- or the card played, together with the answers that followed it and act on it before anything moves: the orders
  (units chosen, an ambush sprung) and the command named for it (separate commands, §18.5).

In both cases every answer of the step is the deciding side's own, that side is deciding now, and no die has been
rolled since the step's first answer. So Rally and I Am Spartacus cannot be taken back (their dice roll as soon as they
are played), nor a card once a unit has moved, a battle has been fought, or the opponent has answered anything.

Clash of Shields and Darken the Sky have no movement: their next decision is the battle, where the card may still be
taken back until the first attack.

Once a unit has moved, Undo takes back the moves one by one as before; with every move taken back, Undo card is offered
again. A forced placement (308) made before the card can be taken back again once the card is.

## Engine

`GameDriver` gains `undoStep(): 'move' | 'placement' | 'card' | null` (what `undo` would take back now) and `undo`
drops the whole step. `canUndo()` stays as `undoStep() !== null`. The forced placement moves from the controller's own
bookkeeping into this check: the controller keeps only what the log needs.

## UI

- The prompts for choosing units (`orders`), naming a command (`chooseCommand`), Movement and Battle show a ghost button
  labelled by the step: "Undo card", "Undo move" or "Undo placement". The card choice prompt keeps "Undo placement".
- `ViewState.canUndo: boolean` becomes `undo: UndoStep | null`.
- The log lines the step wrote ("… plays Order Three Units Center.", "Orders go to the … command.") are removed with it:
  the controller remembers the id of the next log line at each of the human's answers and drops the lines from the
  step's first answer on (ids, not positions: the log is capped at 400 lines).
- After an undo the card choice prompt comes back with the card in hand. The "Your turn" toast is not shown again.

## Tests

- Engine (`tests/engine/rules.test.ts`, turn flow): the card is back in hand and the state equals the state before it
  was played; the step reaches back over the orders; not after a move, an "End movement", Rally's dice, or once the turn
  has passed; with a command named (§18.5) the command goes with the card; Darken the Sky at its battle decision.
- Controller (`tests/ui`): Undo card removes the card's log line and brings back the card choice; the 308 test's
  "no more undo after the card" now takes back the card, then the placement.
- The golden replays are unchanged (no answer or event changes).
