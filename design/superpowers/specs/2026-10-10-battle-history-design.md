# Battle history slides — design

Date: 2026-10-10. Branch `battle-history` (worktree `.claude/worktrees/history`).

## Goal

Every battle gets a short, original account of its history: the road to battle and who fought, an abstracted map
of how the fight went, and the outcome and what it changed. It is reached from a **History** button in the battle
briefing (battle picker) and in the in-game header, beside **Rules**. The base game (001–015) and Expansion #1
(101–124) are written now; Expansions #2 and #3 are being built in parallel and add their own files later.

User choices (2026-10-10): schematic step-through maps; concise text (about 100–160 words a slide); button only, never
opened automatically; publish live when the tests pass.

## The three slides

1. **The Road to Battle.** The war (one line, e.g. "Second Punic War, 218–201 BC"), one or two short paragraphs on why
   the armies met here, and one card per side: the army's name, its commanders, an estimated strength and a line on
   its make-up. Ancient numbers are uncertain: strengths are given as "c." or as a range, with the source disagreement
   noted in a few words when it matters.
2. **The Battlefield.** An abstracted map with terrain, unit blocks in each army's colours and movement arrows, in 1–4
   phases (for example deployment, the decisive move, the collapse). Each phase has a title and a one- or two-sentence
   caption. Units glide from one phase's position to the next.
3. **Outcome & Consequences.** A one-line result, a line on losses, one or two short paragraphs on what followed, and
   the sources (ancient authors with book and chapter, plus a modern reference where useful).

Navigation: Prev / Next buttons, a numbered slide strip at the top and the arrow keys. On the map slide, Next first
steps through the phases and then moves on (a presentation "build"); the phase strip jumps straight to a phase.

## Map conventions

- Coordinates: a 1000 × 600 field. The scenario's **top** army stands at the top, the **bottom** army at the bottom,
  matching the game board; geography (rivers, hills, sea) sits on the same edges as on the game's board where the
  scenario models it. When the player commands the top army (the board is flipped), the map is drawn rotated 180°,
  so the player's army is at the bottom in both views. Labels stay upright.
- Terrain features: `river` (a line), `sea`, `lake`, `hills`, `woods`, `marsh`, `fields` (polygons), `town`, `camp`
  (points), `road` (a dashed line), free `label`s. An optional compass gives the direction of north.
- Units: id, side, kind and an optional label and size. Kinds: `foot` (formed infantry: phalanx, legion, hoplites),
  `light` (skirmishers, archers, slingers), `warband`, `horse`, `lighthorse`, `elephants`, `chariots`, `camels`,
  `machines`. Each kind has a NATO-style glyph inside a block in the army's colour (from `BLOCK_COLORS`).
- Phases are cumulative: the first phase places the units present; later phases list only the units that move, plus
  `broken` (drawn faded, hatched, from that phase on) and `gone` (removed from that phase on). A unit first appears in
  the first phase that places it (late arrivals, ambushes). Arrows belong to a single phase and are drawn in the
  side's colour: `advance` (solid), `retreat` and `rout` (dashed).

## Architecture

- `src/history/types.ts`: the `BattleHistory` type (context, sides, map, outcome, sources).
- `src/history/battles/<id>.ts`: one file per battle, default export `BattleHistory`. Only the authored data lives
  here, so the Expansion #2/#3 sessions add files without touching shared code.
- `src/history/index.ts`: `hasHistory(id)` (synchronous, from the glob's keys) and `loadHistory(id)` (dynamic import,
  so each battle's text is its own small chunk, loaded when the dialog opens).
- `src/history/validate.ts`: `validateHistory(h)` returns a list of problems (ids, references, bounds, phase counts,
  word limits). The tests and the authoring agents both use it.
- `src/ui/history/BattleMap.tsx`: the SVG map renderer (phase, flipped).
- `src/ui/history/HistoryDialog.tsx`: `HistoryButton` (renders nothing when a battle has no history) and the dialog
  with the three slides, built on the kit `Modal`.
- `src/dev/HistoryGallery.tsx`: dev-only route `#/gallery/history[/<id>]`, all slides and phases of a battle on one
  page, for screenshots while authoring.
- UI wiring: one button in `ScenarioSelect`'s briefing title row and one in `GameScreen`'s header actions (the
  Expansion #2 branch changes neither spot). The in-game map is flipped when the human commands the top army.

## Content process

A workflow in the worktree:

1. **Research and write** (one agent per group of related battles, grouped by war so research is shared): read the
   scenario file and the existing briefing, research the battle in the ancient sources and modern scholarship, write
   the data file in original words (no copied sentences), render it with the gallery and look at the screenshot, run
   the validator.
2. **Fact-check** (an independent agent per group): check every name, date, number and claim against sources, check
   the map against the accounts, fix mistakes in place and report what changed.
3. **Review and integrate** (main session): read every file, check tone and consistency, run all tests, check the UI in
   the browser, build and publish.

Style: British spelling (as in the existing briefings), plain language, past tense for the narrative, uncertain facts
marked as such ("perhaps", "c.", "according to Livy").

## Testing

- Every base and Expansion #1 battle has a history; each history's id matches its file name and a scenario.
- `validateHistory` reports nothing for any history (unit references, at least one phase and at most four, cumulative
  states, coordinates within the field, arrows with two or more points, word limits, sources present).
- Render tests (static markup): each slide shows its text; the map draws every visible unit of each phase; a flipped
  map mirrors the coordinates; `HistoryButton` renders nothing without a history.

## Out of scope

Expansions #2 and #3 content (their sessions add `2xx`/`3xx` files with the same format); portraits or other
illustrations; narration or animation beyond the phase transitions.
