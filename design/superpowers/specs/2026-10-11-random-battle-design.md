# Random battle — design

2026-10-11. A "Random battle" button in the battle picker (`ScenarioSelect`).

## Decisions (asked up front)

- **Show the battle.** The button picks a battle and shows it in the picker as if the player had clicked it: briefing,
  map preview, history, optional rules. Nothing starts until "To Battle!". Pressing it again picks again.
- **All battles.** It picks from every battle in every box (`SCENARIOS`), not just the open tab. When the battle is in
  another box, the picker switches to that tab (and remembers it, like a tab click) and scrolls the battle into view.
- **Random side too.** It also picks the army the player commands. The player can still change side, opponent and
  general afterwards; the opponent difficulty and the chosen general are left as they are.

## Behaviour

- Never picks the battle already selected (when there is more than one), so every press visibly changes the battle.
  Every other battle is equally likely; each side has a one in two chance.
- The button sits under the battle list, full width, level with "To Battle!" across the screen: a small ivory die
  (it tumbles onto a new face at every pick) and the words "Random battle". The picker head was the first idea, but
  "← Back" and "Choose a Battle" already fill the 330px list column.
- The picked battle is scrolled to the middle of the list, clear of the list's faded bottom edge.

## Units

- `randomPick(all, currentId, rand = Math.random): { battle: ScenarioInfo; side: Side }` in `src/ui/screens/picker.ts`.
  Pure apart from the default random source; tests pass their own `rand`.
- `ScenarioSelect` (`src/ui/screens/Menus.tsx`) wires the button: switch tab when needed, select the battle, set the
  side, then scroll the list's active item into view (only after a random pick, so manual clicks never scroll).

## Tests

- `tests/ui/random-battle.test.ts`: the pick never repeats the current battle; it reaches battles of every box; the
  side follows `rand`; a one-battle list returns that battle; the picker renders the button under the battle list.
- Browser check on the dev server: pressing the button moves between tabs, selects and scrolls to the battle, and sets
  the side; the page itself does not scroll.

## Release

v1.4.4 "Cynoscephalae": the battle both armies stumbled into in the fog, by chance.
