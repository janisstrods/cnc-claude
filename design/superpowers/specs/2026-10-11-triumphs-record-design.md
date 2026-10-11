# Triumphs: the player's battle record — design

2026-10-11. The game remembers every battle the player finishes and shows it as medals: in the battle picker, on the
main menu and in a Triumphs record of all battles.

## Decisions (asked up front)

- **Medals in place.** The picker keeps its list-and-briefing layout. Each battle row gets a pair of medals (one per
  army), each tab its medal count, and the briefing's side and opponent buttons show what has been won.
- **Tally + Triumphs view.** The main menu gets a one-line medal tally under its buttons and a Triumphs button that
  opens the whole record, battle by battle and box by box. Clicking a battle there opens it in the picker.
- **Export / Import.** The Triumphs view can save the record to a small `.json` file and load one back (merged, never
  counted twice): a backup, and the way to carry the record to another browser.
- **Publish** as v1.6.0 "Pydna" once tests, type-check and browser checks pass.

## Where the record lives

`localStorage`, key `cca-record-v1`, through `src/ui/storage.ts` like the autosave and the settings. Not a cookie: a
cookie travels with every request, holds about 4 KB and expires, and the static GitHub Pages site has no server to
read it. Syncing between devices would need a server and accounts; the export file covers moving a record by hand.

The record is per browser. Clearing the site's data wipes it, and Safari wipes script storage of a site not visited for
about a week. The Triumphs view says so next to the save button.

## What is recorded

- A **finished** battle only: won, lost or drawn. A battle left unfinished is not counted (Continue still resumes it).
- Counted per battle × side commanded × opponent level (`recruit`, `tribune`, `consul`): `{ won, lost, draw }`.
- Each leg of a both-sides match counts on its own. Optional rules and the enemy general's personality are not
  recorded.
- Recorded once per battle, when the controller first sees the winner.

## Medals

- A side's medal is the hardest opponent beaten from that side: **bronze** (Recruit), **silver** (Tribune), **gold**
  (Consul). A side fought but not won shows a plain dark ring; a side never fought shows a faint dotted ring.
- 81 battles × 2 sides = 162 medals to collect. The tallies count each side once, by its best medal.
- "Battles fought" counts battles with any finished result, from either side.

## Where it shows

- **Picker row** (`.scen-item`): two small medals under the year, in the order of the briefing's side buttons
  (bottom army, then top). The row's tooltip and accessible name say e.g. "Syracusan: gold · Carthaginian: not won yet".
- **Picker tabs:** a small medal and the number of medals won in that box, when there is at least one.
- **Briefing, "Command the":** each army's button shows its medal, and its tooltip gives the record from that side
  (won, lost, drawn).
- **Briefing, "Opponent":** each level's button shows its metal: bright when it has been beaten from the chosen side,
  faint otherwise. This also teaches which metal goes with which level.
- **Main menu:** a Triumphs button (between How to Play and Credits) and, once anything is recorded, a tally line:
  "gold 3 · silver 7 · bronze 12 · 22 of 81 battles fought".
- **Triumphs dialog:** the totals, a legend, then each box with its own tally and a grid of its battles (number, name,
  two medals). Clicking a battle closes the dialog and opens the picker on that battle. At the foot: Save record and
  Load record.
- **End of battle:** when a win earns a better medal for that side, the result dialog says so: "New medal: silver, for
  beating the Tribune as the Carthaginians".

## Export and import

- Save record downloads `cca-triumphs-YYYY-MM-DD.json`: `{ game: "cca-triumphs", version: 1, savedAt, battles }`.
- Load record reads such a file and merges it into the current record, taking the larger number for each counter, so
  loading the same file twice changes nothing. It reports how many battles the file held, or that the file is not a
  record. Unknown battle ids are kept (a record from a newer release survives a round trip); malformed entries are
  dropped.

## Units

- `src/ui/record.ts` (pure apart from load/save): the `BattleRecord` type, `addResult`, `sideStanding`,
  `beatenLevels`, `sideTally`, `recordTotals`, `mergeRecords`, `parseRecord`, `loadRecord`, `saveRecord`,
  `recordFinished` (load, add, save; returns the new medal, if any), `exportRecord`.
- `src/ui/screens/Medal.tsx`: the medal art (SVG disc with metallic gradient and a laurel; ring states for fought and
  not fought) and `MedalPair` for a battle's two sides.
- `src/ui/screens/Triumphs.tsx`: the tally line and the Triumphs dialog.
- `GameController` (`src/ui/game/controller.ts`) records the result when the battle ends and puts the new medal in
  `view.over.newMedal`; `BattleResult` shows it.
- `ScenarioSelect` takes an optional `initialBattle` id (from the Triumphs dialog), shows medals in the rows, tabs and
  choose row. `App` passes the battle id from the menu to the picker.

## Tests

- `tests/ui/record.test.ts`: adding results and medal standing; totals; merge is idempotent and takes maxima; parse
  rejects junk and keeps valid parts; load/save round trip; a controller replaying a finished battle records it once
  and reports the new medal; the picker, menu, Triumphs dialog and result dialog render the medals.
- Browser check on a worktree dev server: menu tally and Triumphs dialog with a seeded record, picker rows and buttons,
  click-through from Triumphs to the picker, save and load of the record file.

## Release

v1.6.0 "Pydna": after Pydna, Aemilius Paullus's triumph paraded the captured gold and silver of Macedon through Rome
for three days.
