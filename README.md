# Commands & Colors: Ancients — Digital Edition

A fully playable, unofficial browser edition of Richard Borg's *Commands & Colors: Ancients* (GMT Games):
39 battles against a computer general. The 15 battles of the base game, Rome and Carthage (and Syracuse), and the
24 of Expansion #1, *Greece & Eastern Kingdoms*, from Marathon to Pydna.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:5173. Other scripts:

| Command | What it does |
|---|---|
| `npm run build` | Type-check and build the static site into `docs/` (served by GitHub Pages) |
| `npm test` | Rules-engine, rules, scenario, art, UI, AI and golden-game tests (Vitest) |
| `npm run typecheck` | TypeScript only |

## Playing

1. **New Battle** → pick a battle (the **Punic Wars** tab holds the base game, **Greece & the East** Expansion #1),
   the army you command, and the opponent's strength (Recruit, Tribune, Consul).
2. Each turn: click a command card in your hand (hover to preview it and see which troops it can order),
   press **Play**, click the units to order, **Confirm**, move them (green hexes = may still battle, amber = no
   battle, red = must charge), then attack (red = close combat, orange = ranged fire). The dice, hits and
   retreats are resolved and animated for you.
3. When the enemy attacks you, you'll be asked whether to evade, stand or play First Strike; when you take flags
   you can choose to hold or fall back; when you win a fight you may advance and attack again.
4. First to the scenario's number of Victory Banners wins. Games are saved automatically — **Continue** from
   the main menu.

**History** (in the battle briefing and in the top bar) tells the story of the real battle in three slides: the road to
battle and the two armies, an animated schematic map of the fighting in phases, and the outcome and what it changed.

**Rules** in the top bar opens a full reference (units, dice, terrain, every card, and an Expansion #1 tab). Hover any
unit for its stats. Keys: **1–9** pick a card, **Enter** confirms, **Esc** clears a selection; click the board to hurry
animations.

## Expansion #1: Greece & Eastern Kingdoms

Battles 101–124: Greeks against Persians, Thebes against Sparta, Philip II and Alexander, the Successors, Pyrrhus
against Rome, the Seleucids, India and Macedon's last stand at Pydna. They add:

- **New units:** light bow cavalry (horse archers that shoot and evade), camels (they frighten horses) and heavy war
  machines (long-range bolt-throwers that cannot move and fire, and are abandoned when they evade).
- **New terrain:** the sea, impassable but no bar to sight, and ramparts, earthworks along some hexsides that protect
  the foot units behind them.
- **Elite units:** the Theban Sacred Band, the Silver Shields, Alexander's Companions, the Persian Immortals and India's
  bow-armed auxilia join the base game's Carthaginian Sacred Band, each with its own abilities and its own miniatures.
- **Leaders:** Alexander, whose unit rolls an extra die in close combat, and the Persian satraps, who command only
  their own unit.
- **Scenario rules**, e.g. Hellespont (every leader lost costs a command card), Gabiene (reaching Eumenes' camp is worth
  a banner) and Heraclea (Roman infantry cannot ignore elephant flags). At **Asculum** both sides place their leaders
  before the battle.
- **Roman Tactical Flexibility**, an optional rule for Cynoscephalae, Magnesia and Pydna, switched on or off in the
  briefing.

The computer general knows the new units, rules and commanders.

## The computer general

The AI (`src/ai`, running in a Web Worker) plans each turn by building candidate orders and movements for every card
in its hand, then plays each plan through the real rules engine many times with freshly rolled dice (it never peeks at
your cards, the deck or the dice). It scores the outcomes with a threat-aware evaluation — banners, unit strength,
support, leader safety, retreat paths, terrain and scenario objectives — and keeps strong cards for the right moment.
Each historical commander has a temperament (Hannibal *the Fox*, Varro *the Bull*, Scipio *the Strategist*, …)
that shapes how boldly he fights and what he says in the battle log; you can pick a different one before the battle.

| Level | Character |
|---|---|
| Recruit | Shallow search, noisy judgement, occasional careless reactions |
| Tribune | Full search (default) |
| Consul | Widest search and the most combat rollouts |

## Project layout

```
src/engine/     Pure TypeScript rules engine (deterministic, replayable)
src/ai/         Computer opponent (runs in a Web Worker)
src/scenarios/  The 39 battles: base game 001–015 and Expansion #1 101–124 (JSON data + special rules)
src/history/    The battles' histories (one data file per battle in battles/) and their validator
src/art/        Original SVG miniatures
src/ui/         React UI: board, terrain art, cards, dice, menus
design/         Design spec, rules reference (Expansion #1 in §15–§17), implementation plan, Expansion #1 notes
docs/           Built site for GitHub Pages (generated by `npm run build`; commit it to publish)
tests/          Engine, rules, scenario, art, terrain, UI, AI and golden-game tests
```

Dev shortcuts: `#/play/007/bottom/tribune` starts Cannae as the Romans directly, `#/play/109/top/tribune` Gaugamela as
Alexander; `#/gallery/art`, `#/gallery/terrain`, `#/gallery/kit` show the art galleries, `#/gallery/history/007` every slide and
map phase of a battle's history.

## Credits

Unofficial fan implementation; *Commands & Colors* is a trademark of GMT Games LLC, and Expansion #1 *Greece &
Eastern Kingdoms* is also a GMT Games product. The battle setups are transcribed data; all texts are original or
paraphrased, and all artwork is original. Fonts: Cinzel and EB Garamond (SIL OFL). Icons: game-icons.net (CC BY 3.0).
See `CREDITS.md`.
